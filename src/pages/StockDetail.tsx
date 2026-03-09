import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Brain, TrendingUp, TrendingDown, BarChart2, Newspaper, Target, ChevronRight } from "lucide-react";
import { STOCKS, generateChartData, STOCK_FINANCIALS, getStockNews, getAnalystTargets } from "@/data/stockData";
import { MarketTicker } from "@/components/MarketOverview";
import { StockChart } from "@/components/StockChart";
import { FinancialSummary } from "@/components/FinancialSummary";
import { NewsFeed } from "@/components/NewsFeed";
import { AnalystTargets } from "@/components/AnalystTargets";
import { PredictionPanel } from "@/components/PredictionPanel";

const TABS = [
  { id: "chart", label: "캔들스틱", icon: BarChart2 },
  { id: "financials", label: "재무제표", icon: TrendingUp },
  { id: "news", label: "뉴스", icon: Newspaper },
  { id: "analysts", label: "목표가", icon: Target },
];

const TIMEFRAMES = [
  { label: "1M", value: "30" },
  { label: "2M", value: "60" },
  { label: "3M", value: "90" },
];

export default function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("chart");
  const [timeframe, setTimeframe] = useState("60");

  const stock = STOCKS.find(s => s.symbol === symbol) || STOCKS[0];
  const chartData = generateChartData(stock.price, parseInt(timeframe));
  const financials = STOCK_FINANCIALS[stock.symbol] || STOCK_FINANCIALS["AAPL"];
  const news = getStockNews(stock.symbol);
  const analystTargets = getAnalystTargets(stock.symbol);

  const isGain = stock.changePct >= 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 md:px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mr-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm hidden sm:block">돌아가기</span>
          </button>
          <div className="w-px h-5 bg-border" />
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold gradient-text-primary text-lg">AntGravity</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-mono">PRO</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>홈</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-semibold">{stock.symbol}</span>
        </div>
      </header>

      <MarketTicker />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
          {/* Stock Hero */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-5 md:p-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="font-bold text-primary text-sm font-mono">{stock.symbol.slice(0, 2)}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-xl md:text-2xl font-bold">{stock.symbol}</h1>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
                      {stock.sector}
                    </span>
                  </div>
                  <div className="text-muted-foreground text-sm">{stock.name}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 md:gap-6">
                <div className="text-right">
                  <div className="text-2xl md:text-3xl font-bold font-mono">
                    {stock.price.toLocaleString()}
                  </div>
                  <div className={`flex items-center justify-end gap-1 text-sm font-mono font-semibold ${isGain ? "text-gain" : "text-loss"}`}>
                    {isGain ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {isGain ? "+" : ""}{stock.change.toLocaleString()}
                    <span className="ml-1">({isGain ? "+" : ""}{stock.changePct.toFixed(2)}%)</span>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-xl border font-bold text-sm ${
                  stock.signal.includes("STRONG BUY") ? "bg-gain/10 text-gain border-gain/30" :
                  stock.signal === "BUY" ? "bg-primary/10 text-primary border-primary/30" :
                  stock.signal === "SELL" ? "bg-loss/10 text-loss border-loss/30" :
                  "bg-warning/10 text-warning border-warning/20"
                }`}>
                  {stock.signal}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Main Content + AI Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            {/* Left: Tabs */}
            <div className="space-y-4">
              {/* Tab Bar */}
              <div className="flex gap-1 p-1 glass rounded-xl">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:block">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                {activeTab === "chart" && (
                  <div className="glass rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm font-semibold">{stock.symbol} 가격 차트</div>
                      <div className="flex gap-1">
                        {TIMEFRAMES.map(tf => (
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
                    {/* Legend */}
                    <div className="flex gap-4 mb-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-3 h-0.5 rounded ${isGain ? "bg-gain" : "bg-loss"}`} />
                        <span className="text-muted-foreground">실제 가격</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-0.5 rounded bg-primary" />
                        <span className="text-muted-foreground">AI 예측</span>
                      </div>
                    </div>
                    <div className="h-80">
                      <StockChart data={chartData} symbol={stock.symbol} isGain={isGain} />
                    </div>
                  </div>
                )}

                {activeTab === "financials" && (
                  <FinancialSummary financials={financials} symbol={stock.symbol} />
                )}

                {activeTab === "news" && (
                  <div className="space-y-3">
                    <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                      최신 뉴스 및 감성 분석
                    </div>
                    <NewsFeed news={news} />
                  </div>
                )}

                {activeTab === "analysts" && (
                  <div className="space-y-3">
                    <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                      애널리스트 투자의견 및 목표주가
                    </div>
                    <AnalystTargets targets={analystTargets} currentPrice={stock.price} />
                  </div>
                )}
              </motion.div>
            </div>

            {/* Right: AI Panel */}
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">AI 분석</div>
              <PredictionPanel
                score={stock.prediction}
                signal={stock.signal}
                symbol={stock.symbol}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
