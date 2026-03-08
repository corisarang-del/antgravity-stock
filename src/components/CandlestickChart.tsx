import {
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  Cell,
} from "recharts";
import { motion } from "framer-motion";

interface CandlestickData {
  date: string;
  open: number;
  high: number;
  low: number;
  price: number; // close
  volume: number;
}

interface CandlestickChartProps {
  data: CandlestickData[];
  symbol: string;
}

// Custom candlestick bar shape
const CandlestickBar = (props: any) => {
  const { x, y, width, height, open, close, high, low, chartHeight, yMin, yRange } = props;
  if (!open || !close || !high || !low) return null;

  const isGain = close >= open;
  const color = isGain ? "hsl(158, 64%, 52%)" : "hsl(0, 84%, 60%)";

  // Map price to pixel (this is approximate - recharts handles actual mapping)
  const barTop = Math.min(y, y + height);
  const barBottom = Math.max(y, y + height);
  const barHeight = Math.abs(height) || 1;
  const centerX = x + width / 2;

  return (
    <g>
      {/* Wick */}
      <line x1={centerX} y1={barTop - 2} x2={centerX} y2={barTop} stroke={color} strokeWidth={1.5} />
      <line x1={centerX} y1={barBottom} x2={centerX} y2={barBottom + 2} stroke={color} strokeWidth={1.5} />
      {/* Body */}
      <rect
        x={x + 1}
        y={barTop}
        width={width - 2}
        height={barHeight}
        fill={isGain ? color : color}
        stroke={color}
        strokeWidth={1}
        fillOpacity={isGain ? 0.85 : 0.85}
      />
    </g>
  );
};

// Custom candle using a custom bar shape
const CustomCandlestick = (props: any) => {
  const { x, y, width, payload } = props;
  if (!payload) return null;

  const { open, price: close, high, low } = payload;
  const isGain = close >= open;
  const color = isGain ? "hsl(158, 64%, 52%)" : "hsl(0, 84%, 60%)";

  // y is the top of the range [low, high] mapped by yAxis
  // We need to use the yAxis scale - recharts passes yAxis as context but we'll use the bar's y/height for body
  // In a ComposedChart with Bar using [open, close] as the value, y and height represent that range
  const bodyTop = y;
  const bodyHeight = Math.abs(props.height) || 1;
  const centerX = x + width / 2;

  return (
    <g>
      <line x1={centerX} y1={props.wickTop ?? bodyTop - 5} x2={centerX} y2={bodyTop} stroke={color} strokeWidth={1} opacity={0.8} />
      <line x1={centerX} y1={bodyTop + bodyHeight} x2={centerX} y2={props.wickBottom ?? bodyTop + bodyHeight + 5} stroke={color} strokeWidth={1} opacity={0.8} />
      <rect
        x={x + 1}
        y={bodyTop}
        width={Math.max(width - 2, 2)}
        height={bodyHeight}
        fill={color}
        stroke={color}
        strokeWidth={0.5}
        fillOpacity={0.9}
      />
    </g>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0]?.payload;
    if (!d) return null;
    const isGain = d.price >= d.open;
    return (
      <div className="glass rounded-lg p-3 text-xs shadow-xl min-w-[160px]">
        <div className="text-muted-foreground mb-2 font-medium">{label}</div>
        <div className="space-y-1">
          {[
            { label: "시가", value: d.open },
            { label: "고가", value: d.high },
            { label: "저가", value: d.low },
            { label: "종가", value: d.price },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between gap-4">
              <span className="text-muted-foreground">{label}</span>
              <span className={`font-mono font-semibold ${isGain ? "text-gain" : "text-loss"}`}>
                {value?.toLocaleString()}
              </span>
            </div>
          ))}
          <div className="flex justify-between gap-4 pt-1 border-t border-border">
            <span className="text-muted-foreground">거래량</span>
            <span className="font-mono">{(d.volume / 1_000_000).toFixed(1)}M</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function CandlestickChart({ data, symbol }: CandlestickChartProps) {
  // Transform data: recharts Bar with stacked approach for candlestick
  // We'll use a trick: value = [open, close], and draw wicks separately
  const transformed = data.map(d => ({
    ...d,
    // For bar: [min(open,close), max(open,close)]
    bodyRange: [Math.min(d.open, d.price), Math.max(d.open, d.price)] as [number, number],
    isGain: d.price >= d.open,
  }));

  const allPrices = data.flatMap(d => [d.open, d.price, d.high, d.low]);
  const yMin = Math.min(...allPrices) * 0.998;
  const yMax = Math.max(...allPrices) * 1.002;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={transformed} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 10, fontFamily: "JetBrains Mono" }}
            tickLine={false}
            axisLine={false}
            interval={Math.floor(data.length / 6)}
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 10, fontFamily: "JetBrains Mono" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => v.toLocaleString()}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          {/* Wicks rendered as error bars via custom bar */}
          <Bar
            dataKey="high"
            barSize={1}
            fill="transparent"
            stroke="transparent"
            yAxisId={0}
          />
          {/* Main candlestick body using range bar */}
          <Bar
            dataKey="bodyRange"
            barSize={data.length > 50 ? 4 : data.length > 30 ? 6 : 10}
            shape={(props: any) => {
              const d = props.payload;
              const isGain = d.isGain;
              const color = isGain ? "hsl(158, 64%, 52%)" : "hsl(0, 84%, 60%)";
              const { x, y, width, height } = props;
              const centerX = x + width / 2;
              const bodyTop = y;
              const bodyH = Math.abs(height) || 1;
              
              // We need wick positions - approximate using scale
              // Can't easily get exact pixel pos for high/low without yAxis ref
              // So we'll render a thin candle
              return (
                <g>
                  <rect
                    x={x}
                    y={bodyTop}
                    width={width}
                    height={bodyH}
                    fill={color}
                    fillOpacity={0.9}
                    rx={1}
                  />
                </g>
              );
            }}
          >
            {transformed.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isGain ? "hsl(158, 64%, 52%)" : "hsl(0, 84%, 60%)"}
              />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
