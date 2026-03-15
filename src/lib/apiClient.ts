import { supabase } from "@/integrations/supabase/client";

// ─── 심볼 변환 ───────────────────────────────────────────────────────────────
// 한국 종목 (6자리 숫자) → "{symbol}.KS" suffix 추가
function toBackendSymbol(symbol: string): string {
  return /^\d{6}$/.test(symbol) ? `${symbol}.KS` : symbol;
}

// ─── 공통 요청 헬퍼 ──────────────────────────────────────────────────────────
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (userId) {
    headers["X-User-ID"] = userId;
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
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

export async function fetchSentiment(symbol: string): Promise<unknown> {
  const backendSymbol = toBackendSymbol(symbol);
  return apiFetch(`/api/sentiment/summary/${encodeURIComponent(backendSymbol)}`);
}

export async function fetchPrediction(symbol: string): Promise<Prediction> {
  const backendSymbol = toBackendSymbol(symbol);
  return apiFetch<Prediction>("/api/predict/", {
    method: "POST",
    body: JSON.stringify({ symbol: backendSymbol }),
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

// ─── Pro 대시보드 API 함수 ────────────────────────────────────────────────────

export async function fetchFundamentals(symbol: string): Promise<Fundamentals> {
  const backendSymbol = toBackendSymbol(symbol);
  return apiFetch<Fundamentals>(
    `/api/stocks/${encodeURIComponent(backendSymbol)}/fundamentals`
  );
}

export async function fetchHistory(symbol: string): Promise<FinancialHistory> {
  const backendSymbol = toBackendSymbol(symbol);
  return apiFetch<FinancialHistory>(
    `/api/stocks/${encodeURIComponent(backendSymbol)}/history`
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
  });
}

export async function fetchSectors(): Promise<SectorsResponse> {
  return apiFetch<SectorsResponse>("/api/market/sectors");
}

export async function fetchDividendCalendar(
  year: number,
  month: number
): Promise<DividendCalendarData> {
  return apiFetch<DividendCalendarData>(
    `/api/stocks/dividends/calendar?year=${year}&month=${month}`
  );
}
