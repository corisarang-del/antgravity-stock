import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import type { Tables } from "@/integrations/supabase/types";

export interface Subscription {
  id: string;
  plan: "free" | "pro";
  status: "free" | "active" | "cancelled" | "expired";
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
}

type SubscriptionRow = Tables<"subscriptions">;

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

  // isPro: active 상태이고 plan이 pro인 경우
  const isPro =
    subscription?.plan === "pro" &&
    (subscription?.status === "active" || subscription?.status === "cancelled");

  const confirmPayment = useCallback(async (authKey: string, customerKey: string) => {
    if (!session) return { success: false, error: "로그인이 필요합니다." };

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/toss-confirm-payment`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          authKey,
          customerKey,
          amount: 4900,
          orderId: `stockai_${user!.id}_${Date.now()}`,
          orderName: "StockAI Pro 월정액",
        }),
      }
    );

    const data = await res.json();
    if (res.ok && data.success) {
      await fetchSubscription();
      return { success: true };
    }
    return { success: false, error: data.error ?? "결제 실패" };
  }, [fetchSubscription, session, user]);

  const cancelSubscription = useCallback(async () => {
    if (!session) return { success: false };
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/toss-cancel-subscription`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );
    const data = await res.json();
    if (res.ok && data.success) {
      await fetchSubscription();
      return { success: true };
    }
    return { success: false };
  }, [fetchSubscription, session]);

  return { subscription, loading, isPro, fetchSubscription, confirmPayment, cancelSubscription };
}
