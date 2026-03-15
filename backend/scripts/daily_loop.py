"""
AntGravity - 30일 실천 루프 (Daily Automation Loop)

목표:
1. 매일 아침 최신 데이터 수집 (yf.download)
2. 전날 예측값과 오늘 실제 종가 비교 (Hit/Miss 판정)
3. 슬랙/노션용 레포트 생성 (시뮬레이션)
4. 내일의 주가 예측 및 DB 저장
"""

import sys
import os
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

# backend 경로 추가
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.supabase_client import get_supabase
from data.pipeline import TICKERS, fetch_all, fetch_and_store
from data.preprocess import build_features, make_sequences, LOOKBACK
from models.lstm_model import AntPredictor

def evaluate_predictions():
    """어제 예측과 오늘 실제 결과를 비교하여 성과 측정"""
    print("\n🔍 어제 예측 성과 측정 중...")
    supabase = get_supabase()
    
    # 어제 날짜 (마지막 영업일 기준 비교가 필요하지만, 여기서는 단순화)
    # 실제로는 '최신 데이터가 존재하는 날짜' 중 예측값이 있는 날을 찾음
    
    today_str = datetime.now().date().isoformat()
    
    # 1. 오늘 종가 가져오기
    stock_resp = supabase.table("stocks").select("symbol, close, date").eq("date", today_str).execute()
    actual_closes = {item["symbol"]: item["close"] for item in stock_resp.data}
    
    if not actual_closes:
        print(f"⚠️ 오늘({today_str})의 종가 데이터가 아직 수집되지 않았습니다.")
        return None

    # 2. 어제(또는 이전에) 저장된 '오늘자 예측값' 가져오기
    pred_resp = supabase.table("predictions").select("symbol, last_close, predicted_prices, name").eq("predicted_date", today_str).execute()
    
    report_lines = []
    total_hits = 0
    total_count = 0

    for pred in pred_resp.data:
        symbol = pred["symbol"]
        if symbol in actual_closes:
            actual = float(actual_closes[symbol])
            last_close = float(pred["last_close"])
            # 예측값은 배열의 첫 번째 요소 (v1 baseline)
            predicted_close = float(pred["predicted_prices"][0])
            
            # 방향성 판정
            actual_up = actual > last_close
            predicted_up = predicted_close > last_close
            
            hit = (actual_up == predicted_up)
            if hit: total_hits += 1
            total_count += 1
            
            status = "✅ 적중" if hit else "❌ 실패"
            diff_pct = ((actual - last_close) / last_close) * 100
            pred_diff_pct = ((predicted_close - last_close) / last_close) * 100
            
            report_lines.append(
                f"[{symbol}] {status} | 실제: {actual:,.2f}({diff_pct:+.2f}%) | "
                f"예측: {predicted_close:,.2f}({pred_diff_pct:+.2f}%)"
            )

    accuracy = (total_hits / total_count * 100) if total_count > 0 else 0
    summary = f"📊 총 {total_count}개 종목 중 {total_hits}개 방향 적중 (정확도: {accuracy:.1f}%)"
    
    print(f"\n{summary}")
    for line in report_lines:
        print(line)
    
    # 3. 상세 로그 저장 (대시보드용)
    history_path = os.path.join(os.path.dirname(__file__), "..", "reports", "historical_results.csv")
    history_rows = []
    for pred in pred_resp.data:
        symbol = pred["symbol"]
        if symbol in actual_closes:
            actual = float(actual_closes[symbol])
            last_close = float(pred["last_close"])
            predicted_close = float(pred["predicted_prices"][0])
            
            hit = (actual > last_close) == (predicted_close > last_close)
            
            history_rows.append({
                "date": today_str,
                "symbol": symbol,
                "name": pred.get("name", symbol),
                "last_close": last_close,
                "predicted_close": predicted_close,
                "actual_close": actual,
                "hit": hit
            })
    
    if history_rows:
        history_df = pd.DataFrame(history_rows)
        # 디렉토리 성 확인
        os.makedirs(os.path.dirname(history_path), exist_ok=True)
        if not os.path.exists(history_path):
            history_df.to_csv(history_path, index=False, encoding="utf-8-sig")
        else:
            history_df.to_csv(history_path, mode='a', header=False, index=False, encoding="utf-8-sig")
        print(f"📈 상세 성과 이력 저장 완료: {history_path}")

    return summary + "\n" + "\n".join(report_lines)

