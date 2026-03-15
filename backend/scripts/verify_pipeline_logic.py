import sys
import os
from unittest.mock import MagicMock, patch
import pandas as pd
from datetime import datetime

# backend 경로 추가
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

@patch('core.supabase_client.get_supabase')
@patch('yfinance.download')
@patch('yfinance.Ticker')
def test_pipeline_logic(mock_ticker, mock_yf_download, mock_get_supabase):
    from data.pipeline import fetch_and_store, fetch_vix, fetch_earnings, TICKERS
    
    print("🧪 Pipeline Logic 테스트 시작...")
    
    # Mock Supabase
    mock_db = MagicMock()
    mock_get_supabase.return_value = mock_db
    mock_db.table().select().eq().order().limit().execute.return_value.data = []
    
    # 1. fetch_and_store 테스트 (RSI 계산 확인)
    print("Checking RSI calculation...")
    # 20일치 가상 데이터 생성
    dates = pd.date_range(end=datetime.now(), periods=20)
    mock_data = pd.DataFrame({
        'Open': [100 + i for i in range(20)],
        'High': [105 + i for i in range(20)],
        'Low': [95 + i for i in range(20)],
        'Close': [100 + i for i in range(20)],
        'Volume': [1000] * 20
    }, index=dates)
    mock_yf_download.return_value = mock_data
    
    df = fetch_and_store("TSLA")
    
    assert 'RSI' in df.columns
    assert pd.notna(df['RSI'].iloc[-1])
    print(f"✅ RSI 계산 확인 완료 (마지막 RSI: {df['RSI'].iloc[-1]:.2f})")
    
    # 2. fetch_vix 테스트
    print("Checking VIX collection...")
    mock_vix_data = pd.DataFrame({
        'Close': [20.5, 21.0, 19.8]
    }, index=pd.date_range(end=datetime.now(), periods=3))
    mock_yf_download.return_value = mock_vix_data
    
    fetch_vix(period="5d")
    mock_db.table.assert_any_call("stocks")
    print("✅ VIX 수집 로직 호출 확인")
    
    # 3. fetch_earnings 테스트
    print("Checking Earnings collection...")
    mock_stock_obj = MagicMock()
    mock_ticker.return_value = mock_stock_obj
    mock_stock_obj.calendar = pd.DataFrame({
        "Earnings Date": [datetime(2026, 4, 15)],
        "Mock Event": ["Mock Event"]
    })
    
    fetch_earnings("TSLA")
    mock_db.table.assert_any_call("stock_metadata")
    print("✅ Earnings 수집 로직 호출 확인")

    print("\n🎉 모든 로직 테스트 통과!")

if __name__ == "__main__":
    try:
        test_pipeline_logic()
    except Exception as e:
        print(f"❌ 테스트 실패: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
