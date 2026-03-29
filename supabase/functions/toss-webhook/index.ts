import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  buildCorsHeaders,
  enforceWebhookReplayProtection,
  getErrorMessage,
} from "../_shared/security.ts";
import { addOneMonth } from "../_shared/toss_billing.ts";

const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors.headers });
  }

  try {
    const body = await req.json();
    const { eventType, data } = body;
    const transmissionId = req.headers.get("tosspayments-webhook-transmission-id");
    const replayKey =
      transmissionId ??
      `${eventType}:${data?.paymentKey ?? data?.customerKey ?? "unknown"}:${data?.status ?? "unknown"}`;

    enforceWebhookReplayProtection(replayKey, 300);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      SERVICE_ROLE_KEY,
    );

    if (!SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Service role key missing" }), {
        status: 500,
        headers: { ...cors.headers, "Content-Type": "application/json" },
      });
    }

    if (eventType !== "PAYMENT_STATUS_CHANGED") {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        status: 200,
        headers: { ...cors.headers, "Content-Type": "application/json" },
      });
    }

    if (data?.status === "DONE") {
      const customerKey = data?.customerKey;
      if (!customerKey) {
        return new Response(JSON.stringify({ ok: true, ignored: true }), {
          status: 200,
          headers: { ...cors.headers, "Content-Type": "application/json" },
        });
      }

      const periodStart = new Date();
      const periodEnd = addOneMonth(periodStart);
      const latestPaymentAt = new Date().toISOString();

      await supabase
        .from("subscriptions")
        .update({
          plan: "pro",
          status: "active",
          latest_payment_status: "success",
          latest_payment_code: null,
          latest_payment_message: null,
          latest_payment_at: latestPaymentAt,
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: latestPaymentAt,
        })
        .eq("toss_customer_key", customerKey);
    }

    if (data?.status === "CANCELED" || data?.status === "ABORTED") {
      const customerKey = data?.customerKey;
      if (customerKey) {
        const latestPaymentAt = new Date().toISOString();
        const latestPaymentStatus = data.status === "CANCELED"
          ? "cancelled_by_user"
          : "failed";

        await supabase
          .from("subscriptions")
          .update({
            status: "cancelled",
            cancelled_at: latestPaymentAt,
            latest_payment_status: latestPaymentStatus,
            latest_payment_code: data?.code ?? null,
            latest_payment_message: data?.message ?? null,
            latest_payment_at: latestPaymentAt,
            updated_at: latestPaymentAt,
          })
          .eq("toss_customer_key", customerKey);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...cors.headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { ...cors.headers, "Content-Type": "application/json" },
    });
  }
});
