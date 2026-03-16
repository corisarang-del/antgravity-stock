
import os
import sys
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta

# 프로젝트 루트 경로 추가 (scripts 폴더에서 실행 시)
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from data.preprocess import build_features

def export_multi_sample_modernized():
    # 국장 4 + 미장 4
    target_stocks = {
        "005930.KS": "삼성전자",
        "000660.KS": "SK하이닉스",
        "005380.KS": "현대자동차",
        "035420.KS": "NAVER",
        "TSLA": "테슬라",
        "NVDA": "엔비디아",
        "AAPL": "애플",
        "MSFT": "마이크로소프트"
    }
    
    all_data = []
    
    # 현재 시간 기준 최근 1년 설정 (2026년 기준)
    today = datetime.now()
    start_date = (today - timedelta(days=365)).strftime('%Y-%m-%d')
    end_date = today.strftime('%Y-%m-%d')
    
    print(f"🚀 [최신화 버전] {start_date} ~ {end_date} 데이터 샘플 추출 시작...")
    
    # 공통 VIX 데이터 수집
    try:
        vix = yf.download("^VIX", start=start_date, end=end_date, auto_adjust=True, progress=False)
        if isinstance(vix.columns, pd.MultiIndex):
            vix.columns = [c[0].lower() for c in vix.columns]
        else:
            vix.columns = [c.lower() for c in vix.columns]
    except Exception as e:
        print(f"⚠️ VIX 데이터 수집 실패: {e}")
        vix = None

    for symbol, name in target_stocks.items():
        print(f"📦 {name}({symbol}) 데이터 수집 중...")
        
        try:
            # 1. 데이터 수집
            df = yf.download(symbol, start=start_date, end=end_date, auto_adjust=True, progress=False)
            
            if df.empty:
                print(f"❌ {symbol} 데이터 수집 실패")
                continue

            # 컬럼 정리
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = [c[0].lower() for c in df.columns]
            else:
                df.columns = [c.lower() for c in df.columns]
            
            # 2. 피처 생성 (preprocess.py 로직 사용)
            features_df = build_features(df, vix_df=vix)
            
            # 종목 식별자 추가
            features_df.insert(0, "name", name)
            features_df.insert(0, "symbol", symbol)
            
            all_data.append(features_df)
        except Exception as e:
            print(f"❌ {symbol} 처리 중 오류 발생: {e}")
    
    if not all_data:
        print("❌ 추출된 데이터가 없습니다.")
        return

    # 3. 통합 및 CSV 저장
    combined_df = pd.concat(all_data)
    report_dir = os.path.join(os.path.dirname(__file__), "..", "reports")
    os.makedirs(report_dir, exist_ok=True)
    output_path = os.path.join(report_dir, "training_data_sample.csv")
    combined_df.to_csv(output_path, encoding="utf-8-sig")
    
    print(f"✅ 최신화 샘플 데이터 저장 완료: {output_path} (총 {len(combined_df)}행)")

if __name__ == "__main__":
    export_multi_sample_modernized()
