import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { STOCKS } from "@/data/stockData";
import type { Holding } from "@/pages/Portfolio";

export function usePortfolio() {
  const { user } = useAuth();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHoldings = useCallback(async () => {
    if (!user) { setHoldings([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("portfolio_holdings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setHoldings(
        data.map((row) => ({
          id: row.id,
          symbol: row.symbol,
          name: row.name,
          quantity: Number(row.quantity),
          avgPrice: Number(row.avg_price),
          currentPrice: Number(row.current_price),
          sector: row.sector,
        }))
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchHoldings(); }, [fetchHoldings]);

  const addHolding = async (input: { symbol: string; quantity: number; avgPrice: number }) => {
    if (!user) return;
    const stock = STOCKS.find((s) => s.symbol === input.symbol);
    if (!stock) return;

    const { data, error } = await supabase
      .from("portfolio_holdings")
      .insert({
        user_id: user.id,
        symbol: input.symbol,
        name: stock.name,
        sector: stock.sector,
        quantity: input.quantity,
        avg_price: input.avgPrice,
        current_price: stock.price,
      })
      .select()
      .single();

    if (!error && data) {
      setHoldings((prev) => [
        ...prev,
        {
          id: data.id,
          symbol: data.symbol,
          name: data.name,
          quantity: Number(data.quantity),
          avgPrice: Number(data.avg_price),
          currentPrice: Number(data.current_price),
          sector: data.sector,
        },
      ]);
    }
  };

  const removeHolding = async (id: string) => {
    if (!user) return;
    await supabase.from("portfolio_holdings").delete().eq("id", id).eq("user_id", user.id);
    setHoldings((prev) => prev.filter((h) => h.id !== id));
  };

  return { holdings, loading, addHolding, removeHolding, refetch: fetchHoldings };
}
