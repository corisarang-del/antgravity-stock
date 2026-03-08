import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { STOCKS } from "@/data/stockData";

export interface WatchItem {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  addedAt: string;
}

export function useWatchlist() {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!user) { setWatchlist([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("watchlist")
      .select("*")
      .eq("user_id", user.id)
      .order("added_at", { ascending: false });

    if (!error && data) {
      setWatchlist(data.map((r) => ({ id: r.id, symbol: r.symbol, name: r.name, sector: r.sector, addedAt: r.added_at })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const addToWatchlist = async (symbol: string) => {
    if (!user) return false;
    const stock = STOCKS.find((s) => s.symbol === symbol);
    if (!stock) return false;
    const { data, error } = await supabase
      .from("watchlist")
      .insert({ user_id: user.id, symbol, name: stock.name, sector: stock.sector })
      .select()
      .single();
    if (!error && data) {
      setWatchlist((prev) => [{ id: data.id, symbol: data.symbol, name: data.name, sector: data.sector, addedAt: data.added_at }, ...prev]);
      return true;
    }
    return false;
  };

  const removeFromWatchlist = async (id: string) => {
    if (!user) return;
    await supabase.from("watchlist").delete().eq("id", id).eq("user_id", user.id);
    setWatchlist((prev) => prev.filter((w) => w.id !== id));
  };

  const isWatched = (symbol: string) => watchlist.some((w) => w.symbol === symbol);

  return { watchlist, loading, addToWatchlist, removeFromWatchlist, isWatched, refetch: fetch };
}
