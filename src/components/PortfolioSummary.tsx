import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, DollarSign, BarChart2, Percent } from "lucide-react";
import type { DashboardPortfolioSummary } from "@/lib/apiClient";
import type { Holding } from "@/pages/Portfolio";

interface Props {
  holdings: Holding[];
  summary?: DashboardPortfolioSummary | null;
}

export function PortfolioSummary({ holdings, summary }: Props) {
  const totalCost = summary?.totalCostBasis ?? holdings.reduce((sum, h) => sum + h.avgPrice * h.quantity, 0);
  const totalValue = summary?.totalMarketValue ?? holdings.reduce((sum, h) => sum + h.currentPrice * h.quantity, 0);
  const totalPnl = summary?.totalProfitLoss ?? (totalValue - totalCost);
  const totalReturnPct = summary?.totalReturnRate ?? (totalCost > 0 ? (totalPnl / totalCost) * 100 : 0);
  const gainCount = holdings.filter((h) => h.currentPrice >= h.avgPrice).length;
  const lossCount = holdings.length - gainCount;

  const formatVal = (v: number) => {
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
    return v.toLocaleString();
  };

  const cards = [
    {
      label: "총 평가금액",
      value: `$${formatVal(totalValue)}`,
      sub: `매입 $${formatVal(totalCost)}`,
      icon: DollarSign,
      color: "text-primary",
      iconBg: "bg-primary/10 border-primary/20",
      cardBorder: "border-primary/15",
    },
    {
      label: "총 손익",
      value: `${totalPnl >= 0 ? "+" : "-"}$${formatVal(Math.abs(totalPnl))}`,
      sub: totalPnl >= 0 ? "수익 발생 중" : "손실 발생 중",
      icon: totalPnl >= 0 ? TrendingUp : TrendingDown,
      color: totalPnl >= 0 ? "text-gain" : "text-loss",
      iconBg: totalPnl >= 0 ? "bg-gain/10 border-gain/20" : "bg-loss/10 border-loss/20",
      cardBorder: totalPnl >= 0 ? "border-gain/15" : "border-loss/15",
    },
    {
      label: "총 수익률",
      value: `${totalReturnPct >= 0 ? "+" : ""}${totalReturnPct.toFixed(2)}%`,
      sub: `${holdings.length}개 종목 보유`,
      icon: Percent,
      color: totalReturnPct >= 0 ? "text-gain" : "text-loss",
      iconBg: totalReturnPct >= 0 ? "bg-gain/10 border-gain/20" : "bg-loss/10 border-loss/20",
      cardBorder: totalReturnPct >= 0 ? "border-gain/15" : "border-loss/15",
    },
    {
      label: "수익/손실 종목",
      value: `${gainCount} / ${lossCount}`,
      sub: `수익 ${gainCount}종 · 손실 ${lossCount}종`,
      icon: BarChart2,
      color: "text-foreground",
      iconBg: "bg-secondary border-border",
      cardBorder: "border-border",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          className={`glass rounded-2xl p-4 border shadow-[var(--shadow-card)] ${card.cardBorder}`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-medium">{card.label}</span>
            <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${card.iconBg}`}>
              <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
            </div>
          </div>
          <div className={`text-xl font-bold font-mono ${card.color}`}>{card.value}</div>
          {card.sub && <div className="text-xs text-muted-foreground mt-1">{card.sub}</div>}
        </motion.div>
      ))}
    </div>
  );
}
