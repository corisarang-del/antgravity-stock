"use client";

import type { InvestmentScore } from "@/lib/apiClient";

const MAX: Record<string, number> = {
  quality: 25,
  growth: 20,
  strength: 15,
  cash: 15,
  valuation: 25,
};

const LABELS: Record<string, string> = {
  quality: "수익성 (Quality)",
  growth: "성장성 (Growth)",
  strength: "재무건전성",
  cash: "현금흐름",
  valuation: "밸류에이션",
};

const GRADE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  S: { bg: "bg-primary/20 border-primary/40", text: "text-primary", label: "최우수" },
  A: { bg: "bg-gain/20 border-gain/40", text: "text-gain", label: "우수" },
  B: { bg: "bg-warning/20 border-warning/40", text: "text-warning", label: "양호" },
  C: { bg: "bg-secondary border-border", text: "text-muted-foreground", label: "보통" },
  D: { bg: "bg-loss/20 border-loss/40", text: "text-loss", label: "주의" },
};

interface Props {
  score: InvestmentScore;
}

export function InvestmentScoreCard({ score }: Props) {
  const config = GRADE_CONFIG[score.grade] || GRADE_CONFIG.C;
  const categories = ["quality", "growth", "strength", "cash", "valuation"] as const;

  return (
    <div className="glass rounded-2xl border border-border p-5 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base">Investment Score</h3>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${config.bg}`}>
          <span className={`text-2xl font-black font-mono ${config.text}`}>{score.total}</span>
          <div>
            <div className={`text-xs font-bold ${config.text}`}>{score.grade}</div>
            <div className="text-[10px] text-muted-foreground">{config.label}</div>
          </div>
        </div>
      </div>

      {/* 5카테고리 Progress bars */}
      <div className="space-y-3">
        {categories.map((cat) => {
          const value = score[cat];
          const max = MAX[cat];
          const pct = (value / max) * 100;

          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{LABELS[cat]}</span>
                <span className="text-xs font-mono font-semibold">
                  {value} / {max}
                </span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
