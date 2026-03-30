import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookOpen, TrendingUp, TrendingDown, Minus, ThumbsUp, ThumbsDown, Activity, Thermometer } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { fetchMarketDiary, type MarketDiarySymbolSentiment } from "@/lib/apiClient";

const MOOD_CONFIG = {
  bullish: { label: "강세", icon: ThumbsUp,   cls: "text-gain bg-gain/10 border-gain/20" },
  neutral: { label: "중립", icon: Minus,       cls: "text-warning bg-warning/10 border-warning/20" },
  bearish: { label: "약세", icon: ThumbsDown,  cls: "text-loss bg-loss/10 border-loss/20" },
};

// Returns teal-to-amber based on score (aligned with 90s anime palette)
const getFearGreedColor = (score: number): string => {
  if (score >= 75) return "hsl(350, 68%, 52%)"; // extreme greed → loss red
  if (score >= 55) return "hsl(38, 88%, 52%)";  // greed → amber gold
  if (score >= 45) return "hsl(178, 58%, 40%)"; // neutral → teal
  return "hsl(162, 52%, 38%)";                   // fear → gain teal-green
};

const Diary = () => {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["marketDiary"],
    queryFn: fetchMarketDiary,
    staleTime: 30 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="glass rounded-2xl p-5 border border-border text-sm text-muted-foreground text-center">
            실시간 시황을 불러오는 중이야
          </div>
        </div>
      </AppShell>
    );
  }

  if (isError || !data) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="glass rounded-2xl p-5 border border-border text-sm text-muted-foreground text-center">
            실시간 시황을 아직 가져오지 못했어. 잠시 후 다시 시도해줘.
          </div>
        </div>
      </AppShell>
    );
  }

  const FEAR_GREED = data.fear_greed;
  const MARKET_TEMP = data.market_temperature;
  const SENTIMENT_DATA: MarketDiarySymbolSentiment[] = data.symbol_sentiments;
  const DIARY_ENTRIES = data.diary_entries;

  const fgColor = getFearGreedColor(FEAR_GREED.score);
  const fgCircumference = 2 * Math.PI * 36;
  const fgOffset = fgCircumference - (FEAR_GREED.score / 100) * fgCircumference;
  // Track ring color: light gray for white theme
  const trackColor = "hsl(220, 18%, 88%)";

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* ─── Hero ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-foreground">개미의 일기</h1>
            <p className="text-sm text-muted-foreground">시장 심리 분석 · AI 감성 대시보드</p>
          </div>
        </motion.div>

        {/* ─── Fear & Greed + Market Temp ─── */}
        {data?.cache_status === "stale" ? (
          <div className="text-xs px-3 py-2 rounded-lg border bg-warning/10 text-warning border-warning/20">
            전일 캐시 기준 시황이야. 최신 기사 수집이 끝나면 자동으로 갱신돼.
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Fear & Greed */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass rounded-2xl p-5 border border-border"
          >
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">공포 &amp; 탐욕 지수</span>
            </div>
            <div className="flex items-center gap-5">
              {/* Ring */}
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 84 84">
                  <circle cx="42" cy="42" r="36" fill="none" stroke={trackColor} strokeWidth="7" />
                  <motion.circle
                    cx="42" cy="42" r="36" fill="none"
                    stroke={fgColor} strokeWidth="7" strokeLinecap="round"
                    strokeDasharray={fgCircumference}
                    initial={{ strokeDashoffset: fgCircumference }}
                    animate={{ strokeDashoffset: fgOffset }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold font-mono" style={{ color: fgColor }}>
                    {FEAR_GREED.score}
                  </span>
                </div>
              </div>

              <div className="flex-1">
                <div className="text-2xl font-bold" style={{ color: fgColor }}>{FEAR_GREED.label}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  전일 대비{" "}
                  <span className={FEAR_GREED.score > FEAR_GREED.prev ? "text-gain font-semibold" : "text-loss font-semibold"}>
                    {FEAR_GREED.score > FEAR_GREED.prev ? "+" : ""}{FEAR_GREED.score - FEAR_GREED.prev}
                  </span>
                </div>
                <div className="mt-3 flex gap-1 flex-wrap">
                  {["극공포", "공포", "중립", "탐욕", "극탐욕"].map((l) => (
                    <span key={l} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-medium">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Market Temperature */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-5 border border-border"
          >
            <div className="flex items-center gap-2 mb-4">
              <Thermometer className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">시장 온도계</span>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-xs font-medium mb-2">
                <span className="text-muted-foreground">냉각</span>
                <span className="text-accent font-bold">{MARKET_TEMP.label}</span>
                <span className="text-muted-foreground">과열</span>
              </div>
              {/* Gradient bar */}
              <div className="h-3 bg-secondary rounded-full overflow-hidden relative">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, hsl(178,58%,40%), hsl(38,88%,52%), hsl(350,68%,52%))" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${MARKET_TEMP.score}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-foreground rounded-full border-2 border-background shadow-md"
                  initial={{ left: "0%" }}
                  animate={{ left: `calc(${MARKET_TEMP.score}% - 8px)` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <div className="text-3xl font-bold font-mono text-accent mt-3">
                {MARKET_TEMP.score}
                <span className="text-sm font-normal text-muted-foreground">/100</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">단기 과열 구간 진입. 분할 매수·손절 라인 재점검 권장.</p>
          </motion.div>
        </div>

        {/* ─── Sentiment by Stock ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass rounded-2xl p-5 border border-border"
        >
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
            종목별 투자자 심리
          </div>
          <div className="space-y-2">
            {SENTIMENT_DATA.map((s, i) => (
              <motion.button
                key={s.symbol}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedSymbol(selectedSymbol === s.symbol ? null : s.symbol)}
                className={`w-full text-left rounded-xl p-3 transition-all border ${
                  selectedSymbol === s.symbol
                    ? "border-primary/40 bg-primary/5"
                    : "border-transparent hover:bg-secondary/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {s.symbol.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">{s.symbol}</span>
                        <span className="text-xs text-muted-foreground">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        <span className="text-muted-foreground">{s.posts.toLocaleString()}건</span>
                        <span className={s.change >= 0 ? "text-gain" : "text-loss"}>
                          {s.change >= 0
                            ? <TrendingUp className="w-3 h-3 inline" />
                            : <TrendingDown className="w-3 h-3 inline" />}
                          {Math.abs(s.change)}%
                        </span>
                      </div>
                    </div>
                    {/* Stacked sentiment bar */}
                    <div className="flex h-2 rounded-full overflow-hidden gap-px">
                      <motion.div
                        className="bg-gain rounded-l-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${s.bullish}%` }}
                        transition={{ duration: 0.7, delay: i * 0.05 }}
                      />
                      <motion.div
                        className="bg-secondary"
                        initial={{ width: 0 }}
                        animate={{ width: `${s.neutral}%` }}
                        transition={{ duration: 0.7, delay: i * 0.05 + 0.1 }}
                      />
                      <motion.div
                        className="bg-loss rounded-r-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${s.bearish}%` }}
                        transition={{ duration: 0.7, delay: i * 0.05 + 0.2 }}
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-1 font-medium">
                      <span className="text-gain">강세 {s.bullish}%</span>
                      <span className="text-muted-foreground">중립 {s.neutral}%</span>
                      <span className="text-loss">약세 {s.bearish}%</span>
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ─── AI Diary Entries ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">AI 시황 일기</div>

          {DIARY_ENTRIES.map((entry, i) => {
            const moodCfg = MOOD_CONFIG[entry.mood as keyof typeof MOOD_CONFIG];
            const MoodIcon = moodCfg.icon;
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="glass rounded-2xl p-5 border border-border"
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-bold shrink-0 ${moodCfg.cls}`}>
                    <MoodIcon className="w-3.5 h-3.5" />
                    {moodCfg.label}
                  </div>
                  <span className="text-xs text-muted-foreground font-mono pt-0.5">{entry.date}</span>
                </div>

                {/* Title */}
                <h3 className="font-bold text-base text-foreground mb-2">{entry.title}</h3>

                {/* Body */}
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{entry.body}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {entry.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-semibold border border-primary/20"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

      </div>
    </AppShell>
  );
};

export default Diary;
