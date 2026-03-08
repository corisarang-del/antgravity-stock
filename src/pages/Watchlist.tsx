import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, BarChart2, Star, Trash2, TrendingUp, TrendingDown, ExternalLink, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWatchlist } from "@/hooks/useWatchlist";
import { STOCKS } from "@/data/stockData";
import { AuthModal } from "@/components/AuthModal";
import { UserMenu } from "@/components/UserMenu";
import { AddWatchModal } from "@/components/AddWatchModal";

const Watchlist = () => {
  const { user, loading: authLoading } = useAuth();
  const { watchlist, loading, removeFromWatchlist } = useWatchlist();
  const [showAuth, setShowAuth] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
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
            <Star className="w-4 h-4 text-warning" /> 관심종목
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4" /> 마켓
          </Link>
          {user ? (
            <>
              <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                <Plus className="w-4 h-4" /> 추가
              </button>
              <UserMenu />
            </>
          ) : (
            <button onClick={() => setShowAuth(true)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              로그인
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full">
        {!user && !authLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Star className="w-12 h-12 text-warning/40" />
            <p className="text-muted-foreground">로그인하면 관심종목을 저장할 수 있습니다</p>
            <button onClick={() => setShowAuth(true)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              로그인하기
            </button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">불러오는 중...</div>
        ) : watchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Star className="w-12 h-12 text-warning/30" />
            <p className="text-muted-foreground text-sm">관심 종목이 없습니다. 추가해보세요!</p>
            <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              종목 추가
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {watchlist.map((item, idx) => {
              const stock = STOCKS.find((s) => s.symbol === item.symbol);
              const isGain = stock ? stock.changePct >= 0 : false;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: idx * 0.04 }}
                  className="glass rounded-xl p-4 flex items-center gap-4"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {item.symbol.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-sm">{item.symbol}</span>
                      <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{item.sector}</div>
                  </div>
                  {stock && (
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-sm">{stock.price.toLocaleString()}</div>
                      <div className={`text-xs font-mono flex items-center gap-0.5 justify-end ${isGain ? "text-gain" : "text-loss"}`}>
                        {isGain ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isGain ? "+" : ""}{stock.changePct.toFixed(2)}%
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-1 shrink-0">
                    <Link to={`/stock/${item.symbol}`} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                    <button onClick={() => removeFromWatchlist(item.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-loss hover:bg-loss/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <AnimatePresence>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        {showAdd && <AddWatchModal onClose={() => setShowAdd(false)} />}
      </AnimatePresence>
    </div>
  );
};

export default Watchlist;
