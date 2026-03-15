import { useMemo } from "react";
import type { Fundamentals } from "@/lib/apiClient";

// Rule 6.3: 포맷터 모듈 레벨 호이스팅
const pctFmt = (v: number | null) => (v !== null ? `${(v * 100).toFixed(1)}%` : "—");
const numFmt = (v: number | null) => (v !== null ? v.toFixed(1) : "—");

const GRADE_COLOR: Record<string, string> = {
  S: "text-primary bg-primary/10",
  A: "text-gain bg-gain/10",
  B: "text-warning bg-warning/10",
  C: "text-muted-foreground bg-secondary",
  D: "text-loss bg-loss/10",
};

interface Props {
  fundamentalsMap: Record<string, Fundamentals>;
  names: Record<string, string>;
  onSelect: (symbol: string) => void;
}

export function ProAllTickers({ fundamentalsMap, names, onSelect }: Props) {
  // Rule 5.2 rerender-memo: fundamentalsMap 변경 시에만 재정렬
  const rows = useMemo(
    () =>
      Object.entries(fundamentalsMap)
        .map(([symbol, f]) => ({ symbol, f }))
        .toSorted((a, b) => b.f.score.total - a.f.score.total),
    [fundamentalsMap]
  );

  if (rows.length === 0) return null;

  return (
    <div className="glass rounded-2xl border border-border p-5">
      <h3 className="font-bold text-base mb-4">전체 종목 현황</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-2 pr-3 text-muted-foreground font-semibold">종목</th>
              <th className="text-center py-2 px-2 text-muted-foreground font-semibold">시장</th>
              <th className="text-center py-2 px-2 text-muted-foreground font-semibold">등급</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-semibold">Score</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-semibold">ROE</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-semibold">PER</th>
              <th className="text-right py-2 pl-2 text-muted-foreground font-semibold">섹터</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ symbol, f }) => (
              <tr
                key={symbol}
                onClick={() => onSelect(symbol)}
                className="border-b border-border/30 hover:bg-secondary/40 transition-colors cursor-pointer"
              >
                <td className="py-2.5 pr-3">
                  <div className="font-semibold">{names[symbol] ?? symbol}</div>
                  <div className="text-muted-foreground font-mono">{symbol}</div>
                </td>
                <td className="text-center py-2.5 px-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    f.symbol?.endsWith(".KS") ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400"
                  }`}>
                    {f.symbol?.endsWith(".KS") ? "KR" : "US"}
                  </span>
                </td>
                <td className="text-center py-2.5 px-2">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${GRADE_COLOR[f.score.grade] ?? ""}`}>
                    {f.score.grade}
                  </span>
                </td>
                <td className="text-right py-2.5 px-2 font-mono font-semibold">{f.score.total}</td>
                <td className="text-right py-2.5 px-2 font-mono">{pctFmt(f.roe)}</td>
                <td className="text-right py-2.5 px-2 font-mono">{numFmt(f.trailing_pe)}</td>
                <td className="text-right py-2.5 pl-2 text-muted-foreground truncate max-w-[100px]">
                  {f.sector ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground mt-3">
        종목 클릭 시 재무 탭에서 상세 분석 확인 · AI Score 내림차순 정렬
      </p>
    </div>
  );
}
