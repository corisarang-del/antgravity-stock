import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOSS_SECRET_KEY = Deno.env.get("TOSS_SECRET_KEY") ?? "";
const TOSS_API_BASE = "https://api.tosspayments.com/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // JWT로 유저 인증
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 토큰으로 유저 조회
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { authKey, customerKey, amount, orderId, orderName } = await req.json();

    if (!authKey || !customerKey) {
      return new Response(JSON.stringify({ error: "authKey and customerKey are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TOSS_SECRET_KEY가 없으면 테스트 모드 응답
    if (!TOSS_SECRET_KEY) {
      console.warn("[WARN] TOSS_SECRET_KEY not set. Returning mock Pro subscription.");
      const periodStart = new Date();
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await supabase.from("subscriptions").upsert({
        user_id: user.id,
        plan: "pro",
        status: "active",
        toss_customer_key: customerKey,
        toss_billing_key: "MOCK_BILLING_KEY",
        toss_order_id: orderId ?? "MOCK_ORDER_ID",
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      return new Response(JSON.stringify({ success: true, mock: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      console.error("[ERROR] Billing auth failed:", billingAuthData);
      return new Response(
        JSON.stringify({ error: billingAuthData.message ?? "빌링키 발급 실패" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      console.error("[ERROR] Billing charge failed:", chargeData);
      return new Response(
        JSON.stringify({ error: chargeData.message ?? "결제 실패" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[ERROR]", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
