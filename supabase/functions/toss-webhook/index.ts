import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { eventType, data } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("[TOSS WEBHOOK]", eventType, JSON.stringify(data));

    // 정기결제 성공
    if (eventType === "PAYMENT_STATUS_CHANGED" && data?.status === "DONE") {
      const customerKey = data?.customerKey;
      if (!customerKey) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      // customerKey = user_id 로 구독 갱신
      const periodStart = new Date();
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await supabase
        .from("subscriptions")
        .update({
          plan: "pro",
          status: "active",
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("toss_customer_key", customerKey);
    }

    // 결제 실패 / 취소
    if (
      eventType === "PAYMENT_STATUS_CHANGED" &&
      (data?.status === "CANCELED" || data?.status === "ABORTED")
    ) {
      const customerKey = data?.customerKey;
      if (customerKey) {
        await supabase
          .from("subscriptions")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("toss_customer_key", customerKey);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[WEBHOOK ERROR]", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
