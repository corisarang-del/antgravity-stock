import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, enforceRateLimit, ensureAllowedOrigin, getClientIp, getErrorMessage } from "../_shared/security.ts";

const TOSS_SECRET_KEY = Deno.env.get("TOSS_SECRET_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const TOSS_API_BASE = "https://api.tosspayments.com/v1";

serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors.headers });
  }

  const blocked = ensureAllowedOrigin(req);
  if (blocked) return blocked;

  try {
    enforceRateLimit(`${getClientIp(req)}:toss-confirm`, 10, 60);

    // JWT로 유저 인증
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors.headers, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      SERVICE_ROLE_KEY
    );

    // 토큰으로 유저 조회
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...cors.headers, "Content-Type": "application/json" },
      });
    }

    const { authKey, customerKey, amount, orderId, orderName } = await req.json();

    if (!authKey || !customerKey) {
      return new Response(JSON.stringify({ error: "authKey and customerKey are required" }), {
        status: 400,
        headers: { ...cors.headers, "Content-Type": "application/json" },
      });
    }

    if (!TOSS_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Payment server misconfigured" }), {
        status: 500,
        headers: { ...cors.headers, "Content-Type": "application/json" },
      });
    }

    if (!SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Service role key missing" }), {
        status: 500,
        headers: { ...cors.headers, "Content-Type": "application/json" },
      });
    }

    // 1단계: 빌링키 발급 (authKey → billingKey)
    const basicToken = btoa(TOSS_SECRET_KEY + ":");
    const billingAuthRes = await fetch(
      `${TOSS_API_BASE}/billing/authorizations/${authKey}`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ customerKey }),
      }
    );

    const billingAuthData = await billingAuthRes.json();

    if (!billingAuthRes.ok) {
      return new Response(
        JSON.stringify({ error: billingAuthData.message ?? "빌링키 발급 실패" }),
        { status: 400, headers: { ...cors.headers, "Content-Type": "application/json" } }
      );
    }

    const billingKey = billingAuthData.billingKey;

    // 2단계: 첫 번째 정기결제 실행
    const chargeOrderId = orderId ?? `stockai_pro_${user.id}_${Date.now()}`;
    const chargeRes = await fetch(`${TOSS_API_BASE}/billing/${billingKey}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerKey,
        amount: amount ?? 4900,
        orderId: chargeOrderId,
        orderName: orderName ?? "StockAI Pro 월정액",
        customerEmail: user.email,
        customerName: user.user_metadata?.full_name ?? user.email,
      }),
    });

    const chargeData = await chargeRes.json();

    if (!chargeRes.ok) {
      return new Response(
        JSON.stringify({ error: chargeData.message ?? "결제 실패" }),
        { status: 400, headers: { ...cors.headers, "Content-Type": "application/json" } }
      );
    }

    // 3단계: DB 구독 상태 업데이트
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await supabase.from("subscriptions").upsert({
      user_id: user.id,
      plan: "pro",
      status: "active",
      toss_customer_key: customerKey,
      toss_billing_key: billingKey,
      toss_order_id: chargeOrderId,
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return new Response(JSON.stringify({ success: true, payment: chargeData }), {
      status: 200,
      headers: { ...cors.headers, "Content-Type": "application/json" },
    });
  } catch (e) {
    const status = e instanceof Error && e.message === "RATE_LIMITED" ? 429 : 500;
    const message = e instanceof Error && e.message === "RATE_LIMITED" ? "Too many requests" : getErrorMessage(e);
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...cors.headers, "Content-Type": "application/json" },
    });
  }
});
