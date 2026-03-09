// Mock stock data

export interface StockFinancials {
  revenue: { year: string; value: number }[];
  netIncome: { year: string; value: number }[];
  eps: number;
  per: number;
  pbr: number;
  roe: number;
  debtRatio: number;
  marketCap: string;
  dividendYield: number;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  time: string;
  sentiment: "positive" | "negative" | "neutral";
  url?: string;
}

export interface AnalystTarget {
  firm: string;
  analyst: string;
  rating: string;
  target: number;
  prevTarget: number;
  date: string;
}

export const STOCK_FINANCIALS: Record<string, StockFinancials> = {
  AAPL: {
    revenue: [{ year: "2021", value: 365.8 }, { year: "2022", value: 394.3 }, { year: "2023", value: 383.3 }, { year: "2024", value: 391.0 }],
    netIncome: [{ year: "2021", value: 94.7 }, { year: "2022", value: 99.8 }, { year: "2023", value: 97.0 }, { year: "2024", value: 101.2 }],
    eps: 6.42, per: 29.6, pbr: 48.2, roe: 156.1, debtRatio: 171.2, marketCap: "$2.94T", dividendYield: 0.53,
  },
  NVDA: {
    revenue: [{ year: "2021", value: 16.7 }, { year: "2022", value: 26.9 }, { year: "2023", value: 44.9 }, { year: "2024", value: 130.5 }],
    netIncome: [{ year: "2021", value: 4.3 }, { year: "2022", value: 4.0 }, { year: "2023", value: 9.2 }, { year: "2024", value: 55.3 }],
    eps: 2.21, per: 39.6, pbr: 52.3, roe: 123.8, debtRatio: 44.1, marketCap: "$2.14T", dividendYield: 0.03,
  },
  TSLA: {
    revenue: [{ year: "2021", value: 53.8 }, { year: "2022", value: 81.5 }, { year: "2023", value: 97.7 }, { year: "2024", value: 101.4 }],
    netIncome: [{ year: "2021", value: 5.5 }, { year: "2022", value: 12.6 }, { year: "2023", value: 15.0 }, { year: "2024", value: 7.1 }],
    eps: 2.04, per: 121.8, pbr: 16.4, roe: 13.5, debtRatio: 28.9, marketCap: "$796B", dividendYield: 0,
  },
  MSFT: {
    revenue: [{ year: "2021", value: 168.1 }, { year: "2022", value: 198.3 }, { year: "2023", value: 211.9 }, { year: "2024", value: 245.1 }],
    netIncome: [{ year: "2021", value: 61.3 }, { year: "2022", value: 72.7 }, { year: "2023", value: 72.4 }, { year: "2024", value: 88.1 }],
    eps: 11.84, per: 35.1, pbr: 12.9, roe: 38.1, debtRatio: 75.4, marketCap: "$3.08T", dividendYield: 0.72,
  },
  GOOGL: {
    revenue: [{ year: "2021", value: 257.6 }, { year: "2022", value: 282.8 }, { year: "2023", value: 307.4 }, { year: "2024", value: 350.0 }],
    netIncome: [{ year: "2021", value: 76.0 }, { year: "2022", value: 59.9 }, { year: "2023", value: 73.8 }, { year: "2024", value: 94.3 }],
    eps: 7.60, per: 23.2, pbr: 6.1, roe: 28.7, debtRatio: 10.6, marketCap: "$2.18T", dividendYield: 0.45,
  },
  AMZN: {
    revenue: [{ year: "2021", value: 469.8 }, { year: "2022", value: 514.0 }, { year: "2023", value: 574.8 }, { year: "2024", value: 637.9 }],
    netIncome: [{ year: "2021", value: 33.4 }, { year: "2022", value: -2.7 }, { year: "2023", value: 30.4 }, { year: "2024", value: 59.2 }],
    eps: 5.53, per: 35.8, pbr: 8.9, roe: 24.9, debtRatio: 186.1, marketCap: "$2.09T", dividendYield: 0,
  },
  META: {
    revenue: [{ year: "2021", value: 117.9 }, { year: "2022", value: 116.6 }, { year: "2023", value: 134.9 }, { year: "2024", value: 164.5 }],
    netIncome: [{ year: "2021", value: 39.4 }, { year: "2022", value: 23.2 }, { year: "2023", value: 39.1 }, { year: "2024", value: 62.4 }],
    eps: 24.96, per: 20.5, pbr: 7.2, roe: 35.1, debtRatio: 21.5, marketCap: "$1.29T", dividendYield: 0.35,
  },
  "005930": {
    revenue: [{ year: "2021", value: 279.6 }, { year: "2022", value: 302.2 }, { year: "2023", value: 258.9 }, { year: "2024", value: 300.9 }],
    netIncome: [{ year: "2021", value: 39.9 }, { year: "2022", value: 55.6 }, { year: "2023", value: 15.5 }, { year: "2024", value: 32.0 }],
    eps: 4891, per: 15.3, pbr: 1.2, roe: 8.1, debtRatio: 27.0, marketCap: "약 446조원", dividendYield: 2.3,
  },
  "035420": {
    revenue: [{ year: "2021", value: 6.8 }, { year: "2022", value: 8.2 }, { year: "2023", value: 9.7 }, { year: "2024", value: 10.9 }],
    netIncome: [{ year: "2021", value: 1.4 }, { year: "2022", value: 0.9 }, { year: "2023", value: 1.2 }, { year: "2024", value: 1.8 }],
    eps: 11420, per: 16.0, pbr: 1.7, roe: 10.5, debtRatio: 60.2, marketCap: "약 30조원", dividendYield: 0.3,
  },
  "000660": {
    revenue: [{ year: "2021", value: 42.5 }, { year: "2022", value: 44.6 }, { year: "2023", value: 32.8 }, { year: "2024", value: 57.3 }],
    netIncome: [{ year: "2021", value: 9.6 }, { year: "2022", value: 3.6 }, { year: "2023", value: -7.7 }, { year: "2024", value: 8.2 }],
    eps: 11024, per: 18.0, pbr: 2.1, roe: 11.6, debtRatio: 52.3, marketCap: "약 144조원", dividendYield: 0.9,
  },
};

