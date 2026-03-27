import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, BarChart2, Star, Trash2, TrendingUp, TrendingDown, ExternalLink, Plus, Crown, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/useAuth";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useSubscription } from "@/hooks/useSubscription";
import { STOCKS } from "@/data/stockData";
import { AuthModal } from "@/components/AuthModal";
import { UserMenu } from "@/components/UserMenu";
import { AddWatchModal } from "@/components/AddWatchModal";
import { PricingModal } from "@/components/PricingModal";
import { FREE_LIMITS } from "@/config/toss";

const STOCK_BY_SYMBOL = new Map(STOCKS.map((stock) => [stock.symbol, stock]));

const Watchlist = () => {
  const { user, loading: authLoading } = useAuth();
  const { watchlist, loading, removeFromWatchlist } = useWatchlist();
  const { isPro } = useSubscription();
  const [showAuth, setShowAuth] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [search, setSearch] = useState("");

  const atLimit = !isPro && watchlist.length >= FREE_LIMITS.watchlist;

  const handleAddClick = () => {
    if (atLimit) setShowPricing(true);
    else setShowAdd(true);
  };

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return watchlist;
    }

    return watchlist.filter(
      (item) =>
        item.symbol.toLowerCase().includes(normalizedSearch) ||
        item.name.toLowerCase().includes(normalizedSearch)
    );
  }, [search, watchlist]);

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
            <Star className="w-4 h-4 text-warning fill-warning/30" /> 관심종목
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
                <Plus className="w-4 h-4" /> 추가
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

      <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full space-y-4">
        {!user && !authLoading ? (
          /* ─── 미로그인 ─── */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-28 gap-5"
          >
            <div className="w-20 h-20 rounded-2xl bg-warning/10 border border-warning/20 flex items-center justify-center shadow-[var(--shadow-card)]">
              <Star className="w-9 h-9 text-warning/60" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground mb-1">관심종목을 저장하세요</p>
              <p className="text-muted-foreground text-sm">로그인하면 관심 종목을 저장하고 빠르게 확인할 수 있습니다</p>
            </div>
            <button
              onClick={() => setShowAuth(true)}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              로그인하기
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
            {/* Free 플랜 배너 */}
            {!isPro && (
              <motion.button
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setShowPricing(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-accent/30 bg-accent/5 hover:bg-accent/10 transition-colors text-left shadow-[var(--shadow-card)]"
              >
                <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                  <Crown className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-accent">Free 플랜 · {watchlist.length}/{FREE_LIMITS.watchlist}개 사용 중</div>
                  <div className="text-xs text-muted-foreground">Pro로 업그레이드하면 무제한으로 추가할 수 있습니다</div>
                </div>
                <span className="text-xs font-semibold text-accent bg-accent/10 px-2 py-1 rounded-lg shrink-0 hidden sm:block">업그레이드 →</span>
              </motion.button>
            )}

            {/* 검색 바 */}
            {watchlist.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="종목명 또는 코드 검색..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary transition-colors shadow-[var(--shadow-card)]"
                />
              </div>
            )}

            {watchlist.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-28 gap-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-warning/10 border border-warning/20 flex items-center justify-center">
                  <Star className="w-7 h-7 text-warning/50" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground mb-1">관심종목이 없습니다</p>
                  <p className="text-muted-foreground text-sm">마음에 드는 종목을 추가해보세요!</p>
                </div>
                <button
                  onClick={() => setShowAdd(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" /> 종목 추가
                </button>
              </motion.div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1 mb-1">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">
                    {filtered.length}개 종목
                  </span>
                </div>
                <AnimatePresence>
                  {filtered.map((item, idx) => {
                    const stock = STOCK_BY_SYMBOL.get(item.symbol);
                    const isGain = stock ? stock.changePct >= 0 : false;
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="glass rounded-xl p-4 flex items-center gap-4 shadow-[var(--shadow-card)] hover:border-primary/30 transition-colors border border-transparent"
                      >
                        {/* Symbol Badge */}
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0 font-mono">
                          {item.symbol.slice(0, 2)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono font-bold text-sm text-foreground">{item.symbol}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">{item.sector}</span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{item.name}</div>
                        </div>

                        {/* Price */}
                        {stock ? (
                          <div className="text-right shrink-0">
                            <div className="font-mono font-bold text-sm text-foreground">{stock.price.toLocaleString()}</div>
                            <div className={`text-xs font-mono flex items-center gap-0.5 justify-end mt-0.5 ${isGain ? "text-gain" : "text-loss"}`}>
                              {isGain ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {isGain ? "+" : ""}{stock.changePct.toFixed(2)}%
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground shrink-0">데이터 없음</div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Link
                            to={`/stock/${item.symbol}`}
                            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="상세 보기"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => removeFromWatchlist(item.id)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-loss hover:bg-loss/10 transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </main>

      <AnimatePresence>
        {showAuth ? <AuthModal onClose={() => setShowAuth(false)} /> : null}
        {showAdd ? <AddWatchModal onClose={() => setShowAdd(false)} /> : null}
        {showPricing ? <PricingModal onClose={() => setShowPricing(false)} /> : null}
      </AnimatePresence>
    </div>
  );
};

export default Watchlist;
