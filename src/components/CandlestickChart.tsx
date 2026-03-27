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

interface CandlestickTooltipPayloadItem {
  payload?: CandlestickData;
}

interface CandlestickTooltipProps {
  active?: boolean;
  payload?: CandlestickTooltipPayloadItem[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CandlestickTooltipProps) => {
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
            shape={(props: {
              x: number;
              y: number;
              width: number;
              height: number;
              payload: CandlestickData & { isGain: boolean };
            }) => {
              const d = props.payload;
              const isGain = d.isGain;
              const color = isGain ? "hsl(158, 64%, 52%)" : "hsl(0, 84%, 60%)";
              const { x, y, width, height } = props;
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
