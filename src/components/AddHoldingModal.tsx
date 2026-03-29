import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { X, Plus, Search } from "lucide-react";
import { STOCK_UNIVERSE, getStockMetadata } from "@/data/stockUniverse";
import { useStockBundle } from "@/hooks/useStockBundle";

interface Props {
  onClose: () => void;
  onAdd: (holding: { symbol: string; quantity: number; avgPrice: number }) => void;
}

export function AddHoldingModal({ onClose, onAdd }: Props) {
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredStocks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return STOCK_UNIVERSE.filter(
      (stock) =>
        stock.symbol.toLowerCase().includes(normalizedQuery) ||
        stock.name.toLowerCase().includes(normalizedQuery)
    ).slice(0, 6);
  }, [searchQuery]);

  const selectedStock = useMemo(() => getStockMetadata(symbol), [symbol]);
  const { data: selectedBundle } = useStockBundle(symbol, "3mo");
  const selectedCurrentPrice = useMemo(() => {
    const rows = selectedBundle?.detail?.data ?? [];
    const lastRow = rows[rows.length - 1];
    return lastRow?.close ?? null;
  }, [selectedBundle]);

  useEffect(() => {
    if (selectedCurrentPrice !== null && !avgPrice) {
      setAvgPrice(selectedCurrentPrice.toString());
    }
  }, [avgPrice, selectedCurrentPrice]);

  const handleSelect = (sym: string) => {
    const stock = getStockMetadata(sym);
    setSymbol(sym);
    setSearchQuery(stock?.name ?? sym);
    setShowDropdown(false);
    setAvgPrice("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !quantity || !avgPrice) return;
    onAdd({ symbol, quantity: parseFloat(quantity), avgPrice: parseFloat(avgPrice) });
  };

  const isValid = symbol && parseFloat(quantity) > 0 && parseFloat(avgPrice) > 0;

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
        className="glass rounded-2xl p-6 w-full max-w-md border border-border shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold">종목 추가</h2>
            <p className="text-xs text-muted-foreground mt-0.5">보유 종목과 매입 정보를 입력하세요</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Symbol Search */}
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1.5">종목 선택</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Search className="w-4 h-4 text-muted-foreground" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                  if (!e.target.value) setSymbol("");
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="종목명 또는 코드 검색..."
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:border-primary transition-colors"
              />

              {/* Dropdown */}
              {showDropdown && searchQuery && filteredStocks.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full mt-1 left-0 right-0 z-10 glass rounded-lg border border-border shadow-xl overflow-hidden"
                >
                  {filteredStocks.map((stock) => (
                    <button
                      key={stock.symbol}
                      type="button"
                      onClick={() => handleSelect(stock.symbol)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {stock.symbol.slice(0, 2)}
                        </div>
                      <div>
                        <div className="text-xs font-mono font-semibold">{stock.symbol}</div>
                        <div className="text-xs text-muted-foreground">{stock.name}</div>
                      </div>
                    </div>
                      <span className="text-[11px] text-muted-foreground">{stock.sector}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Selected stock preview */}
            {selectedStock && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs">
                <span className="font-mono font-semibold text-primary">{selectedStock.symbol}</span>
                <span className="text-muted-foreground">{selectedStock.name}</span>
                <span className="ml-auto font-mono text-foreground">
                  현재가: {selectedCurrentPrice?.toLocaleString() ?? "-"}
                </span>
              </div>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1.5">보유 수량</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="예: 10"
              min="0.001"
              step="any"
              className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:border-primary transition-colors font-mono"
            />
          </div>

          {/* Average Price */}
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1.5">평균 매입가</label>
            <input
              type="number"
              value={avgPrice}
              onChange={(e) => setAvgPrice(e.target.value)}
              placeholder="예: 150.00"
              min="0.001"
              step="any"
              className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:border-primary transition-colors font-mono"
            />
            {selectedStock && avgPrice && (
              <div className="mt-1 text-xs text-muted-foreground">
                현재가 대비:{" "}
                <span className={(selectedCurrentPrice ?? 0) >= parseFloat(avgPrice) ? "text-gain" : "text-loss"}>
                  {(selectedCurrentPrice ?? 0) >= parseFloat(avgPrice) ? "+" : ""}
                  {selectedCurrentPrice
                    ? (((selectedCurrentPrice - parseFloat(avgPrice)) / parseFloat(avgPrice)) * 100).toFixed(2)
                    : "-.--"}%
                </span>
              </div>
            )}
          </div>

          {/* Total cost preview */}
          {quantity && avgPrice && parseFloat(quantity) > 0 && parseFloat(avgPrice) > 0 && (
            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/50 border border-border text-xs font-mono">
              <span className="text-muted-foreground">총 매입금액</span>
              <span className="font-semibold">{(parseFloat(quantity) * parseFloat(avgPrice)).toLocaleString()}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!isValid}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" /> 포트폴리오에 추가
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
