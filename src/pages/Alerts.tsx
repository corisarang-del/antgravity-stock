import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, BarChart2, Bell, Trash2, Plus, ToggleLeft, ToggleRight, AlertCircle, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/useAuth";
import { useAlerts } from "@/hooks/useAlerts";
import { useSubscription } from "@/hooks/useSubscription";
import { STOCKS } from "@/data/stockData";
import { AuthModal } from "@/components/AuthModal";
import { UserMenu } from "@/components/UserMenu";
import { AddAlertModal } from "@/components/AddAlertModal";
import { PricingModal } from "@/components/PricingModal";
import { FREE_LIMITS } from "@/config/toss";

const STOCK_BY_SYMBOL = new Map(STOCKS.map((stock) => [stock.symbol, stock]));

const Alerts = () => {
  const { user, loading: authLoading } = useAuth();
  const { alerts, triggered, loading, toggleAlert, deleteAlert } = useAlerts();
  const { isPro } = useSubscription();
  const [showAuth, setShowAuth] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

  const atLimit = !isPro && alerts.length >= FREE_LIMITS.alerts;

  const handleAddClick = () => {
    if (atLimit) {
      setShowPricing(true);
    } else {
      setShowAdd(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border px-4 md:px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold gradient-text-primary text-lg">AntGravity</span>
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-semibold flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-gain" /> 알림 설정
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
                <Plus className="w-4 h-4" /> 알림 추가
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

      <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full space-y-4">
        {/* Info Banner */}
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>목표가 알림은 현재 저장 기능만 지원됩니다. 실시간 Push 알림은 추후 업데이트 예정입니다.</span>
        </div>

        {!user && !authLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Bell className="w-12 h-12 text-gain/30" />
            <p className="text-muted-foreground text-sm">로그인하면 가격 알림을 설정할 수 있습니다</p>
            <button onClick={() => setShowAuth(true)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              로그인하기
            </button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">불러오는 중...</div>
        ) : (
          <>
            {triggered.length > 0 ? (
              <div className="space-y-2">
                {triggered.map((item, index) => (
                  <div
                    key={`${item.title}-${index}`}
                    className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-gain/10 border border-gain/20 text-xs"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-gain" />
                    <div>
                      <div className="font-semibold text-gain">{item.title}</div>
                      <div className="text-muted-foreground mt-0.5">{item.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {/* 제한 안내 */}
            {!isPro && (
              <button
                onClick={() => setShowPricing(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
              >
                <Crown className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-primary">Free 플랜 · {alerts.length}/{FREE_LIMITS.alerts}개 사용 중</div>
                  <div className="text-xs text-muted-foreground">Pro로 업그레이드하면 알림을 무제한으로 설정할 수 있습니다</div>
                </div>
              </button>
            )}

            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Bell className="w-12 h-12 text-gain/30" />
                <p className="text-muted-foreground text-sm">설정된 알림이 없습니다</p>
                <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                  알림 추가
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert, idx) => {
                  const stock = STOCK_BY_SYMBOL.get(alert.symbol);
                  const currentPrice = stock?.price ?? 0;
                  const diff = currentPrice > 0 ? ((alert.targetPrice - currentPrice) / currentPrice) * 100 : 0;
                  return (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className={`glass rounded-xl p-4 flex items-center gap-4 border transition-all ${alert.isActive ? "border-border" : "border-border/40 opacity-60"}`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${alert.alertType === "above" ? "bg-gain/10 border border-gain/20 text-gain" : "bg-loss/10 border border-loss/20 text-loss"}`}>
                        {alert.alertType === "above" ? "▲" : "▼"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-sm">{alert.symbol}</span>
                          <span className="text-xs text-muted-foreground">{alert.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          목표가: <span className="font-mono font-semibold text-foreground">{alert.targetPrice.toLocaleString()}</span>
                          {currentPrice > 0 && (
                            <span className={`ml-2 ${diff >= 0 ? "text-gain" : "text-loss"}`}>
                              ({diff >= 0 ? "+" : ""}{diff.toFixed(2)}%)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 text-xs text-muted-foreground">
                        <div>{alert.alertType === "above" ? "이상 도달 시" : "이하 도달 시"}</div>
                        <div className={`font-semibold ${alert.isActive ? "text-gain" : "text-muted-foreground"}`}>
                          {alert.isActive ? "활성" : "비활성"}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => toggleAlert(alert.id, alert.isActive)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                          {alert.isActive ? <ToggleRight className="w-5 h-5 text-gain" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button onClick={() => deleteAlert(alert.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-loss hover:bg-loss/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      <AnimatePresence>
        {showAuth ? <AuthModal onClose={() => setShowAuth(false)} /> : null}
        {showAdd ? <AddAlertModal onClose={() => setShowAdd(false)} /> : null}
        {showPricing ? <PricingModal onClose={() => setShowPricing(false)} /> : null}
      </AnimatePresence>
    </div>
  );
};

export default Alerts;
