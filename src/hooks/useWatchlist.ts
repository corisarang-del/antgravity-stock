import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import { getStockMetadata } from "@/data/stockUniverse";
import {
  createDashboardWatchlistItem,
  deleteDashboardWatchlistItem,
  fetchDashboardWatchlist,
} from "@/lib/apiClient";

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
    try {
      const items = await fetchDashboardWatchlist();
      setWatchlist(items);
      setLoading(false);
      return;
    } catch {
      // dashboard API 전환 중이므로, 서버 미가동/권한 문제 시 기존 Supabase 직접 읽기로 폴백
    }

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
    const stock = getStockMetadata(symbol);
    if (!stock) return false;
    try {
      const item = await createDashboardWatchlistItem({
        symbol,
        name: stock.name,
        sector: stock.sector,
      });
      setWatchlist((prev) => [item, ...prev]);
      return true;
    } catch {
      // write path 전환 중이므로 기존 Supabase 직접 쓰기를 폴백으로 유지
    }

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
    try {
      await deleteDashboardWatchlistItem(id);
      setWatchlist((prev) => prev.filter((w) => w.id !== id));
      return;
    } catch {
      // write path 전환 중이므로 기존 Supabase 직접 쓰기를 폴백으로 유지
    }

    await supabase.from("watchlist").delete().eq("id", id).eq("user_id", user.id);
    setWatchlist((prev) => prev.filter((w) => w.id !== id));
  };

  const isWatched = (symbol: string) => watchlist.some((w) => w.symbol === symbol);

  return { watchlist, loading, addToWatchlist, removeFromWatchlist, isWatched, refetch: fetch };
}
