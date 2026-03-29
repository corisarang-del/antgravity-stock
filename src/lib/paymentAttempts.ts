import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { PaymentAttemptStatus } from "@/lib/tossPaymentStatus";

interface RecordPaymentAttemptInput {
  status: Exclude<PaymentAttemptStatus, "idle">;
  flow: string;
  code?: string | null;
  message?: string | null;
  orderId?: string | null;
  authKey?: string | null;
  customerKey?: string | null;
  amount?: number | null;
  metadata?: Json;
}

export async function recordPaymentAttempt(input: RecordPaymentAttemptInput) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    return;
  }

  const { error } = await supabase.functions.invoke("toss-log-payment-attempt", {
    body: input,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    throw error;
  }
}
