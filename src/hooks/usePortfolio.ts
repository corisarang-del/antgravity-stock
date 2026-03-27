import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import { STOCKS } from "@/data/stockData";
import {
  createDashboardPortfolioHolding,
  deleteDashboardPortfolioHolding,
  fetchDashboardPortfolioHoldings,
  fetchDashboardPortfolioSummary,
  type DashboardPortfolioSummary,
} from "@/lib/apiClient";
import type { Holding } from "@/pages/Portfolio";

const STOCK_BY_SYMBOL = new Map(STOCKS.map((stock) => [stock.symbol, stock]));

export function usePortfolio() {
  const { user } = useAuth();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [summary, setSummary] = useState<DashboardPortfolioSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchHoldings = useCallback(async () => {
    if (!user) { setHoldings([]); setSummary(null); return; }
    setLoading(true);
    try {
      const [items, nextSummary] = await Promise.all([
        fetchDashboardPortfolioHoldings(),
        fetchDashboardPortfolioSummary(),
      ]);
      setHoldings(items);
      setSummary(nextSummary);
      setLoading(false);
      return;
    } catch {
      // dashboard API 전환 중이므로, 서버 미가동/권한 문제 시 기존 Supabase 직접 읽기로 폴백
    }

    const { data, error } = await supabase
      .from("portfolio_holdings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (!error && data) {
      const nextHoldings = data.map((row) => ({
        id: row.id,
        symbol: row.symbol,
        name: row.name,
        quantity: Number(row.quantity),
        avgPrice: Number(row.avg_price),
        currentPrice: Number(row.current_price),
        sector: row.sector,
      }));
      setHoldings(nextHoldings);
      const totalCostBasis = nextHoldings.reduce((sum, holding) => sum + holding.avgPrice * holding.quantity, 0);
      const totalMarketValue = nextHoldings.reduce((sum, holding) => sum + holding.currentPrice * holding.quantity, 0);
      const totalProfitLoss = totalMarketValue - totalCostBasis;
      const totalReturnRate = totalCostBasis > 0 ? (totalProfitLoss / totalCostBasis) * 100 : 0;
      setSummary({
        totalCostBasis,
        totalMarketValue,
        totalProfitLoss,
        totalReturnRate,
        calculatedAt: new Date().toISOString(),
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchHoldings(); }, [fetchHoldings]);

  const addHolding = async (input: { symbol: string; quantity: number; avgPrice: number }) => {
    if (!user) return;
    const stock = STOCK_BY_SYMBOL.get(input.symbol);
    if (!stock) return;
    try {
      const item = await createDashboardPortfolioHolding({
        symbol: input.symbol,
        name: stock.name,
        sector: stock.sector,
        quantity: input.quantity,
        avgPrice: input.avgPrice,
        currentPrice: stock.price,
      });
      setHoldings((prev) => {
        const nextHoldings = [...prev, item];
        const totalCostBasis = nextHoldings.reduce((sum, holding) => sum + holding.avgPrice * holding.quantity, 0);
        const totalMarketValue = nextHoldings.reduce((sum, holding) => sum + holding.currentPrice * holding.quantity, 0);
        const totalProfitLoss = totalMarketValue - totalCostBasis;
        const totalReturnRate = totalCostBasis > 0 ? (totalProfitLoss / totalCostBasis) * 100 : 0;
        setSummary({
          totalCostBasis,
          totalMarketValue,
          totalProfitLoss,
          totalReturnRate,
          calculatedAt: new Date().toISOString(),
        });
        return nextHoldings;
      });
      return;
    } catch {
      // write path 전환 중이므로 기존 Supabase 직접 쓰기를 폴백으로 유지
    }

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
      setHoldings((prev) => {
        const nextHoldings = [
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
        ];
        const totalCostBasis = nextHoldings.reduce((sum, holding) => sum + holding.avgPrice * holding.quantity, 0);
        const totalMarketValue = nextHoldings.reduce((sum, holding) => sum + holding.currentPrice * holding.quantity, 0);
        const totalProfitLoss = totalMarketValue - totalCostBasis;
        const totalReturnRate = totalCostBasis > 0 ? (totalProfitLoss / totalCostBasis) * 100 : 0;
        setSummary({
          totalCostBasis,
          totalMarketValue,
          totalProfitLoss,
          totalReturnRate,
          calculatedAt: new Date().toISOString(),
        });
        return nextHoldings;
      });
    }
  };

  const removeHolding = async (id: string) => {
    if (!user) return;
    try {
      await deleteDashboardPortfolioHolding(id);
      setHoldings((prev) => {
        const nextHoldings = prev.filter((holding) => holding.id !== id);
        const totalCostBasis = nextHoldings.reduce((sum, holding) => sum + holding.avgPrice * holding.quantity, 0);
        const totalMarketValue = nextHoldings.reduce((sum, holding) => sum + holding.currentPrice * holding.quantity, 0);
        const totalProfitLoss = totalMarketValue - totalCostBasis;
        const totalReturnRate = totalCostBasis > 0 ? (totalProfitLoss / totalCostBasis) * 100 : 0;
        setSummary({
          totalCostBasis,
          totalMarketValue,
          totalProfitLoss,
          totalReturnRate,
          calculatedAt: new Date().toISOString(),
        });
        return nextHoldings;
      });
      return;
    } catch {
      // write path 전환 중이므로 기존 Supabase 직접 쓰기를 폴백으로 유지
    }

    await supabase.from("portfolio_holdings").delete().eq("id", id).eq("user_id", user.id);
    setHoldings((prev) => {
      const nextHoldings = prev.filter((holding) => holding.id !== id);
      const totalCostBasis = nextHoldings.reduce((sum, holding) => sum + holding.avgPrice * holding.quantity, 0);
      const totalMarketValue = nextHoldings.reduce((sum, holding) => sum + holding.currentPrice * holding.quantity, 0);
      const totalProfitLoss = totalMarketValue - totalCostBasis;
      const totalReturnRate = totalCostBasis > 0 ? (totalProfitLoss / totalCostBasis) * 100 : 0;
      setSummary({
        totalCostBasis,
        totalMarketValue,
        totalProfitLoss,
        totalReturnRate,
        calculatedAt: new Date().toISOString(),
      });
      return nextHoldings;
    });
  };

  return { holdings, summary, loading, addHolding, removeHolding, refetch: fetchHoldings };
}
