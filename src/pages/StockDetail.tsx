import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Brain, ChevronRight } from "lucide-react";
import { STOCKS } from "@/data/stockData";
import { MarketTicker } from "@/components/MarketOverview";
import { StockDetailPanel } from "@/components/StockDetailPanel";

const STOCK_MAP = new Map(STOCKS.map((s) => [s.symbol, s]));

export default function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();

  const stock = (symbol ? STOCK_MAP.get(symbol) : undefined) ?? STOCKS[0];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border px-4 md:px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/home")}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg px-2 py-1"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span className="text-sm hidden sm:block">돌아가기</span>
          </button>
          <div className="w-px h-5 bg-border" />
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary" aria-hidden="true" />
          </div>
          <span className="font-bold gradient-text-primary text-lg">AntGravity</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>홈</span>
          <ChevronRight className="w-3 h-3" aria-hidden="true" />
          <span className="text-foreground font-semibold">{stock.symbol}</span>
        </div>
      </header>

      <MarketTicker />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <StockDetailPanel symbol={stock.symbol} />
        </div>
      </div>
    </div>
  );
}
