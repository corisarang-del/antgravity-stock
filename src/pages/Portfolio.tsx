import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Plus, BarChart2, Wallet, Crown, TrendingUp, TrendingDown } from "lucide-react";
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
    if (!isPro) setShowPricing(true);
    else setShowAddModal(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 py-3 flex items-center justify-between shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold gradient-text-primary text-lg hidden sm:block">AntGravity</span>
          </Link>
          <span className="text-border">·</span>
          <span className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
            <Wallet className="w-4 h-4 text-primary" /> 포트폴리오
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors items-center gap-1.5 hidden sm:flex">
            <BarChart2 className="w-4 h-4" /> 마켓
          </Link>
          {user ? (
            <>
              <button
                onClick={handleAddClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> 종목 추가
              </button>
              <UserMenu />
            </>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              로그인
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
        {!user && !authLoading ? (
          /* ─── 미로그인 ─── */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-28 gap-5"
          >
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[var(--shadow-card)]">
              <Wallet className="w-9 h-9 text-primary/60" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground mb-1">포트폴리오를 관리하세요</p>
              <p className="text-muted-foreground text-sm">로그인하면 포트폴리오를 저장하고 실시간으로 관리할 수 있습니다</p>
            </div>
            <button
              onClick={() => setShowAuth(true)}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              로그인하기
            </button>
          </motion.div>
        ) : !isPro && !loading ? (
          /* ─── Free 유저 ─── */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-28 gap-5"
          >
            <div className="w-20 h-20 rounded-2xl bg-accent/10 border border-accent/25 flex items-center justify-center shadow-[var(--shadow-card)]">
              <Crown className="w-9 h-9 text-accent" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground mb-1">포트폴리오는 Pro 전용 기능입니다</p>
              <p className="text-muted-foreground text-sm">월 <span className="font-semibold text-accent">₩4,900</span>으로 포트폴리오 클라우드 저장 및 모든 Pro 기능을 사용하세요</p>
            </div>
            <button
              onClick={() => setShowPricing(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition-colors shadow-md shadow-accent/20"
            >
              <Crown className="w-4 h-4" /> Pro로 업그레이드
            </button>
          </motion.div>
        ) : loading ? (
          <div className="flex items-center justify-center py-28 text-muted-foreground text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              불러오는 중...
            </div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <PortfolioSummary holdings={holdings} />

            {/* Chart + Table Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1">
                <div className="glass rounded-2xl p-5 h-full shadow-[var(--shadow-card)]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-4 rounded-full bg-primary" />
                    <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">자산 배분</div>
                  </div>
                  <PortfolioChart holdings={holdings} />
                </div>
              </div>
              <div className="lg:col-span-2">
                <div className="glass rounded-2xl p-5 h-full shadow-[var(--shadow-card)]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 rounded-full bg-primary" />
                      <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">보유 종목</div>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono bg-secondary px-2 py-0.5 rounded-full">{holdings.length}개</span>
                  </div>
                  <PortfolioTable holdings={holdings} onRemove={removeHolding} />
                </div>
              </div>
            </div>

            {/* Return Bars */}
            {holdings.length > 0 && (
              <div className="glass rounded-2xl p-5 shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-1 h-4 rounded-full bg-primary" />
                  <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">종목별 수익률</div>
                </div>
                <ReturnBars holdings={holdings} />
              </div>
            )}
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
          <motion.div
            key={item.symbol}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-center gap-3"
          >
            <div className="w-20 text-xs font-mono text-right text-muted-foreground shrink-0">{item.symbol}</div>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 bg-secondary rounded-full h-5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.7, delay: idx * 0.05, ease: "easeOut" }}
                  className={`h-full rounded-full ${isGain ? "bg-gain" : "bg-loss"}`}
                />
              </div>
              <div className={`flex items-center gap-0.5 text-xs font-mono font-bold w-18 text-right ${isGain ? "text-gain" : "text-loss"}`}>
                {isGain ? <TrendingUp className="w-3 h-3 shrink-0" /> : <TrendingDown className="w-3 h-3 shrink-0" />}
                {isGain ? "+" : ""}{item.returnPct.toFixed(2)}%
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export default Portfolio;
