import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { INDICES } from "@/data/stockData";

export function MarketTicker() {
  const doubled = [...INDICES, ...INDICES];

  return (
    <div className="border-b border-border bg-secondary/40 overflow-hidden py-2">
      <div className="flex animate-ticker whitespace-nowrap gap-8">
        {doubled.map((idx, i) => (
          <span key={`${idx.name}-${i}`} className="inline-flex items-center gap-2 px-4 text-sm font-mono shrink-0">
            <span className="text-muted-foreground">{idx.name}</span>
            <span className="font-semibold">{idx.value}</span>
            <span className={`flex items-center gap-0.5 ${idx.up ? "gain-text" : "loss-text"}`}>
              {idx.up ? <TrendingUp className="w-3 h-3" aria-hidden="true" /> : <TrendingDown className="w-3 h-3" aria-hidden="true" />}
              {idx.change}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function MarketOverview() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {INDICES.map((idx, i) => (
        <motion.div
          key={idx.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          className="glass rounded-lg p-3"
        >
          <div className="text-xs text-muted-foreground mb-1">{idx.name}</div>
          <div className="font-mono font-semibold text-sm">{idx.value}</div>
          <div className={`text-xs font-mono flex items-center gap-1 mt-1 ${idx.up ? "gain-text" : "loss-text"}`}>
            {idx.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {idx.change}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
