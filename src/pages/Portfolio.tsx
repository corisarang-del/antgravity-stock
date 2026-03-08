import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Plus, Trash2, TrendingUp, TrendingDown, BarChart2, Wallet, X } from "lucide-react";
import { Link } from "react-router-dom";
import { STOCKS } from "@/data/stockData";
import { PortfolioChart } from "@/components/PortfolioChart";
import { PortfolioTable } from "@/components/PortfolioTable";
import { PortfolioSummary } from "@/components/PortfolioSummary";
import { AddHoldingModal } from "@/components/AddHoldingModal";

export interface Holding {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  sector: string;
}

function getDefaultHoldings(): Holding[] {
  return [
    { id: "1", symbol: "NVDA", name: "NVIDIA Corp.", quantity: 10, avgPrice: 620, currentPrice: 875.35, sector: "Tech" },
    { id: "2", symbol: "AAPL", name: "Apple Inc.", quantity: 25, avgPrice: 165, currentPrice: 189.84, sector: "Tech" },
    { id: "3", symbol: "TSLA", name: "Tesla Inc.", quantity: 15, avgPrice: 280, currentPrice: 248.50, sector: "EV" },
    { id: "4", symbol: "MSFT", name: "Microsoft Corp.", quantity: 8, avgPrice: 370, currentPrice: 415.26, sector: "Tech" },
    { id: "5", symbol: "005930", name: "삼성전자", quantity: 50, avgPrice: 70000, currentPrice: 74800, sector: "반도체" },
  ];
}

const Portfolio = () => {
  const [holdings, setHoldings] = useState<Holding[]>(getDefaultHoldings);
  const [showAddModal, setShowAddModal] = useState(false);

  const addHolding = (holding: Omit<Holding, "id" | "currentPrice" | "name" | "sector">) => {
    const stock = STOCKS.find((s) => s.symbol === holding.symbol);
    if (!stock) return;
    const newHolding: Holding = {
      id: Date.now().toString(),
      symbol: holding.symbol,
      name: stock.name,
      quantity: holding.quantity,
      avgPrice: holding.avgPrice,
      currentPrice: stock.price,
      sector: stock.sector,
    };
    setHoldings((prev) => [...prev, newHolding]);
  };

  const removeHolding = (id: string) => {
    setHoldings((prev) => prev.filter((h) => h.id !== id));
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 md:px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold gradient-text-primary text-lg">StockAI</span>
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-semibold flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-primary" /> 포트폴리오
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4" /> 마켓
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> 종목 추가
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Summary Cards */}
        <PortfolioSummary holdings={holdings} />

        {/* Charts + Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pie Chart */}
          <div className="lg:col-span-1">
            <div className="glass rounded-xl p-4 h-full">
              <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-4">자산 배분</div>
              <PortfolioChart holdings={holdings} />
            </div>
          </div>

          {/* Holdings Table */}
          <div className="lg:col-span-2">
            <div className="glass rounded-xl p-4 h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">보유 종목</div>
                <span className="text-xs text-muted-foreground font-mono">{holdings.length}개 종목</span>
              </div>
              <PortfolioTable
                holdings={holdings}
                onRemove={removeHolding}
              />
            </div>
          </div>
        </div>

        {/* Return Bar Chart */}
        <div className="glass rounded-xl p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-4">종목별 수익률</div>
          <ReturnBars holdings={holdings} />
        </div>
      </main>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddHoldingModal
            onClose={() => setShowAddModal(false)}
            onAdd={(h) => { addHolding(h); setShowAddModal(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

function ReturnBars({ holdings }: { holdings: Holding[] }) {
  if (holdings.length === 0) return <div className="text-center text-muted-foreground py-8 text-sm">보유 종목이 없습니다</div>;

  const items = holdings.map((h) => ({
    symbol: h.symbol,
    name: h.name,
    returnPct: ((h.currentPrice - h.avgPrice) / h.avgPrice) * 100,
  })).sort((a, b) => b.returnPct - a.returnPct);

  const maxAbs = Math.max(...items.map((i) => Math.abs(i.returnPct)), 1);

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const isGain = item.returnPct >= 0;
        const barWidth = (Math.abs(item.returnPct) / maxAbs) * 100;
        return (
          <motion.div
            key={item.symbol}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-center gap-3"
          >
            <div className="w-20 text-xs font-mono text-right text-muted-foreground shrink-0">{item.symbol}</div>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 bg-secondary rounded-full h-5 overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.6, delay: idx * 0.05, ease: "easeOut" }}
                  className={`h-full rounded-full ${isGain ? "bg-gain" : "bg-loss"}`}
                />
              </div>
              <span className={`text-xs font-mono font-bold w-16 text-right ${isGain ? "text-gain" : "text-loss"}`}>
                {isGain ? "+" : ""}{item.returnPct.toFixed(2)}%
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export default Portfolio;
