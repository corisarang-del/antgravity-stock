import { ReactNode, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Crown, Lock } from "lucide-react";
import { PricingModal } from "@/components/PricingModal";

interface ProGateProps {
  /** Pro 기능 여부 */
  isPro: boolean;
  /** 잠금 메시지 */
  message?: string;
  /** 블러 처리 모드 (children을 보여주되 블러) vs 완전 차단 */
  mode?: "blur" | "block";
  children: ReactNode;
}

/** Pro 기능을 감싸는 컴포넌트 - free 유저에게 업그레이드 유도 */
export function ProGate({ isPro, message = "Pro 전용 기능입니다", mode = "blur", children }: ProGateProps) {
  const [showPricing, setShowPricing] = useState(false);

  if (isPro) return <>{children}</>;

  if (mode === "block") {
    return (
      <>
        <div
          className="flex flex-col items-center justify-center gap-3 py-12 cursor-pointer group"
          onClick={() => setShowPricing(true)}
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Crown className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground text-center">{message}</p>
          <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5" /> Pro로 업그레이드
          </button>
        </div>

        <AnimatePresence>
          {showPricing ? <PricingModal onClose={() => setShowPricing(false)} /> : null}
        </AnimatePresence>
      </>
    );
  }

  // blur mode
  return (
    <>
      <div className="relative">
        <div className="pointer-events-none select-none blur-sm opacity-60">{children}</div>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 cursor-pointer"
          onClick={() => setShowPricing(true)}
        >
          <div className="px-4 py-2.5 rounded-xl bg-background/90 border border-primary/30 shadow-xl flex items-center gap-2 hover:bg-background transition-colors">
            <Lock className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Pro 전용</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}
      </AnimatePresence>
    </>
  );
}

/** 버튼 형태의 Pro 업그레이드 배너 */
export function ProBanner({ message, onOpen }: { message: string; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
    >
      <Crown className="w-5 h-5 text-primary shrink-0" />
      <div>
        <div className="text-sm font-semibold text-primary">Pro로 업그레이드</div>
        <div className="text-xs text-muted-foreground">{message}</div>
      </div>
    </button>
  );
}
