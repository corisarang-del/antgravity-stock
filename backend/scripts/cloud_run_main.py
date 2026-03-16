# cloud_run_main.py - Cloud Run 엔트리포인트
from flask import Flask, request
from google.cloud import bigquery
import pandas as pd
import os
import sys

# 프로젝트 루트 경로 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.anomaly_detector import AnomalyDetector
from models.stock_recommender import StockRecommender

app = Flask(__name__)
bq_client = bigquery.Client()

def get_market_tickers():
    """S&P 500, NASDAQ 100, KOSPI 200, KOSDAQ 150 등 주요 지수 종목 합산 수집"""
    tickers = set()
    
    # 1. S&P 500
    try:
        sp500 = pd.read_html('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies')[0]
        tickers.update(sp500['Symbol'].tolist())
    except: pass
    
    # 2. NASDAQ 100
    try:
        nasdaq100 = pd.read_html('https://en.wikipedia.org/wiki/Nasdaq-100#Components')[4]
        tickers.update(nasdaq100['Ticker'].tolist())
    except: pass
    
    # 3. KOSPI 200 (Wikipedia 기반은 관리 어려움이 있어 상위 상위권 주요 종목 예시 및 확장을 위한 로직)
    # 실제 운영 시 KRX API나 전용 라이브러리 연동 권장
    kr_samples = [
        "005930.KS", "000660.KS", "005380.KS", "005490.KS", "035420.KS", # KOSPI Top
        "091990.KQ", "263750.KQ", "066970.KQ", "293490.KQ", "028300.KQ"  # KOSDAQ Top
    ]
    tickers.update(kr_samples)
    
    # 중복 제거 및 정리
    final_list = sorted(list(tickers))
    print(f"✅ 총 {len(final_list)}개 종목 수집 완료 (US & KR Mixed)")
    return final_list

def save_predictions_to_bq(results_df, client):
    """BigQuery에 예측 결과 저장"""
    dataset_id = 'ant_gravity_data'
    table_id = 'daily_predictions'
    table_ref = client.dataset(dataset_id).table(table_id)
    
    # 30일 모니터링을 위한 스키마 및 적재 로직 (생략)
    try:
        client.load_table_from_dataframe(results_df, table_ref).result()
        print("✅ BigQuery 저장 완료")
    except Exception as e:
        print(f"❌ BigQuery 저장 실패: {e}")

def save_predictions_to_local_csv(results_df):
    """대시보드 실시간 반영을 위해 로컬 CSV에도 누적 저장"""
    csv_path = os.path.join(os.path.dirname(__file__), "..", "reports", "research_results.csv")
    os.makedirs(os.path.dirname(csv_path), exist_ok=True)
    
    # TICKERS 정보 매핑 (name, market)
    from data.pipeline import TICKERS
    
    results_df['name'] = results_df['ticker'].apply(lambda x: TICKERS.get(x, {}).get('name', x))
    results_df['market'] = results_df['ticker'].apply(lambda x: TICKERS.get(x, {}).get('market', 'US'))
    
    # 저장용 형식 변환
    log_df = pd.DataFrame({
        'date': results_df['date'],
        'model': 'AntRanker', # Ranker 결과가 최종 추천임
        'market': results_df['market'],
        'symbol': results_df['ticker'],
        'name': results_df['name'],
        'score': results_df['final_score'],
        'rank': results_df['rank'],
        'result_7d': None,
        'result_30d': None
    })
    
    if not os.path.exists(csv_path):
        log_df.to_csv(csv_path, index=False, encoding="utf-8-sig")
    else:
        log_df.to_csv(csv_path, mode='a', header=False, index=False, encoding="utf-8-sig")
    print(f"📊 연구용 성과 누적 완료: {csv_path}")

@app.route('/run_daily', methods=['POST'])
def daily_pipeline():
    """데일리 파이프라인 실행 엔트리포인트"""
    print("🚀 데일리 파이프라인 시작...")
    
    # 1. 전 세계 주요 지수 종목 수집 (S&P, NASDAQ, KOSPI, KOSDAQ)
    tickers = get_market_tickers()
    print(f"📊 총 {len(tickers)}개 종목 스캔 시작...")
    
    # 2. Model 2: AntRadar (이상치 감지)
    detector = AnomalyDetector()
    candidates = []
    
    # 전 종목 루프 (실 운영환경에서는 병렬 처리를 권장하지만, 안정성을 위해 순차 처리 + 예외 처리 강화)
    for i, ticker in enumerate(tickers):
        try:
            if i % 50 == 0: print(f"🔍 진행 중... ({i}/{len(tickers)})")
            
            features = detector.build_features(ticker)
            if features is None or features.empty: continue
            
            pred, score = detector.detect(features)
            # -1: Anomaly (급등 후보)
            if pred[-1] == -1:  
                candidates.append({
                    'ticker': ticker, 
                    'anomaly_score': float(score[-1]),
                    'date': pd.Timestamp.now().strftime('%Y-%m-%d')
                })
        except Exception as e:
            # 개별 종목 에러가 전체 파이프라인을 멈추지 않도록 처리
            continue
    
    print(f"✅ 스캔 완료. 급등 후보 {len(candidates)}개 발견.")
    
    if not candidates:
        return {'status': 'success', 'message': '급등 후보가 발견되지 않았습니다.', 'candidates_count': 0}
    
    # 3. Model 3: AntRanker (추천 랭킹)
    recommender = StockRecommender()
    candidates_df = pd.DataFrame(candidates)
    
    # 상위 후보군에 대해 랭킹 산출
    final_recs = recommender.recommend(candidates_df)
    
    # 4. BigQuery에 저장 (성과 추적용)
    save_predictions_to_bq(final_recs, bq_client)
    
    # 5. 로컬 누적 저장 (대시보드 반영용)
    try:
        save_predictions_to_local_csv(final_recs)
    except Exception as e:
        print(f"⚠️ 로컬 저장 실패: {e}")
    
    return {
        'status': 'success', 
        'date': pd.Timestamp.now().strftime('%Y-%m-%d'),
        'candidates_count': len(candidates),
        'recommendations': final_recs.to_dict(orient='records')
    }

if __name__ == "__main__":
    # 로컬 테스트용
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