export const STOCK_NEWS: Record<string, NewsItem[]> = {
  NVDA: [
    { id: "1", title: "NVIDIA, 차세대 블랙웰 아키텍처 데이터센터 수요 급증으로 분기 매출 350억 달러 돌파", source: "Bloomberg", time: "2시간 전", sentiment: "positive" },
    { id: "2", title: "AI 인프라 투자 확대에 따른 NVDA 목표주가 상향 조정 잇따라", source: "Reuters", time: "4시간 전", sentiment: "positive" },
    { id: "3", title: "미 반도체 수출 규제 강화 우려에 NVDA 장중 변동성 확대", source: "WSJ", time: "6시간 전", sentiment: "negative" },
    { id: "4", title: "NVIDIA, 중국 시장 맞춤형 H20 칩 수요 예상 웃돌아", source: "Financial Times", time: "1일 전", sentiment: "positive" },
    { id: "5", title: "소프트뱅크, NVDA와 AI 인프라 협력 강화 논의 중", source: "Nikkei", time: "1일 전", sentiment: "neutral" },
  ],
  AAPL: [
    { id: "1", title: "애플, 아이폰 17 시리즈 AI 기능 강화로 업그레이드 사이클 기대감 고조", source: "Bloomberg", time: "1시간 전", sentiment: "positive" },
    { id: "2", title: "Apple Intelligence 서비스 매출 기여도 확대…애널리스트 목표가 상향", source: "CNBC", time: "3시간 전", sentiment: "positive" },
    { id: "3", title: "중국 스마트폰 시장 점유율 회복세, 화웨이와의 경쟁 완화 조짐", source: "Reuters", time: "5시간 전", sentiment: "neutral" },
    { id: "4", title: "EU, 애플 앱스토어 독점 정책 추가 조사 착수", source: "FT", time: "8시간 전", sentiment: "negative" },
    { id: "5", title: "워런 버핏 버크셔 해서웨이, 애플 지분 추가 매입", source: "WSJ", time: "2일 전", sentiment: "positive" },
  ],
  TSLA: [
    { id: "1", title: "테슬라, 로보택시 '사이버캡' 2025년 양산 일정 재확인…주가 반등", source: "Bloomberg", time: "30분 전", sentiment: "positive" },
    { id: "2", title: "유럽 EV 시장 점유율 하락, BYD·폭스바겐 거센 추격", source: "Reuters", time: "2시간 전", sentiment: "negative" },
    { id: "3", title: "머스크 CEO, 정치 활동 집중으로 테슬라 경영 집중도 우려 제기", source: "NYT", time: "5시간 전", sentiment: "negative" },
    { id: "4", title: "FSD(완전자율주행) v13 업데이트, 실주행 데이터에서 개선 확인", source: "Electrek", time: "1일 전", sentiment: "positive" },
    { id: "5", title: "Q1 인도량 전망 하향…월가 컨센서스 하회 우려", source: "Barron's", time: "1일 전", sentiment: "negative" },
  ],
  MSFT: [
    { id: "1", title: "마이크로소프트, Azure AI 매출 전년 대비 157% 성장 기록", source: "CNBC", time: "2시간 전", sentiment: "positive" },
    { id: "2", title: "코파일럿 엔터프라이즈 구독자 1000만 돌파, 수익화 속도 예상 초과", source: "Bloomberg", time: "4시간 전", sentiment: "positive" },
    { id: "3", title: "EU 경쟁당국, MS의 Teams 번들링 관행 추가 조사", source: "FT", time: "7시간 전", sentiment: "negative" },
    { id: "4", title: "OpenAI 투자 ROI 가시화…GPT-4o 탑재 오피스 365 매출 급증", source: "WSJ", time: "1일 전", sentiment: "positive" },
    { id: "5", title: "MS, 게이밍 부문 엑스박스 IP 모바일 확장 전략 발표", source: "VentureBeat", time: "2일 전", sentiment: "neutral" },
  ],
};

