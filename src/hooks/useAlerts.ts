import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import {
  createDashboardAlert,
  type DashboardTriggeredAlertItem,
  deleteDashboardAlert,
  fetchDashboardAlerts,
  updateDashboardAlert,
} from "@/lib/apiClient";

export interface PriceAlert {
  id: string;
  symbol: string;
  name: string;
  alertType: "above" | "below";
  targetPrice: number;
  isActive: boolean;
  createdAt: string;
}

export function useAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [triggered, setTriggered] = useState<DashboardTriggeredAlertItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!user) { setAlerts([]); return; }
    setLoading(true);
    try {
      const response = await fetchDashboardAlerts();
      setAlerts(response.items);
      setTriggered(response.triggered);
      setLoading(false);
      return;
    } catch {
      // dashboard API 전환 중이므로, 서버 미가동/권한 문제 시 기존 Supabase 직접 읽기로 폴백
    }

    const { data, error } = await supabase
      .from("price_alerts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAlerts(data.map((r) => ({
        id: r.id,
        symbol: r.symbol,
        name: r.name,
        alertType: r.alert_type as "above" | "below",
        targetPrice: Number(r.target_price),
        isActive: r.is_active,
        createdAt: r.created_at,
      })));
    }
    setTriggered([]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const addAlert = async (input: { symbol: string; name: string; alertType: "above" | "below"; targetPrice: number }) => {
    if (!user) return;
    try {
      const item = await createDashboardAlert(input);
      setAlerts((prev) => [item, ...prev]);
      return;
    } catch {
      // write path 전환 중이므로 기존 Supabase 직접 쓰기를 폴백으로 유지
    }

    const { data, error } = await supabase
      .from("price_alerts")
      .insert({ user_id: user.id, symbol: input.symbol, name: input.name, alert_type: input.alertType, target_price: input.targetPrice })
      .select()
      .single();
    if (!error && data) {
      setAlerts((prev) => [{
        id: data.id, symbol: data.symbol, name: data.name,
        alertType: data.alert_type as "above" | "below",
        targetPrice: Number(data.target_price),
        isActive: data.is_active,
        createdAt: data.created_at,
      }, ...prev]);
    }
  };

  const toggleAlert = async (id: string, isActive: boolean) => {
    try {
      const updated = await updateDashboardAlert({ id, isActive: !isActive });
      setAlerts((prev) => prev.map((alert) => (alert.id === id ? updated : alert)));
      return;
    } catch {
      // write path 전환 중이므로 기존 Supabase 직접 쓰기를 폴백으로 유지
    }

    await supabase.from("price_alerts").update({ is_active: !isActive }).eq("id", id).eq("user_id", user!.id);
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, isActive: !isActive } : a));
  };

  const deleteAlert = async (id: string) => {
    try {
      await deleteDashboardAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      return;
    } catch {
      // write path 전환 중이므로 기존 Supabase 직접 쓰기를 폴백으로 유지
    }

    await supabase.from("price_alerts").delete().eq("id", id).eq("user_id", user!.id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return { alerts, triggered, loading, addAlert, toggleAlert, deleteAlert };
}
