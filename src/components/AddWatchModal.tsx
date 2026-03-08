import { useState } from "react";
import { motion } from "framer-motion";
import { X, Search } from "lucide-react";
import { STOCKS } from "@/data/stockData";
import { useWatchlist } from "@/hooks/useWatchlist";

interface Props { onClose: () => void; }

export function AddWatchModal({ onClose }: Props) {
  const { addToWatchlist, isWatched } = useWatchlist();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<string | null>(null);

  const filtered = STOCKS.filter(
    (s) => s.symbol.toLowerCase().includes(query.toLowerCase()) || s.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleAdd = async (symbol: string) => {
    setAdding(symbol);
    await addToWatchlist(symbol);
    setAdding(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="glass rounded-2xl p-5 w-full max-w-sm border border-border shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold">관심종목 추가</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="종목명 또는 코드 검색..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:border-primary transition-colors"
            autoFocus
          />
        </div>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {filtered.map((stock) => {
            const watched = isWatched(stock.symbol);
            const isGain = stock.changePct >= 0;
            return (
              <div key={stock.symbol} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {stock.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-xs font-mono font-semibold">{stock.symbol}</div>
                    <div className="text-xs text-muted-foreground">{stock.name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono ${isGain ? "text-gain" : "text-loss"}`}>
                    {isGain ? "+" : ""}{stock.changePct.toFixed(2)}%
                  </span>
                  <button
                    onClick={() => !watched && handleAdd(stock.symbol)}
                    disabled={watched || adding === stock.symbol}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${watched ? "bg-secondary text-muted-foreground cursor-default" : "bg-primary/10 text-primary hover:bg-primary/20"}`}
                  >
                    {watched ? "추가됨" : adding === stock.symbol ? "추가 중" : "추가"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
