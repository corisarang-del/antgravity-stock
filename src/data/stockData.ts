// Mock stock data
export const STOCKS = [
  { symbol: "AAPL", name: "Apple Inc.", price: 189.84, change: 2.34, changePct: 1.25, prediction: 78, signal: "BUY", sector: "Tech" },
  { symbol: "NVDA", name: "NVIDIA Corp.", price: 875.35, change: 24.12, changePct: 2.83, prediction: 91, signal: "STRONG BUY", sector: "Tech" },
  { symbol: "TSLA", name: "Tesla Inc.", price: 248.50, change: -6.20, changePct: -2.43, prediction: 42, signal: "HOLD", sector: "EV" },
  { symbol: "MSFT", name: "Microsoft Corp.", price: 415.26, change: 3.88, changePct: 0.94, prediction: 83, signal: "BUY", sector: "Tech" },
  { symbol: "GOOGL", name: "Alphabet Inc.", price: 175.98, change: -1.45, changePct: -0.82, prediction: 65, signal: "HOLD", sector: "Tech" },
  { symbol: "AMZN", name: "Amazon.com Inc.", price: 198.11, change: 5.62, changePct: 2.92, prediction: 88, signal: "BUY", sector: "E-Commerce" },
  { symbol: "META", name: "Meta Platforms", price: 512.44, change: 8.32, changePct: 1.65, prediction: 72, signal: "BUY", sector: "Social" },
  { symbol: "005930", name: "삼성전자", price: 74800, change: -500, changePct: -0.66, prediction: 61, signal: "HOLD", sector: "반도체" },
  { symbol: "035420", name: "NAVER", price: 182500, change: 3500, changePct: 1.96, prediction: 70, signal: "BUY", sector: "인터넷" },
  { symbol: "000660", name: "SK하이닉스", price: 198000, change: 5000, changePct: 2.59, prediction: 85, signal: "BUY", sector: "반도체" },
];

export const INDICES = [
  { name: "S&P 500", value: "5,234.18", change: "+0.87%", up: true },
  { name: "NASDAQ", value: "16,384.47", change: "+1.24%", up: true },
  { name: "KOSPI", value: "2,687.44", change: "-0.34%", up: false },
  { name: "DOW", value: "39,127.80", change: "+0.52%", up: true },
  { name: "NIKKEI", value: "40,168.07", change: "+0.91%", up: true },
  { name: "VIX", value: "14.23", change: "-3.12%", up: false },
];

export function generateChartData(basePrice: number, days = 60) {
  const data = [];
  let price = basePrice * 0.88;
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const change = (Math.random() - 0.46) * basePrice * 0.025;
    price = Math.max(price + change, basePrice * 0.5);
    const open = price;
    const close = price + (Math.random() - 0.48) * basePrice * 0.012;
    const high = Math.max(open, close) + Math.random() * basePrice * 0.008;
    const low = Math.min(open, close) - Math.random() * basePrice * 0.008;
    const volume = Math.floor(Math.random() * 50000000 + 10000000);
    data.push({
      date: date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
      price: parseFloat(close.toFixed(2)),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      volume,
      predicted: i < 10 ? parseFloat((close * (1 + (Math.random() - 0.3) * 0.03)).toFixed(2)) : null,
    });
    price = close;
  }
  return data;
}

export const AI_FACTORS = [
  { name: "기술적 분석", score: 82, color: "primary" },
  { name: "펀더멘털", score: 74, color: "gain" },
  { name: "감성 분석", score: 68, color: "warning" },
  { name: "거래량 패턴", score: 91, color: "primary" },
  { name: "섹터 모멘텀", score: 79, color: "gain" },
];
