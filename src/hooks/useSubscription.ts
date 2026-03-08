import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Subscription {
  id: string;
  plan: "free" | "pro";
  status: "free" | "active" | "cancelled" | "expired";
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
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
      .from("subscriptions" as any)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error && data) {
      setSubscription({
        id: (data as any).id,
        plan: (data as any).plan,
        status: (data as any).status,
        currentPeriodEnd: (data as any).current_period_end,
        cancelledAt: (data as any).cancelled_at,
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

  const confirmPayment = async (authKey: string, customerKey: string) => {
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
  };

  const cancelSubscription = async () => {
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
  };

  return { subscription, loading, isPro, fetchSubscription, confirmPayment, cancelSubscription };
}
