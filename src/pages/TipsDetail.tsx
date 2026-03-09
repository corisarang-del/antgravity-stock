import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarDays, Building2, AlertTriangle, Tag, TrendingUp, Clock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getIpoById, STATUS_LABELS, IpoStatus } from "@/data/ipoData";

const STATUS_STYLE: Record<IpoStatus, { cls: string }> = {
  open:     { cls: "bg-primary/15 text-primary border-primary/30" },
  upcoming: { cls: "bg-primary/15 text-primary border-primary/30" },
  closed:   { cls: "bg-muted text-muted-foreground border-border" },
};

const TipsDetail = () => {
  const { id } = useParams<{ id: string }>();
  const ipo = getIpoById(id ?? "");

  if (!ipo) {
    return (
      <AppShell hideTicker>
        <div className="flex flex-col items-center justify-center py-32 gap-4 text-muted-foreground">
          <p>공모주 정보를 찾을 수 없습니다.</p>
          <Link to="/tips" className="text-primary text-sm hover:underline">목록으로 돌아가기</Link>
        </div>
      </AppShell>
    );
  }

  const st = STATUS_STYLE[ipo.status];

  return (
    <AppShell hideTicker>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Back */}
        <Link to="/tips" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> 꿀팁정보 목록
        </Link>

        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 border border-border"
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-primary">{ipo.company.slice(0, 2)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="font-bold text-xl">{ipo.company}</h1>
                <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${st.cls}`}>
                  {STATUS_LABELS[ipo.status]}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Tag className="w-3 h-3" />
                {ipo.sector}
                <span>·</span>
                <TrendingUp className="w-3 h-3" />
                {ipo.marketCap}
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{ipo.summary}</p>
        </motion.div>

        {/* Key Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3"
        >
          {[
            { label: "공모가", value: ipo.offerPrice, sub: ipo.priceRange },
            { label: "상장예정일", value: ipo.listingDate, icon: CalendarDays },
            { label: "청약 기간", value: `${ipo.subscriptionStart}`, sub: `~ ${ipo.subscriptionEnd}` },
            { label: "대표주관", value: ipo.leadUnderwriter, icon: Building2 },
          ].map(({ label, value, sub, icon: Icon }) => (
            <div key={label} className="glass rounded-xl p-4 border border-border">
              <div className="text-[11px] text-muted-foreground mb-2 flex items-center gap-1">
                {Icon && <Icon className="w-3 h-3" />} {label}
              </div>
              <div className="font-semibold text-sm">{value}</div>
              {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
            </div>
          ))}
        </motion.div>

        {/* Lockup */}
        {ipo.lockupPeriod && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-secondary/50 border border-border"
          >
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="text-xs">
              <span className="text-muted-foreground">보호예수 기간: </span>
              <span className="font-semibold">{ipo.lockupPeriod}</span>
            </div>
          </motion.div>
        )}

        {/* Details */}
        {ipo.details && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-5 border border-border"
          >
            <h2 className="font-semibold text-sm mb-3">기업 상세 정보</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{ipo.details}</p>
          </motion.div>
        )}

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-warning/5 border border-warning/20"
        >
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-warning font-semibold">투자 주의:</span> 본 정보는 참고용으로만 제공됩니다.
            투자 결정 전 반드시 금감원 전자공시시스템(DART) 공시 내용을 직접 확인하시기 바랍니다.
          </p>
        </motion.div>
      </div>
    </AppShell>
  );
};

export default TipsDetail;
