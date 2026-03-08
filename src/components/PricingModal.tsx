import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Zap, Check, Star, Brain, Bell, Wallet, Crown, Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { TOSS_CLIENT_KEY, TOSS_PLAN } from "@/config/toss";
import { AuthModal } from "@/components/AuthModal";

interface Props {
  onClose: () => void;
}

const FREE_FEATURES = [
  "관심종목 최대 5개",
  "가격 알림 최대 2개",
  "주가 차트 조회",
  "글로벌 시장 현황",
];

const PRO_FEATURES = [
  { icon: Star, label: "관심종목 무제한" },
  { icon: Bell, label: "가격 알림 무제한" },
  { icon: Wallet, label: "포트폴리오 클라우드 저장" },
  { icon: Brain, label: "AI 예측 분석 무제한" },
];

export function PricingModal({ onClose }: Props) {
  const { user, session } = useAuth();
  const { isPro, confirmPayment, cancelSubscription, subscription } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleSubscribe = async () => {
    if (!user || !session) {
      setShowAuth(true);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // 토스페이먼츠 빌링키 인증 요청
      const { loadTossPayments } = await import("@tosspayments/tosspayments-js");
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      const payment = tossPayments.payment({ customerKey: user.id });

      await payment.requestBillingAuth({
        method: "CARD",
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
        customerEmail: user.email ?? "",
        customerName:
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          user.email?.split("@")[0] ??
          "고객",
      });
      // requestBillingAuth는 페이지를 이동하므로 이후 코드 실행 안 됨
    } catch (e: any) {
      // 사용자가 취소한 경우
      if (e?.code === "USER_CANCEL") {
        setError(null);
      } else {
        setError(e?.message ?? "결제 창을 열지 못했습니다. 토스페이먼츠 키를 확인해주세요.");
      }
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
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.93, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.93, opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          className="glass rounded-2xl p-6 w-full max-w-lg border border-border shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Crown className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="font-bold gradient-text-primary">StockAI Pro</div>
                <div className="text-xs text-muted-foreground">월 ₩4,900 · 언제든 취소 가능</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Plans */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {/* Free */}
            <div className="rounded-xl border border-border bg-secondary/30 p-4">
              <div className="text-sm font-semibold mb-1">Free</div>
              <div className="text-2xl font-bold font-mono mb-3">₩0</div>
              <ul className="space-y-2">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/50" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro */}
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-bl-lg">
                추천
              </div>
              <div className="text-sm font-semibold mb-1 text-primary">Pro</div>
              <div className="text-2xl font-bold font-mono mb-3">
                ₩4,900<span className="text-sm font-normal text-muted-foreground">/월</span>
              </div>
              <ul className="space-y-2">
                {PRO_FEATURES.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-start gap-2 text-xs">
                    <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-3 px-3 py-2 rounded-lg bg-loss/10 border border-loss/20 text-xs text-loss flex items-center gap-2"
              >
                <Zap className="w-3.5 h-3.5 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action */}
          {isPro ? (
            <div className="space-y-2">
              <div className="w-full py-2.5 rounded-lg bg-gain/10 border border-gain/20 text-gain text-sm font-semibold text-center flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Pro 구독 중
              </div>
              {subscription?.status === "cancelled" ? (
                <p className="text-xs text-center text-muted-foreground">
                  구독이 취소되었습니다. 현재 기간 만료 후 Free로 전환됩니다.
                </p>
              ) : (
                <>
                  {showCancelConfirm ? (
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancel}
                        disabled={loading}
                        className="flex-1 py-2 rounded-lg bg-loss text-white text-xs font-semibold hover:bg-loss/90 transition-colors disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : "확인 취소"}
                      </button>
                      <button
                        onClick={() => setShowCancelConfirm(false)}
                        className="flex-1 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/80 transition-colors"
                      >
                        아니오
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="w-full py-2 rounded-lg border border-border text-muted-foreground text-xs hover:bg-secondary transition-colors"
                    >
                      구독 취소
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Pro 시작하기 · 월 ₩4,900
                </>
              )}
            </button>
          )}

          <p className="text-center text-xs text-muted-foreground mt-3">
            토스페이먼츠로 안전하게 결제 · 언제든 취소 가능
          </p>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showAuth && (
          <AuthModal onClose={() => setShowAuth(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
