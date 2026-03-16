import { useQuery } from "@tanstack/react-query";
import { fetchMarketTicker, type MarketTickerItem } from "@/lib/apiClient";

export function useMarketTicker() {
  return useQuery<MarketTickerItem[]>({
    queryKey: ["marketTicker"],
    queryFn: fetchMarketTicker,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}
