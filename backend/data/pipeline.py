"""
주가 데이터 파이프라인

비용 최소화 전략:
- yfinance는 무료 API (비용 없음)
- 수집 결과를 Supabase에 저장 → 중복 호출 원천 차단
- 캐싱: settings.STOCK_CACHE_MINUTES 동안 DB 데이터 재사용
"""
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from core.config import settings
from core.supabase_client import get_supabase

# 14개 종목 (국장 5 + 미장 9)
TICKERS = {
    # 국내 (KRX)
    "005930.KS": {"name": "삼성전자",   "market": "KR"},
    "000660.KS": {"name": "SK하이닉스", "market": "KR"},
    "005380.KS": {"name": "현대자동차", "market": "KR"},
    "012330.KS": {"name": "현대모비스", "market": "KR"},
    "267270.KS": {"name": "효성중공업", "market": "KR"},
    # 해외 (NASDAQ/NYSE)
    "TSLA":      {"name": "테슬라",          "market": "US"},
    "NVDA":      {"name": "엔비디아",        "market": "US"},
    "AAPL":      {"name": "애플",            "market": "US"},
    "GOOGL":     {"name": "알파벳(구글)",    "market": "US"},
    "MSFT":      {"name": "마이크로소프트",  "market": "US"},
    "PLTR":      {"name": "팔란티어",        "market": "US"},
    "HOOD":      {"name": "로빈후드",        "market": "US"},
    "SPY":       {"name": "SPDR S&P 500 ETF Trust", "market": "US"},
    "VOO":       {"name": "Vanguard S&P 500 ETF",   "market": "US"},
}

MARKET_TICKER_SYMBOLS = {
    "^KS11": {"name": "KOSPI", "market": "INDEX"},
    "^KQ11": {"name": "KOSDAQ", "market": "INDEX"},
    "^IXIC": {"name": "NASDAQ", "market": "INDEX"},
    "^GSPC": {"name": "S&P 500", "market": "INDEX"},
    "^N225": {"name": "NIKKEI 225", "market": "INDEX"},
    "000001.SS": {"name": "SSE", "market": "INDEX"},
    "^STOXX50E": {"name": "EURO STOXX 50", "market": "INDEX"},
}


def fetch_and_store(symbol: str, period: str = "1y") -> pd.DataFrame:
    """
    yfinance로 OHLCV 데이터를 수집하고 Supabase에 저장.
    이미 저장된 날짜는 건너뜀 (중복 API 호출 방지).
    """
    supabase = get_supabase()

    # DB에 이미 있는 최신 날짜 확인
    response = (
        supabase.table("stocks")
        .select("date")
        .eq("symbol", symbol)
        .order("date", desc=True)
        .limit(1)
        .execute()
    )
    last_date = None
    if response.data:
        last_date = datetime.fromisoformat(response.data[0]["date"]).date()

    # 최신 데이터만 수집
    start_date = (last_date + timedelta(days=1)).isoformat() if last_date else None
    df = yf.download(symbol, period=period if not start_date else None,
                     start=start_date, auto_adjust=True, progress=False)

    if df.empty:
        return df

    # RSI 계산 (14일 기준)
    if len(df) >= 14:
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        # 0으로 나누기 방지
        rs = gain / loss.replace(0, 1e-9)
        df['RSI'] = 100 - (100 / (1 + rs))
    else:
        df['RSI'] = None

    # DB upsert
    rows = []
    for date, row in df.iterrows():
        rows.append({
            "symbol": symbol,
            "market": TICKERS[symbol]["market"],
            "name": TICKERS[symbol]["name"],
            "date": date.date().isoformat(),
            "open":   float(row["Open"]),
            "high":   float(row["High"]),
            "low":    float(row["Low"]),
            "close":  float(row["Close"]),
            "volume": int(row["Volume"]),
            "rsi":    float(row["RSI"]) if pd.notna(row["RSI"]) else None,
        })
    if rows:
        supabase.table("stocks").upsert(rows, on_conflict="symbol,date").execute()

    return df


def fetch_vix(period: str = "1y"):
    """VIX (공포 지수) 데이터 수집 및 stocks 테이블에 통합 저장"""
    try:
        vix = yf.download("^VIX", period=period, auto_adjust=True, progress=False)
        if vix.empty:
            return

        supabase = get_supabase()
        rows = []
        for date, row in vix.iterrows():
            rows.append({
                "symbol": "^VIX",
                "market": "US",
                "name": "VIX Index",
                "date": date.date().isoformat(),
                "close": float(row["Close"]),
            })
        if rows:
            supabase.table("stocks").upsert(rows, on_conflict="symbol,date").execute()
        print("✅ VIX Index 데이터 수집 완료")
    except Exception as e:
        print(f"❌ VIX 수집 실패: {e}")


def fetch_earnings(symbol: str):
    """실적 발표 일정 수집 및 stock_metadata에 저장"""
    if TICKERS.get(symbol, {}).get("market") != "US":
        return  # 현재는 미장만 지원

    try:
        stock = yf.Ticker(symbol)
        calendar = stock.calendar
        if calendar is not None and not calendar.empty:
            # yfinance 버전에 따라 형식이 다를 수 있음 (일반적으로 첫 번째 행이 다음 실적일)
            next_date = calendar.iloc[0, 0]
            if isinstance(next_date, (datetime, pd.Timestamp)):
                next_date_str = next_date.date().isoformat()
                supabase = get_supabase()
                supabase.table("stock_metadata").upsert({
                    "symbol": symbol,
                    "next_earnings_date": next_date_str,
                    "updated_at": datetime.now().isoformat()
                }).execute()
                print(f"📅 {symbol} 실적 발표일 업데이트: {next_date_str}")
    except Exception as e:
        print(f"⚠️ {symbol} 실적 데이터 수집 불가: {e}")


def fetch_all():
    """전체 데이터 수집 프로세스"""
    # 1. 주가 데이터 (RSI 포함)
    for symbol in TICKERS:
        try:
            fetch_and_store(symbol)
            print(f"✅ {symbol} ({TICKERS[symbol]['name']}) 수집 완료")
            
            # 2. 실적 일정 (미장만)
            fetch_earnings(symbol)
        except Exception as e:
            print(f"❌ {symbol} 수집 실패: {e}")

    # 3. 시장 지표 (VIX)
    fetch_vix()


if __name__ == "__main__":
    fetch_all()
