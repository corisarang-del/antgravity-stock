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