// Default news for symbols without specific news
const DEFAULT_NEWS: NewsItem[] = [
  { id: "1", title: "글로벌 시장 변동성 확대 속 방어주 선호 심리 강화", source: "Reuters", time: "1시간 전", sentiment: "neutral" },
  { id: "2", title: "연준 의사록 공개 앞두고 투자자 관망세 지속", source: "Bloomberg", time: "3시간 전", sentiment: "neutral" },
  { id: "3", title: "AI 관련주 실적 서프라이즈 기대감에 기술주 전반 강세", source: "CNBC", time: "5시간 전", sentiment: "positive" },
  { id: "4", title: "반도체 공급망 재편 가속화, 아시아 생산기지 다변화 추진", source: "Nikkei", time: "1일 전", sentiment: "neutral" },
  { id: "5", title: "기관 투자자, 주가 조정 국면서 분할 매수 전략 권고", source: "WSJ", time: "1일 전", sentiment: "positive" },
];

export function getStockNews(symbol: string): NewsItem[] {
  return STOCK_NEWS[symbol] || DEFAULT_NEWS;
}

export const ANALYST_TARGETS: Record<string, AnalystTarget[]> = {
  NVDA: [
    { firm: "Goldman Sachs", analyst: "Toshiya Hari", rating: "BUY", target: 1100, prevTarget: 1000, date: "2024-03-05" },
    { firm: "Morgan Stanley", analyst: "Joseph Moore", rating: "OVERWEIGHT", target: 1025, prevTarget: 950, date: "2024-03-04" },
    { firm: "JPMorgan", analyst: "Harlan Sur", rating: "OVERWEIGHT", target: 1000, prevTarget: 900, date: "2024-03-01" },
    { firm: "UBS", analyst: "Timothy Arcuri", rating: "BUY", target: 1050, prevTarget: 980, date: "2024-02-28" },
    { firm: "Citi", analyst: "Atif Malik", rating: "BUY", target: 1000, prevTarget: 870, date: "2024-02-27" },
  ],
  AAPL: [
    { firm: "Wedbush", analyst: "Dan Ives", rating: "OUTPERFORM", target: 250, prevTarget: 225, date: "2024-03-05" },
    { firm: "Morgan Stanley", analyst: "Erik Woodring", rating: "OVERWEIGHT", target: 230, prevTarget: 220, date: "2024-03-03" },
    { firm: "Goldman Sachs", analyst: "Michael Ng", rating: "BUY", target: 220, prevTarget: 210, date: "2024-02-29" },
    { firm: "JPMorgan", analyst: "Samik Chatterjee", rating: "OVERWEIGHT", target: 225, prevTarget: 215, date: "2024-02-27" },
    { firm: "Barclays", analyst: "Tim Long", rating: "EQUAL WEIGHT", target: 180, prevTarget: 175, date: "2024-02-26" },
  ],
  TSLA: [
    { firm: "Wedbush", analyst: "Dan Ives", rating: "OUTPERFORM", target: 315, prevTarget: 350, date: "2024-03-05" },
    { firm: "Morgan Stanley", analyst: "Adam Jonas", rating: "OVERWEIGHT", target: 320, prevTarget: 345, date: "2024-03-04" },
    { firm: "Goldman Sachs", analyst: "Mark Delaney", rating: "NEUTRAL", target: 185, prevTarget: 195, date: "2024-03-01" },
    { firm: "JPMorgan", analyst: "Ryan Brinkman", rating: "UNDERWEIGHT", target: 115, prevTarget: 130, date: "2024-02-28" },
    { firm: "Piper Sandler", analyst: "Alexander Potter", rating: "OVERWEIGHT", target: 300, prevTarget: 310, date: "2024-02-26" },
  ],
  MSFT: [
    { firm: "Goldman Sachs", analyst: "Kash Rangan", rating: "BUY", target: 500, prevTarget: 470, date: "2024-03-05" },
    { firm: "JPMorgan", analyst: "Mark Murphy", rating: "OVERWEIGHT", target: 490, prevTarget: 460, date: "2024-03-04" },
    { firm: "UBS", analyst: "Karl Keirstead", rating: "BUY", target: 510, prevTarget: 480, date: "2024-03-01" },
    { firm: "Barclays", analyst: "Raimo Lenschow", rating: "OVERWEIGHT", target: 500, prevTarget: 475, date: "2024-02-28" },
    { firm: "Citi", analyst: "Tyler Radke", rating: "BUY", target: 480, prevTarget: 450, date: "2024-02-27" },
  ],
};

