import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { X, Search, Bell } from "lucide-react";
import { STOCKS } from "@/data/stockData";
import { useAlerts } from "@/hooks/useAlerts";

interface Props { onClose: () => void; }

const STOCK_BY_SYMBOL = new Map(STOCKS.map((stock) => [stock.symbol, stock]));

export function AddAlertModal({ onClose }: Props) {
  const { addAlert } = useAlerts();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<typeof STOCKS[0] | null>(null);
  const [alertType, setAlertType] = useState<"above" | "below">("above");
  const [targetPrice, setTargetPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return STOCKS.filter(
      (stock) =>
        stock.symbol.toLowerCase().includes(normalizedQuery) ||
        stock.name.toLowerCase().includes(normalizedQuery)
    ).slice(0, 6);
  }, [query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !targetPrice) return;
    setLoading(true);
    await addAlert({ symbol: selected.symbol, name: selected.name, alertType, targetPrice: parseFloat(targetPrice) });
    setLoading(false);
    onClose();
  };

  const isValid = selected && parseFloat(targetPrice) > 0;

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
          <h2 className="text-base font-bold flex items-center gap-2"><Bell className="w-4 h-4 text-gain" /> 알림 추가</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Symbol search */}
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1.5">종목 선택</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); setSelected(null); }}
                onFocus={() => setShowDropdown(true)}
                placeholder="종목 검색..."
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:border-primary transition-colors"
              />
              {showDropdown && query && filtered.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 z-10 glass rounded-lg border border-border shadow-xl overflow-hidden">
                  {filtered.map((stock) => (
                    <button key={stock.symbol} type="button" onClick={() => { setSelected(STOCK_BY_SYMBOL.get(stock.symbol) ?? stock); setQuery(stock.symbol); setTargetPrice(stock.price.toString()); setShowDropdown(false); }}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary/50 transition-colors text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold">{stock.symbol}</span>
                        <span className="text-xs text-muted-foreground">{stock.name}</span>
                      </div>
                      <span className="text-xs font-mono">{stock.price.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selected && (
              <div className="mt-2 text-xs px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 flex justify-between">
                <span className="font-mono font-semibold text-primary">{selected.symbol}</span>
                <span className="text-muted-foreground">현재가: <span className="font-mono text-foreground">{selected.price.toLocaleString()}</span></span>
              </div>
            )}
          </div>

          {/* Alert type */}
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1.5">알림 조건</label>
            <div className="flex gap-2">
              {(["above", "below"] as const).map((type) => (
                <button key={type} type="button" onClick={() => setAlertType(type)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${alertType === type
                    ? type === "above" ? "bg-gain/10 border-gain/30 text-gain" : "bg-loss/10 border-loss/30 text-loss"
                    : "border-border text-muted-foreground hover:bg-secondary"}`}>
                  {type === "above" ? "▲ 이상 도달 시" : "▼ 이하 도달 시"}
                </button>
              ))}
            </div>
          </div>

          {/* Target price */}
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1.5">목표가</label>
            <input
              type="number"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="목표 가격 입력..."
              min="0.001"
              step="any"
              className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:border-primary transition-colors font-mono"
            />
          </div>

          <button type="submit" disabled={!isValid || loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            <Bell className="w-4 h-4" /> 알림 설정
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
