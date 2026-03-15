import { useQuery } from "@tanstack/react-query";
import { fetchStockBundle, type StockBundle } from "@/lib/apiClient";

export function useStockBundle(symbol: string, period = "3mo") {
  return useQuery<StockBundle>({
    queryKey: ["stockBundle", symbol, period],
    queryFn: () => fetchStockBundle(symbol, period),
    staleTime: 5 * 60 * 1000,
    enabled: !!symbol,
  });
}
