import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Brain, Check, Crown, Loader2, Star, Wallet, Zap } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { AuthModal } from "@/components/AuthModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/useAuth";
import { recordPaymentAttempt } from "@/lib/paymentAttempts";
import { startSubscriptionCheckout } from "@/lib/tossBilling";
import { useSubscription } from "@/hooks/useSubscription";

const freeFeatures = [
  "관심종목 최대 5개",
  "가격 알림 최대 2개",
  "주가 차트 조회",
  "글로벌 시장 요약",
];

const proFeatures = [
  { icon: Star, label: "관심종목 무제한", desc: "원하는 모든 종목을 저장" },
  { icon: Bell, label: "가격 알림 무제한", desc: "목표가 도달하면 바로 확인" },
  { icon: Wallet, label: "포트폴리오 관리", desc: "보유 종목 성과를 추적" },
  { icon: Brain, label: "AI 상세 분석", desc: "점수와 신호를 더 깊게 확인" },
];

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function formatPeriodEnd(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

const Upgrade = () => {
  const { user, session } = useAuth();
  const { isPro, cancelSubscription, subscription } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const currentPeriodEndLabel = formatPeriodEnd(subscription?.currentPeriodEnd ?? null);

  const handleSubscribe = async () => {
    if (!user || !session) {
      setShowAuth(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await startSubscriptionCheckout(user);
    } catch (error) {
      const userCancel =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "USER_CANCEL";

      if (userCancel) {
        await recordPaymentAttempt({
          status: "cancelled_by_user",
          flow: "billing_auth_client",
          message: "사용자가 결제창에서 취소함",
          metadata: {
            source: "upgrade_page",
          },
        }).catch(() => {});
      } else {
        setError(getErrorMessage(error, "결제창을 열지 못했다."));
      }

      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    setError(null);

    const { success } = await cancelSubscription();
    if (!success) {
      setError("구독 취소에 실패했다.");
    }

    setShowCancelDialog(false);
    setLoading(false);
  };

  return (
    <AppShell hideTicker>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto">
            <Crown className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold gradient-text-primary">AntGravity Pro</h1>
          <p className="text-sm text-muted-foreground">개미가 아니라 기관처럼 보는 AI 분석 도구</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-4"
        >
          <div className="glass rounded-2xl p-5 border border-border">
            <div className="text-sm font-semibold text-muted-foreground mb-1">Free</div>
            <div className="text-3xl font-bold font-mono mb-4">₩0</div>
            <ul className="space-y-2.5">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Check className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-40" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="glass rounded-2xl p-5 border border-primary/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 px-2.5 py-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-bl-xl">
              추천
            </div>
            <div className="text-sm font-semibold text-primary mb-1">Pro</div>
            <div className="text-3xl font-bold font-mono mb-0.5">₩9,900</div>
            <div className="text-xs text-muted-foreground mb-4">/월, 언제든 취소 가능</div>
            <ul className="space-y-2.5">
              {proFeatures.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-start gap-2 text-xs">
                  <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-2 gap-3"
        >
          {proFeatures.map(({ icon: Icon, label, desc }, index) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.06 }}
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

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="px-3 py-2 rounded-lg bg-loss/10 border border-loss/20 text-xs text-loss flex items-center gap-2"
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {isPro ? (
            <div className="space-y-3">
              <div className="w-full py-3 rounded-xl bg-gain/10 border border-gain/20 text-gain text-sm font-semibold text-center flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                AntGravity Pro 구독 중
              </div>

              {subscription?.status === "cancelled" ? (
                <p className="text-xs text-center text-muted-foreground">
                  구독은 취소됐고
                  {currentPeriodEndLabel ? ` ${currentPeriodEndLabel}까지` : " 현재 결제 주기 종료 전까지"} Pro 권한은 유지된다.
                </p>
              ) : (
                <>
                  <button
                    onClick={() => setShowCancelDialog(true)}
                    className="w-full py-2.5 rounded-xl border border-border text-muted-foreground text-xs hover:bg-secondary transition-colors"
                  >
                    구독 취소
                  </button>
                  <p className="text-xs text-center text-muted-foreground">
                    취소하면 billing key는 즉시 삭제되고
                    {currentPeriodEndLabel ? ` ${currentPeriodEndLabel}까지` : " 현재 결제 주기 종료 전까지"}는 계속 사용할 수 있다.
                  </p>
                </>
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
                  Pro 시작하기, 월 ₩9,900
                </>
              )}
            </button>
          )}

          <p className="text-center text-xs text-muted-foreground mt-3">
            토스페이먼츠 테스트 결제로 안전하게 확인 가능, 언제든 취소 가능
          </p>
        </motion.div>
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 구독을 취소할까?</AlertDialogTitle>
            <AlertDialogDescription>
              취소하면 저장된 billing key는 즉시 삭제되고 다음 자동결제는 진행되지 않는다.
              {currentPeriodEndLabel ? ` 다만 ${currentPeriodEndLabel}까지는 Pro 권한을 계속 사용할 수 있다.` : " 다만 현재 결제 주기 종료 전까지는 Pro 권한을 계속 사용할 수 있다."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>돌아가기</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleCancel();
              }}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "취소 처리 중..." : "구독 취소하기"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AnimatePresence>
        {showAuth ? <AuthModal onClose={() => setShowAuth(false)} /> : null}
      </AnimatePresence>
    </AppShell>
  );
};

export default Upgrade;
