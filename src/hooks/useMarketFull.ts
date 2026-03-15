import { useQuery } from "@tanstack/react-query";
import { fetchMarketFull, type MarketFullResponse } from "@/lib/apiClient";

interface UseMarketFullParams {
  market?: "KR" | "US" | "all";
  page?: number;
  limit?: number;
  sort?: "market_cap" | "change_pct" | "per" | "name";
  sector?: string;
}

export function useMarketFull(params: UseMarketFullParams = {}) {
  return useQuery<MarketFullResponse>({
    queryKey: ["marketFull", params],
    queryFn: () => fetchMarketFull(params),
    staleTime: 5 * 60 * 1000, // 5분
    placeholderData: (prev) => prev, // 페이지 전환 시 이전 데이터 유지
  });
}
