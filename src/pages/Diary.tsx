import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, TrendingUp, TrendingDown, Minus, ThumbsUp, ThumbsDown, Activity, Thermometer } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { STOCKS } from "@/data/stockData";

// Mock sentiment data
const FEAR_GREED = {
  score: 62,
  label: "탐욕",
  prev: 55,
};

const MARKET_TEMP = {
  score: 71,
  label: "과열 주의",
};

interface SentimentEntry {
  symbol: string;
  name: string;
  bullish: number; // 0-100
  bearish: number;
  neutral: number;
  posts: number;
  change: number; // sentiment change vs yesterday
}

const SENTIMENT_DATA: SentimentEntry[] = [
  { symbol: "NVDA", name: "NVIDIA", bullish: 78, bearish: 12, neutral: 10, posts: 14820, change: 6 },
  { symbol: "AAPL", name: "Apple", bullish: 65, bearish: 20, neutral: 15, posts: 9340, change: -3 },
  { symbol: "TSLA", name: "Tesla", bullish: 42, bearish: 45, neutral: 13, posts: 21500, change: -8 },
  { symbol: "MSFT", name: "Microsoft", bullish: 71, bearish: 14, neutral: 15, posts: 7620, change: 4 },
  { symbol: "005930", name: "삼성전자", bullish: 58, bearish: 28, neutral: 14, posts: 32100, change: 2 },
  { symbol: "000660", name: "SK하이닉스", bullish: 72, bearish: 18, neutral: 10, posts: 11400, change: 9 },
  { symbol: "035420", name: "NAVER", bullish: 55, bearish: 30, neutral: 15, posts: 8900, change: -1 },
];

const DIARY_ENTRIES = [
  {
    id: 1,
    date: "2026-03-09",
    mood: "bullish",
    title: "AI 반도체 사이클, 아직 끝나지 않았다",
    body: "NVDA의 블랙웰 수요가 예상보다 강합니다. 데이터센터 업그레이드 사이클이 2027년까지 이어질 것이라는 분석이 힘을 얻고 있습니다. 개미 투자자 입장에서는 단기 변동성보다 장기 트렌드에 집중하는 전략이 유효해 보입니다.",
    tags: ["NVDA", "AI", "반도체"],
  },
  {
    id: 2,
    date: "2026-03-08",
    mood: "neutral",
    title: "FOMC 전 눈치 보기 장세, 방어적 포지션 고려",
    body: "다음 주 FOMC를 앞두고 시장 변동성이 커지고 있습니다. 금리 동결 확률이 높지만 파월 의장의 발언 수위에 따라 단기 급등락이 발생할 수 있습니다. 현금 비중을 일부 높이며 기회를 기다리는 전략을 권장합니다.",
    tags: ["FOMC", "금리", "방어주"],
  },
  {
    id: 3,
    date: "2026-03-07",
    mood: "bearish",
    title: "테슬라 1분기 인도량 우려, 단기 매도 압력 지속",
    body: "테슬라 1분기 인도량이 컨센서스를 하회할 것이라는 전망이 나오고 있습니다. 중국 시장 경쟁 심화와 유럽 수요 둔화가 주요 원인입니다. 단기적으로 추가 하락 압력이 있을 수 있으며, 지지선 확인 후 접근을 권장합니다.",
    tags: ["TSLA", "EV", "중국"],
  },
];

const MOOD_CONFIG = {
  bullish: { label: "강세", icon: ThumbsUp, cls: "text-gain bg-gain/10 border-gain/20" },
  neutral: { label: "중립", icon: Minus,    cls: "text-warning bg-warning/10 border-warning/20" },
  bearish: { label: "약세", icon: ThumbsDown, cls: "text-loss bg-loss/10 border-loss/20" },
};

const getFearGreedColor = (score: number) => {
  if (score >= 75) return "hsl(0, 84%, 60%)";
  if (score >= 55) return "hsl(45, 93%, 58%)";
  if (score >= 45) return "hsl(185, 100%, 50%)";
  return "hsl(158, 64%, 52%)";
};

