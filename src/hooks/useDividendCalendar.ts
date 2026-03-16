import { useQuery } from "@tanstack/react-query";
import { fetchDividendCalendar, type DividendCalendarData } from "@/lib/apiClient";

export function useDividendCalendar(year: number, month: number) {
  return useQuery<DividendCalendarData>({
    queryKey: ["dividendCalendar", year, month],
    queryFn: () => fetchDividendCalendar(year, month),
    staleTime: 24 * 60 * 60 * 1000, // 24시간
  });
}
