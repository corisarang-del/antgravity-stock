"use client";

import type { Fundamentals } from "@/lib/apiClient";

function isKrSymbol(symbol: string): boolean {
  return /^\d{6}(\.K[QS])?$/.test(symbol);
}

function fmt(val: number | null, type: "pct" | "ratio" | "x" | "mktcap"): string {
  if (val === null || val === undefined) return "—";
  if (type === "pct") return `${(val * 100).toFixed(1)}%`;
  if (type === "x") return `${val.toFixed(2)}x`;
  if (type === "ratio") return val.toFixed(2);
  if (type === "mktcap") {
    if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
    if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
    return `$${(val / 1e6).toFixed(0)}M`;
  }
  return String(val);
}

function fmtMarketCap(val: number | null, symbol: string): string {
  if (val === null || val === undefined) return "—";
  if (isKrSymbol(symbol)) {
    if (val >= 1e12) return `${(val / 1e12).toFixed(1)}조원`;
    if (val >= 1e8) return `${(val / 1e8).toFixed(0)}억원`;
    return `${Math.round(val).toLocaleString()}원`;
  }
  return fmt(val, "mktcap");
}

function fmtPrice(val: number | null, symbol: string): string {
  if (val === null || val === undefined) return "—";
  return isKrSymbol(symbol) ? `₩${val.toLocaleString()}` : `$${val.toFixed(2)}`;
}

interface MetricCardProps {
  label: string;
  value: string;
  positive?: boolean;
}

function MetricCard({ label, value, positive }: MetricCardProps) {
  const colorClass =
    positive === true
      ? "text-gain"
      : positive === false
      ? "text-loss"
      : "text-foreground";

  return (
    <div className="glass rounded-xl border border-border p-3">
      <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
      <p className={`text-base font-bold font-mono ${colorClass}`}>{value}</p>
    </div>
  );
}

interface Props {
  data: Fundamentals;
}

export function FundamentalsGrid({ data }: Props) {
  return (
    <div className="space-y-4">
      {/* 수익성 */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">수익성</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MetricCard label="ROE" value={fmt(data.roe, "pct")} positive={data.roe !== null ? data.roe >= 0.15 : undefined} />
          <MetricCard label="영업이익률" value={fmt(data.operating_margin, "pct")} positive={data.operating_margin !== null ? data.operating_margin >= 0.15 : undefined} />
          <MetricCard label="순이익률" value={fmt(data.net_margin, "pct")} positive={data.net_margin !== null ? data.net_margin >= 0.10 : undefined} />
          <MetricCard label="매출총이익률" value={fmt(data.gross_margin, "pct")} />
        </div>
      </div>

      {/* 성장성 */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">성장성</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MetricCard label="수익성장률" value={fmt(data.earnings_growth, "pct")} positive={data.earnings_growth !== null ? data.earnings_growth >= 0.15 : undefined} />
          <MetricCard label="매출성장률" value={fmt(data.revenue_growth, "pct")} positive={data.revenue_growth !== null ? data.revenue_growth >= 0.10 : undefined} />
        </div>
      </div>

      {/* 밸류에이션 */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">밸류에이션</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MetricCard label="PER (Trailing)" value={fmt(data.trailing_pe, "ratio")} />
          <MetricCard label="PBR" value={fmt(data.price_to_book, "ratio")} />
          <MetricCard label="PEG" value={fmt(data.peg_ratio, "ratio")} positive={data.peg_ratio !== null ? data.peg_ratio <= 1.5 : undefined} />
          <MetricCard label="EV/EBITDA" value={fmt(data.ev_to_ebitda, "x")} />
        </div>
      </div>

      {/* 재무건전성 */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">재무건전성</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MetricCard label="부채비율" value={fmt(data.debt_to_equity, "ratio")} positive={data.debt_to_equity !== null ? data.debt_to_equity <= 0.5 : undefined} />
          <MetricCard label="유동비율" value={fmt(data.current_ratio, "ratio")} positive={data.current_ratio !== null ? data.current_ratio >= 1.5 : undefined} />
          <MetricCard label="배당수익률" value={fmt(data.dividend_yield, "pct")} />
          <MetricCard label="시가총액" value={fmtMarketCap(data.market_cap, data.symbol)} />
        </div>
      </div>

      {/* 52주 범위 */}
      {data.fifty_two_week_high && data.fifty_two_week_low && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">52주 범위</h4>
          <div className="glass rounded-xl border border-border p-3 flex items-center gap-3">
            <span className="text-xs text-loss font-mono">{fmtPrice(data.fifty_two_week_low, data.symbol)}</span>
            <div className="flex-1 h-2 rounded-full bg-secondary" />
            <span className="text-xs text-gain font-mono">{fmtPrice(data.fifty_two_week_high, data.symbol)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
