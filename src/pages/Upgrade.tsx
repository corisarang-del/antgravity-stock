import { motion, AnimatePresence } from "framer-motion";
import { Crown, Zap, Star, Bell, Brain, Wallet, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { TOSS_CLIENT_KEY } from "@/config/toss";
import { AuthModal } from "@/components/AuthModal";

const FREE_FEATURES = [
  "관심종목 최대 5개",
  "가격 알림 최대 2개",
  "주가 차트 조회",
  "글로벌 시장 현황",
];

const PRO_FEATURES = [
  { icon: Star,   label: "관심종목 무제한",           desc: "원하는 모든 종목을 저장" },
  { icon: Bell,   label: "가격 알림 무제한",           desc: "목표가 도달 즉시 알림" },
  { icon: Wallet, label: "포트폴리오 클라우드 저장",   desc: "기기 간 동기화" },
  { icon: Brain,  label: "AI 예측 분석 전체 공개",     desc: "종목별 점수 및 신호 분석" },
];

const Upgrade = () => {
  const { user, session } = useAuth();
  const { isPro, confirmPayment, cancelSubscription, subscription } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleSubscribe = async () => {
    if (!user || !session) { setShowAuth(true); return; }
    setLoading(true); setError(null);
    try {
      const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk");
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      const payment = tossPayments.payment({ customerKey: user.id });
      await payment.requestBillingAuth({
        method: "CARD",
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
        customerEmail: user.email ?? "",
        customerName: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "고객",
      });
    } catch (e: any) {
      if (e?.code !== "USER_CANCEL") setError(e?.message ?? "결제 창을 열지 못했습니다.");
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    const { success } = await cancelSubscription();
    if (!success) setError("구독 취소에 실패했습니다.");
    setShowCancelConfirm(false);
    setLoading(false);
  };

  return (
    <AppShell hideTicker>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto">
            <Crown className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold gradient-text-primary">AntGravity Pro</h1>
          <p className="text-sm text-muted-foreground">개미도 기관처럼 — AI 분석의 모든 것</p>
        </motion.div>

        {/* Plan Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-4"
        >
          {/* Free */}
          <div className="glass rounded-2xl p-5 border border-border">
            <div className="text-sm font-semibold text-muted-foreground mb-1">Free</div>
            <div className="text-3xl font-bold font-mono mb-4">₩0</div>
            <ul className="space-y-2.5">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Check className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-40" />{f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="glass rounded-2xl p-5 border border-primary/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 px-2.5 py-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-bl-xl">
              추천
            </div>
            <div className="text-sm font-semibold text-primary mb-1">Pro</div>
            <div className="text-3xl font-bold font-mono mb-0.5">₩4,900</div>
            <div className="text-xs text-muted-foreground mb-4">/월 · 언제든 취소</div>
            <ul className="space-y-2.5">
              {PRO_FEATURES.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-start gap-2 text-xs">
                  <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Pro Feature Cards */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-2 gap-3"
        >
          {PRO_FEATURES.map(({ icon: Icon, label, desc }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.06 }}
              className="glass rounded-xl p-4 border border-border"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center mb-2">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="text-xs font-semibold mb-1">{label}</div>
              <div className="text-[11px] text-muted-foreground">{desc}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="px-3 py-2 rounded-lg bg-loss/10 border border-loss/20 text-xs text-loss flex items-center gap-2"
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />{error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {isPro ? (
            <div className="space-y-3">
              <div className="w-full py-3 rounded-xl bg-gain/10 border border-gain/20 text-gain text-sm font-semibold text-center flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Pro 구독 중
              </div>
              {subscription?.status !== "cancelled" && (
                showCancelConfirm ? (
                  <div className="flex gap-2">
                    <button onClick={handleCancel} disabled={loading}
                      className="flex-1 py-2.5 rounded-xl bg-loss text-loss-foreground text-xs font-semibold hover:bg-loss/90 transition-colors disabled:opacity-50">
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : "구독 취소 확인"}
                    </button>
                    <button onClick={() => setShowCancelConfirm(false)}
                      className="flex-1 py-2.5 rounded-xl bg-secondary text-xs font-semibold hover:bg-secondary/80 transition-colors">
                      돌아가기
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowCancelConfirm(true)}
                    className="w-full py-2.5 rounded-xl border border-border text-muted-foreground text-xs hover:bg-secondary transition-colors">
                    구독 취소
                  </button>
                )
              )}
            </div>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Pro 시작하기 · 월 ₩4,900
                </>
              )}
            </button>
          )}
          <p className="text-center text-xs text-muted-foreground mt-3">
            토스페이먼츠로 안전하게 결제 · 언제든 취소 가능
          </p>
        </motion.div>
      </div>

      <AnimatePresence>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </AnimatePresence>
    </AppShell>
  );
};

export default Upgrade;