def get_priority_logic(pred_price, last_close, risk_level):
    """예측 가격과 리스크를 바탕으로 투자 우선순위 태그와 이유 생성"""
    diff_pct = ((pred_price - last_close) / last_close) * 100
    
    if diff_pct > 1.5 and risk_level == "Low":
        return "[🚀 강력 추천]", "높은 상승 기대치와 낮은 변동성 확인", 1.0
    elif diff_pct > 0.8 and risk_level != "High":
        return "[📈 매수 우위]", "안정적인 상승 추세 예상", 0.7
    elif diff_pct < -1.0:
        return "[⚠️ 주의]", "단기 조정 또는 하락 신호 포착", 0.0
    elif risk_level == "High":
        return "[⏳ 관망]", "높은 시장 변동성으로 인한 리스크 관리 필요", 0.3
    else:
        return "[⏳ 관망]", "뚜렷한 방향성 부재 또는 보합세 예상", 0.4

def generate_new_predictions():
    """최신 데이터를 바탕으로 내일의 주가를 예측하여 DB(또는 CSV) 저장 및 태깅"""
    print("\n🔮 내일의 주가 예측 및 전략 생성 중...")
    
    supabase = None
    try:
        supabase = get_supabase()
    except:
        print("⚠️ Supabase 연결 불가. CSV 모드로 전환합니다.")

    tomorrow = (datetime.now() + timedelta(days=1)).date().isoformat()
    all_predictions = []
    
    for symbol in TICKERS:
        try:
            import yfinance as yf
            df = yf.download(symbol, period="1y", auto_adjust=True, progress=False)
            if df.empty: continue
            
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = [c[0].lower() for c in df.columns]
            else:
                df.columns = [c.lower() for c in df.columns]

            vix_df = yf.download("^VIX", period="1y", auto_adjust=True, progress=False)
            if not vix_df.empty:
                if isinstance(vix_df.columns, pd.MultiIndex):
                    vix_df.columns = [c[0].lower() for c in vix_df.columns]
                else:
                    vix_df.columns = [c.lower() for c in vix_df.columns]
            
            # yfinance 데이터 컬럼 정리 (Close vs close)
            for df_temp in [df, vix_df]:
                if df_temp is not None and not df_temp.empty:
                    # MultiIndex인 경우 첫번째 레벨만 취함
                    if isinstance(df_temp.columns, pd.MultiIndex):
                        df_temp.columns = [c[0].lower() for c in df_temp.columns]
                    else:
                        df_temp.columns = [c.lower() for c in df_temp.columns]

            features_df = build_features(df, vix_df=vix_df)
            
            if len(features_df) < LOOKBACK:
                continue

            last_sequence = features_df.values[-LOOKBACK:]
            last_close = float(df['close'].iloc[-1])
            
            from sklearn.preprocessing import MinMaxScaler
            scaler = MinMaxScaler()
            scaler.fit(features_df.values)
            scaled_seq = scaler.transform(last_sequence)

            predictor = AntPredictor(symbol)
            pred_data = predictor.predict(scaled_seq)
            
            # scaler.inverse_transform 기대 구조 맞추기 (10개 피처)
            # FEATURES = ["open", "high", "low", "close", "volume", "vix", "rsi", "ma5", "ma20", "earnings_dday"]
            # 'close'는 인덱스 3
            dummy = np.zeros((1, 10))
            dummy[0, 3] = pred_data["predicted_prices"][0] 
            inv_pred = float(scaler.inverse_transform(dummy)[0, 3])
            
            # 우선순위 로직 적용
            tag, reason, score = get_priority_logic(inv_pred, last_close, pred_data["risk_level"])
            
            pred_entry = {
                "symbol": symbol,
                "name": TICKERS[symbol]["name"],
                "market": TICKERS[symbol]["market"],
                "predicted_date": tomorrow,
                "prediction_dates": [tomorrow],
                "predicted_prices": [inv_pred],
                "volatility": pred_data["volatility"],
                "risk_level": pred_data["risk_level"],
                "last_close": last_close,
                "tag": tag,
                "reason": reason,
                "priority_score": score
            }
            all_predictions.append(pred_entry)

            if supabase:
                try:
                    supabase.table("predictions").upsert(pred_entry, on_conflict="symbol, predicted_date").execute()
                except:
                    pass
            
            print(f"✅ {symbol}: 생성 완료 ({tag})")
            
        except Exception as e:
            print(f"❌ {symbol} 예측 실패: {e}")

    # 우선순위 높은 순으로 정렬
    all_predictions.sort(key=lambda x: x["priority_score"], reverse=True)

    # 4. CSV로 통합 저장 (백업 및 편의성)
    if all_predictions:
        os.makedirs("reports/daily_csv", exist_ok=True)
        csv_path = f"reports/daily_csv/prediction_{tomorrow}.csv"
        df_new = pd.DataFrame(all_predictions)
        df_new.to_csv(csv_path, index=False, encoding="utf-8-sig")
        print(f"💾 데일리 전략 리포트 저장 완료: {csv_path}")
        
        # 5. [추가] 누적 성과 기록
        log_path = os.path.join(os.path.dirname(__file__), "..", "reports", "cumulative_performance.csv")
        log_entry = {
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "prediction_date": tomorrow,
            "stock_count": len(all_predictions),
            "top_pick": all_predictions[0]["symbol"] if all_predictions[0]["priority_score"] >= 0.7 else "None"
        }
        log_df = pd.DataFrame([log_entry])
        if not os.path.exists(log_path):
            log_df.to_csv(log_path, index=False, encoding="utf-8-sig")
        else:
            log_df.to_csv(log_path, mode='a', header=False, index=False, encoding="utf-8-sig")
        print(f"📒 누적 로그 업데이트: {log_path}")

    return all_predictions

