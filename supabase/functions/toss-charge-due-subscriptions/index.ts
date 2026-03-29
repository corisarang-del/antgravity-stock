import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildCorsHeaders,
  ensureAllowedOrigin,
  getErrorMessage,
} from "../_shared/security.ts";
import {
  addOneMonth,
  chargeBillingKey,
  getBillingAmount,
  getBillingOrderName,
  isDueOnOrBeforeTargetDate,
  toKstDateString,
} from "../_shared/toss_billing.ts";

const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const TOSS_SECRET_KEY = Deno.env.get("TOSS_SECRET_KEY") ?? "";
const BILLING_CRON_SECRET =
  Deno.env.get("BILLING_CRON_SECRET") ??
  Deno.env.get("CRON_SECRET") ??
  "";

async function recordPaymentAttempt(
  supabase: ReturnType<typeof createClient>,
  input: {
    userId: string;
    subscriptionId: string;
    status: "success" | "failed";
    orderId: string;
    customerKey: string;
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
    flow: "billing_charge",
    status: input.status,
    order_id: input.orderId,
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
    .eq("id", input.subscriptionId);
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function verifyCronSecret(req: Request) {
  if (!BILLING_CRON_SECRET) {
    throw new Error("BILLING_CRON_SECRET is missing");
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "").trim()
    : null;

  if (!token || !timingSafeEqual(token, BILLING_CRON_SECRET)) {
    throw new Error("UNAUTHORIZED_CRON");
  }
}

serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors.headers });
  }

  const blocked = ensureAllowedOrigin(req);
  if (blocked) return blocked;

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...cors.headers, "Content-Type": "application/json" },
      });
    }

    verifyCronSecret(req);

    if (!SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Service role key missing" }), {
        status: 500,
        headers: { ...cors.headers, "Content-Type": "application/json" },
      });
    }

    if (!TOSS_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Toss secret key missing" }), {
        status: 500,
        headers: { ...cors.headers, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;
    const limit = Number(body?.limit ?? 100);
    const targetDate =
      typeof body?.targetDate === "string" && body.targetDate
        ? body.targetDate
        : toKstDateString(new Date());

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      SERVICE_ROLE_KEY,
    );

    const { data: subscriptions, error } = await supabase
      .from("subscriptions")
      .select("id,user_id,plan,status,toss_customer_key,toss_billing_key,current_period_start,current_period_end")
      .eq("plan", "pro")
      .eq("status", "active")
      .not("toss_billing_key", "is", null)
      .not("toss_customer_key", "is", null)
      .not("current_period_end", "is", null)
      .limit(limit);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...cors.headers, "Content-Type": "application/json" },
      });
    }

    const dueSubscriptions = (subscriptions ?? []).filter((subscription) =>
      isDueOnOrBeforeTargetDate(subscription.current_period_end, targetDate),
    );

    if (dryRun) {
      return new Response(JSON.stringify({
        dryRun: true,
        targetDate,
        totalCandidates: subscriptions?.length ?? 0,
        dueCount: dueSubscriptions.length,
        dueSubscriptions,
      }), {
        status: 200,
        headers: { ...cors.headers, "Content-Type": "application/json" },
      });
    }

    const results: Array<Record<string, unknown>> = [];

    for (const subscription of dueSubscriptions) {
      const periodStart = subscription.current_period_end
        ? new Date(subscription.current_period_end)
        : new Date();
      const periodEnd = addOneMonth(periodStart);
      const orderId = `stockai_renew_${subscription.user_id}_${Date.now()}`;
      const billingAmount = getBillingAmount();

      const charge = await chargeBillingKey({
        secretKey: TOSS_SECRET_KEY,
        input: {
          billingKey: subscription.toss_billing_key!,
          customerKey: subscription.toss_customer_key!,
          amount: billingAmount,
          orderId,
          orderName: getBillingOrderName(),
        },
      });

      if (!charge.ok) {
        await recordPaymentAttempt(supabase, {
          userId: subscription.user_id,
          subscriptionId: subscription.id,
          status: "failed",
          orderId,
          customerKey: subscription.toss_customer_key!,
          amount: billingAmount,
          code: charge.data?.code ?? null,
          message: charge.data?.message ?? "결제 실패",
          metadata: {
            stage: "billing_charge",
            targetDate,
          },
        });

        results.push({
          userId: subscription.user_id,
          subscriptionId: subscription.id,
          success: false,
          error: charge.data?.message ?? "결제 실패",
          response: charge.data,
        });
        continue;
      }

      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
          latest_payment_status: "success",
          latest_payment_code: null,
          latest_payment_message: null,
          latest_payment_at: new Date().toISOString(),
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          toss_order_id: orderId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id);

      if (updateError) {
        results.push({
          userId: subscription.user_id,
          subscriptionId: subscription.id,
          success: false,
          error: updateError.message,
        });
        continue;
      }

      await recordPaymentAttempt(supabase, {
        userId: subscription.user_id,
        subscriptionId: subscription.id,
        status: "success",
        orderId,
        customerKey: subscription.toss_customer_key!,
        amount: billingAmount,
        metadata: {
          stage: "billing_charge",
          paymentKey: charge.data?.paymentKey ?? null,
          approvedAt: charge.data?.approvedAt ?? null,
          targetDate,
        },
      });

      results.push({
        userId: subscription.user_id,
        subscriptionId: subscription.id,
        success: true,
        orderId,
        payment: charge.data,
      });
    }

    return new Response(JSON.stringify({
      dryRun: false,
      targetDate,
      totalCandidates: subscriptions?.length ?? 0,
      dueCount: dueSubscriptions.length,
      chargedCount: results.filter((result) => result.success === true).length,
      failedCount: results.filter((result) => result.success === false).length,
      results,
    }), {
      status: 200,
      headers: { ...cors.headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message === "UNAUTHORIZED_CRON" ? 401 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...cors.headers, "Content-Type": "application/json" },
    });
  }
});
