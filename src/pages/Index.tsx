import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { STOCKS, generateChartData } from "@/data/stockData";
import { AppShell } from "@/components/AppShell";
import { StockChart } from "@/components/StockChart";
import { StockHeader } from "@/components/StockHeader";
import { PredictionPanel } from "@/components/PredictionPanel";
import { Sparkles, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedSymbol, setSelectedSymbol] = useState("NVDA");
  const [timeframe, setTimeframe] = useState("60");

  useEffect(() => {
    const sym = (location.state as { symbol?: string } | null)?.symbol;
    if (sym) setSelectedSymbol(sym);
  }, [location.state]);

  const stock = STOCKS.find((s) => s.symbol === selectedSymbol) || STOCKS[0];
  const chartData = generateChartData(stock.price, parseInt(timeframe));

  const timeframes = [
    { label: "1M", value: "30" },
    { label: "2M", value: "60" },
    { label: "3M", value: "90" },
  ];

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* AI 진단 진입 배너 */}
        <motion.button
          onClick={() => navigate("/")}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full glass rounded-xl p-4 border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-bold text-base text-foreground">이 종목, 지금 사도 될까요?</div>
                <div className="text-sm text-muted-foreground mt-0.5">AI가 점수 하나로 알려드려요 — 비싼지 싼지, 성장하는지</div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-primary shrink-0" />
          </div>
        </motion.button>

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
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xl font-semibold">{stock.symbol} 가격 차트</div>
            <div className="flex gap-1.5">
              {timeframes.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => setTimeframe(tf.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-all border ${
                    timeframe === tf.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/60 text-muted-foreground border-border/50 hover:bg-background/60"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-4 mb-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className={`w-3 h-0.5 rounded ${stock.changePct >= 0 ? "bg-gain" : "bg-loss"}`} />
              <span className="text-muted-foreground">실제 가격</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded bg-primary" style={{ backgroundImage: "repeating-linear-gradient(90deg, hsl(185,100%,50%) 0, hsl(185,100%,50%) 4px, transparent 4px, transparent 7px)" }} />
              <span className="text-muted-foreground">AI 예측</span>
            </div>
          </div>
          <div className="h-72 md:h-96">
            <StockChart data={chartData} symbol={stock.symbol} isGain={stock.changePct >= 0} />
          </div>
        </div>

        {/* Prediction Panel */}
        <div className="glass rounded-xl p-5">
          <div className="text-xl font-semibold mb-4">AI 분석</div>
          <PredictionPanel score={stock.prediction} signal={stock.signal} symbol={stock.symbol} />
        </div>
      </div>
    </AppShell>
  );
};

export default Index;
