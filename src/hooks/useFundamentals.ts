import { useQuery } from "@tanstack/react-query";
import { fetchFundamentals, type Fundamentals } from "@/lib/apiClient";

export function useFundamentals(symbol: string) {
  return useQuery<Fundamentals>({
    queryKey: ["fundamentals", symbol],
    queryFn: () => fetchFundamentals(symbol),
    staleTime: 30 * 60 * 1000, // 30분
    enabled: Boolean(symbol),
  });
}
