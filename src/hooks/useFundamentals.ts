import { useQuery } from "@tanstack/react-query";
import { fetchFundamentals, type Fundamentals } from "@/lib/apiClient";

export function useFundamentals(symbol: string) {
  return useQuery<Fundamentals>({
    queryKey: ["fundamentals", symbol],
    queryFn: () => fetchFundamentals(symbol),
    staleTime: 8 * 60 * 60 * 1000, // 8시간 — 재무데이터는 하루 1~2회만 갱신
    enabled: Boolean(symbol),
  });
}
