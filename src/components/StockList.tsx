import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Search, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { STOCKS } from "@/data/stockData";

interface StockListProps {
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
}

export function StockList({ selectedSymbol, onSelect, search, onSearchChange }: StockListProps) {
  const filtered = STOCKS.filter(
    (s) =>
      s.symbol.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase())
  );

  const getSignalColor = (signal: string) => {
    if (signal.includes("STRONG BUY")) return "text-gain bg-gain/10 border-gain/30";
    if (signal === "BUY") return "text-primary bg-primary/10 border-primary/30";
    if (signal === "SELL" || signal.includes("STRONG SELL")) return "text-loss bg-loss/10 border-loss/30";
    return "text-warning bg-warning/10 border-warning/30";
  };

  return (
    <div className="glass rounded-xl flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">종목 목록</div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full bg-secondary border border-border rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-primary transition-colors"
            placeholder="종목 검색..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {filtered.map((stock, i) => (
          <motion.button
            key={stock.symbol}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => onSelect(stock.symbol)}
            className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-secondary/60 transition-all ${
              selectedSymbol === stock.symbol ? "bg-primary/10 border-l-2 border-l-primary" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-sm">{stock.symbol}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded border font-mono font-semibold ${getSignalColor(stock.signal)}`}>
                {stock.signal}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground truncate max-w-[100px]">{stock.name}</span>
              <div className="flex items-center gap-1">
                {stock.changePct >= 0 ? (
                  <TrendingUp className="w-3 h-3 gain-text" />
                ) : (
                  <TrendingDown className="w-3 h-3 loss-text" />
                )}
                <span className={`text-xs font-mono font-semibold ${stock.changePct >= 0 ? "gain-text" : "loss-text"}`}>
                  {stock.changePct >= 0 ? "+" : ""}{stock.changePct.toFixed(2)}%
                </span>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
