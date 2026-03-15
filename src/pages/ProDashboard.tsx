import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Lock, BarChart2, Star, TrendingUp, DollarSign, BookOpen, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AiScreener } from "@/components/AiScreener";
import { SectorHeatmap } from "@/components/SectorHeatmap";
import { InvestmentScoreCard } from "@/components/InvestmentScoreCard";
import { FundamentalsGrid } from "@/components/FundamentalsGrid";
import { HistoricalTable } from "@/components/HistoricalTable";
import { DividendCalendar } from "@/components/DividendCalendar";
import { ProTopRanking } from "@/components/ProTopRanking";
import { useSubscription } from "@/hooks/useSubscription";
import { fetchFundamentals, type Fundamentals } from "@/lib/apiClient";

// 14개 종목 목록 (backend/data/pipeline.py TICKERS 동기화)
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
};

const TABS = [
  { key: "overview", label: "개요", icon: BarChart2 },
  { key: "screener", label: "스크리너", icon: Star },
  { key: "sector", label: "섹터", icon: TrendingUp },
  { key: "fundamentals", label: "재무", icon: BookOpen },
  { key: "dividends", label: "배당", icon: DollarSign },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// TICKERS 심볼 목록 (프론트에서 직접 참조)
const ALL_SYMBOLS = Object.keys(TICKERS ?? {});

function ProGate({ children }: { children: React.ReactNode }) {
  const { isPro, loading } = useSubscription();

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

export default function ProDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [selectedSymbol, setSelectedSymbol] = useState(ALL_SYMBOLS[0] ?? "NVDA");

  // 개요 탭용: 모든 종목 fundamentals 병렬 로드
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
    staleTime: 30 * 60 * 1000,
    enabled: activeTab === "overview",
  });

  const selectedFund = useQuery({
    queryKey: ["fundamentals", selectedSymbol],
    queryFn: () => fetchFundamentals(selectedSymbol),
    staleTime: 30 * 60 * 1000,
    enabled: activeTab === "fundamentals",
  });

  const names = Object.fromEntries(
    ALL_SYMBOLS.map((s) => [s, TICKERS?.[s]?.name ?? s])
  );

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
              {fundQueries.isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : fundQueries.data ? (
                <ProTopRanking fundamentalsMap={fundQueries.data} names={names} />
              ) : null}
            </div>
          )}

          {activeTab === "screener" && <AiScreener />}

          {activeTab === "sector" && <SectorHeatmap />}

          {activeTab === "fundamentals" && (
            <div className="space-y-5">
              {/* 종목 선택 */}
              <div className="flex flex-wrap gap-1.5">
                {ALL_SYMBOLS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSymbol(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      selectedSymbol === s
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-muted-foreground border-border hover:bg-secondary/70"
                    }`}
                  >
                    {names[s] || s}
                  </button>
                ))}
              </div>

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
