import { supabase } from "@/integrations/supabase/client";

// ─── 심볼 변환 ───────────────────────────────────────────────────────────────
// Rule 7.9: RegExp 루프 밖 모듈 레벨로 호이스팅
const KR_SYMBOL_RE = /^\d{6}$/;
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const PRO_API_TIMEOUT_MS = 12_000;

// 한국 종목 (6자리 숫자) → "{symbol}.KS" suffix 추가
function toBackendSymbol(symbol: string): string {
  return KR_SYMBOL_RE.test(symbol) ? `${symbol}.KS` : symbol;
}

// ─── 공통 요청 헬퍼 ──────────────────────────────────────────────────────────
async function apiFetch<T>(url: string, options?: RequestInit, timeoutMs?: number): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const targetUrl = url.startsWith("/") && API_BASE_URL ? `${API_BASE_URL}${url}` : url;
  const controller = new AbortController();
  const requestSignal = options?.signal;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  if (requestSignal) {
    if (requestSignal.aborted) {
      controller.abort();
    } else {
      requestSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  if (timeoutMs && timeoutMs > 0) {
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  }

  let res: Response;
  try {
    res = await fetch(targetUrl, { ...options, headers, signal: controller.signal });
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (error instanceof DOMException && error.name === "AbortError" && timeoutMs) {
      throw new Error(`API timeout after ${timeoutMs}ms`);
    }
    throw error;
  }

  if (timeoutId) {
    clearTimeout(timeoutId);
  }
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

// ─── 타입 정의 ───────────────────────────────────────────────────────────────

export interface OhlcvRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockDetail {
  symbol: string;
  name: string;
  market: string;
  data: OhlcvRow[];
}

export interface Prediction {
  symbol: string;
  predicted_prices: number[];
  volatility: number;
  risk_level: string;
  last_close: number;
  model_name: string;
}

export interface StockBundle {
  detail: StockDetail;
  prediction: Prediction;
}

export interface MarketTickerItem {
  symbol: string;
  display_name: string;
  price: number;
  change_amount: number;
  change_rate: number;
}

export interface BackendIpoItem {
  id: string;
  company_name: string;
  listing_type: string;
  status: string;
  subscription_start_date: string;
  subscription_end_date: string;
  offer_price: number;
  lead_underwriter: string;
  summary: string;
  description: string;
  detail_url: string;
}

interface IpoCalendarResponse {
  source: string;
  updated_at: string;
  total: number;
  items: BackendIpoItem[];
}

export interface SentimentSummary {
  symbol: string;
  avg_score: number;
  label: "positive" | "neutral" | "negative";
  summary: string;
  post_count: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  investor_sentiment: {
    individual: number;
    foreign: number;
    institution: number;
  };
  fear_greed_index: number;
  market_temperature: string;
  history: number[];
}

export interface DashboardWatchItem {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  addedAt: string;
}

interface DashboardWatchlistResponse {
  items: DashboardWatchItem[];
}

export interface DashboardAlertItem {
  id: string;
  symbol: string;
  name: string;
  alertType: "above" | "below";
  targetPrice: number;
  isActive: boolean;
  createdAt: string;
}

interface DashboardAlertsResponse {
  items: DashboardAlertItem[];
  triggered: DashboardTriggeredAlertItem[];
}

export interface DashboardPortfolioHoldingItem {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  sector: string;
}

interface DashboardPortfolioHoldingsResponse {
  items: DashboardPortfolioHoldingItem[];
}

export interface DashboardTriggeredAlertItem {
  title: string;
  message: string;
  status: "triggered";
}

export interface DashboardPortfolioSummary {
  totalCostBasis: number;
  totalMarketValue: number;
  totalProfitLoss: number;
  totalReturnRate: number;
  calculatedAt: string;
}

interface DashboardPortfolioSummaryResponse {
  total_cost_basis: number;
  total_market_value: number;
  total_profit_loss: number;
  total_return_rate: number;
  calculated_at: string;
}

// ─── API 함수 ─────────────────────────────────────────────────────────────────

export async function fetchStockBundle(
  symbol: string,
  period = "3mo"
): Promise<StockBundle> {
  const backendSymbol = toBackendSymbol(symbol);
  return apiFetch<StockBundle>(
    `/api/stocks/${encodeURIComponent(backendSymbol)}/bundle?period=${period}`
  );
}

export async function fetchMarketTicker(): Promise<MarketTickerItem[]> {
  return apiFetch<MarketTickerItem[]>("/api/market-ticker");
}

export async function fetchIpoCalendar(): Promise<BackendIpoItem[]> {
  const res = await apiFetch<IpoCalendarResponse>("/api/tips/ipo");
  return res.items;
}

export async function fetchIpoDetail(id: string): Promise<BackendIpoItem> {
  return apiFetch<BackendIpoItem>(`/api/tips/ipo/${encodeURIComponent(id)}`);
}

export async function fetchSentiment(symbol: string): Promise<SentimentSummary> {
  const backendSymbol = toBackendSymbol(symbol);
  return apiFetch<SentimentSummary>(`/api/sentiment/summary/${encodeURIComponent(backendSymbol)}`);
}

export async function fetchPrediction(symbol: string): Promise<Prediction> {
  const backendSymbol = toBackendSymbol(symbol);
  return apiFetch<Prediction>("/api/predict/", {
    method: "POST",
    body: JSON.stringify({ symbol: backendSymbol }),
  });
}

export async function fetchDashboardWatchlist(): Promise<DashboardWatchItem[]> {
  const res = await apiFetch<DashboardWatchlistResponse>("/api/dashboard/watchlist");
  return res.items;
}

export async function fetchDashboardAlerts(): Promise<DashboardAlertsResponse> {
  return apiFetch<DashboardAlertsResponse>("/api/dashboard/alerts");
}

export async function fetchDashboardPortfolioSummary(): Promise<DashboardPortfolioSummary> {
  const res = await apiFetch<DashboardPortfolioSummaryResponse>("/api/dashboard/portfolio/summary");
  return {
    totalCostBasis: res.total_cost_basis,
    totalMarketValue: res.total_market_value,
    totalProfitLoss: res.total_profit_loss,
    totalReturnRate: res.total_return_rate,
    calculatedAt: res.calculated_at,
  };
}

export async function fetchDashboardAlertItems(): Promise<DashboardAlertItem[]> {
  const res = await apiFetch<DashboardAlertsResponse>("/api/dashboard/alerts");
  return res.items;
}

export async function fetchDashboardPortfolioHoldings(): Promise<DashboardPortfolioHoldingItem[]> {
  const res = await apiFetch<DashboardPortfolioHoldingsResponse>("/api/dashboard/portfolio/holdings");
  return res.items;
}

export async function createDashboardWatchlistItem(input: {
  symbol: string;
  name: string;
  sector: string;
}): Promise<DashboardWatchItem> {
  return apiFetch<DashboardWatchItem>("/api/dashboard/watchlist", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteDashboardWatchlistItem(id: string): Promise<void> {
  return apiFetch<void>(`/api/dashboard/watchlist/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function createDashboardAlert(input: {
  symbol: string;
  name: string;
  alertType: "above" | "below";
  targetPrice: number;
}): Promise<DashboardAlertItem> {
  return apiFetch<DashboardAlertItem>("/api/dashboard/alerts", {
    method: "POST",
    body: JSON.stringify({
      symbol: input.symbol,
      name: input.name,
      condition_type: input.alertType,
      target_price: input.targetPrice,
      delivery_channels: ["toast"],
    }),
  });
}

export async function updateDashboardAlert(input: {
  id: string;
  isActive?: boolean;
  targetPrice?: number;
}): Promise<DashboardAlertItem> {
  const body: Record<string, unknown> = {};
  if (input.isActive !== undefined) {
    body.status = input.isActive ? "active" : "paused";
  }
  if (input.targetPrice !== undefined) {
    body.target_price = input.targetPrice;
  }

  return apiFetch<DashboardAlertItem>(`/api/dashboard/alerts/${encodeURIComponent(input.id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteDashboardAlert(id: string): Promise<void> {
  return apiFetch<void>(`/api/dashboard/alerts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function createDashboardPortfolioHolding(input: {
  symbol: string;
  name: string;
  sector: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
}): Promise<DashboardPortfolioHoldingItem> {
  return apiFetch<DashboardPortfolioHoldingItem>("/api/dashboard/portfolio/holdings", {
    method: "POST",
    body: JSON.stringify({
      symbol: input.symbol,
      name: input.name,
      sector: input.sector,
      quantity: input.quantity,
      buy_price: input.avgPrice,
      current_price: input.currentPrice,
    }),
  });
}

export async function deleteDashboardPortfolioHolding(id: string): Promise<void> {
  return apiFetch<void>(`/api/dashboard/portfolio/holdings/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ─── Pro 대시보드 타입 ─────────────────────────────────────────────────────────

export interface InvestmentScore {
  quality: number;
  growth: number;
  strength: number;
  cash: number;
  valuation: number;
  total: number;
  grade: "S" | "A" | "B" | "C" | "D";
}

export interface Fundamentals {
  symbol: string;
  source: string;
  roe: number | null;
  gross_margin: number | null;
  operating_margin: number | null;
  net_margin: number | null;
  debt_to_equity: number | null;
  current_ratio: number | null;
  trailing_pe: number | null;
  price_to_book: number | null;
  peg_ratio: number | null;
  ev_to_ebitda: number | null;
  earnings_growth: number | null;
  revenue_growth: number | null;
  market_cap: number | null;
  dividend_yield: number | null;
  fifty_two_week_high: number | null;
  fifty_two_week_low: number | null;
  sector: string | null;
  industry: string | null;
  score: InvestmentScore;
}

export interface HistoryRow {
  year: string;
  revenue: number | null;
  net_income: number | null;
  operating_income: number | null;
  eps: number | null;
  roe: number | null;
  gross_margin: number | null;
  fcf: number | null;
}

export interface FinancialHistory {
  symbol: string;
  annual: HistoryRow[];
}

export interface ScreenerResult {
  symbol: string;
  name: string;
  market: string;
  score: number;
  market_cap: string;
  roe: number | null;
  pe: number | null;
  peg: number | null;
  sector: string | null;
}

export interface ScreenerResponse {
  count: number;
  results: ScreenerResult[];
}

export interface SectorStock {
  symbol: string;
  name: string;
  market: string;
  market_cap: number;
  change_pct: number;
  ai_signal: "BUY" | "HOLD" | "WATCH";
}

export interface SectorItem {
  name: string;
  stocks: SectorStock[];
  total_market_cap: number;
  avg_change_pct: number;
}

export interface SectorsResponse {
  sectors: SectorItem[];
}

export interface DividendEvent {
  symbol: string;
  name: string;
  market: string;
  ex_date: string;
  pay_date: string | null;
  amount: number;
  yield: number | null;
}

export interface DividendCalendarData {
  calendar: Record<string, DividendEvent[]>;
  summary: { date: string; count: number; total_amount: number }[];
}

export interface FundamentalsOverviewRankItem {
  symbol: string;
  name: string;
  value: number;
}

export interface FundamentalsOverview {
  available_count: number;
  growth_leaders: FundamentalsOverviewRankItem[];
  growth_laggards: FundamentalsOverviewRankItem[];
  top_scores: FundamentalsOverviewRankItem[];
}

// ─── Pro 대시보드 API 함수 ────────────────────────────────────────────────────

export async function fetchFundamentals(symbol: string): Promise<Fundamentals> {
  const backendSymbol = toBackendSymbol(symbol);
  return apiFetch<Fundamentals>(
    `/api/stocks/${encodeURIComponent(backendSymbol)}/fundamentals`,
    undefined,
    PRO_API_TIMEOUT_MS,
  );
}

export async function fetchFundamentalsOverview(): Promise<FundamentalsOverview> {
  return apiFetch<FundamentalsOverview>(
    "/api/stocks/fundamentals/overview",
    undefined,
    PRO_API_TIMEOUT_MS,
  );
}

export async function fetchHistory(symbol: string): Promise<FinancialHistory> {
  const backendSymbol = toBackendSymbol(symbol);
  return apiFetch<FinancialHistory>(
    `/api/stocks/${encodeURIComponent(backendSymbol)}/history`,
    undefined,
    PRO_API_TIMEOUT_MS,
  );
}

export async function fetchScreener(
  strategies: string[],
  combination: "AND" | "OR" = "AND",
  market: "all" | "KR" | "US" = "all"
): Promise<ScreenerResponse> {
  return apiFetch<ScreenerResponse>("/api/stocks/screener", {
    method: "POST",
    body: JSON.stringify({ strategies, combination, market }),
  }, PRO_API_TIMEOUT_MS);
}

export async function fetchSectors(): Promise<SectorsResponse> {
  return apiFetch<SectorsResponse>("/api/market/sectors", undefined, PRO_API_TIMEOUT_MS);
}

export async function fetchDividendCalendar(
  year: number,
  month: number
): Promise<DividendCalendarData> {
  return apiFetch<DividendCalendarData>(
    `/api/stocks/dividends/calendar?year=${year}&month=${month}`,
    undefined,
    PRO_API_TIMEOUT_MS,
  );
}

// ─── Phase 9: 전체 시장 데이터 ───────────────────────────────────────────────

export interface MarketStock {
  symbol: string;
  market: string;      // "KR" | "US"
  name: string | null;
  sector: string | null;
  close: number | null;
  change_pct: number | null;
  market_cap: number | null;
  per: number | null;
  pbr: number | null;
  snapshot_date: string | null;
}

export interface MarketFullResponse {
  items: MarketStock[];
  total: number;
  page: number;
  limit: number;
}

export interface MarketSearchResponse {
  items: MarketStock[];
  total: number;
}

export async function fetchMarketFull(params: {
  market?: "KR" | "US" | "all";
  page?: number;
  limit?: number;
  sort?: "market_cap" | "change_pct" | "per" | "name";
  sector?: string;
}): Promise<MarketFullResponse> {
  const searchParams = new URLSearchParams();
  if (params.market) searchParams.set("market", params.market);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.sort) searchParams.set("sort", params.sort);
  if (params.sector) searchParams.set("sector", params.sector);
  return apiFetch<MarketFullResponse>(`/api/market/full?${searchParams}`, undefined, PRO_API_TIMEOUT_MS);
}

export async function fetchMarketSearch(q: string): Promise<MarketSearchResponse> {
  return apiFetch<MarketSearchResponse>(`/api/market/full/search?q=${encodeURIComponent(q)}`, undefined, PRO_API_TIMEOUT_MS);
}
