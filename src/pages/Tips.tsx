import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Filter, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { IpoCard } from "@/components/IpoCard";
import { IPO_DATA, IpoStatus, STATUS_LABELS } from "@/data/ipoData";

type FilterKey = "all" | IpoStatus;

const FILTERS: FilterKey[] = ["all", "open", "upcoming", "closed"];

const Tips = () => {
  const [filter, setFilter] = useState<FilterKey>("all");

  const filtered = filter === "all" ? IPO_DATA : IPO_DATA.filter((i) => i.status === filter);
  const openCount = IPO_DATA.filter((i) => i.status === "open").length;
  const upcomingCount = IPO_DATA.filter((i) => i.status === "upcoming").length;
  const closedCount = IPO_DATA.filter((i) => i.status === "closed").length;

  return (
    <AppShell hideTicker>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 border border-border"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">꿀팁정보 · IPO</h1>
              <p className="text-xs text-muted-foreground">개미 투자자를 위한 공모주 청약 정보</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            청약 일정, 공모가, 대표주관사 등 핵심 정보를 한눈에 확인하세요.
            상장 전 충분한 분석으로 현명한 투자 결정을 내리세요.
          </p>
        </motion.div>

        {/* Summary Bar */}
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
            <div key={label} className={`glass rounded-xl p-3 text-center border ${active ? "border-primary/20" : "border-border"}`}>
              <div className={`text-2xl font-bold font-mono ${active ? "text-primary" : "text-muted-foreground"}`}>{count}</div>
              <div className="text-xs text-muted-foreground mt-1">{label}</div>
            </div>
          ))}
        </motion.div>

        {/* Filter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-2"
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

        {/* Card List */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((ipo, i) => (
              <IpoCard key={ipo.id} ipo={ipo} index={i} />
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm">
              해당 상태의 공모주가 없습니다.
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-warning/5 border border-warning/20"
        >
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-warning font-semibold">투자 주의:</span> 본 정보는 교육 목적으로만 제공되며, 투자 권유가 아닙니다.
            공모주 투자 시 원금 손실이 발생할 수 있으며, 투자 결정 전 금융감독원 전자공시시스템(DART) 및 증권신고서를 반드시 확인하시기 바랍니다.
            출처: 금감원 DART, 각 주관사 안내 자료 (참고용).
          </p>
        </motion.div>
      </div>
    </AppShell>
  );
};

export default Tips;
