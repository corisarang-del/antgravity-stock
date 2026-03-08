import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Plus, BarChart2, Wallet, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useSubscription } from "@/hooks/useSubscription";
import { PortfolioChart } from "@/components/PortfolioChart";
import { PortfolioTable } from "@/components/PortfolioTable";
import { PortfolioSummary } from "@/components/PortfolioSummary";
import { AddHoldingModal } from "@/components/AddHoldingModal";
import { AuthModal } from "@/components/AuthModal";
import { UserMenu } from "@/components/UserMenu";
import { PricingModal } from "@/components/PricingModal";

export interface Holding {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  sector: string;
}

const Portfolio = () => {
  const { user, loading: authLoading } = useAuth();
  const { holdings, loading, addHolding, removeHolding } = usePortfolio();
  const { isPro } = useSubscription();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

  const handleAddClick = () => {
    if (!isPro) {
      setShowPricing(true);
    } else {
      setShowAddModal(true);
    }
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
          {user ? (
            <>
              <button
                onClick={handleAddClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" /> 종목 추가
              </button>
              <UserMenu />
            </>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              로그인
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
        {!user && !authLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Wallet className="w-12 h-12 text-primary/30" />
            <p className="text-muted-foreground text-sm">로그인하면 포트폴리오를 저장하고 관리할 수 있습니다</p>
            <button
              onClick={() => setShowAuth(true)}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              로그인하기
            </button>
          </div>
        ) : !isPro && !loading ? (
          /* Free 유저 - 포트폴리오 DB 저장 차단 */
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Crown className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold mb-1">포트폴리오는 Pro 전용 기능입니다</p>
              <p className="text-muted-foreground text-sm">월 ₩4,900으로 포트폴리오 클라우드 저장 및 모든 Pro 기능을 사용하세요</p>
            </div>
            <button
              onClick={() => setShowPricing(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              <Crown className="w-4 h-4" /> Pro로 업그레이드
            </button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">불러오는 중...</div>
        ) : (
          <>
            {/* Summary Cards */}
            <PortfolioSummary holdings={holdings} />

            {/* Charts + Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1">
                <div className="glass rounded-xl p-4 h-full">
                  <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-4">자산 배분</div>
                  <PortfolioChart holdings={holdings} />
                </div>
              </div>
              <div className="lg:col-span-2">
                <div className="glass rounded-xl p-4 h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">보유 종목</div>
                    <span className="text-xs text-muted-foreground font-mono">{holdings.length}개 종목</span>
                  </div>
                  <PortfolioTable holdings={holdings} onRemove={removeHolding} />
                </div>
              </div>
            </div>

            {/* Return Bars */}
            <div className="glass rounded-xl p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-4">종목별 수익률</div>
              <ReturnBars holdings={holdings} />
            </div>
          </>
        )}
      </main>

      <AnimatePresence>
        {showAddModal && (
          <AddHoldingModal
            onClose={() => setShowAddModal(false)}
            onAdd={(h) => { addHolding(h); setShowAddModal(false); }}
          />
        )}
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}
      </AnimatePresence>
    </div>
  );
};

function ReturnBars({ holdings }: { holdings: Holding[] }) {
  if (holdings.length === 0)
    return <div className="text-center text-muted-foreground py-8 text-sm">보유 종목이 없습니다</div>;

  const items = holdings
    .map((h) => ({ symbol: h.symbol, returnPct: ((h.currentPrice - h.avgPrice) / h.avgPrice) * 100 }))
    .sort((a, b) => b.returnPct - a.returnPct);
  const maxAbs = Math.max(...items.map((i) => Math.abs(i.returnPct)), 1);

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const isGain = item.returnPct >= 0;
        const barWidth = (Math.abs(item.returnPct) / maxAbs) * 100;
        return (
          <motion.div key={item.symbol} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} className="flex items-center gap-3">
            <div className="w-20 text-xs font-mono text-right text-muted-foreground shrink-0">{item.symbol}</div>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 bg-secondary rounded-full h-5 overflow-hidden">
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
