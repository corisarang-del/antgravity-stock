import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import type { Tables } from "@/integrations/supabase/types";
import { TOSS_PLAN } from "@/config/toss";

export interface Subscription {
  id: string;
  plan: "free" | "pro";
  status: "free" | "active" | "cancelled" | "expired";
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
}

type SubscriptionRow = Tables<"subscriptions">;

function isFutureDate(value: string | null): boolean {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return false;
  return timestamp > Date.now();
}

export function useSubscription() {
  const { user, session } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error && data) {
      const row = data as SubscriptionRow;
      setSubscription({
        id: row.id,
        plan: row.plan as Subscription["plan"],
        status: row.status as Subscription["status"],
        currentPeriodEnd: row.current_period_end,
        cancelledAt: row.cancelled_at,
      });
    } else if (!data) {
      // 구독 row가 없으면 free로 설정
      setSubscription({ id: "", plan: "free", status: "free", currentPeriodEnd: null, cancelledAt: null });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const isPro =
    subscription?.plan === "pro" &&
    (
      subscription?.status === "active" ||
      (subscription?.status === "cancelled" && isFutureDate(subscription.currentPeriodEnd))
    );

  const confirmPayment = useCallback(async (authKey: string, customerKey: string) => {
    if (!session) return { success: false, error: "로그인이 필요합니다." };

    const { data, error } = await supabase.functions.invoke("toss-confirm-payment", {
      body: {
        authKey,
        customerKey,
        amount: TOSS_PLAN.price,
        orderId: `stockai_${user!.id}_${Date.now()}`,
        orderName: TOSS_PLAN.orderName,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!error && data?.success) {
      await fetchSubscription();
      return { success: true };
    }
    return { success: false, error: error?.message ?? data?.error ?? "결제 실패" };
  }, [fetchSubscription, session, user]);

  const cancelSubscription = useCallback(async () => {
    if (!session) return { success: false };
    const { data, error } = await supabase.functions.invoke("toss-cancel-subscription", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    if (!error && data?.success) {
      await fetchSubscription();
      return { success: true };
    }
    return { success: false };
  }, [fetchSubscription, session]);

  return { subscription, loading, isPro, fetchSubscription, confirmPayment, cancelSubscription };
}
