import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CalendarDays, Building2, ChevronRight } from "lucide-react";
import { IpoItem, IpoStatus } from "@/data/ipoData";

interface IpoCardProps {
  ipo: IpoItem;
  index?: number;
}

const STATUS_STYLE: Record<IpoStatus, { label: string; cls: string }> = {
  open:     { label: "청약중",   cls: "bg-primary/15 text-primary border-primary/30" },
  upcoming: { label: "청약예정", cls: "bg-primary/15 text-primary border-primary/30" },
  closed:   { label: "청약마감", cls: "bg-muted text-muted-foreground border-border" },
};

export function IpoCard({ ipo, index = 0 }: IpoCardProps) {
  const st = STATUS_STYLE[ipo.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Link to={`/tips/${ipo.id}`}>
        <div className="glass rounded-xl p-4 md:p-5 hover:border-primary/40 border border-border transition-all group">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">{ipo.company.slice(0, 2)}</span>
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{ipo.company}</div>
                <div className="text-xs text-muted-foreground">{ipo.sector}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${st.cls}`}>
                {st.label}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">{ipo.summary}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-secondary/50 rounded-lg p-2.5">
              <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> 청약기일
              </div>
              <div className="text-xs font-semibold font-mono">
                {ipo.subscriptionStart}<br />~ {ipo.subscriptionEnd}
              </div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-2.5">
              <div className="text-[10px] text-muted-foreground mb-1">공모가</div>
              <div className="text-xs font-semibold">{ipo.offerPrice}</div>
              <div className="text-[10px] text-muted-foreground truncate">{ipo.priceRange}</div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-2.5">
              <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> 대표주관
              </div>
              <div className="text-xs font-semibold truncate">{ipo.leadUnderwriter}</div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-2.5">
              <div className="text-[10px] text-muted-foreground mb-1">상장예정일</div>
              <div className="text-xs font-semibold font-mono">{ipo.listingDate}</div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
