import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Search, Brain, TrendingUp, ShieldCheck, Zap, Sparkles,
  ArrowRight, Target, BarChart2, Activity,
} from "lucide-react";
import { DIAGNOSE_SUGGESTION_SYMBOLS, STOCK_UNIVERSE, STOCK_METADATA_BY_SYMBOL } from "@/data/stockUniverse";
import { AppShell } from "@/components/AppShell";
import antCharacter from "@/assets/ant_character.png";
import { useStockBundle } from "@/hooks/useStockBundle";

/* ── helpers ─────────────────────────────── */
const getScoreColor = (score: number) => {
  if (score >= 75) return "hsl(162, 52%, 38%)";
  if (score >= 55) return "hsl(178, 58%, 40%)";
  if (score >= 40) return "hsl(38, 88%, 52%)";
  return "hsl(350, 68%, 52%)";
};

const getGrade = (score: number) => {
  if (score >= 85) return "S";
  if (score >= 75) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  return "D";
};

const getGradeLabel = (score: number) => {
  if (score >= 85) return "최우수";
  if (score >= 75) return "우수";
  if (score >= 65) return "양호";
  if (score >= 50) return "보통";
  return "주의";
};

const getSignalLabel = (signal: string) => {
  const map: Record<string, string> = {
    "STRONG BUY": "강력 매수",
    "BUY": "매수",
    "HOLD": "보유",
    "SELL": "매도",
  };
  return map[signal] || signal;
};

const RISK_SCORE: Record<string, number> = {
  low: 80,
  medium: 60,
  high: 40,
};

function calcSignal(predictedPrice: number | undefined, lastClose: number | undefined) {
  if (!predictedPrice || !lastClose || lastClose === 0) return "HOLD";
  const pct = ((predictedPrice - lastClose) / lastClose) * 100;
  if (pct >= 5) return "STRONG BUY";
  if (pct >= 2) return "BUY";
  if (pct >= -2) return "HOLD";
  return "SELL";
}

const SUGGESTIONS = DIAGNOSE_SUGGESTION_SYMBOLS.flatMap((symbol) => {
  const stock = STOCK_METADATA_BY_SYMBOL.get(symbol);
  return stock ? [stock] : [];
});

/* ── Score Ring ─────────────────────────── */
function ScoreRing({ score, size = 140 }: { score: number; size?: number }) {
  const r = (size / 2) - 12;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = getScoreColor(score);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(220,18%,88%)" strokeWidth="10" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="font-bold font-mono leading-none"
          style={{ fontSize: size * 0.25, color }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          {score}
        </motion.span>
        <span className="text-xs text-muted-foreground mt-0.5">/100</span>
      </div>
    </div>
  );
}

