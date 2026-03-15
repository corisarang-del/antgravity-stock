import { lazy, Suspense, useState, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Lock, BarChart2, Star, TrendingUp, DollarSign, BookOpen, Loader2, Search, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AiScreener } from "@/components/AiScreener";
import { InvestmentScoreCard } from "@/components/InvestmentScoreCard";
import { FundamentalsGrid } from "@/components/FundamentalsGrid";
import { HistoricalTable } from "@/components/HistoricalTable";
import { DividendCalendar } from "@/components/DividendCalendar";
import { ProTopRanking } from "@/components/ProTopRanking";
import { ProMarketList } from "@/components/ProMarketList";

// Rule 2.4: Recharts Treemap는 무거운 컴포넌트 → 탭 전환 시에만 로드
const SectorHeatmap = lazy(() =>
  import("@/components/SectorHeatmap").then((m) => ({ default: m.SectorHeatmap }))
);
import { useSubscription } from "@/hooks/useSubscription";
import { fetchFundamentals, fetchMarketSearch, type Fundamentals } from "@/lib/apiClient";

// 전체 종목 목록 (backend/data/pipeline.py TICKERS 동기화)
const TICKERS: Record<string, { name: string; market: string }> = {
  "005930.KS": { name: "삼성전자", market: "KR" },
  "000660.KS": { name: "SK하이닉스", market: "KR" },
  "005380.KS": { name: "현대자동차", market: "KR" },
  "012330.KS": { name: "현대모비스", market: "KR" },
  "267270.KS": { name: "효성중공업", market: "KR" },
  "TSLA":      { name: "테슬라", market: "US" },
  "NVDA":      { name: "엔비디아", market: "US" },
  "AAPL":      { name: "애플", market: "US" },
  "GOOGL":     { name: "알파벳", market: "US" },
  "MSFT":      { name: "마이크로소프트", market: "US" },
  "PLTR":      { name: "팔란티어", market: "US" },
  "HOOD":      { name: "로빈후드", market: "US" },
  "SPY":       { name: "S&P 500 ETF", market: "US" },
  "VOO":       { name: "Vanguard ETF", market: "US" },
};

