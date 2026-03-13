import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Brain, TrendingUp, ShieldCheck, Zap, Sparkles,
  ArrowRight, Target, BarChart2, Activity,
} from "lucide-react";
import { STOCKS } from "@/data/stockData";
import { AppShell } from "@/components/AppShell";
import antCharacter from "@/assets/ant_character.png";

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

const SUGGESTIONS = [
  { symbol: "NVDA", label: "NVIDIA" },
  { symbol: "005930", label: "삼성전자" },
  { symbol: "000660", label: "SK하이닉스" },
  { symbol: "AAPL", label: "Apple" },
  { symbol: "298040", label: "효성중공업" },
  { symbol: "PLTR", label: "Palantir" },
  { symbol: "MSFT", label: "Microsoft" },
  { symbol: "012330", label: "현대모비스" },
];

type Stock = (typeof STOCKS)[0];

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
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-mono font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ delay, duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────── */
export default function Diagnose() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [dropResults, setDropResults] = useState<Stock[]>([]);
  const [showDrop, setShowDrop] = useState(false);
  const [diagnosed, setDiagnosed] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const skipDropRef = useRef(false);

  useEffect(() => {
    if (skipDropRef.current) { skipDropRef.current = false; setShowDrop(false); return; }
    const q = query.trim().toLowerCase();
    if (!q) { setDropResults([]); setShowDrop(false); return; }
    const f = STOCKS.filter(s =>
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

  const diagnose = (stock: Stock) => {
    skipDropRef.current = true;
    setQuery(stock.name);
    setShowDrop(false);
    setDiagnosed(null);
    setLoading(true);
    setTimeout(() => { setDiagnosed(stock); setLoading(false); }, 700);
  };

  const goToDetail = () => {
    if (diagnosed) navigate("/home", { state: { symbol: diagnosed.symbol } });
  };

  const scoreColor = diagnosed ? getScoreColor(diagnosed.prediction) : "hsl(178,58%,40%)";
  const grade = diagnosed ? getGrade(diagnosed.prediction) : "";
  const gradeLabel = diagnosed ? getGradeLabel(diagnosed.prediction) : "";
  const isKorean = diagnosed ? /^\d{6}$/.test(diagnosed.symbol) : false;

  /* factor scores derived from prediction */
  const factors = diagnosed ? [
    { label: "기술적 분석", value: Math.min(100, diagnosed.prediction + 9) },
    { label: "펀더멘털", value: Math.max(0, diagnosed.prediction - 4) },
    { label: "거래량 패턴", value: Math.min(100, diagnosed.prediction + 14) },
    { label: "감성 분석", value: Math.max(0, diagnosed.prediction - 9) },
    { label: "섹터 모멘텀", value: Math.min(100, diagnosed.prediction + 5) },
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
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => query && dropResults.length > 0 && setShowDrop(true)}
                placeholder="종목명 또는 티커 검색… (삼성전자, NVDA)"
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow shadow-sm"
              />
            </div>

            {/* Dropdown */}
            <AnimatePresence>
              {showDrop && (
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
          {!diagnosed && !loading && (
            <motion.div
              className="flex flex-wrap justify-center gap-2 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {SUGGESTIONS.map(({ symbol, label }) => {
                const s = STOCKS.find((x) => x.symbol === symbol);
                if (!s) return null;
                return (
                  <button
                    key={symbol}
                    onClick={() => diagnose(s)}
                    className="px-3 py-1.5 rounded-full bg-card border border-border text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all font-medium"
                  >
                    {label}
                  </button>
                );
              })}
            </motion.div>
          )}

          {/* Loading */}
          <AnimatePresence>
            {loading && (
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
            {diagnosed && !loading && (
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
                        <span className="font-mono font-semibold text-sm text-foreground">
                          {isKorean ? `₩${diagnosed.price.toLocaleString()}` : `$${diagnosed.price.toLocaleString()}`}
                        </span>
                        <span className={`text-xs font-mono ${diagnosed.changePct >= 0 ? "gain-text" : "loss-text"}`}>
                          {diagnosed.changePct >= 0 ? "+" : ""}{diagnosed.changePct.toFixed(2)}%
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
                          {diagnosed.prediction}점
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
                      { icon: Activity, label: "변동률", value: `${diagnosed.changePct >= 0 ? "+" : ""}${diagnosed.changePct.toFixed(2)}%`, color: diagnosed.changePct >= 0 ? "gain-text" : "loss-text" },
                      { icon: BarChart2, label: "AI 점수", value: `${diagnosed.prediction}pt`, color: "" },
                      { icon: Brain, label: "신호", value: getSignalLabel(diagnosed.signal), color: "" },
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
                  onClick={() => { setDiagnosed(null); setQuery(""); }}
                  className="w-full mt-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
                >
                  다른 종목 진단하기 →
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AppShell>
  );
}
