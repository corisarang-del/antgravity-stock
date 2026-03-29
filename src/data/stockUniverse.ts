export interface StockMetadata {
  symbol: string;
  name: string;
  sector: string;
  market: "KR" | "US";
}

export const STOCK_UNIVERSE: StockMetadata[] = [
  { symbol: "005930", name: "삼성전자", sector: "반도체", market: "KR" },
  { symbol: "000660", name: "SK하이닉스", sector: "반도체", market: "KR" },
  { symbol: "005380", name: "현대자동차", sector: "자동차", market: "KR" },
  { symbol: "012330", name: "현대모비스", sector: "자동차부품", market: "KR" },
  { symbol: "267270", name: "효성중공업", sector: "중공업", market: "KR" },
  { symbol: "TSLA", name: "테슬라", sector: "EV", market: "US" },
  { symbol: "NVDA", name: "엔비디아", sector: "반도체", market: "US" },
  { symbol: "AAPL", name: "애플", sector: "Tech", market: "US" },
  { symbol: "GOOGL", name: "알파벳", sector: "Tech", market: "US" },
  { symbol: "MSFT", name: "마이크로소프트", sector: "Tech", market: "US" },
  { symbol: "PLTR", name: "팔란티어", sector: "AI/Data", market: "US" },
  { symbol: "HOOD", name: "로빈후드", sector: "Fintech", market: "US" },
  { symbol: "SPY", name: "S&P 500 ETF", sector: "ETF", market: "US" },
  { symbol: "VOO", name: "Vanguard ETF", sector: "ETF", market: "US" },
];

export const STOCK_METADATA_BY_SYMBOL = new Map<string, StockMetadata>(
  STOCK_UNIVERSE.flatMap((stock) =>
    stock.market === "KR"
      ? [
          [stock.symbol, stock] as const,
          [`${stock.symbol}.KS`, stock] as const,
        ]
      : [[stock.symbol, stock] as const]
  )
);

export const DIAGNOSE_SUGGESTION_SYMBOLS = [
  "NVDA",
  "005930",
  "000660",
  "AAPL",
  "267270",
  "PLTR",
  "MSFT",
  "012330",
] as const;

export const MARKET_INDEX_FALLBACKS = [
  { name: "S&P 500", value: "5,234.18", change: "+0.87%", up: true },
  { name: "NASDAQ", value: "16,384.47", change: "+1.24%", up: true },
  { name: "KOSPI", value: "2,687.44", change: "-0.34%", up: false },
  { name: "KOSDAQ", value: "876.32", change: "+0.61%", up: true },
  { name: "DOW", value: "39,127.80", change: "+0.52%", up: true },
  { name: "NIKKEI", value: "40,168.07", change: "+0.91%", up: true },
] as const;

export function getStockMetadata(symbol: string): StockMetadata | undefined {
  return STOCK_METADATA_BY_SYMBOL.get(symbol);
}
