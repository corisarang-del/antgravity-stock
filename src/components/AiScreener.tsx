"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { useScreener } from "@/hooks/useScreener";

const STRATEGIES: { key: string; label: string; desc: string }[] = [
  { key: "warren_buffett", label: "워런 버핏", desc: "ROE ≥15%, 부채비율 ≤0.5" },
  { key: "peter_lynch", label: "피터 린치", desc: "PEG ≤1.5, 수익성장 ≥15%" },
  { key: "momentum", label: "모멘텀", desc: "수익성장 ≥25%, 매출성장 ≥20%" },
  { key: "value", label: "가치투자", desc: "PBR ≤2, PER ≤20" },
  { key: "quality", label: "품질주", desc: "ROE ≥20%, 영업마진 ≥15%" },
  { key: "growth", label: "성장주", desc: "매출·수익성장 ≥20%" },
  { key: "dividend", label: "배당주", desc: "배당수익률 ≥2%" },
  { key: "fcf", label: "FCF", desc: "FCF yield ≥3%" },
  { key: "low_debt", label: "저부채", desc: "부채비율 ≤0.3" },
  { key: "deep_value", label: "딥밸류", desc: "PBR ≤1, EV/EBITDA ≤8" },
  { key: "high_score", label: "AI 점수", desc: "AI Score ≥60" },
];

const GRADE_COLOR: Record<string, string> = {
  S: "text-primary bg-primary/10",
  A: "text-gain bg-gain/10",
  B: "text-warning bg-warning/10",
  C: "text-muted-foreground bg-secondary",
  D: "text-loss bg-loss/10",
};

export function AiScreener() {
  const [selected, setSelected] = useState<string[]>(["high_score"]);
  const [combination, setCombination] = useState<"AND" | "OR">("AND");
  const [market, setMarket] = useState<"all" | "KR" | "US">("all");
  const screener = useScreener();

  function toggleStrategy(key: string) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  }

  function handleScreen() {
    screener.mutate({ strategies: selected, combination, market });
  }

  return (
    <div className="glass rounded-2xl border border-border p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base">AI 스크리너</h3>
        <div className="flex items-center gap-2">
          {/* AND / OR 토글 */}
          <div className="flex rounded-lg overflow-hidden border border-border text-xs">
            {(["AND", "OR"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setCombination(mode)}
                className={`px-3 py-1.5 font-semibold transition-colors ${combination === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
              >
                {mode}
              </button>
            ))}
          </div>
          {/* 시장 필터 */}
          <div className="flex rounded-lg overflow-hidden border border-border text-xs">
            {(["all", "KR", "US"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMarket(m)}
                className={`px-3 py-1.5 font-semibold transition-colors ${market === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
              >
                {m === "all" ? "전체" : m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 전략 선택 */}
      <div className="flex flex-wrap gap-2">
        {STRATEGIES.map(({ key, label, desc }) => (
          <button
            key={key}
            onClick={() => toggleStrategy(key)}
            title={desc}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              selected.includes(key)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-muted-foreground border-border hover:bg-secondary/70"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 실행 버튼 */}
      <button
        onClick={handleScreen}
        disabled={screener.isPending || selected.length === 0}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition-opacity disabled:opacity-50"
      >
        {screener.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Search className="w-4 h-4" />
        )}
        스크리닝 실행
      </button>

      {/* 결과 테이블 */}
      {screener.data && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {screener.data.count}개 종목 발견
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 pr-3 text-muted-foreground font-semibold">종목</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-semibold">Score</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-semibold">ROE</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-semibold">PER</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-semibold">시가총액</th>
                </tr>
              </thead>
              <tbody>
                {screener.data.results.map((r) => (
                  <tr key={r.symbol} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                    <td className="py-2 pr-3">
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-muted-foreground">{r.symbol}</div>
                    </td>
                    <td className="text-right py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${GRADE_COLOR["A"]}`}>
                        {r.score}
                      </span>
                    </td>
                    <td className="text-right py-2 px-3 font-mono">
                      {r.roe !== null ? `${(r.roe * 100).toFixed(1)}%` : "—"}
                    </td>
                    <td className="text-right py-2 px-3 font-mono">
                      {r.pe !== null ? r.pe.toFixed(1) : "—"}
                    </td>
                    <td className="text-right py-2 px-3 font-mono">{r.market_cap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {screener.data.results.length === 0 && (
              <p className="text-center py-8 text-muted-foreground text-sm">
                조건에 맞는 종목이 없습니다.
              </p>
            )}
          </div>
        </div>
      )}

      {screener.isError && (
        <p className="text-xs text-loss">스크리닝 실패: {screener.error?.message}</p>
      )}
    </div>
  );
}