const Diary = () => {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const sentimentEntry = selectedSymbol
    ? SENTIMENT_DATA.find((s) => s.symbol === selectedSymbol)
    : null;

  const fgColor = getFearGreedColor(FEAR_GREED.score);
  const fgCircumference = 2 * Math.PI * 36;
  const fgOffset = fgCircumference - (FEAR_GREED.score / 100) * fgCircumference;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg">개미의 일기</h1>
            <p className="text-xs text-muted-foreground">시장 심리 분석 · AI 감성 대시보드</p>
          </div>
        </motion.div>

        {/* Fear & Greed + Market Temp */}
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
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">공포 & 탐욕 지수</span>
            </div>
            <div className="flex items-center gap-5">
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 84 84">
                  <circle cx="42" cy="42" r="36" fill="none" stroke="hsl(222, 30%, 18%)" strokeWidth="7" />
                  <motion.circle
                    cx="42" cy="42" r="36" fill="none"
                    stroke={fgColor} strokeWidth="7" strokeLinecap="round"
                    strokeDasharray={fgCircumference}
                    initial={{ strokeDashoffset: fgCircumference }}
                    animate={{ strokeDashoffset: fgOffset }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold font-mono" style={{ color: fgColor }}>{FEAR_GREED.score}</span>
                </div>
              </div>
              <div>
                <div className="text-xl font-bold" style={{ color: fgColor }}>{FEAR_GREED.label}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  전일 대비 <span className={FEAR_GREED.score > FEAR_GREED.prev ? "text-gain" : "text-loss"}>
                    {FEAR_GREED.score > FEAR_GREED.prev ? "+" : ""}{FEAR_GREED.score - FEAR_GREED.prev}
                  </span>
                </div>
                <div className="mt-3 flex gap-1 text-[10px]">
                  {["극도공포", "공포", "중립", "탐욕", "극도탐욕"].map((l, i) => (
                    <span key={l} className="px-1.5 py-0.5 rounded bg-secondary/60 text-muted-foreground">{l}</span>
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
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">시장 온도계</span>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-muted-foreground">냉각</span>
                <span className="font-semibold text-warning">{MARKET_TEMP.label}</span>
                <span className="text-muted-foreground">과열</span>
              </div>
              <div className="h-3 bg-secondary rounded-full overflow-hidden relative">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, hsl(158,64%,52%), hsl(45,93%,58%), hsl(0,84%,60%))" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${MARKET_TEMP.score}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-foreground rounded-full border-2 border-background shadow"
                  initial={{ left: "0%" }}
                  animate={{ left: `calc(${MARKET_TEMP.score}% - 8px)` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <div className="text-3xl font-bold font-mono text-warning mt-3">{MARKET_TEMP.score}<span className="text-sm font-normal text-muted-foreground">/100</span></div>
            </div>
            <p className="text-xs text-muted-foreground">단기 과열 구간 진입. 분할 매수·손절 라인 재점검 권장.</p>
          </motion.div>
        </div>

        {/* Sentiment by Stock */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass rounded-2xl p-5 border border-border"
        >
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">종목별 투자자 심리</div>
          <div className="space-y-3">
            {SENTIMENT_DATA.map((s, i) => (
              <motion.button
                key={s.symbol}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedSymbol(selectedSymbol === s.symbol ? null : s.symbol)}
                className={`w-full text-left rounded-xl p-3 transition-all border ${
                  selectedSymbol === s.symbol ? "border-primary/40 bg-primary/5" : "border-transparent hover:bg-secondary/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {s.symbol.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">{s.symbol}</span>
                        <span className="text-xs text-muted-foreground">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span>{s.posts.toLocaleString()}건</span>
                        <span className={s.change >= 0 ? "text-gain" : "text-loss"}>
                          {s.change >= 0 ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />}
                          {Math.abs(s.change)}%
                        </span>
                      </div>
                    </div>
                    {/* Stacked bar */}
                    <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                      <motion.div
                        className="bg-gain rounded-l-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${s.bullish}%` }}
                        transition={{ duration: 0.7, delay: i * 0.05 }}
                      />
                      <motion.div
                        className="bg-muted-foreground/30"
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
                    <div className="flex justify-between text-[10px] mt-1 text-muted-foreground">
                      <span className="text-gain">강세 {s.bullish}%</span>
                      <span>중립 {s.neutral}%</span>
                      <span className="text-loss">약세 {s.bearish}%</span>
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* AI Diary Entries */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">AI 시황 일기</div>
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
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-semibold ${moodCfg.cls}`}>
                        <MoodIcon className="w-3 h-3" /> {moodCfg.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">{entry.date}</span>
                    </div>
                    <h3 className="font-semibold text-sm">{entry.title}</h3>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">{entry.body}</p>
                <div className="flex flex-wrap gap-1.5">
                  {entry.tags.map((tag) => (
                    <span key={tag} className="text-[11px] px-2 py-0.5 rounded-lg bg-secondary text-muted-foreground">
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
