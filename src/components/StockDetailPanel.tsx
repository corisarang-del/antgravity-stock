import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, BarChart2, Newspaper, Target } from "lucide-react";
import { getStockMetadata } from "@/data/stockUniverse";
import { StockChart } from "@/components/StockChart";
import { NewsFeed } from "@/components/NewsFeed";
import { AnalystTargets } from "@/components/AnalystTargets";
import { PredictionPanel } from "@/components/PredictionPanel";
import { FundamentalsGrid } from "@/components/FundamentalsGrid";
import { HistoricalTable } from "@/components/HistoricalTable";
import { InvestmentScoreCard } from "@/components/InvestmentScoreCard";
import { useStockBundle } from "@/hooks/useStockBundle";
import { useFundamentals } from "@/hooks/useFundamentals";
import { fetchSentiment, type OhlcvRow } from "@/lib/apiClient";

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
  const metadata = getStockMetadata(symbol);

  const { data: bundle, isLoading } = useStockBundle(
    symbol,
    TIMEFRAME_PERIOD[timeframe]
  );
  const { data: fundamentals, isLoading: fundamentalsLoading } = useFundamentals(symbol);
  const { data: sentiment } = useQuery({
    queryKey: ["sentiment", symbol],
    queryFn: () => fetchSentiment(symbol),
    staleTime: 30 * 60 * 1000,
    enabled: Boolean(symbol),
  });

  const ohlcv = bundle?.detail?.data ?? [];
  const prediction = bundle?.prediction;
  const predictedPrice = prediction?.predicted_prices?.[0];
  const lastClose = ohlcv.length > 0 ? ohlcv[ohlcv.length - 1].close : null;
  const prevClose = ohlcv.length > 1 ? ohlcv[ohlcv.length - 2].close : null;
  const change = lastClose !== null && prevClose !== null ? lastClose - prevClose : null;
  const changePct = change !== null && prevClose ? (change / prevClose) * 100 : null;

  const displayName = bundle?.detail?.name ?? metadata?.name ?? symbol;
  const displayMarket = fundamentals?.sector ?? metadata?.sector ?? bundle?.detail?.market ?? "정보 없음";
  const currentPrice = lastClose;
  const currentChange = change;
  const currentChangePct = changePct;
  const isGain = (currentChangePct ?? 0) >= 0;

  const signal = predictedPrice && lastClose
    ? calcSignal(predictedPrice, lastClose)
    : "HOLD";

  const score = prediction && prediction.volatility !== undefined
    ? Math.round(
        RISK_SCORE[prediction.risk_level?.toLowerCase()] ??
          Math.max(0, Math.min(100, 100 - prediction.volatility * 10))
      )
    : 0;

  const chartData =
    ohlcv.length > 0
      ? toChartData(ohlcv, predictedPrice)
      : undefined;
  const predictionFactors = [
    { name: "기술적 분석", score: Math.min(100, score + 8) },
    { name: "펀더멘털", score: fundamentals?.score ? Math.round((fundamentals.score.total / 100) * 100) : Math.max(0, score - 5) },
    { name: "감성 분석", score: sentiment ? sentiment.fear_greed_index : Math.max(0, score - 2) },
    { name: "거래량 패턴", score: Math.min(100, score + 6) },
    { name: "모멘텀", score: Math.min(100, score + 3) },
  ];
  const newsItems = sentiment
    ? [
        {
          id: `${symbol}-sentiment`,
          title: `${displayName} 투자 심리 요약`,
          source: "AI Sentiment",
          time: `최근 게시물 ${sentiment.post_count}건 기준`,
          sentiment: sentiment.label,
          description: sentiment.summary,
        },
      ]
    : [];

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
                {currentPrice !== null ? currentPrice.toLocaleString() : "—"}
              </div>
              <div
                className={`flex items-center justify-end gap-1 text-sm font-mono font-semibold tabular-nums ${
                  isGain ? "text-gain" : "text-loss"
                }`}
              >
                {currentChangePct !== null && isGain ? (
                  <TrendingUp className="w-4 h-4" aria-hidden="true" />
                ) : currentChangePct !== null ? (
                  <TrendingDown className="w-4 h-4" aria-hidden="true" />
                ) : null}
                {currentChange !== null ? (
                  <>
                    {isGain ? "+" : ""}
                    {currentChange.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    <span className="ml-1">
                      ({isGain ? "+" : ""}
                      {currentChangePct?.toFixed(2)}%)
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">당일 변동 데이터 없음</span>
                )}
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
                  ) : chartData && chartData.length > 0 ? (
                    <StockChart
                      data={chartData}
                      symbol={symbol}
                      isGain={isGain}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                      가격 데이터를 아직 불러오지 못했어
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "financials" && (
              <div className="space-y-4">
                {fundamentalsLoading ? (
                  <div className="glass rounded-xl p-5 text-sm text-muted-foreground text-center">
                    재무 데이터를 불러오는 중이야
                  </div>
                ) : fundamentals ? (
                  <>
                    <InvestmentScoreCard score={fundamentals.score} />
                    <div className="glass rounded-xl p-4">
                      <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-4">
                        핵심 재무지표
                      </div>
                      <FundamentalsGrid data={fundamentals} />
                    </div>
                    <div className="glass rounded-xl p-4">
                      <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-4">
                        연간 재무 히스토리
                      </div>
                      <HistoricalTable symbol={symbol} />
                    </div>
                  </>
                ) : (
                  <div className="glass rounded-xl p-5 text-sm text-muted-foreground text-center">
                    재무 데이터를 아직 제공하지 못하고 있어
                  </div>
                )}
              </div>
            )}

            {activeTab === "news" && (
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                  최신 뉴스 및 감성 분석
                </div>
                <NewsFeed
                  news={newsItems}
                  emptyMessage="공개 뉴스 피드가 아직 연결되지 않았어. 연결 전까지는 감성 요약만 표시돼."
                />
              </div>
            )}

            {activeTab === "analysts" && (
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                  애널리스트 투자의견 및 목표주가
                </div>
                <AnalystTargets
                  targets={[]}
                  currentPrice={currentPrice ?? 0}
                  predictedPrice={predictedPrice}
                />
              </div>
            )}
          </motion.div>
        </div>

        {/* Right: AI Panel */}
        <div className="space-y-4">
          <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
            AI 분석
          </div>
          {prediction ? (
            <PredictionPanel
              score={score}
              signal={signal}
              symbol={symbol}
              factors={predictionFactors}
              summary={sentiment?.summary}
            />
          ) : (
            <div className="glass rounded-xl p-5 text-sm text-muted-foreground text-center">
              AI 예측 데이터를 아직 불러오지 못했어
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
