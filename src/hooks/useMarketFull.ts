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
  // Rule rerender-dependencies: queryKey에 object 대신 primitive 값 사용 (직렬화 일관성 보장)
  const { market, page, limit, sort, sector } = params;
  return useQuery<MarketFullResponse>({
    queryKey: ["marketFull", market, page, limit, sort, sector],
    queryFn: () => fetchMarketFull(params),
    staleTime: 30 * 60 * 1000, // 30분 — 일일 적재 데이터 기준
    placeholderData: (prev) => prev, // 페이지 전환 시 이전 데이터 유지
  });
}
