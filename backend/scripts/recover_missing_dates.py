import sys
import os
import pandas as pd
import yfinance as yf
from datetime import datetime

# backend 경로 추가
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def recover_date(target_date_str):
    print(f"🔄 {target_date_str} 데이터 복구 시작...")
    
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    prediction_path = os.path.join(base_dir, "reports", "daily_csv", f"prediction_{target_date_str}.csv")
    history_path = os.path.join(base_dir, "reports", "historical_results.csv")
    
    if not os.path.exists(prediction_path):
        print(f"❌ {prediction_path} 파일이 없습니다.")
        return
    
    pred_df = pd.read_csv(prediction_path)
    history_rows = []
    
    for _, row in pred_df.iterrows():
        symbol = row['symbol']
        try:
            # 해당 날짜의 종가 가져오기
            # yfinance에서 특정 날짜를 가져오려면 start/end를 지정
            df = yf.download(symbol, start=target_date_str, end=(pd.to_datetime(target_date_str) + pd.Timedelta(days=1)).strftime('%Y-%m-%d'), progress=False)
            
            if df.empty:
                print(f"⚠️ {symbol}: {target_date_str} 데이터가 없습니다.")
                continue
            
            # MultiIndex columns 처리 (Price, Ticker 레벨)
            if isinstance(df.columns, pd.MultiIndex):
                # 'Close' 레벨과 symbol 레벨을 찾아서 값 추출
                if 'Close' in df.columns.get_level_values(0):
                    actual_close = float(df['Close'][symbol].iloc[0])
                elif 'close' in df.columns.get_level_values(0):
                    actual_close = float(df['close'][symbol].iloc[0])
                else:
                    print(f"❌ {symbol}: 'Close' 컬럼을 찾을 수 없습니다. {df.columns}")
                    continue
            else:
                # 단일 인덱스인 경우
                actual_close = float(df['Close'].iloc[0]) if 'Close' in df.columns else float(df['close'].iloc[0])
                
            last_close = float(row['last_close'])
            # predicted_prices는 문자열 형태의 리스트일 수 있으므로 처리
            import ast
            pred_prices = ast.literal_eval(row['predicted_prices'])
            predicted_close = float(pred_prices[0])
            
            hit = (actual_close > last_close) == (predicted_close > last_close)
            
            history_rows.append({
                "date": target_date_str,
                "symbol": symbol,
                "name": row['name'],
                "last_close": last_close,
                "predicted_close": predicted_close,
                "actual_close": actual_close,
                "hit": hit
            })
            print(f"✅ {symbol}: 복구 완료 ({'적중' if hit else '실패'})")
            
        except Exception as e:
            print(f"❌ {symbol} 복구 실패: {e}")
            
    if history_rows:
        new_df = pd.DataFrame(history_rows)
        if os.path.exists(history_path):
            existing_df = pd.read_csv(history_path)
            # 중복 제거 (이미 해당 날짜/종목 데이터가 있으면 스킵)
            combined = pd.concat([existing_df, new_df]).drop_duplicates(subset=['date', 'symbol'], keep='last')
            combined.to_csv(history_path, index=False, encoding="utf-8-sig")
        else:
            new_df.to_csv(history_path, index=False, encoding="utf-8-sig")
        print(f"💾 {len(history_rows)}개 항목이 {history_path}에 업데이트 되었습니다.")

if __name__ == "__main__":
    # 데이터 복구 대상 날짜
    for d in ["2026-03-03", "2026-03-04", "2026-03-05", "2026-03-06"]:
        recover_date(d)
    
    # 대시보드 업데이트
    try:
        from scripts.update_dashboard import generate_dashboard
        generate_dashboard()
    except Exception as e:
        print(f"⚠️ 대시보드 업데이트 실패: {e}")