const TABS = [
  { key: "overview", label: "개요", icon: BarChart2 },
  { key: "screener", label: "스크리너", icon: Star },
  { key: "sector", label: "섹터", icon: TrendingUp },
  { key: "fundamentals", label: "재무", icon: BookOpen },
  { key: "dividends", label: "배당", icon: DollarSign },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// Rule 6.3 rendering-hoist-jsx: 상수에서 파생된 값은 컴포넌트 외부로 호이스팅
// (TICKERS가 모듈 상수이므로 매 렌더마다 재생성할 필요 없음)
const ALL_SYMBOLS = Object.keys(TICKERS);
const TICKER_NAMES: Record<string, string> = Object.fromEntries(
  ALL_SYMBOLS.map((s) => [s, TICKERS[s].name])
);

function ProGate({ children }: { children: React.ReactNode }) {
  const { isPro, loading } = useSubscription();

  // 개발 환경에서는 Pro 게이트 우회 (빌드 시 dead code로 제거됨)
  if (import.meta.env.DEV) return <>{children}</>;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Pro 전용 기능</h2>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            Pro 대시보드는 구독 회원 전용입니다. 재무지표, AI 스크리너, 섹터 히트맵을 이용하려면 업그레이드하세요.
          </p>
        </div>
        <Link
          to="/upgrade"
          className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
        >
          Pro 업그레이드
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}

// 종목 서치 컴포넌트 — 2글자 이상 입력 시 전체 universe(13,830개) API 검색
function TickerSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (symbol: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();

  // 2글자 이상 → API 검색, 미만 → 로컬 14개 표시
  const { data: searchData } = useQuery({
    queryKey: ["tickerSearch", trimmed],
    queryFn: () => fetchMarketSearch(trimmed),
    enabled: trimmed.length >= 2,
    staleTime: 2 * 60 * 1000,
  });

  const items = useMemo(() => {
    if (trimmed.length >= 2) {
      return (searchData?.items ?? []).map((s) => ({ symbol: s.symbol, name: s.name ?? s.symbol }));
    }
    return ALL_SYMBOLS.map((s) => ({ symbol: s, name: TICKER_NAMES[s] }));
  }, [trimmed, searchData]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function select(symbol: string) {
    onChange(symbol);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-secondary/50 focus-within:border-primary/50 focus-within:bg-secondary transition-colors">
        <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <input
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-0"
          placeholder={`${TICKER_NAMES[value] || value} 검색...`}
          aria-label="종목 검색"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="검색어 초기화">
            <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
        {!query && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-semibold shrink-0">
            {value}
          </span>
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-border bg-background shadow-lg">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">검색 결과 없음</p>
          ) : (
            items.map(({ symbol, name }) => (
              <button
                key={symbol}
                onClick={() => select(symbol)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-secondary transition-colors ${
                  symbol === value ? "bg-primary/10" : ""
                }`}
              >
                <span className="text-sm font-semibold">{name}</span>
                <span className="text-xs text-muted-foreground font-mono">{symbol}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function ProDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [selectedSymbol, setSelectedSymbol] = useState(ALL_SYMBOLS[0] ?? "NVDA");

  // 개요 탭용: 페이지 마운트 즉시 병렬 prefetch (탭 전환 대기 없음)
  const fundQueries = useQuery({
    queryKey: ["allFundamentals"],
    queryFn: async () => {
      const results = await Promise.allSettled(
        ALL_SYMBOLS.map((s) => fetchFundamentals(s))
      );
      const map: Record<string, Fundamentals> = {};
      results.forEach((r, i) => {
        if (r.status === "fulfilled") map[ALL_SYMBOLS[i]] = r.value;
      });
      return map;
    },
    staleTime: 8 * 60 * 60 * 1000, // 8시간 — 재무데이터는 장중 변동 없음
  });

  const selectedFund = useQuery({
    queryKey: ["fundamentals", selectedSymbol],
    queryFn: () => fetchFundamentals(selectedSymbol),
    staleTime: 8 * 60 * 60 * 1000,
    enabled: activeTab === "fundamentals",
  });

  return (
    <AppShell hideTicker>
      <ProGate>
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          {/* 헤더 */}
          <div className="glass rounded-2xl p-5 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <BarChart2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Pro 대시보드</h1>
                <p className="text-xs text-muted-foreground">AI 재무분석 · 스크리너 · 섹터 히트맵</p>
              </div>
              <span className="ml-auto text-[11px] px-2 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary font-semibold">PRO</span>
            </div>
          </div>

          {/* 탭 */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                  activeTab === key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/70"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* 탭 콘텐츠 */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Top Ranking: fundamentals 로드 완료 후 표시 */}
              {fundQueries.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : fundQueries.data ? (
                <ProTopRanking fundamentalsMap={fundQueries.data} names={TICKER_NAMES} />
              ) : null}

              {/* 전체 시장 목록: fundamentals 기다리지 않고 즉시 표시 */}
              <ProMarketList
                onSelect={(symbol) => {
                  setSelectedSymbol(symbol);
                  setActiveTab("fundamentals");
                }}
              />
            </div>
          )}

          {activeTab === "screener" && <AiScreener />}

          {activeTab === "sector" && (
            <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}>
              <SectorHeatmap />
            </Suspense>
          )}

          {activeTab === "fundamentals" && (
            <div className="space-y-5">
              {/* 종목 검색 */}
              <TickerSearch value={selectedSymbol} onChange={setSelectedSymbol} />

              {selectedFund.isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : selectedFund.data ? (
                <div className="space-y-5">
                  <InvestmentScoreCard score={selectedFund.data.score} />
                  <div className="glass rounded-2xl border border-border p-5">
                    <h3 className="font-bold text-base mb-4">재무지표</h3>
                    <FundamentalsGrid data={selectedFund.data} />
                  </div>
                  <div className="glass rounded-2xl border border-border p-5">
                    <h3 className="font-bold text-base mb-4">5개년 재무 히스토리</h3>
                    <HistoricalTable symbol={selectedSymbol} />
                  </div>
                </div>
              ) : selectedFund.isError ? (
                <p className="text-sm text-muted-foreground text-center py-8">재무 데이터를 불러올 수 없습니다.</p>
              ) : null}
            </div>
          )}

          {activeTab === "dividends" && <DividendCalendar />}
        </div>
      </ProGate>
    </AppShell>
  );
}
