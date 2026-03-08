import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, BarChart2, TrendingUp, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { STOCKS, generateChartData } from "@/data/stockData";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { UserMenu } from "@/components/UserMenu";
import { MarketTicker, MarketOverview } from "@/components/MarketOverview";
import { StockList } from "@/components/StockList";
import { StockChart } from "@/components/StockChart";
import { StockHeader } from "@/components/StockHeader";
import { PredictionPanel } from "@/components/PredictionPanel";

const Index = () => {
  const { user } = useAuth();
  const [selectedSymbol, setSelectedSymbol] = useState("NVDA");
  const [search, setSearch] = useState("");
  const [timeframe, setTimeframe] = useState("60");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const stock = STOCKS.find((s) => s.symbol === selectedSymbol) || STOCKS[0];
  const chartData = generateChartData(stock.price, parseInt(timeframe));

  const timeframes = [
    { label: "1M", value: "30" },
    { label: "2M", value: "60" },
    { label: "3M", value: "90" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 md:px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold gradient-text-primary text-lg">StockAI</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-mono">PRO</span>
            </div>
            <div className="text-xs text-muted-foreground hidden sm:block">AI 기반 주식 예측 플랫폼</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gain animate-pulse-glow" />
            <span className="text-xs text-muted-foreground">실시간 데이터</span>
          </div>
          <div className="hidden md:flex items-center gap-3 text-sm">
            <button className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4" /> 마켓
            </button>
            <Link to="/portfolio" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> 포트폴리오
            </Link>
          </div>
          {user ? (
            <UserMenu />
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              로그인
            </button>
          )}
          <button
            className="md:hidden text-muted-foreground"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Ticker */}
      <MarketTicker />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Stock List */}
        <aside
          className={`
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
            fixed md:relative z-30 md:z-auto top-0 left-0 h-full
            w-72 border-r border-border shrink-0
            transition-transform duration-300 bg-background md:bg-transparent
            flex flex-col
          `}
          style={{ top: sidebarOpen ? "auto" : undefined }}
        >
          <div className="h-full overflow-hidden flex flex-col p-3">
            <StockList
              selectedSymbol={selectedSymbol}
              onSelect={(sym) => {
                setSelectedSymbol(sym);
                setSidebarOpen(false);
              }}
              search={search}
              onSearchChange={setSearch}
            />
          </div>
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-background/80 md:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Center - Chart Area */}
        <main className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
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
              <StockChart
                data={chartData}
                symbol={stock.symbol}
                isGain={stock.changePct >= 0}
              />
            </div>
          </div>
        </main>

        {/* Right Panel - Prediction */}
        <aside className="hidden lg:block w-80 shrink-0 border-l border-border overflow-y-auto">
          <div className="p-4 space-y-4">
            <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">AI 분석</div>
            <PredictionPanel
              score={stock.prediction}
              signal={stock.signal}
              symbol={stock.symbol}
            />
          </div>
        </aside>
      </div>

      {/* Mobile Prediction (below chart on mobile) */}
      <div className="lg:hidden px-3 pb-4">
        <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-3">AI 분석</div>
        <PredictionPanel
          score={stock.prediction}
          signal={stock.signal}
          symbol={stock.symbol}
        />
      </div>

      <AnimatePresence>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </AnimatePresence>
    </div>
  );
};

export default Index;
