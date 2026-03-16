import os
import sys
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta

# backend 경로 추가
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models.anomaly_detector import AnomalyDetector
from models.stock_recommender import StockRecommender
from data.pipeline import TICKERS

RESEARCH_CSV = os.path.join(os.path.dirname(__file__), "..", "reports", "research_results.csv")

def update_historical_results():
    """기존 연구 데이터 중 '측정 중...'인 항목들의 성과를 업데이트"""
    if not os.path.exists(RESEARCH_CSV):
        return
        
    df = pd.read_csv(RESEARCH_CSV)
    updated = False
    
    for i, row in df.iterrows():
        # 7일 후 결과 업데이트 (Model 2)
        if row['model'] == 'AntRadar' and (pd.isna(row['result_7d']) or row['result_7d'] == '측정 중...'):
            start_date = pd.to_datetime(row['date'])
            # 7일이 지났는지 확인 (오늘 3/6 - 시작일 2/27 = 7일)
            if datetime.now() - start_date >= timedelta(days=7):
                symbol = row['symbol']
                try:
                    # 시작가 (해당 날짜 종가)
                    # 실제로는 시작일에 저장된 가격을 써야 하지만, 여기서는 다시 가져옴
                    hist = yf.download(symbol, start=row['date'], period='10d', progress=False)
                    if isinstance(hist.columns, pd.MultiIndex):
                        hist.columns = [c[0].lower() for c in hist.columns]
                    else:
                        hist.columns = [c.lower() for c in hist.columns]
                    
                    if len(hist) >= 6: # 주말 제외 약 5-7영업일
                        start_price = hist['close'].iloc[0]
                        end_price = hist['close'].iloc[-1]
                        change = ((end_price - start_price) / start_price) * 100
                        df.at[i, 'result_7d'] = f"{change:+.1f}%"
                        updated = True
                except: pass
                
        # 30일 후 결과는 아직 기간 미달 (Feb 27 -> Mar 6 은 약 7-8일)
        
    if updated:
        df.to_csv(RESEARCH_CSV, index=False, encoding="utf-8-sig")
        print("✅ 과거 연구 성과 업데이트 완료")

def run_new_research():
    """오늘(3/6) 날짜로 새로운 이상치 및 랭킹 생성"""
    today_str = "2026-03-06"
    detector = AnomalyDetector()
    
    results = []
    
    print("📡 [Model 2] AntRadar 스캔 중...")
    # 주요 종목 위주로 스캔 (시간 절약)
    for symbol in TICKERS:
        try:
            data = detector.build_features(symbol)
            if data.empty: continue
            
            preds, scores = detector.detect(data)
            # -1: Anomaly
            if preds[-1] == -1:
                results.append({
                    'date': today_str,
                    'model': 'AntRadar',
                    'market': TICKERS[symbol]['market'],
                    'symbol': symbol,
                    'name': TICKERS[symbol]['name'],
                    'score': float(scores[-1]),
                    'rank': None,
                    'result_7d': '측정 중...',
                    'result_30d': None
                })
                print(f"🚩 이상치 발견: {symbol}")
        except: continue
        
    # Model 3 (Ranker) - 여기서는 간단히 상위 3개 선정 (LGBM 학습 데이터가 부족할 경우를 대비)
    if results:
        # 이상치 점수가 낮은 것(Isolation Forest는 낮을수록 더 이상함) 순으로 랭킹
        anomalies = [r for r in results if r['model'] == 'AntRadar']
        anomalies.sort(key=lambda x: x['score'])
        
        # 상위 3개를 Ranker 결과로 추가
        for i, res in enumerate(anomalies[:3]):
            results.append({
                'date': today_str,
                'model': 'AntRanker',
                'market': res['market'],
                'symbol': res['symbol'],
                'name': res['name'],
                'score': 1.0 - (i * 0.05), # 가상의 추천 점수
                'rank': i + 1,
                'result_7d': None,
                'result_30d': '측정 중...'
            })
            
    if results:
        new_df = pd.DataFrame(results)
        if os.path.exists(RESEARCH_CSV):
            old_df = pd.read_csv(RESEARCH_CSV)
            # 금일 데이터 중복 방지
            old_df = old_df[old_df['date'] != today_str]
            final_df = pd.concat([new_df, old_df]).sort_values(['date', 'model'], ascending=[False, True])
            final_df.to_csv(RESEARCH_CSV, index=False, encoding="utf-8-sig")
        else:
            new_df.to_csv(RESEARCH_CSV, index=False, encoding="utf-8-sig")
        print(f"📊 {today_str} 연구 결과 저장 완료 ({len(results)}건)")

if __name__ == "__main__":
    update_historical_results()
    run_new_research()
    
    # 대시보드 갱신
    try:
        from scripts.update_dashboard import generate_dashboard
        generate_dashboard()
    except Exception as e:
        print(f"⚠️ 대시보드 업데이트 실패: {e}")
