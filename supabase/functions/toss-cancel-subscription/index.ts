import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  buildCorsHeaders,
  enforceRateLimit,
  ensureAllowedOrigin,
  getClientIp,
  getErrorMessage,
} from "../_shared/security.ts";

const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors.headers });
  }

  const blocked = ensureAllowedOrigin(req);
  if (blocked) return blocked;

  try {
    enforceRateLimit(`${getClientIp(req)}:toss-cancel`, 10, 60);

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

    if (!SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Service role key missing" }), {
        status: 500,
        headers: { ...cors.headers, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...cors.headers, "Content-Type": "application/json" },
      });
    }

    const cancelledAt = new Date().toISOString();
    const latestMessage = "사용자가 구독 취소를 요청함";

    await supabase
      .from("subscriptions")
      .update({
        status: "cancelled",
        cancelled_at: cancelledAt,
        toss_billing_key: null,
        latest_payment_status: "cancelled_by_user",
        latest_payment_code: null,
        latest_payment_message: latestMessage,
        latest_payment_at: cancelledAt,
        updated_at: cancelledAt,
      })
      .eq("user_id", user.id);

    await supabase
      .from("payment_attempts")
      .insert({
        user_id: user.id,
        provider: "toss",
        flow: "subscription_cancel",
        status: "cancelled_by_user",
        toss_message: latestMessage,
        metadata: {
          source: "toss-cancel-subscription",
          billingKeyDeleted: true,
        },
      });

    return new Response(JSON.stringify({ success: true }), {
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
