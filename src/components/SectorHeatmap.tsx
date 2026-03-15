"use client";

import { Treemap, ResponsiveContainer } from "recharts";
import { useSectors } from "@/hooks/useSectors";
import { Loader2 } from "lucide-react";

interface TreemapItem {
  name: string;
  size: number;
  changePct: number;
  aiSignal: string;
}

interface TreemapRoot {
  name: string;
  children: TreemapItem[];
}

function buildTreemapData(sectors: { name: string; stocks: { symbol: string; name: string; market_cap: number; change_pct: number; ai_signal: string }[] }[]): TreemapRoot[] {
  return sectors.map((sec) => ({
    name: sec.name,
    children: sec.stocks.map((s) => ({
      name: `${s.symbol}\n${(s.change_pct >= 0 ? "+" : "") + s.change_pct.toFixed(2)}%`,
      size: Math.max(s.market_cap || 1e9, 1e9),
      changePct: s.change_pct,
      aiSignal: s.ai_signal,
    })),
  }));
}

function getColor(changePct: number): string {
  if (changePct >= 2) return "rgb(34,197,94)";   // strong gain
  if (changePct > 0) return "rgb(74,222,128)";    // mild gain
  if (changePct === 0) return "rgb(100,116,139)"; // neutral
  if (changePct > -2) return "rgb(248,113,113)";  // mild loss
  return "rgb(220,38,38)";                        // strong loss
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomContent(props: any) {
  const { x, y, width, height, name, changePct } = props;
  if (width < 30 || height < 20) return null;
  const lines = String(name).split("\n");
  const color = getColor(changePct ?? 0);

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} style={{ fill: color, stroke: "#1e293b", strokeWidth: 1 }} rx={4} />
      {height > 30 && (
        <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="#fff" fontSize={10} fontWeight="600">
          {lines[0]}
        </text>
      )}
      {height > 40 && (
        <text x={x + width / 2} y={y + height / 2 + 8} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={9}>
          {lines[1]}
        </text>
      )}
    </g>
  );
}

export function SectorHeatmap() {
  const { data, isLoading, isError } = useSectors();

  if (isLoading) {
    return (
      <div className="glass rounded-2xl border border-border p-5 flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="glass rounded-2xl border border-border p-5 flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">섹터 데이터를 불러올 수 없습니다.</p>
      </div>
    );
  }

  const treemapData = buildTreemapData(data.sectors);

  return (
    <div className="glass rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base">섹터 히트맵</h3>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[rgb(34,197,94)]" />+2% 이상</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[rgb(100,116,139)]" />보합</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[rgb(220,38,38)]" />-2% 이상</span>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={treemapData}
            dataKey="size"
            aspectRatio={4 / 3}
            content={<CustomContent />}
          />
        </ResponsiveContainer>
      </div>
    </div>
  );
}
