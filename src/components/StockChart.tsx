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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-lg p-3 text-xs shadow-xl">
        <div className="text-muted-foreground mb-2 font-medium">{label}</div>
        {payload.map((p: any) => (
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
              <stop
                offset="5%"
                stopColor={isGain ? "hsl(158, 64%, 52%)" : "hsl(0, 84%, 60%)"}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={isGain ? "hsl(158, 64%, 52%)" : "hsl(0, 84%, 60%)"}
                stopOpacity={0}
              />
            </linearGradient>
            <linearGradient id={predictedGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(185, 100%, 50%)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(185, 100%, 50%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(222, 30%, 18%)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 10, fontFamily: "JetBrains Mono" }}
            tickLine={false}
            axisLine={false}
            interval={Math.floor(data.length / 6)}
          />
          <YAxis
            tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 10, fontFamily: "JetBrains Mono" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => v.toLocaleString()}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            x={data[data.length - 10]?.date}
            stroke="hsl(185, 100%, 50%)"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
            label={{ value: "예측 시작", fill: "hsl(185, 100%, 50%)", fontSize: 10, position: "top" }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={isGain ? "hsl(158, 64%, 52%)" : "hsl(0, 84%, 60%)"}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="predicted"
            stroke="hsl(185, 100%, 50%)"
            strokeWidth={2}
            strokeDasharray="5 3"
            fill={`url(#${predictedGradientId})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
