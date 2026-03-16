import { cn } from "@/lib/utils";

interface Props {
  market: "KR" | "US" | "all";
  sort: "market_cap" | "change_pct" | "per" | "name";
  onMarketChange: (v: "KR" | "US" | "all") => void;
  onSortChange: (v: "market_cap" | "change_pct" | "per" | "name") => void;
}

const MARKET_OPTIONS: { value: "KR" | "US" | "all"; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "KR", label: "KR" },
  { value: "US", label: "US" },
];

const SORT_OPTIONS: { value: "market_cap" | "change_pct" | "per" | "name"; label: string }[] = [
  { value: "market_cap", label: "시총" },
  { value: "change_pct", label: "변동%" },
  { value: "per", label: "PER" },
  { value: "name", label: "이름" },
];

export function ProMarketFilter({ market, sort, onMarketChange, onSortChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1 rounded-xl border border-border bg-secondary/50 p-1" role="group" aria-label="시장 필터">
        {MARKET_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onMarketChange(opt.value)}
            aria-pressed={market === opt.value}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              market === opt.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 rounded-xl border border-border bg-secondary/50 p-1" role="group" aria-label="정렬 기준">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSortChange(opt.value)}
            aria-pressed={sort === opt.value}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              sort === opt.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