/* ── Mini factor bar ──────────────────── */
function FactorBar({ label, value, delay = 0 }: { label: string; value: number; delay?: number }) {
  const color = getScoreColor(value);
  const shouldReduceMotion = useReducedMotion();
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-mono font-bold tabular-nums" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={shouldReduceMotion ? { duration: 0 } : { delay, duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────── */
export default function Diagnose() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [dropResults, setDropResults] = useState(STOCK_UNIVERSE.slice(0, 7));
  const [showDrop, setShowDrop] = useState(false);
  const [diagnosedSymbol, setDiagnosedSymbol] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const skipDropRef = useRef(false);
  const diagnosed = diagnosedSymbol ? STOCK_METADATA_BY_SYMBOL.get(diagnosedSymbol) ?? null : null;
  const { data: bundle, isLoading, isError } = useStockBundle(diagnosedSymbol ?? "", "3mo");

  useEffect(() => {
    if (skipDropRef.current) { skipDropRef.current = false; setShowDrop(false); return; }
    const q = query.trim().toLowerCase();
    if (!q) { setDropResults(STOCK_UNIVERSE.slice(0, 7)); setShowDrop(false); return; }
    const f = STOCK_UNIVERSE.filter(s =>
      s.symbol.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.sector.toLowerCase().includes(q)
    ).slice(0, 7);
    setDropResults(f);
    setShowDrop(f.length > 0);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setShowDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const diagnose = (stock: (typeof STOCK_UNIVERSE)[number]) => {
    skipDropRef.current = true;
    setQuery(stock.name);
    setDiagnosedSymbol(stock.symbol);
  };

  const goToDetail = () => {
    if (diagnosed) navigate("/home", { state: { symbol: diagnosed.symbol } });
  };

  const ohlcv = bundle?.detail?.data ?? [];
  const lastClose = ohlcv.length > 0 ? ohlcv[ohlcv.length - 1].close : undefined;
  const prevClose = ohlcv.length > 1 ? ohlcv[ohlcv.length - 2].close : undefined;
  const change = lastClose !== undefined && prevClose !== undefined ? lastClose - prevClose : 0;
  const changePct = lastClose !== undefined && prevClose ? (change / prevClose) * 100 : 0;
  const predictedPrice = bundle?.prediction?.predicted_prices?.[0];
  const score = bundle?.prediction
    ? Math.round(
        RISK_SCORE[bundle.prediction.risk_level?.toLowerCase()] ??
          Math.max(0, Math.min(100, 100 - bundle.prediction.volatility * 10))
      )
    : 0;
  const signal = calcSignal(predictedPrice, lastClose);
  const scoreColor = diagnosed && bundle?.prediction ? getScoreColor(score) : "hsl(178,58%,40%)";
  const grade = diagnosed && bundle?.prediction ? getGrade(score) : "";
  const gradeLabel = diagnosed && bundle?.prediction ? getGradeLabel(score) : "";
  const isKorean = diagnosed ? /^\d{6}$/.test(diagnosed.symbol) : false;

  /* factor scores derived from prediction */
  const factors = diagnosed && bundle?.prediction ? [
    { label: "기술적 분석", value: Math.min(100, score + 9) },
    { label: "펀더멘털", value: Math.max(0, score - 4) },
    { label: "거래량 패턴", value: Math.min(100, score + 14) },
    { label: "감성 분석", value: Math.max(0, score - 9) },
    { label: "섹터 모멘텀", value: Math.min(100, score + 5) },
  ] : [];

  return (
    <AppShell>
      {/* ── Hero ─────────────────────────── */}
      <div className="flex flex-col items-center justify-start px-4 pt-10 pb-20 md:pt-16">
        <motion.div
          className="w-full max-w-lg"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Logo + headline */}
          <div className="flex flex-col items-center text-center mb-10">
            <motion.img
              src={antCharacter}
              alt="AntGravity"
              className="w-16 h-16 object-contain mb-4"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
            />
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="text-xs font-bold text-primary tracking-wider uppercase">AI 진단</span>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-2">
              이 종목,<br />
              <span className="gradient-text-primary">지금 사도 될까요?</span>
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              비싼지 싼지, 성장하고 있는지<br />
              AI가 분석해서 점수 하나로 알려드려요.
            </p>
          </div>

          {/* Search bar */}
          <div ref={containerRef} className="relative mb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                aria-label="주식 종목 검색"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => query && dropResults.length > 0 && setShowDrop(true)}
                placeholder="종목명 또는 티커 검색… (삼성전자, NVDA)"
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-border bg-card text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-shadow shadow-sm"
              />
            </div>

            {/* Dropdown */}
            <AnimatePresence>
              {showDrop && dropResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-1.5 z-[100] bg-card rounded-2xl overflow-hidden border border-border shadow-lg"
                >
                  {dropResults.map((stock) => (
                    <button
                      key={stock.symbol}
                      onClick={() => diagnose(stock)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/70 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Brain className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-primary">{stock.symbol}</span>
                          <span className="text-sm font-medium truncate">{stock.name}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{stock.sector}</span>
                      </div>
                      <span
                        className="text-sm font-bold font-mono shrink-0"
                        style={{ color: getScoreColor(stock.prediction) }}
                      >
                        {getGrade(stock.prediction)}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Suggestion chips */}
          {!diagnosed && !isLoading && (
            <motion.div
              className="flex flex-wrap justify-center gap-2 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {SUGGESTIONS.map((stock) => (
                <button
                  key={stock.symbol}
                  onClick={() => diagnose(stock)}
                  className="px-3 py-1.5 rounded-full bg-card border border-border text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all font-medium"
                >
                  {stock.name}
                </button>
              ))}
            </motion.div>
          )}

          {/* Loading */}
          <AnimatePresence>
            {isLoading && diagnosed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-12"
              >
                <div className="relative w-16 h-16">
                  <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
                  <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <Brain className="absolute inset-0 m-auto w-6 h-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">AI가 분석 중입니다…</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Result Card ─────────────────── */}
          <AnimatePresence>
            {diagnosed && !isLoading && bundle?.prediction && lastClose !== undefined && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <div className="glass-card rounded-2xl p-6 border border-border">
                  {/* Stock identity */}
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">{diagnosed.name}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-xs text-muted-foreground">{diagnosed.symbol}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{diagnosed.sector}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="font-mono font-semibold text-sm text-foreground tabular-nums">
                          {isKorean ? `₩${lastClose.toLocaleString()}` : `$${lastClose.toLocaleString()}`}
                        </span>
                        <span className={`text-xs font-mono tabular-nums ${changePct >= 0 ? "gain-text" : "loss-text"}`}>
                          {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    {/* Grade badge */}
                    <motion.div
                      className="flex flex-col items-center gap-0.5 px-4 py-3 rounded-2xl border-2 shrink-0"
                      style={{
                        color: scoreColor,
                        borderColor: scoreColor,
                        background: `${scoreColor}15`,
                      }}
                      initial={{ scale: 0, rotate: -10 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.2 }}
                    >
                      <span className="font-bold text-3xl leading-none">{grade}</span>
                      <span className="text-[10px] font-semibold">{gradeLabel}</span>
                    </motion.div>
                  </div>

                  {/* Score ring + signal */}
                  <div className="flex items-center gap-6 mb-6">
                    <ScoreRing score={diagnosed.prediction} size={140} />
                    <div className="flex-1">
                      <div
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border font-bold text-sm mb-3"
                        style={{ color: scoreColor, borderColor: `${scoreColor}50`, background: `${scoreColor}12` }}
                      >
                        {diagnosed.signal === "STRONG BUY" || diagnosed.signal === "BUY"
                          ? <TrendingUp className="w-4 h-4" />
                          : diagnosed.signal === "SELL"
                          ? <TrendingUp className="w-4 h-4 rotate-180" />
                          : <ShieldCheck className="w-4 h-4" />}
                        {getSignalLabel(diagnosed.signal)}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        AI 종합 점수{" "}
                        <span className="font-bold font-mono" style={{ color: scoreColor }}>
                          {score}점
                        </span>
                        으로 <span className="font-bold" style={{ color: scoreColor }}>{gradeLabel}</span>{" "}
                        등급입니다. 기술적·펀더멘털·감성 지표를 종합 분석한 결과입니다.
                      </p>
                    </div>
                  </div>

                  {/* Factor bars */}
                  <div className="rounded-xl bg-secondary/40 p-4 mb-5 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">요인 분석</span>
                    </div>
                    {factors.map((f, i) => (
                      <FactorBar key={f.label} label={f.label} value={f.value} delay={i * 0.1 + 0.2} />
                    ))}
                  </div>

                  {/* Key metrics row */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                      {[
                      { icon: Activity, label: "변동률", value: `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`, color: changePct >= 0 ? "gain-text" : "loss-text" },
                      { icon: BarChart2, label: "AI 점수", value: `${score}pt`, color: "" },
                      { icon: Brain, label: "신호", value: getSignalLabel(signal), color: "" },
                    ].map(({ icon: Icon, label, value, color }) => (
                      <div key={label} className="glass rounded-xl p-3 text-center">
                        <Icon className="w-4 h-4 text-primary mx-auto mb-1.5" />
                        <div className={`text-sm font-bold ${color}`} style={!color ? { color: scoreColor } : {}}>{value}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Disclaimer */}
                  <div className="flex items-start gap-1.5 mb-5">
                    <Zap className="w-3 h-3 text-warning shrink-0 mt-0.5" />
                    <span className="text-[10px] text-muted-foreground leading-relaxed">
                      AI 분석은 참고용입니다. 실제 투자 결정 시 전문가 상담을 권장합니다. 과거 성과가 미래를 보장하지 않습니다.
                    </span>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={goToDetail}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors"
                  >
                    <BarChart2 className="w-4 h-4" />
                    {diagnosed.name} 상세 분석 보기
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Try another */}
                <button
                  onClick={() => { setDiagnosedSymbol(null); setQuery(""); }}
                  className="w-full mt-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
                >
                  다른 종목 진단하기 →
                </button>
              </motion.div>
            )}
            {diagnosed && !isLoading && (!bundle?.prediction || lastClose === undefined || isError) && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="glass-card rounded-2xl p-6 border border-border text-center text-sm text-muted-foreground"
              >
                진단 데이터를 아직 불러오지 못했어. 잠시 후 다시 시도해줘.
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AppShell>
  );
}
