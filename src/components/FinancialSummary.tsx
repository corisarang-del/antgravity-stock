import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  type CartesianGridProps,
} from "recharts";
import { StockFinancials } from "@/data/stockData";
import { DollarSign, TrendingUp, BarChart2, Percent, type LucideIcon } from "lucide-react";

interface FinancialSummaryProps {
  financials: StockFinancials;
  symbol: string;
}

const KR_SYMBOL_RE = /^\d{6}$/;

// Korean stock codes (6-digit numbers)
const isKoreanStock = (symbol: string) => KR_SYMBOL_RE.test(symbol);

type MetricCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  color?: string;
};

const MetricCard = ({ icon: Icon, label, value, sub, color = "primary" }: MetricCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass rounded-xl p-4 flex items-start gap-3"
  >
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-${color}/10 border border-${color}/20`}>
      <Icon className={`w-4 h-4 text-${color}`} />
    </div>
    <div>
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div className="font-mono font-bold text-sm">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  </motion.div>
);

interface ChartTooltipDatum {
  value?: number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipDatum[];
  label?: string;
  isKrw: boolean;
}

const ChartTooltip = ({ active, payload, label, isKrw }: ChartTooltipProps) => {
  if (active && payload?.length) {
    const val = payload[0]?.value;
    const formatted = isKrw
      ? `${val?.toFixed(1)}조원`
      : `$${val?.toFixed(1)}B`;
    return (
      <div className="glass rounded-lg p-2 text-xs shadow-xl border border-border">
        <div className="text-muted-foreground mb-1">{label}</div>
        <div className="font-mono font-semibold text-foreground">{formatted}</div>
      </div>
    );
  }
  return null;
};

export function FinancialSummary({ financials, symbol }: FinancialSummaryProps) {
  const krw = isKoreanStock(symbol);
  const revenueUnit = krw ? "연간 매출 (조원)" : "연간 매출 (십억 USD)";
  const incomeUnit = krw ? "연간 순이익 (조원)" : "연간 순이익 (십억 USD)";

  // EPS display: Korean stocks in ₩, US in $
  const epsDisplay = krw
    ? `₩${financials.eps.toLocaleString("ko-KR")}`
    : `$${financials.eps.toFixed(2)}`;

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          icon={DollarSign}
          label="시가총액"
          value={financials.marketCap}
          color="primary"
        />
        <MetricCard
          icon={TrendingUp}
          label="EPS"
          value={epsDisplay}
          sub={`PER ${financials.per}x`}
          color="gain"
        />
        <MetricCard
          icon={BarChart2}
          label="PBR"
          value={`${financials.pbr}x`}
          sub={`ROE ${financials.roe.toFixed(1)}%`}
          color="primary"
        />
        <MetricCard
          icon={Percent}
          label="배당수익률"
          value={financials.dividendYield > 0 ? `${financials.dividendYield}%` : "N/A"}
          sub={`부채비율 ${financials.debtRatio}%`}
          color="warning"
        />
      </div>

      {/* Revenue & Net Income Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revenue */}
        <div className="glass rounded-xl p-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">{revenueUnit}</div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financials.revenue} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGridCustom />
                <XAxis
                  dataKey="year"
                  tick={{ fill: "hsl(215, 20%, 45%)", fontSize: 10, fontFamily: "JetBrains Mono" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(215, 20%, 45%)", fontSize: 10, fontFamily: "JetBrains Mono" }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip content={<ChartTooltip isKrw={krw} />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {financials.revenue.map((_, i) => (
                    <Cell
                      key={i}
                      fill="hsl(178, 58%, 40%)"
                      fillOpacity={i === financials.revenue.length - 1 ? 0.9 : 0.4}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Net Income */}
        <div className="glass rounded-xl p-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">{incomeUnit}</div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financials.netIncome} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGridCustom />
                <XAxis
                  dataKey="year"
                  tick={{ fill: "hsl(215, 20%, 45%)", fontSize: 10, fontFamily: "JetBrains Mono" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(215, 20%, 45%)", fontSize: 10, fontFamily: "JetBrains Mono" }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip content={<ChartTooltip isKrw={krw} />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {financials.netIncome.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.value >= 0 ? "hsl(158, 64%, 42%)" : "hsl(0, 72%, 51%)"}
                      fillOpacity={i === financials.netIncome.length - 1 ? 0.9 : 0.45}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function CartesianGridCustom() {
  const props: CartesianGridProps = {
    strokeDasharray: "3 3",
    stroke: "hsl(215, 20%, 88%)",
    vertical: false,
  };
  return <CartesianGrid {...props} />;
}
