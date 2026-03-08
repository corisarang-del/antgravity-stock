import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!user) { setAlerts([]); return; }
    setLoading(true);
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
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const addAlert = async (input: { symbol: string; name: string; alertType: "above" | "below"; targetPrice: number }) => {
    if (!user) return;
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
    await supabase.from("price_alerts").update({ is_active: !isActive }).eq("id", id).eq("user_id", user!.id);
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, isActive: !isActive } : a));
  };

  const deleteAlert = async (id: string) => {
    await supabase.from("price_alerts").delete().eq("id", id).eq("user_id", user!.id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return { alerts, loading, addAlert, toggleAlert, deleteAlert };
}
