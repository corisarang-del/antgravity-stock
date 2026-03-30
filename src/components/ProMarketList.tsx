import { useState, useCallback } from "react";
import { Loader2, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useMarketFull } from "@/hooks/useMarketFull";
import { fetchMarketSearch, type MarketSearchResponse, type MarketStock } from "@/lib/apiClient";
import { getProMarketListState } from "@/lib/proMarketListState";
import { ProMarketFilter } from "@/components/ProMarketFilter";
import { useQuery } from "@tanstack/react-query";

// Rule 6.3: 포맷터는 모듈 레벨로 호이스팅
const pctFmt = (v: number | null) =>
  v !== null ? `${v >= 0 ? "+" : ""}${v.toFixed(2)}%` : "—";

const capFmt = (v: number | null) => {
  if (v === null) return "—";
  if (v >= 1e12) return `${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  return `${(v / 1e6).toFixed(0)}M`;
};

const perFmt = (v: number | null) => (v !== null ? v.toFixed(1) : "—");

const priceFmt = (v: number | null) => (v !== null ? v.toLocaleString() : "—");

const PAGE_LIMIT = 100;

interface Props {
  onSelect?: (symbol: string) => void;
}

export function ProMarketList({ onSelect }: Props) {
  const [market, setMarket] = useState<"KR" | "US" | "all">("all");
  const [sort, setSort] = useState<"market_cap" | "change_pct" | "per" | "name">("market_cap");
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const isSearchMode = submittedQuery.trim().length > 0;

  const listQuery = useMarketFull({
    market,
    page,
    limit: PAGE_LIMIT,
    sort,
  });

  const searchResult = useQuery<MarketSearchResponse>({
    queryKey: ["marketSearch", submittedQuery],
    queryFn: () => fetchMarketSearch(submittedQuery),
    enabled: isSearchMode,
    staleTime: 2 * 60 * 1000,
  });

  const activeQuery = isSearchMode ? searchResult : listQuery;
  const items: MarketStock[] = activeQuery.data?.items ?? [];
  const total: number = activeQuery.data?.total ?? 0;
  const viewState = getProMarketListState({
    isLoading: activeQuery.isLoading,
    isError: activeQuery.isError,
    total,
  });

  const totalPages = Math.ceil(total / PAGE_LIMIT);
  const rangeStart = (page - 1) * PAGE_LIMIT + 1;
  const rangeEnd = Math.min(page * PAGE_LIMIT, total);

  const handleSearch = useCallback(() => {
    const trimmed = searchQuery.trim();
    setSubmittedQuery(trimmed);
    if (trimmed) setPage(1);
  }, [searchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSubmittedQuery("");
  }, []);

  const handleMarketChange = useCallback((v: "KR" | "US" | "all") => {
    setMarket(v);
    setPage(1);
  }, []);

  const handleSortChange = useCallback(
    (v: "market_cap" | "change_pct" | "per" | "name") => {
      setSort(v);
      setPage(1);
    },
    []
  );

  return (
    <div className="glass rounded-2xl border border-border p-5">
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="font-bold text-base">전체 시장 현황</h3>

          {/* 검색바 */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-secondary/50 focus-within:border-primary/50 focus-within:bg-secondary transition-colors sm:w-64">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-0"
              placeholder="종목명·심볼 검색"
              aria-label="종목명 또는 심볼로 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            {searchQuery ? (
              <button onClick={handleClearSearch} aria-label="검색 초기화">
                <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            ) : null}
          </div>
        </div>

        {/* 필터 */}
        {!isSearchMode && (
          <ProMarketFilter
            market={market}
            sort={sort}
            onMarketChange={handleMarketChange}
            onSortChange={handleSortChange}
          />
        )}
      </div>

      {/* 테이블 */}
      {viewState === "loading" ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : viewState === "error" ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">시장 데이터를 불러올 수 없습니다.</p>
        </div>
      ) : viewState === "empty" ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">시장 데이터 수집 중...</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 pr-3 text-muted-foreground font-semibold">종목명</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-semibold">심볼</th>
                  <th className="text-center py-2 px-2 text-muted-foreground font-semibold">시장</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-semibold">종가</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-semibold">변동%</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-semibold">시총</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-semibold">PER</th>
                  <th className="text-right py-2 pl-2 text-muted-foreground font-semibold">섹터</th>
                </tr>
              </thead>
              <tbody>
                {items.map((stock) => (
                  <tr
                    key={stock.symbol}
                    onClick={() => onSelect?.(stock.symbol)}
                    onKeyDown={(e) => e.key === "Enter" && onSelect?.(stock.symbol)}
                    tabIndex={0}
                    role="button"
                    className="border-b border-border/30 hover:bg-secondary/40 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
                    style={{ contentVisibility: "auto" }}
                  >
                    <td className="py-2.5 pr-3 font-semibold truncate max-w-[120px]">
                      {stock.name ?? stock.symbol}
                    </td>
                    <td className="py-2.5 px-2 font-mono text-muted-foreground">
                      {stock.symbol}
                    </td>
                    <td className="text-center py-2.5 px-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          stock.market === "KR"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {stock.market}
                      </span>
                    </td>
                    <td className="text-right py-2.5 px-2 font-mono">
                      {priceFmt(stock.close)}
                    </td>
                    <td
                      className={`text-right py-2.5 px-2 font-mono font-semibold ${
                        stock.change_pct === null
                          ? "text-muted-foreground"
                          : stock.change_pct >= 0
                          ? "text-gain"
                          : "text-loss"
                      }`}
                    >
                      {pctFmt(stock.change_pct)}
                    </td>
                    <td className="text-right py-2.5 px-2 font-mono">
                      {capFmt(stock.market_cap)}
                    </td>
                    <td className="text-right py-2.5 px-2 font-mono">
                      {perFmt(stock.per)}
                    </td>
                    <td className="text-right py-2.5 pl-2 text-muted-foreground truncate max-w-[100px]">
                      {stock.sector ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 — 검색 모드가 아닐 때만 표시 */}
          {!isSearchMode && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
              <p className="text-[11px] text-muted-foreground">
                {rangeStart}–{rangeEnd} / 전체 {total.toLocaleString()}개
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-secondary/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="이전 페이지"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono px-2">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg hover:bg-secondary/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="다음 페이지"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {isSearchMode && (
            <p className="text-[11px] text-muted-foreground mt-3">
              "{submittedQuery}" 검색 결과 {total}건
            </p>
          )}
        </>
      )}
    </div>
  );
}