export function getAnalystTargets(symbol: string): AnalystTarget[] {
  if (ANALYST_TARGETS[symbol]) return ANALYST_TARGETS[symbol];
  // Generic analyst data
  const price = STOCKS.find(s => s.symbol === symbol)?.price || 100;
  return [
    { firm: "Goldman Sachs", analyst: "Research Team", rating: "BUY", target: price * 1.18, prevTarget: price * 1.12, date: "2024-03-05" },
    { firm: "Morgan Stanley", analyst: "Research Team", rating: "OVERWEIGHT", target: price * 1.15, prevTarget: price * 1.10, date: "2024-03-04" },
    { firm: "JPMorgan", analyst: "Research Team", rating: "NEUTRAL", target: price * 1.05, prevTarget: price * 1.02, date: "2024-03-01" },
    { firm: "UBS", analyst: "Research Team", rating: "BUY", target: price * 1.20, prevTarget: price * 1.15, date: "2024-02-28" },
    { firm: "Barclays", analyst: "Research Team", rating: "EQUAL WEIGHT", target: price * 0.98, prevTarget: price * 0.95, date: "2024-02-26" },
  ];
}
export const STOCKS = [
  { symbol: "AAPL",   name: "Apple Inc.",       price: 189.84,  change: 2.34,    changePct: 1.25,  prediction: 78, signal: "BUY",        sector: "Tech" },
  { symbol: "NVDA",   name: "NVIDIA Corp.",      price: 875.35,  change: 24.12,   changePct: 2.83,  prediction: 91, signal: "STRONG BUY", sector: "Tech" },
  { symbol: "TSLA",   name: "Tesla Inc.",        price: 248.50,  change: -6.20,   changePct: -2.43, prediction: 42, signal: "HOLD",       sector: "EV" },
  { symbol: "MSFT",   name: "Microsoft Corp.",   price: 415.26,  change: 3.88,    changePct: 0.94,  prediction: 83, signal: "BUY",        sector: "Tech" },
  { symbol: "GOOGL",  name: "Alphabet Inc.",     price: 175.98,  change: -1.45,   changePct: -0.82, prediction: 65, signal: "HOLD",       sector: "Tech" },
  { symbol: "AMZN",   name: "Amazon.com Inc.",   price: 198.11,  change: 5.62,    changePct: 2.92,  prediction: 88, signal: "BUY",        sector: "E-Commerce" },
  { symbol: "META",   name: "Meta Platforms",    price: 512.44,  change: 8.32,    changePct: 1.65,  prediction: 72, signal: "BUY",        sector: "Social" },
  { symbol: "PLTR",   name: "Palantir Technologies", price: 82.47, change: 3.18,  changePct: 4.01,  prediction: 87, signal: "BUY",        sector: "AI/Data" },
  { symbol: "HOOD",   name: "Robinhood Markets", price: 42.31,   change: -1.24,   changePct: -2.85, prediction: 55, signal: "HOLD",       sector: "Fintech" },
  { symbol: "005930", name: "삼성전자",           price: 74800,   change: -500,    changePct: -0.66, prediction: 61, signal: "HOLD",       sector: "반도체" },
  { symbol: "035420", name: "NAVER",             price: 182500,  change: 3500,    changePct: 1.96,  prediction: 70, signal: "BUY",        sector: "인터넷" },
  { symbol: "000660", name: "SK하이닉스",         price: 198000,  change: 5000,    changePct: 2.59,  prediction: 85, signal: "BUY",        sector: "반도체" },
  { symbol: "298040", name: "효성중공업",         price: 284000,  change: 8500,    changePct: 3.09,  prediction: 80, signal: "BUY",        sector: "중공업" },
  { symbol: "012330", name: "현대모비스",         price: 261500,  change: -2500,   changePct: -0.95, prediction: 67, signal: "HOLD",       sector: "자동차부품" },
];

export const INDICES = [
  { name: "S&P 500",  value: "5,234.18",  change: "+0.87%", up: true  },
  { name: "NASDAQ",   value: "16,384.47", change: "+1.24%", up: true  },
  { name: "KOSPI",    value: "2,687.44",  change: "-0.34%", up: false },
  { name: "KOSDAQ",   value: "876.32",    change: "+0.61%", up: true  },
  { name: "DOW",      value: "39,127.80", change: "+0.52%", up: true  },
  { name: "NIKKEI",   value: "40,168.07", change: "+0.91%", up: true  },
  { name: "상해종합",  value: "3,412.88",  change: "-0.28%", up: false },
  { name: "CSI 300",  value: "4,018.54",  change: "+0.15%", up: true  },
  { name: "VIX",      value: "14.23",     change: "-3.12%", up: false },
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
