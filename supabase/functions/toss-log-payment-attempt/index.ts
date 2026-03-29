import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  buildCorsHeaders,
  ensureAllowedOrigin,
  enforceRateLimit,
  getClientIp,
  getErrorMessage,
} from "../_shared/security.ts";

type PaymentAttemptStatus = "success" | "cancelled_by_user" | "failed";

function isAllowedStatus(value: unknown): value is PaymentAttemptStatus {
  return value === "success" || value === "cancelled_by_user" || value === "failed";
}

serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors.headers });
  }

  const blocked = ensureAllowedOrigin(req);
  if (blocked) return blocked;

  try {
    enforceRateLimit(`${getClientIp(req)}:toss-log-payment-attempt`, 20, 60);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors.headers, "Content-Type": "application/json" },
      });
    }

    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
    if (!serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Service role key missing" }), {
        status: 500,
        headers: { ...cors.headers, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...cors.headers, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const status = body?.status;
    const flow = typeof body?.flow === "string" ? body.flow : "";

    if (!isAllowedStatus(status) || !flow) {
      return new Response(JSON.stringify({ error: "Invalid payment attempt payload" }), {
        status: 400,
        headers: { ...cors.headers, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const latestPaymentMessage =
      typeof body?.message === "string" && body.message.trim()
        ? body.message.trim()
        : null;
    const latestPaymentCode =
      typeof body?.code === "string" && body.code.trim()
        ? body.code.trim()
        : null;

    const { error: insertError } = await supabase
      .from("payment_attempts")
      .insert({
        user_id: user.id,
        provider: "toss",
        flow,
        status,
        order_id: typeof body?.orderId === "string" ? body.orderId : null,
        auth_key: typeof body?.authKey === "string" ? body.authKey : null,
        toss_customer_key: typeof body?.customerKey === "string" ? body.customerKey : null,
        toss_code: latestPaymentCode,
        toss_message: latestPaymentMessage,
        amount: typeof body?.amount === "number" ? body.amount : null,
        metadata: typeof body?.metadata === "object" && body.metadata !== null ? body.metadata : {},
      });

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...cors.headers, "Content-Type": "application/json" },
      });
    }

    const subscriptionPatch: Record<string, string | null> = {
      latest_payment_status: status,
      latest_payment_code: latestPaymentCode,
      latest_payment_message: latestPaymentMessage,
      latest_payment_at: now,
      updated_at: now,
    };

    if (status === "cancelled_by_user" && flow === "subscription_cancel") {
      subscriptionPatch.status = "cancelled";
      subscriptionPatch.cancelled_at = now;
    }

    const { error: updateError } = await supabase
      .from("subscriptions")
      .update(subscriptionPatch)
      .eq("user_id", user.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...cors.headers, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...cors.headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message === "RATE_LIMITED" ? 429 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...cors.headers, "Content-Type": "application/json" },
    });
  }
});
