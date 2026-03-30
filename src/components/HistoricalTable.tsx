"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchHistory } from "@/lib/apiClient";
import { Loader2 } from "lucide-react";

function isKrSymbol(symbol: string): boolean {
  return /^\d{6}(\.K[QS])?$/.test(symbol);
}

function fmtAmount(val: number | null, symbol: string): string {
  if (val === null) return "—";
  if (isKrSymbol(symbol)) {
    return `${(val / 1e12).toFixed(1)}조`;
  }
  return `${(val / 1e9).toFixed(1)}B`;
}

function fmtPct(val: number | null): string {
  if (val === null) return "—";
  return `${(val * 100).toFixed(1)}%`;
}

interface Props {
  symbol: string;
}

export function HistoricalTable({ symbol }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["history", symbol],
    queryFn: () => fetchHistory(symbol),
    staleTime: 24 * 60 * 60 * 1000,
    enabled: Boolean(symbol),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data || data.annual.length === 0) {
    const message =
      isError && data === undefined
        ? "현재 데이터 준비 중, 잠시 후 다시 시도해줘"
        : "재무 히스토리 없음";
    return <p className="text-sm text-muted-foreground text-center py-4">{message}</p>;
  }

  return (
    <div className="overflow-x-auto space-y-3">
      {data.cache_status === "stale" ? (
        <div className="text-xs px-3 py-2 rounded-lg border bg-warning/10 text-warning border-warning/20">
          전일 캐시 기준 데이터야. 최신 수집이 끝나면 자동으로 갱신돼.
        </div>
      ) : null}
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left py-2 pr-3 text-muted-foreground font-semibold">연도</th>
            <th className="text-right py-2 px-3 text-muted-foreground font-semibold">매출</th>
            <th className="text-right py-2 px-3 text-muted-foreground font-semibold">순이익</th>
            <th className="text-right py-2 px-3 text-muted-foreground font-semibold">영업이익</th>
            <th className="text-right py-2 px-3 text-muted-foreground font-semibold">매출이익률</th>
            <th className="text-right py-2 px-3 text-muted-foreground font-semibold">ROE</th>
          </tr>
        </thead>
        <tbody>
          {/* Rule 7.12 js-tosorted-immutable: toReversed()로 불변 역순, 최근 5년만 표시 */}
          {data.annual.toReversed().slice(0, 5).map((row) => (
            <tr key={row.year} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
              <td className="py-2 pr-3 font-semibold">{row.year}</td>
              <td className="text-right py-2 px-3 font-mono">{fmtAmount(row.revenue, symbol)}</td>
              <td className="text-right py-2 px-3 font-mono">{fmtAmount(row.net_income, symbol)}</td>
              <td className="text-right py-2 px-3 font-mono">{fmtAmount(row.operating_income, symbol)}</td>
              <td className="text-right py-2 px-3 font-mono">{fmtPct(row.gross_margin)}</td>
              <td className="text-right py-2 px-3 font-mono">{fmtPct(row.roe)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
