"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchHistory } from "@/lib/apiClient";
import { Loader2 } from "lucide-react";

function fmtB(val: number | null): string {
  if (val === null) return "—";
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
    return <p className="text-sm text-muted-foreground text-center py-4">재무 히스토리 없음</p>;
  }

  return (
    <div className="overflow-x-auto">
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
          {[...data.annual].reverse().map((row) => (
            <tr key={row.year} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
              <td className="py-2 pr-3 font-semibold">{row.year}</td>
              <td className="text-right py-2 px-3 font-mono">{fmtB(row.revenue)}</td>
              <td className="text-right py-2 px-3 font-mono">{fmtB(row.net_income)}</td>
              <td className="text-right py-2 px-3 font-mono">{fmtB(row.operating_income)}</td>
              <td className="text-right py-2 px-3 font-mono">{fmtPct(row.gross_margin)}</td>
              <td className="text-right py-2 px-3 font-mono">{fmtPct(row.roe)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
