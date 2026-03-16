import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, BarChart2, Newspaper, Target } from "lucide-react";
import {
  STOCKS,
  STOCK_FINANCIALS,
  getStockNews,
  getAnalystTargets,
} from "@/data/stockData";
import { StockChart } from "@/components/StockChart";
import { FinancialSummary } from "@/components/FinancialSummary";
import { NewsFeed } from "@/components/NewsFeed";
import { AnalystTargets } from "@/components/AnalystTargets";
import { PredictionPanel } from "@/components/PredictionPanel";
import { useStockBundle } from "@/hooks/useStockBundle";
import { type OhlcvRow } from "@/lib/apiClient";

const TABS = [
  { id: "chart", label: "차트", icon: BarChart2 },
  { id: "financials", label: "재무제표", icon: TrendingUp },
  { id: "news", label: "뉴스", icon: Newspaper },
  { id: "analysts", label: "목표가", icon: Target },
];

const TIMEFRAME_PERIOD: Record<string, string> = {
  "30": "1mo",
  "60": "3mo",
  "90": "3mo",
};

const TIMEFRAMES = [
  { label: "1M", value: "30" },
  { label: "2M", value: "60" },
  { label: "3M", value: "90" },
];

const STOCK_MAP = new Map(STOCKS.map((s) => [s.symbol, s]));

const RISK_SCORE: Record<string, number> = {
  low: 80,
  medium: 60,
  high: 40,
};

function toChartData(rows: OhlcvRow[], predictedPrice?: number) {
  const data = rows.map((r) => ({
    date: new Date(r.date).toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    }),
    price: r.close,
    open: r.open,
    high: r.high,
    low: r.low,
    volume: r.volume,
    predicted: null as number | null,
  }));

  if (predictedPrice !== undefined && predictedPrice > 0 && data.length > 0) {
    const last = data[data.length - 1];
    data.push({ ...last, date: "예측", predicted: predictedPrice });
  }
  return data;
}

function calcSignal(predictedPrice: number, lastClose: number): string {
  if (lastClose === 0) return "HOLD";
  const pct = ((predictedPrice - lastClose) / lastClose) * 100;
  if (pct >= 5) return "STRONG BUY";
  if (pct >= 2) return "BUY";
  if (pct >= -2) return "HOLD";
  return "SELL";
}

interface Props {
  symbol: string;
}

export function StockDetailPanel({ symbol }: Props) {
  const [activeTab, setActiveTab] = useState("chart");
  const [timeframe, setTimeframe] = useState("60");

  const { data: bundle, isLoading } = useStockBundle(
    symbol,
    TIMEFRAME_PERIOD[timeframe]
  );

  // 실제 데이터 우선, 없으면 mock 폴백
  const mockStock = STOCK_MAP.get(symbol) ?? STOCKS[0];
  const financials = STOCK_FINANCIALS[symbol] || STOCK_FINANCIALS["AAPL"];
  const news = getStockNews(symbol);
  const analystTargets = getAnalystTargets(symbol);

  // 번들 데이터에서 파생값 계산
  const ohlcv = bundle?.detail?.data ?? [];
  const prediction = bundle?.prediction;
  const predictedPrice = prediction?.predicted_prices?.[0];
  const lastClose = ohlcv.length > 0 ? ohlcv[ohlcv.length - 1].close : mockStock.price;
  const prevClose = ohlcv.length > 1 ? ohlcv[ohlcv.length - 2].close : lastClose - mockStock.change;
  const change = lastClose - prevClose;
  const changePct = prevClose !== 0 ? (change / prevClose) * 100 : mockStock.changePct;

  const displayName = bundle?.detail?.name ?? mockStock.name;
  const displayMarket = bundle?.detail?.market ?? mockStock.sector;
  const currentPrice = isLoading ? mockStock.price : lastClose;
  const currentChange = isLoading ? mockStock.change : change;
  const currentChangePct = isLoading ? mockStock.changePct : changePct;
  const isGain = currentChangePct >= 0;

  const signal = predictedPrice
    ? calcSignal(predictedPrice, lastClose)
    : mockStock.signal;

  const score = prediction
    ? Math.round(
        RISK_SCORE[prediction.risk_level?.toLowerCase()] ??
          Math.max(0, Math.min(100, 100 - prediction.volatility * 10))
      )
    : mockStock.prediction;

  const chartData =
    ohlcv.length > 0
      ? toChartData(ohlcv, predictedPrice)
      : undefined;

  return (
    <div className="space-y-6">
      {/* Stock Hero */}
      <motion.div
        key={symbol}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-5 md:p-6"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="font-bold text-primary text-sm font-mono">
                {symbol.slice(0, 2)}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl md:text-2xl font-bold">{symbol}</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
                  {displayMarket}
                </span>
              </div>
              <div className="text-muted-foreground text-sm">{displayName}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            <div className="text-right">
              <div className="text-2xl md:text-3xl font-bold font-mono tabular-nums">
                {currentPrice.toLocaleString()}
              </div>
              <div
                className={`flex items-center justify-end gap-1 text-sm font-mono font-semibold tabular-nums ${
                  isGain ? "text-gain" : "text-loss"
                }`}
              >
                {isGain ? (
                  <TrendingUp className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <TrendingDown className="w-4 h-4" aria-hidden="true" />
                )}
                {isGain ? "+" : ""}
                {currentChange.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                <span className="ml-1">
                  ({isGain ? "+" : ""}
                  {currentChangePct.toFixed(2)}%)
                </span>
              </div>
            </div>
            <div
              className={`px-4 py-2 rounded-xl border font-bold text-sm ${
                signal.includes("STRONG BUY")
                  ? "bg-gain/10 text-gain border-gain/30"
                  : signal === "BUY"
                  ? "bg-primary/10 text-primary border-primary/30"
                  : signal === "SELL"
                  ? "bg-loss/10 text-loss border-loss/30"
                  : "bg-warning/10 text-warning border-warning/20"
              }`}
            >
              {signal}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content + AI Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left: Tabs */}
        <div className="space-y-4">
          <div className="flex gap-1 p-1 glass rounded-xl">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:block">{tab.label}</span>
              </button>
            ))}
          </div>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === "chart" && (
              <div className="glass rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-semibold">{symbol} 가격 차트</div>
                  <div className="flex gap-1">
                    {TIMEFRAMES.map((tf) => (
                      <button
                        key={tf.value}
                        onClick={() => setTimeframe(tf.value)}
                        className={`px-3 py-1 rounded text-xs font-mono transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
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
                    <div className={`w-3 h-0.5 rounded ${isGain ? "bg-gain" : "bg-loss"}`} />
                    <span className="text-muted-foreground">실제 가격</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 rounded bg-primary" />
                    <span className="text-muted-foreground">AI 예측</span>
                  </div>
                </div>
                <div className="h-80">
                  {isLoading ? (
                    <div className="h-full bg-secondary/30 rounded-lg animate-pulse" />
                  ) : (
                    <StockChart
                      data={chartData ?? []}
                      symbol={symbol}
                      isGain={isGain}
                    />
                  )}
                </div>
              </div>
            )}

            {activeTab === "financials" && (
              <FinancialSummary financials={financials} symbol={symbol} />
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
                <AnalystTargets targets={analystTargets} currentPrice={currentPrice} />
              </div>
            )}
          </motion.div>
        </div>

        {/* Right: AI Panel */}
        <div className="space-y-4">
          <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
            AI 분석
          </div>
          <PredictionPanel score={score} signal={signal} symbol={symbol} />
        </div>
      </div>
    </div>
  );
}
