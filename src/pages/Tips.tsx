import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Filter, AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { IpoCard } from "@/components/IpoCard";
import { IPO_DATA, IpoStatus, STATUS_LABELS } from "@/data/ipoData";
import { supabase } from "@/integrations/supabase/client";

type FilterKey = "all" | IpoStatus;
const FILTERS: FilterKey[] = ["all", "open", "upcoming", "closed"];

// Shape returned from edge function (superset of IpoItem)
interface DartIpoItem {
  id: string;
  company: string;
  status: IpoStatus;
  subscriptionStart: string;
  subscriptionEnd: string;
  listingDate: string;
  offerPrice: string;
  priceRange: string;
  leadUnderwriter: string;
  summary: string;
  sector: string;
  marketCap: string;
  rceptNo?: string;
}

const Tips = () => {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [ipoList, setIpoList] = useState<DartIpoItem[]>(IPO_DATA as DartIpoItem[]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    fetchIpo();
  }, []);

  const fetchIpo = async () => {
    setLoading(true);
    setError(null);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/dart-ipo`,
        { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } }
      );

      // Read body regardless of status code
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        throw new Error("응답 파싱 실패");
      }

      // If server returned data.list (even with fallback flag), use it
      if (data.list !== undefined) {
        if (data.fallback || data.error) {
          // Server-side fallback — use mock
          setIpoList(IPO_DATA as DartIpoItem[]);
          setIsLive(false);
          setError("DART 연동 실패 — 샘플 데이터를 표시합니다");
        } else if (data.list.length > 0) {
          setIpoList(data.list);
          setIsLive(true);
        } else {
          setIpoList(IPO_DATA as DartIpoItem[]);
          setIsLive(false);
        }
      } else if (data.error) {
        throw new Error(data.error);
      }
    } catch (e: any) {
      setIpoList(IPO_DATA as DartIpoItem[]);
      setIsLive(false);
      setError("DART 연동 실패 — 샘플 데이터를 표시합니다");
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === "all" ? ipoList : ipoList.filter((i) => i.status === filter);
  const openCount = ipoList.filter((i) => i.status === "open").length;
  const upcomingCount = ipoList.filter((i) => i.status === "upcoming").length;
  const closedCount = ipoList.filter((i) => i.status === "closed").length;

  return (
    <AppShell hideTicker>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 border border-border"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-lg">꿀팁정보 · IPO 청약</h1>
                <p className="text-xs text-muted-foreground">개미 투자자를 위한 공모주 청약 정보</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Live/mock indicator */}
              <div className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full border ${isLive ? "text-gain border-gain/20 bg-gain/10" : "text-muted-foreground border-border bg-secondary/40"}`}>
                {isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isLive ? "DART 실시간" : "샘플"}
              </div>
              <button
                onClick={fetchIpo}
                disabled={loading}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground disabled:opacity-40"
                title="새로고침"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            청약 일정, 공모가, 대표주관사 등 핵심 정보를 한눈에 확인하세요.
            금감원 DART 공시 데이터를 실시간으로 가져옵니다.
          </p>
        </motion.div>

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-warning/5 border border-warning/20 text-xs text-warning"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary Bar */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3"
          >
            {[
              { label: "청약중", count: openCount, active: true },
              { label: "청약예정", count: upcomingCount, active: true },
              { label: "청약마감", count: closedCount, active: false },
            ].map(({ label, count, active }) => (
              <div key={label} className={`glass rounded-xl p-3 text-center border ${active && count > 0 ? "border-primary/20" : "border-border"}`}>
                <div className={`text-2xl font-bold font-mono ${active && count > 0 ? "text-primary" : "text-muted-foreground"}`}>{count}</div>
                <div className="text-xs text-muted-foreground mt-1">{label}</div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Filter */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-2 flex-wrap"
          >
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex gap-1.5 flex-wrap">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filter === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/70"
                  }`}
                >
                  {STATUS_LABELS[f]}
                  {f !== "all" && (
                    <span className="ml-1.5 opacity-70">
                      {f === "open" ? openCount : f === "upcoming" ? upcomingCount : closedCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <span className="ml-auto text-xs text-muted-foreground">총 {filtered.length}건</span>
          </motion.div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass rounded-xl p-5 border border-border animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-secondary" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-secondary rounded w-1/3" />
                    <div className="h-2.5 bg-secondary rounded w-1/5" />
                  </div>
                </div>
                <div className="h-2.5 bg-secondary rounded w-3/4 mb-2" />
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {[1,2,3,4].map(j => <div key={j} className="h-12 bg-secondary rounded-lg" />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Card List */}
        {!loading && (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((ipo, i) => (
                <IpoCard key={ipo.id} ipo={ipo as any} index={i} />
              ))}
            </AnimatePresence>
            {filtered.length === 0 && (
              <div className="text-center py-16 text-muted-foreground text-sm">
                해당 상태의 공모주가 없습니다.
              </div>
            )}
          </div>
        )}

        {/* Disclaimer */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-warning/5 border border-warning/20"
          >
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-warning font-semibold">투자 주의:</span> 본 정보는 금감원 DART 공시 데이터를 기반으로 교육 목적으로만 제공되며, 투자 권유가 아닙니다.
              공모주 투자 시 원금 손실이 발생할 수 있으며, 투자 결정 전 증권신고서 및 투자설명서를 반드시 확인하시기 바랍니다.
              출처: 금융감독원 전자공시시스템(DART) · opendart.fss.or.kr
            </p>
          </motion.div>
        )}
      </div>
    </AppShell>
  );
};

export default Tips;
