import { motion } from "framer-motion";
import { BarChart2, DollarSign, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { STOCK_FINANCIALS } from "@/data/stockData";

interface StockHeaderProps {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  sector: string;
}

export function StockHeader({ symbol, name, price, change, changePct, sector }: StockHeaderProps) {
  const isGain = changePct >= 0;
  const fin = STOCK_FINANCIALS[symbol];

  return (
    <motion.div
      key={symbol}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl font-bold gradient-text-primary">{symbol}</span>
            <span className="text-xs px-2 py-1 rounded bg-secondary text-muted-foreground border border-border">
              {sector}
            </span>
          </div>
          <div className="text-muted-foreground text-sm">{name}</div>
        </div>
        <div className="flex items-start gap-4">
          <div className="text-right">
            <motion.div
              key={price}
              initial={{ opacity: 0.5, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-3xl font-bold font-mono"
            >
              {price.toLocaleString()}
            </motion.div>
            <div className={`flex items-center justify-end gap-1.5 mt-1 ${isGain ? "gain-text" : "loss-text"}`}>
              {isGain ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="font-mono font-semibold">
                {isGain ? "+" : ""}{change.toLocaleString()}
              </span>
              <span className="font-mono text-sm">
                ({isGain ? "+" : ""}{changePct.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
        {[
          { icon: <DollarSign className="w-3.5 h-3.5" />, label: "시가총액", value: fin?.marketCap ?? "N/A" },
          { icon: <BarChart2 className="w-3.5 h-3.5" />, label: "거래량", value: "58.2M" },
          { icon: <Activity className="w-3.5 h-3.5" />, label: "52주 범위", value: `${(price * 0.72).toFixed(0)} - ${(price * 1.18).toFixed(0)}` },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              {stat.icon}
              <span className="text-xs">{stat.label}</span>
            </div>
            <div className="font-mono text-sm font-semibold">{stat.value}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
