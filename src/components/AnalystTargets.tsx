import { motion } from "framer-motion";
import { ArrowUp, ArrowDown, Building2 } from "lucide-react";

interface AnalystTargetsProps {
  targets: AnalystTargetItem[];
  currentPrice: number;
  predictedPrice?: number | null;
}

export interface AnalystTargetItem {
  firm: string;
  analyst: string;
  rating: string;
  target: number;
  prevTarget: number;
  date: string;
}

const ratingColor: Record<string, string> = {
  "BUY": "text-gain bg-gain/10 border-gain/30",
  "STRONG BUY": "text-gain bg-gain/10 border-gain/30",
  "OVERWEIGHT": "text-primary bg-primary/10 border-primary/30",
  "OUTPERFORM": "text-primary bg-primary/10 border-primary/30",
  "NEUTRAL": "text-warning bg-warning/10 border-warning/20",
  "EQUAL WEIGHT": "text-warning bg-warning/10 border-warning/20",
  "UNDERWEIGHT": "text-loss bg-loss/10 border-loss/30",
  "SELL": "text-loss bg-loss/10 border-loss/30",
};

export function AnalystTargets({ targets, currentPrice, predictedPrice }: AnalystTargetsProps) {
  if (targets.length === 0) {
    const hasPrediction = typeof predictedPrice === "number" && predictedPrice > 0;
    const upside = hasPrediction ? ((predictedPrice - currentPrice) / currentPrice) * 100 : null;

    return (
      <div className="space-y-4">
        {hasPrediction ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="glass rounded-xl p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">AI 예측가</div>
              <div className="font-mono font-bold text-sm">
                {predictedPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="glass rounded-xl p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">현재가 대비</div>
              <div className={`font-mono font-bold text-sm ${upside !== null && upside >= 0 ? "text-gain" : "text-loss"}`}>
                {upside !== null ? `${upside >= 0 ? "+" : ""}${upside.toFixed(1)}%` : "—"}
              </div>
            </div>
          </div>
        ) : null}

        <div className="glass rounded-xl p-5 text-sm text-muted-foreground text-center leading-relaxed">
          공개 애널리스트 목표가 피드는 아직 연결되지 않았어.
          {hasPrediction ? " 지금은 AI 예측가만 참고용으로 보여주고 있어." : ""}
        </div>
      </div>
    );
  }

  const avgTarget = targets.reduce((sum, t) => sum + t.target, 0) / targets.length;
  const upside = ((avgTarget - currentPrice) / currentPrice) * 100;

  const ratings = targets.reduce((acc, t) => {
    const key = ["BUY", "STRONG BUY", "OVERWEIGHT", "OUTPERFORM"].includes(t.rating) ? "매수" :
                ["SELL", "UNDERWEIGHT"].includes(t.rating) ? "매도" : "중립";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-xl p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">평균 목표가</div>
          <div className="font-mono font-bold text-sm">{avgTarget.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">상승여력</div>
          <div className={`font-mono font-bold text-sm ${upside >= 0 ? "text-gain" : "text-loss"}`}>
            {upside >= 0 ? "+" : ""}{upside.toFixed(1)}%
          </div>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">매수 의견</div>
          <div className="font-mono font-bold text-sm text-gain">{ratings["매수"] || 0}/{targets.length}</div>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="glass rounded-xl p-4">
        <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3 font-semibold">의견 분포</div>
        <div className="flex gap-1 h-3 rounded-full overflow-hidden mb-2">
          {(ratings["매수"] || 0) > 0 && (
            <div
              className="bg-gain rounded-l-full"
              style={{ width: `${((ratings["매수"] || 0) / targets.length) * 100}%` }}
            />
          )}
          {(ratings["중립"] || 0) > 0 && (
            <div
              className="bg-warning"
              style={{ width: `${((ratings["중립"] || 0) / targets.length) * 100}%` }}
            />
          )}
          {(ratings["매도"] || 0) > 0 && (
            <div
              className="bg-loss rounded-r-full"
              style={{ width: `${((ratings["매도"] || 0) / targets.length) * 100}%` }}
            />
          )}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground font-mono">
          <span className="text-gain">매수 {ratings["매수"] || 0}</span>
          <span className="text-warning">중립 {ratings["중립"] || 0}</span>
          <span className="text-loss">매도 {ratings["매도"] || 0}</span>
        </div>
      </div>

      {/* Individual Targets */}
      <div className="space-y-2">
        {targets.map((t, i) => {
          const changed = t.target - t.prevTarget;
          const isUp = changed >= 0;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass rounded-xl p-3 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-sm truncate">{t.firm}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded border font-mono font-semibold shrink-0 ${ratingColor[t.rating] || "text-muted-foreground bg-secondary border-border"}`}>
                    {t.rating}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">{t.analyst} · {t.date}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono font-bold text-sm">{t.target.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                <div className={`text-xs font-mono flex items-center justify-end gap-0.5 ${isUp ? "text-gain" : "text-loss"}`}>
                  {isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {Math.abs(changed).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
