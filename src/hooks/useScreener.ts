import { useMutation } from "@tanstack/react-query";
import { fetchScreener, type ScreenerResponse } from "@/lib/apiClient";

interface ScreenerParams {
  strategies: string[];
  combination?: "AND" | "OR";
  market?: "all" | "KR" | "US";
}

export function useScreener() {
  return useMutation<ScreenerResponse, Error, ScreenerParams>({
    mutationFn: ({ strategies, combination = "AND", market = "all" }) =>
      fetchScreener(strategies, combination, market),
  });
}
