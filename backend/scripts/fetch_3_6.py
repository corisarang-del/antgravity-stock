import sys
import os
from datetime import datetime
import pandas as pd

# backend 경로 추가
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.supabase_client import get_supabase

def check_3_6():
    try:
        supabase = get_supabase()
        target_date = "2026-03-06"
        resp = supabase.table("predictions").select("*").eq("predicted_date", target_date).execute()
        if resp.data:
            print(f"Found {len(resp.data)} predictions for {target_date}")
            df = pd.DataFrame(resp.data)
            # rename columns if necessary to match daily_loop format
            # symbol,name,market,predicted_date,prediction_dates,predicted_prices,volatility,risk_level,last_close,tag,reason,priority_score
            output_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'reports', 'daily_csv', f'prediction_{target_date}.csv'))
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            df.to_csv(output_path, index=False)
            print(f"Saved to {output_path}")
        else:
            print(f"No predictions found for {target_date} in Supabase")
    except Exception as e:
        print(f"Error fetching from Supabase: {e}")

if __name__ == "__main__":
    check_3_6()
