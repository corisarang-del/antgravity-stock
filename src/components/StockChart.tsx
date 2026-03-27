import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { motion } from "framer-motion";

interface StockChartProps {
  data: {
    date: string;
    price: number;
    predicted: number | null;
    volume: number;
  }[];
  symbol: string;
  isGain: boolean;
}

interface StockChartTooltipDatum {
  dataKey?: string;
  color?: string;
  value?: number;
}

interface StockChartTooltipProps {
  active?: boolean;
  payload?: StockChartTooltipDatum[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: StockChartTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-lg p-3 text-xs shadow-xl">
        <div className="text-muted-foreground mb-2 font-medium">{label}</div>
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">
              {p.dataKey === "price" ? "실제가" : "예측가"}:
            </span>
            <span className="font-mono font-semibold">{p.value?.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function StockChart({ data, symbol, isGain }: StockChartProps) {
  const gradientId = `gradient-${symbol}`;
  const predictedGradientId = `gradient-predicted-${symbol}`;

  const gainColor = "hsl(162, 52%, 38%)";
  const lossColor = "hsl(350, 68%, 52%)";
  const lineColor = isGain ? gainColor : lossColor;
  const predictColor = "hsl(178, 58%, 40%)";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="w-full h-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={lineColor} stopOpacity={0.18} />
              <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={predictedGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={predictColor} stopOpacity={0.12} />
              <stop offset="95%" stopColor={predictColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(220, 18%, 88%)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: "hsl(220, 12%, 55%)", fontSize: 10, fontFamily: "JetBrains Mono" }}
            tickLine={false}
            axisLine={false}
            interval={Math.floor(data.length / 6)}
          />
          <YAxis
            tick={{ fill: "hsl(220, 12%, 55%)", fontSize: 10, fontFamily: "JetBrains Mono" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => v.toLocaleString()}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            x={data[data.length - 10]?.date}
            stroke={predictColor}
            strokeDasharray="4 4"
            strokeOpacity={0.6}
            label={{ value: "예측 시작", fill: predictColor, fontSize: 10, position: "top" }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={lineColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: lineColor }}
          />
          <Area
            type="monotone"
            dataKey="predicted"
            stroke={predictColor}
            strokeWidth={2}
            strokeDasharray="5 3"
            fill={`url(#${predictedGradientId})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: predictColor }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
