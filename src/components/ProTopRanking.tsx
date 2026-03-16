"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Star } from "lucide-react";
import type { Fundamentals } from "@/lib/apiClient";

// Rule 6.3 rendering-hoist-jsx: 포맷터는 컴포넌트 외부로 호이스팅 (매 렌더마다 재생성 방지)
const pctFmt = (v: number) => `${(v * 100).toFixed(1)}%`;
const scoreFmt = (v: number) => String(v);

interface RankItem {
  symbol: string;
  name: string;
  value: number;
  formatted: string;
}

interface Props {
  fundamentalsMap: Record<string, Fundamentals>;
  names: Record<string, string>;
}

function topN(
  map: Record<string, Fundamentals>,
  names: Record<string, string>,
  key: keyof Fundamentals,
  n = 5,
  desc = true
): RankItem[] {
  return Object.entries(map)
    .filter(([, f]) => f[key] !== null && f[key] !== undefined)
    .map(([symbol, f]) => ({
      symbol,
      name: names[symbol] || symbol,
      value: f[key] as number,
      formatted: "",
    }))
    .toSorted((a, b) => (desc ? b.value - a.value : a.value - b.value))
    .slice(0, n);
}

function RankRow({ rank, item, formatFn }: { rank: number; item: RankItem; formatFn: (v: number) => string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-5 text-xs font-bold text-muted-foreground">{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{item.name}</p>
        <p className="text-xs text-muted-foreground">{item.symbol}</p>
      </div>
      <span className="text-sm font-mono font-semibold text-primary">{formatFn(item.value)}</span>
    </div>
  );
}

export function ProTopRanking({ fundamentalsMap, names }: Props) {
  // Rule 5.2 rerender-memo: fundamentalsMap/names 변경 시에만 재계산
  const gainers = useMemo(
    () => topN(fundamentalsMap, names, "earnings_growth", 5, true),
    [fundamentalsMap, names]
  );
  const losers = useMemo(
    () => topN(fundamentalsMap, names, "earnings_growth", 5, false),
    [fundamentalsMap, names]
  );
  const topScores = useMemo(
    () =>
      Object.entries(fundamentalsMap)
        .map(([symbol, f]) => ({
          symbol,
          name: names[symbol] || symbol,
          value: f.score.total,
          formatted: "",
        }))
        .toSorted((a, b) => b.value - a.value)
        .slice(0, 5),
    [fundamentalsMap, names]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 수익성장 상위 */}
      <div className="glass rounded-2xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-gain" />
          <h3 className="text-sm font-semibold">수익성장 Top 5</h3>
        </div>
        <div className="divide-y divide-border/50">
          {gainers.map((item, i) => (
            <RankRow key={item.symbol} rank={i + 1} item={item} formatFn={pctFmt} />
          ))}
          {gainers.length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center">데이터 없음</p>
          )}
        </div>
      </div>

      {/* 수익성장 하위 (주의) */}
      <div className="glass rounded-2xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="w-4 h-4 text-loss" />
          <h3 className="text-sm font-semibold">수익성장 하위 5</h3>
        </div>
        <div className="divide-y divide-border/50">
          {losers.map((item, i) => (
            <RankRow key={item.symbol} rank={i + 1} item={item} formatFn={pctFmt} />
          ))}
          {losers.length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center">데이터 없음</p>
          )}
        </div>
      </div>

      {/* AI 점수 상위 */}
      <div className="glass rounded-2xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">AI Score Top 5</h3>
        </div>
        <div className="divide-y divide-border/50">
          {topScores.map((item, i) => (
            <RankRow key={item.symbol} rank={i + 1} item={item} formatFn={scoreFmt} />
          ))}
          {topScores.length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center">데이터 없음</p>
          )}
        </div>
      </div>
    </div>
  );
}
