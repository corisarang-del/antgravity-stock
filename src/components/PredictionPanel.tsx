import { motion } from "framer-motion";
import { Brain, Target, Zap, TrendingUp, ShieldCheck, Crown } from "lucide-react";
import { AI_FACTORS } from "@/data/stockData";
import { ProGate } from "@/components/ProGate";
import { useSubscription } from "@/hooks/useSubscription";

interface PredictionPanelProps {
  score: number;
  signal: string;
  symbol: string;
}

const getScoreColor = (score: number) => {
  if (score >= 75) return "hsl(162, 52%, 38%)";  // high → teal-green
  if (score >= 55) return "hsl(178, 58%, 40%)";  // good → teal
  if (score >= 40) return "hsl(38, 88%, 52%)";   // mid → amber
  return "hsl(350, 68%, 52%)";                    // low → rose-red
};

const getSignalConfig = (signal: string) => {
  const configs: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
    "STRONG BUY": {
      color: "text-gain",
      bg: "bg-gain/10 border-gain/30",
      icon: <TrendingUp className="w-5 h-5" />,
      label: "강력 매수",
    },
    "BUY": {
      color: "text-primary",
      bg: "bg-primary/10 border-primary/30",
      icon: <TrendingUp className="w-5 h-5" />,
      label: "매수",
    },
    "HOLD": {
      color: "text-warning",
      bg: "bg-warning/10 border-warning/30",
      icon: <ShieldCheck className="w-5 h-5" />,
      label: "보유",
    },
    "SELL": {
      color: "text-loss",
      bg: "bg-loss/10 border-loss/30",
      icon: <TrendingUp className="w-5 h-5 rotate-180" />,
      label: "매도",
    },
  };
  return configs[signal] || configs["HOLD"];
};

export function PredictionPanel({ score, signal, symbol }: PredictionPanelProps) {
  const { isPro } = useSubscription();
  const cfg = getSignalConfig(signal);
  const scoreColor = getScoreColor(score);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  const panelContent = (
    <div className="space-y-4">
      {/* AI Score Ring */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">AI 예측 점수</span>
        </div>
        <div className="flex items-center gap-5">
          <div className="relative w-24 h-24 shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(222, 30%, 18%)" strokeWidth="8" />
              <motion.circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={scoreColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className="text-2xl font-bold font-mono"
                style={{ color: scoreColor }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {score}
              </motion.span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>

          <div className="flex-1">
            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border font-semibold text-sm ${cfg.color} ${cfg.bg}`}>
              {cfg.icon}
              {cfg.label} ({signal})
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              AI 모델이 {symbol} 종목에 대해 <strong className={cfg.color}>{cfg.label}</strong> 신호를 감지했습니다. 최근 7일간의 복합 지표 분석 결과입니다.
            </p>
          </div>
        </div>
      </div>

      {/* Factor Breakdown */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">요인 분석</span>
        </div>
        <div className="space-y-3">
          {AI_FACTORS.map((factor, i) => (
            <div key={factor.name}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{factor.name}</span>
                <span className="font-mono font-semibold" style={{ color: getScoreColor(factor.score) }}>
                  {factor.score}
                </span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: getScoreColor(factor.score) }}
                  initial={{ width: 0 }}
                  animate={{ width: `${factor.score}%` }}
                  transition={{ delay: i * 0.1 + 0.3, duration: 0.7, ease: "easeOut" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Warning */}
      <div className="glass rounded-xl p-4 border border-warning/20 bg-warning/5">
        <div className="flex items-start gap-2">
          <Zap className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-warning font-semibold">주의:</span> 이 예측은 AI 알고리즘 기반으로, 실제 투자 결정에 사용 시 전문가 상담을 권장합니다. 과거 성과가 미래를 보장하지 않습니다.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <ProGate
      isPro={isPro}
      message="AI 예측 분석은 Pro 전용 기능입니다. 월 ₩4,900으로 무제한 이용하세요."
      mode="blur"
    >
      {panelContent}
    </ProGate>
  );
}