def daily_mission_report(eval_content, new_predictions=None):
    """팀 공유용 리포트 출력"""
    print("\n" + "="*50)
    print("📢 AntGravity Daily Mission Report")
    print("="*50)
    
    print("\n[1. 전일 성과 평가]")
    if eval_content:
        print(eval_content)
    else:
        print("최근 24시간 내 예측 데이터가 없습니다. (첫 실행 시 발생)")

    print("\n[2. 내일의 투자 우선순위]")
    if new_predictions:
        for p in new_predictions:
            diff = ((p["predicted_prices"][0] - p["last_close"]) / p["last_close"]) * 100
            print(f"{p['tag']} {p['symbol']} ({p['name']})")
            print(f"   - 예측가: {p['predicted_prices'][0]:,.2f} ({diff:+.2f}%)")
            print(f"   - 추천사유: {p['reason']}")
    else:
        print("내일의 예측 데이터가 생성되지 않았습니다.")

    print("\n" + "="*50)
    print("💡 기획자님의 한마디: '예측-확인-수정'의 30일 루프! 내일도 달립시다.")
    print("="*50)

if __name__ == "__main__":
    print(f"🚀 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - 데일리 루프 시작")
    
    try:
        fetch_all()
    except:
        print("⚠️ DB 연결 문제로 일부 아카이빙이 제한될 수 있습니다.")
    
    eval_report = None
    try:
        eval_report = evaluate_predictions()
    except:
        pass
    
    new_preds = generate_new_predictions()
    
    # 대시보드 업데이트 트리거
    try:
        from scripts.update_dashboard import generate_dashboard
        generate_dashboard()
    except Exception as e:
        print(f"⚠️ 대시보드 업데이트 실패: {e}")
    
    daily_mission_report(eval_report, new_preds)
