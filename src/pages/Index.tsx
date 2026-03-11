import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { STOCKS, generateChartData } from "@/data/stockData";
import { AppShell } from "@/components/AppShell";
import { MarketOverview } from "@/components/MarketOverview";
import { StockList } from "@/components/StockList";
import { StockChart } from "@/components/StockChart";
import { StockHeader } from "@/components/StockHeader";
import { PredictionPanel } from "@/components/PredictionPanel";
import { Menu, X, Sparkles, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [selectedSymbol, setSelectedSymbol] = useState("NVDA");
  const [search, setSearch] = useState("");
  const [timeframe, setTimeframe] = useState("60");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const stock = STOCKS.find((s) => s.symbol === selectedSymbol) || STOCKS[0];
  const chartData = generateChartData(stock.price, parseInt(timeframe));

  const timeframes = [
    { label: "1M", value: "30" },
    { label: "2M", value: "60" },
    { label: "3M", value: "90" },
  ];

  return (
    <AppShell>
      <div className="flex overflow-hidden" style={{ height: "calc(100vh - 112px)" }}>
        {/* Sidebar - Stock List */}
        <aside
          className={`
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
            fixed md:relative z-30 md:z-auto top-0 left-0 h-full
            w-72 border-r border-border shrink-0
            transition-transform duration-300 bg-background md:bg-transparent
            flex flex-col
          `}
        >
          {/* Mobile close btn */}
          <div className="md:hidden flex items-center justify-between px-4 pt-4 pb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">종목 목록</span>
            <button onClick={() => setSidebarOpen(false)} className="text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col p-3">
            <StockList
              selectedSymbol={selectedSymbol}
              onSelect={(sym) => { setSelectedSymbol(sym); setSidebarOpen(false); }}
              search={search}
              onSearchChange={setSearch}
            />
          </div>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-background/80 md:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Center - Chart Area */}
        <main className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
          {/* Mobile sidebar trigger */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-sm text-muted-foreground"
            >
              <Menu className="w-4 h-4" /> 종목 선택
            </button>
            <span className="text-sm font-semibold font-mono text-primary">{stock.symbol}</span>
          </div>

          {/* ── AI 종목 진단 ─────────────────────────── */}
          <section>
            <StockDiagnose onSelectStock={(sym) => setSelectedSymbol(sym)} />
          </section>

          {/* Market Overview */}
          <section>
            <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2 font-semibold">글로벌 시장</div>
            <MarketOverview />
          </section>

          {/* Stock Header */}
          <StockHeader
            symbol={stock.symbol}
            name={stock.name}
            price={stock.price}
            change={stock.change}
            changePct={stock.changePct}
            sector={stock.sector}
          />

          {/* Chart */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold">{stock.symbol} 가격 차트</div>
              <div className="flex gap-1">
                {timeframes.map((tf) => (
                  <button
                    key={tf.value}
                    onClick={() => setTimeframe(tf.value)}
                    className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                      timeframe === tf.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-4 mb-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className={`w-3 h-0.5 rounded ${stock.changePct >= 0 ? "bg-gain" : "bg-loss"}`} />
                <span className="text-muted-foreground">실제 가격</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 rounded bg-primary" style={{ backgroundImage: "repeating-linear-gradient(90deg, hsl(185,100%,50%) 0, hsl(185,100%,50%) 4px, transparent 4px, transparent 7px)" }} />
                <span className="text-muted-foreground">AI 예측</span>
              </div>
            </div>
            <div className="h-64 md:h-80">
              <StockChart data={chartData} symbol={stock.symbol} isGain={stock.changePct >= 0} />
            </div>
          </div>
        </main>

        {/* Right Panel - Prediction */}
        <aside className="hidden lg:block w-80 shrink-0 border-l border-border overflow-y-auto">
          <div className="p-4 space-y-4">
            <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">AI 분석</div>
            <PredictionPanel score={stock.prediction} signal={stock.signal} symbol={stock.symbol} />
          </div>
        </aside>
      </div>

      {/* Mobile Prediction */}
      <div className="lg:hidden px-3 pb-4">
        <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-3">AI 분석</div>
        <PredictionPanel score={stock.prediction} signal={stock.signal} symbol={stock.symbol} />
      </div>
    </AppShell>
  );
};

export default Index;
