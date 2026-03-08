import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, DollarSign, BarChart2, Percent } from "lucide-react";
import type { Holding } from "@/pages/Portfolio";

interface Props {
  holdings: Holding[];
}

export function PortfolioSummary({ holdings }: Props) {
  const totalCost = holdings.reduce((sum, h) => sum + h.avgPrice * h.quantity, 0);
  const totalValue = holdings.reduce((sum, h) => sum + h.currentPrice * h.quantity, 0);
  const totalPnl = totalValue - totalCost;
  const totalReturnPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const gainCount = holdings.filter((h) => h.currentPrice >= h.avgPrice).length;
  const lossCount = holdings.length - gainCount;

  const formatKRW = (v: number) => {
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
    return v.toLocaleString();
  };

  const cards = [
    {
      label: "총 평가금액",
      value: `$${formatKRW(totalValue)}`,
      icon: DollarSign,
      color: "text-primary",
      bg: "bg-primary/10 border-primary/20",
    },
    {
      label: "총 손익",
      value: `${totalPnl >= 0 ? "+" : ""}$${formatKRW(Math.abs(totalPnl))}`,
      icon: totalPnl >= 0 ? TrendingUp : TrendingDown,
      color: totalPnl >= 0 ? "text-gain" : "text-loss",
      bg: totalPnl >= 0 ? "bg-gain/10 border-gain/20" : "bg-loss/10 border-loss/20",
    },
    {
      label: "총 수익률",
      value: `${totalReturnPct >= 0 ? "+" : ""}${totalReturnPct.toFixed(2)}%`,
      icon: Percent,
      color: totalReturnPct >= 0 ? "text-gain" : "text-loss",
      bg: totalReturnPct >= 0 ? "bg-gain/10 border-gain/20" : "bg-loss/10 border-loss/20",
    },
    {
      label: "수익/손실 종목",
      value: `${gainCount}↑ / ${lossCount}↓`,
      icon: BarChart2,
      color: "text-foreground",
      bg: "bg-secondary/50 border-border",
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
          className={`glass rounded-xl p-4 border ${card.bg}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">{card.label}</span>
            <card.icon className={`w-4 h-4 ${card.color}`} />
          </div>
          <div className={`text-xl font-bold font-mono ${card.color}`}>{card.value}</div>
        </motion.div>
      ))}
    </div>
  );
}
