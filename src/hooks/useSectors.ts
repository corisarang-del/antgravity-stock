import { useQuery } from "@tanstack/react-query";
import { fetchSectors, type SectorsResponse } from "@/lib/apiClient";

export function useSectors() {
  return useQuery<SectorsResponse>({
    queryKey: ["sectors"],
    queryFn: fetchSectors,
    staleTime: 5 * 60 * 1000, // 5분
  });
}
