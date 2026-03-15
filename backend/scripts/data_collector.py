import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta

def collect_stock_data(symbol, days=365*2):
    """
    yfinance를 사용하여 주가, VIX 지수, 그리고 기본 지표들을 수집합니다.
    """
    print(f"--- {symbol} 데이터 수집 시작 ---")
    
    # 1. 주류 주가 데이터 수집
    stock = yf.Ticker(symbol)
    df = stock.history(period=f"{days}d")
    
    # 2. VIX 지수(공포지수) 수집
    vix = yf.Ticker("^VIX")
    vix_df = vix.history(period=f"{days}d")['Close']
    vix_df.name = 'VIX'
    
    # 3. 데이터 통합 (날짜 기준 병합)
    combined_df = df.join(vix_df, how='left')
    
    # 4. 기술적 지표 추가 (기초 Baseline용)
    # RSI (상대강도지수)
    delta = combined_df['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    combined_df['RSI'] = 100 - (100 / (1 + rs))
    
    # 이동평균선 (MA20, MA60)
    combined_df['MA20'] = combined_df['Close'].rolling(window=20).mean()
    combined_df['MA60'] = combined_df['Close'].rolling(window=60).mean()
    
    # 5. 실적 발표 일정 (유료 API 없이 yfinance 기본 제공 정보 활용)
    print("실적 발표 일정 확인 중...")
    try:
        earnings = stock.calendar
        if earnings is not None and not earnings.empty:
            print(f"다음 실적 발표 예정일: \n{earnings}")
    except:
        print("실적 발표 일정을 가져올 수 없습니다 (yfinance 제한).")

    # 결측치 처리
    combined_df.fillna(method='ffill', inplace=True)
    
    # 저장
    filename = f"{symbol}_integrated_data.csv"
    combined_df.to_csv(filename)
    print(f"성공: {filename} 저장 완료 (총 {len(combined_df)} 행)")
    
    return combined_df

if __name__ == "__main__":
    # 3대장 종목 테스트 수집
    symbols = ["005930.KS", "000660.KS", "005380.KS"] # 삼전, 닉스, 현차
    for s in symbols:
        try:
            collect_stock_data(s)
        except Exception as e:
            print(f"에러 발생 ({s}): {e}")
