import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { Holding } from "@/pages/Portfolio";

interface Props {
  holdings: Holding[];
}

// 90s anime teal/amber palette
const PIE_COLORS = [
  "hsl(178, 58%, 40%)",   // primary teal
  "hsl(38, 88%, 52%)",    // amber
  "hsl(162, 52%, 38%)",   // teal-green
  "hsl(200, 60%, 48%)",   // sky
  "hsl(350, 68%, 52%)",   // rose
  "hsl(258, 52%, 58%)",   // violet
  "hsl(178, 44%, 58%)",   // light teal
];

const RADIAN = Math.PI / 180;

interface CustomLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}

function CustomLabel({ cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 }: CustomLabelProps) {
  if (percent < 0.06) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export function PortfolioChart({ holdings }: Props) {
  const data = useMemo(
    () =>
      holdings.map((holding) => ({
        name: holding.symbol,
        fullName: holding.name,
        value: parseFloat((holding.currentPrice * holding.quantity).toFixed(2)),
      })),
    [holdings]
  );

  const total = useMemo(
    () => data.reduce((sum, item) => sum + item.value, 0),
    [data]
  );

  if (holdings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <span className="text-3xl">📊</span>
        <p className="text-sm">보유 종목이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={88}
              innerRadius={44}
              dataKey="value"
              labelLine={false}
              label={CustomLabel}
              strokeWidth={3}
              stroke="hsl(var(--background))"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`$${value.toLocaleString()}`, "평가금액"]}
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "10px",
                fontSize: "12px",
                color: "hsl(var(--foreground))",
                boxShadow: "0 4px 12px hsl(220 20% 60% / 0.12)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="space-y-2 pt-1 border-t border-border">
        {data.map((item, i) => {
          const pct = ((item.value / total) * 100).toFixed(1);
          return (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                <span className="font-mono font-semibold text-foreground">{item.name}</span>
                <span className="text-muted-foreground hidden sm:block truncate max-w-[80px]">{item.fullName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-mono">{pct}%</span>
                <span className="font-mono text-foreground font-semibold">${item.value.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
