import { useQuery } from "@tanstack/react-query";
import { fetchSectors, type SectorsResponse } from "@/lib/apiClient";

export function useSectors() {
  return useQuery<SectorsResponse>({
    queryKey: ["sectors"],
    queryFn: fetchSectors,
    staleTime: 4 * 60 * 60 * 1000, // 4시간 — 섹터 구성은 하루 1~2회면 충분
  });
}
