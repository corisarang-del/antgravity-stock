import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { Holding } from "@/pages/Portfolio";

interface Props {
  holdings: Holding[];
}

const PIE_COLORS = [
  "hsl(185, 100%, 50%)",
  "hsl(142, 76%, 46%)",
  "hsl(221, 100%, 62%)",
  "hsl(38, 100%, 55%)",
  "hsl(280, 80%, 65%)",
  "hsl(350, 80%, 60%)",
  "hsl(165, 70%, 45%)",
];

const RADIAN = Math.PI / 180;

function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.06) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
}

export function PortfolioChart({ holdings }: Props) {
  if (holdings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        보유 종목이 없습니다
      </div>
    );
  }

  const data = holdings.map((h) => ({
    name: h.symbol,
    fullName: h.name,
    value: parseFloat((h.currentPrice * h.quantity).toFixed(2)),
  }));

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={90}
              innerRadius={46}
              dataKey="value"
              labelLine={false}
              label={CustomLabel}
              strokeWidth={2}
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
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(var(--foreground))",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="space-y-1.5">
        {data.map((item, i) => {
          const pct = (item.value / total * 100).toFixed(1);
          return (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="font-mono text-foreground">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{pct}%</span>
                <span className="font-mono text-foreground">${item.value.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
