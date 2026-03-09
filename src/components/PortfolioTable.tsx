import { motion } from "framer-motion";
import { Trash2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import type { Holding } from "@/pages/Portfolio";

interface Props {
  holdings: Holding[];
  onRemove: (id: string) => void;
}

export function PortfolioTable({ holdings, onRemove }: Props) {
  if (holdings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
        <span className="text-4xl">📊</span>
        <p className="text-sm">보유 종목이 없습니다. 종목을 추가해보세요!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full text-sm min-w-[600px]">
        <thead>
        <tr className="border-b border-border">
            {["종목", "수량", "평균단가", "현재가", "평가금액", "손익", "수익률", ""].map((h) => (
              <th key={h} className="pb-2.5 text-left text-xs text-muted-foreground font-semibold uppercase tracking-wide px-2 first:pl-0 last:pr-0">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {holdings.map((h, idx) => {
            const cost = h.avgPrice * h.quantity;
            const value = h.currentPrice * h.quantity;
            const pnl = value - cost;
            const returnPct = (pnl / cost) * 100;
            const isGain = pnl >= 0;

            const fmtPrice = (p: number) =>
              p >= 1000 ? p.toLocaleString("ko-KR") : p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            return (
              <motion.tr
                key={h.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: idx * 0.04 }}
                className="border-b border-border/40 hover:bg-secondary/30 transition-colors"
              >
                <td className="py-3 px-2 pl-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {h.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-semibold font-mono text-xs">{h.symbol}</div>
                      <div className="text-xs text-muted-foreground leading-none">{h.name}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-2 font-mono text-xs">{h.quantity.toLocaleString()}</td>
                <td className="py-3 px-2 font-mono text-xs text-muted-foreground">{fmtPrice(h.avgPrice)}</td>
                <td className="py-3 px-2 font-mono text-xs">{fmtPrice(h.currentPrice)}</td>
                <td className="py-3 px-2 font-mono text-xs">{fmtPrice(value)}</td>
                <td className={`py-3 px-2 font-mono text-xs font-semibold ${isGain ? "text-gain" : "text-loss"}`}>
                  {isGain ? "+" : ""}{fmtPrice(pnl)}
                </td>
                <td className={`py-3 px-2 font-mono text-xs font-bold ${isGain ? "text-gain" : "text-loss"}`}>
                  <span className={`px-1.5 py-0.5 rounded text-xs ${isGain ? "bg-gain/10" : "bg-loss/10"}`}>
                    {isGain ? "+" : ""}{returnPct.toFixed(2)}%
                  </span>
                </td>
                <td className="py-3 pr-0 pl-2">
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/stock/${h.symbol}`}
                      className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"
                      title="상세 보기"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => onRemove(h.id)}
                      className="p-1 rounded text-muted-foreground hover:text-loss transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
