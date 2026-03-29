import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  buildCorsHeaders,
  enforceRateLimit,
  ensureAllowedOrigin,
  getClientIp,
  getErrorMessage,
} from "../_shared/security.ts";
import {
  addOneMonth,
  chargeBillingKey,
  getBillingAmount,
  getBillingOrderName,
  issueBillingKey,
} from "../_shared/toss_billing.ts";

const TOSS_SECRET_KEY = Deno.env.get("TOSS_SECRET_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? "";

async function recordPaymentAttempt(
  supabase: ReturnType<typeof createClient>,
  input: {
    userId: string;
    status: "success" | "failed";
    orderId: string | null;
    authKey: string | null;
    customerKey: string | null;
    amount: number;
    code?: string | null;
    message?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const now = new Date().toISOString();

  await supabase.from("payment_attempts").insert({
    user_id: input.userId,
    provider: "toss",
    flow: "billing_auth",
    status: input.status,
    order_id: input.orderId,
    auth_key: input.authKey,
    toss_customer_key: input.customerKey,
    toss_code: input.code ?? null,
    toss_message: input.message ?? null,
    amount: input.amount,
    metadata: input.metadata ?? {},
  });

  await supabase
    .from("subscriptions")
    .update({
      latest_payment_status: input.status,
      latest_payment_code: input.code ?? null,
      latest_payment_message: input.message ?? null,
      latest_payment_at: now,
      updated_at: now,
    })
    .eq("user_id", input.userId);
}

serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors.headers });
  }

  const blocked = ensureAllowedOrigin(req);
  if (blocked) return blocked;

  try {
    enforceRateLimit(`${getClientIp(req)}:toss-confirm`, 10, 60);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors.headers, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      SERVICE_ROLE_KEY,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...cors.headers, "Content-Type": "application/json" },
      });
    }

    const { authKey, customerKey, amount, orderId, orderName } = await req.json();
    const billingAmount = amount ?? getBillingAmount();
    const chargeOrderId = orderId ?? `stockai_pro_${user.id}_${Date.now()}`;

    if (!authKey || !customerKey) {
      await recordPaymentAttempt(supabase, {
        userId: user.id,
        status: "failed",
        orderId: chargeOrderId,
        authKey: authKey ?? null,
        customerKey: customerKey ?? null,
        amount: billingAmount,
        message: "authKey and customerKey are required",
      });

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

    const billingAuth = await issueBillingKey({
      secretKey: TOSS_SECRET_KEY,
      authKey,
      customerKey,
    });

    if (!billingAuth.ok) {
      await recordPaymentAttempt(supabase, {
        userId: user.id,
        status: "failed",
        orderId: chargeOrderId,
        authKey,
        customerKey,
        amount: billingAmount,
        code: billingAuth.data.code ?? null,
        message: billingAuth.data.message ?? "빌링키 발급 실패",
        metadata: {
          stage: "issue_billing_key",
        },
      });

      return new Response(
        JSON.stringify({ error: billingAuth.data.message ?? "빌링키 발급 실패" }),
        { status: 400, headers: { ...cors.headers, "Content-Type": "application/json" } },
      );
    }

    const billingKey = billingAuth.data.billingKey;

    const charge = await chargeBillingKey({
      secretKey: TOSS_SECRET_KEY,
      input: {
        billingKey,
        customerKey,
        amount: billingAmount,
        orderId: chargeOrderId,
        orderName: orderName ?? getBillingOrderName(),
        customerEmail: user.email,
        customerName: user.user_metadata?.full_name ?? user.email,
      },
    });

    if (!charge.ok) {
      await recordPaymentAttempt(supabase, {
        userId: user.id,
        status: "failed",
        orderId: chargeOrderId,
        authKey,
        customerKey,
        amount: billingAmount,
        code: charge.data.code ?? null,
        message: charge.data.message ?? "결제 실패",
        metadata: {
          stage: "charge_billing_key",
        },
      });

      return new Response(
        JSON.stringify({ error: charge.data.message ?? "결제 실패" }),
        { status: 400, headers: { ...cors.headers, "Content-Type": "application/json" } },
      );
    }

    const periodStart = new Date();
    const periodEnd = addOneMonth(periodStart);
    const latestPaymentAt = new Date().toISOString();

    await supabase.from("subscriptions").upsert({
      user_id: user.id,
      plan: "pro",
      status: "active",
      latest_payment_status: "success",
      latest_payment_code: null,
      latest_payment_message: null,
      latest_payment_at: latestPaymentAt,
      toss_customer_key: customerKey,
      toss_billing_key: billingKey,
      toss_order_id: chargeOrderId,
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      updated_at: latestPaymentAt,
    }, { onConflict: "user_id" });

    await recordPaymentAttempt(supabase, {
      userId: user.id,
      status: "success",
      orderId: chargeOrderId,
      authKey,
      customerKey,
      amount: billingAmount,
      metadata: {
        stage: "charge_billing_key",
        paymentKey: charge.data.paymentKey ?? null,
        approvedAt: charge.data.approvedAt ?? null,
      },
    });

    return new Response(JSON.stringify({ success: true, payment: charge.data }), {
      status: 200,
      headers: { ...cors.headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    const status = error instanceof Error && error.message === "RATE_LIMITED" ? 429 : 500;
    const message = error instanceof Error && error.message === "RATE_LIMITED"
      ? "Too many requests"
      : getErrorMessage(error);

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...cors.headers, "Content-Type": "application/json" },
    });
  }
});
