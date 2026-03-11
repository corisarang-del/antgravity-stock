import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Brain, TrendingUp, ShieldCheck, Zap, Sparkles } from "lucide-react";
import { STOCKS } from "@/data/stockData";

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

const getSignalLabel = (signal: string) => {
  const map: Record<string, string> = {
    "STRONG BUY": "강력매수",
    "BUY": "매수",
    "HOLD": "보유",
    "SELL": "매도",
  };
  return map[signal] || signal;
};

const SUGGESTIONS = ["NVDA", "005930", "000660", "AAPL", "298040", "PLTR"];

export function StockDiagnose({ onSelectStock }: { onSelectStock?: (symbol: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<typeof STOCKS>([]);
  const [diagnosed, setDiagnosed] = useState<(typeof STOCKS)[0] | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [animating, setAnimating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) { setResults([]); setShowDropdown(false); return; }
    const filtered = STOCKS.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.sector.toLowerCase().includes(q)
    ).slice(0, 6);
    setResults(filtered);
    setShowDropdown(filtered.length > 0);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const diagnose = (stock: (typeof STOCKS)[0]) => {
    setQuery(stock.name);
    setShowDropdown(false);
    setDiagnosed(null);
    setAnimating(true);
    setTimeout(() => {
      setDiagnosed(stock);
      setAnimating(false);
    }, 500);
    onSelectStock?.(stock.symbol);
  };

  const scoreColor = diagnosed ? getScoreColor(diagnosed.prediction) : "hsl(178, 58%, 40%)";
  const grade = diagnosed ? getGrade(diagnosed.prediction) : "";
  const circumference = 2 * Math.PI * 34;
  const offset = diagnosed ? circumference - (diagnosed.prediction / 100) * circumference : circumference;

  return (
    <div className="w-full">
      {/* Hero headline */}
      <div className="mb-3 flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
          <Sparkles className="w-3 h-3 text-primary" />
          <span className="text-xs font-semibold text-primary">AI 진단</span>
        </div>
        <span className="text-sm font-semibold text-foreground">이 종목, 지금 사도 될까요?</span>
      </div>

      <div ref={containerRef} className="relative">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query && results.length > 0 && setShowDropdown(true)}
            placeholder="종목명 또는 티커 검색… (예: 삼성전자, NVDA)"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
          />
        </div>

        {/* Dropdown */}
        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-1.5 z-50 glass rounded-xl overflow-hidden border border-border"
            >
              {results.map((stock) => (
                <button
                  key={stock.symbol}
                  onClick={() => diagnose(stock)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/70 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Brain className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-xs text-primary">{stock.symbol}</span>
                      <span className="text-xs text-muted-foreground truncate">{stock.name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{stock.sector}</span>
                  </div>
                  <div className="text-xs font-semibold" style={{ color: getScoreColor(stock.prediction) }}>
                    {getGrade(stock.prediction)}
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick suggestion chips */}
      {!diagnosed && !animating && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {SUGGESTIONS.map((sym) => {
            const s = STOCKS.find((x) => x.symbol === sym);
            if (!s) return null;
            return (
              <button
                key={sym}
                onClick={() => diagnose(s)}
                className="px-2.5 py-1 rounded-full bg-secondary text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border hover:border-primary/30 transition-all font-mono"
              >
                {sym}
              </button>
            );
          })}
        </div>
      )}

      {/* Loading */}
      <AnimatePresence>
        {animating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card"
          >
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">AI가 분석 중입니다…</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Card */}
      <AnimatePresence>
        {diagnosed && !animating && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mt-3"
          >
            <div className="glass rounded-xl p-4 border border-border">
              {/* Card header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-foreground">{diagnosed.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary font-mono text-muted-foreground">{diagnosed.symbol}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{diagnosed.sector}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-muted-foreground font-mono">
                      {diagnosed.symbol.match(/^\d{6}$/)
                        ? `₩${diagnosed.price.toLocaleString()}`
                        : `$${diagnosed.price.toLocaleString()}`}
                    </span>
                    <span className={`text-xs font-mono ${diagnosed.changePct >= 0 ? "gain-text" : "loss-text"}`}>
                      {diagnosed.changePct >= 0 ? "+" : ""}{diagnosed.changePct.toFixed(2)}%
                    </span>
                  </div>
                </div>
                {/* Grade badge */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl border-2 shrink-0"
                  style={{ color: scoreColor, borderColor: scoreColor, background: `${scoreColor}15` }}
                >
                  {grade}
                </div>
              </div>

              {/* Score ring + signal */}
              <div className="flex items-center gap-4">
                {/* Ring */}
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 84 84">
                    <circle cx="42" cy="42" r="34" fill="none" stroke="hsl(220, 18%, 88%)" strokeWidth="7" />
                    <motion.circle
                      cx="42" cy="42" r="34"
                      fill="none"
                      stroke={scoreColor}
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset: offset }}
                      transition={{ duration: 1.0, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                      className="text-xl font-bold font-mono leading-none"
                      style={{ color: scoreColor }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      {diagnosed.prediction}
                    </motion.span>
                    <span className="text-[9px] text-muted-foreground">/100</span>
                  </div>
                </div>

                {/* Signal + description */}
                <div className="flex-1">
                  <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold mb-2"
                    style={{
                      color: scoreColor,
                      borderColor: `${scoreColor}50`,
                      background: `${scoreColor}12`,
                    }}
                  >
                    {diagnosed.signal === "STRONG BUY" || diagnosed.signal === "BUY" ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : diagnosed.signal === "SELL" ? (
                      <TrendingUp className="w-3.5 h-3.5 rotate-180" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                    {getSignalLabel(diagnosed.signal)}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    AI가 <span className="font-semibold text-foreground">{diagnosed.name}</span>을 분석한 결과,
                    종합 점수 <span className="font-mono font-bold" style={{ color: scoreColor }}>{diagnosed.prediction}점</span>으로
                    <span className="font-semibold" style={{ color: scoreColor }}> {getSignalLabel(diagnosed.signal)}</span> 신호입니다.
                  </p>
                </div>
              </div>

              {/* Mini factor bars */}
              <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2">
                {[
                  { label: "기술적 분석", v: Math.min(100, diagnosed.prediction + 8) },
                  { label: "펀더멘털", v: Math.max(0, diagnosed.prediction - 5) },
                  { label: "모멘텀", v: Math.min(100, diagnosed.prediction + 3) },
                ].map(({ label, v }) => (
                  <div key={label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground">{label}</span>
                      <span className="text-[10px] font-mono font-semibold" style={{ color: getScoreColor(v) }}>{v}</span>
                    </div>
                    <div className="h-1 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: getScoreColor(v) }}
                        initial={{ width: 0 }}
                        animate={{ width: `${v}%` }}
                        transition={{ delay: 0.3, duration: 0.7, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Disclaimer */}
              <div className="mt-2.5 flex items-start gap-1.5">
                <Zap className="w-3 h-3 text-warning shrink-0 mt-0.5" />
                <span className="text-[10px] text-muted-foreground">AI 분석 참고용입니다. 실제 투자 결정 시 전문가 상담을 권장합니다.</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
