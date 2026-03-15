import os
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta

def backfill():
    daily_csv_dir = "reports/daily_csv"
    history_path = "reports/historical_results.csv"
    
    if not os.path.exists(daily_csv_dir):
        print("Daily CSV directory not found.")
        return

    all_history = []
    
    for filename in os.listdir(daily_csv_dir):
        if filename.startswith("prediction_") and filename.endswith(".csv"):
            date_str = filename.replace("prediction_", "").replace(".csv", "")
            # prediction_2026-02-26.csv contains predictions FOR 2026-02-26
            # We need the actual price on 2026-02-26.
            
            try:
                pred_df = pd.read_csv(os.path.join(daily_csv_dir, filename))
                for _, row in pred_df.iterrows():
                    symbol = row['symbol']
                    last_close = float(row['last_close'])
                    
                    # Convert string predicted_prices to float
                    import ast
                    pred_prices = ast.literal_eval(row['predicted_prices']) if isinstance(row['predicted_prices'], str) else row['predicted_prices']
                    predicted_close = float(pred_prices[0]) if isinstance(pred_prices, list) else float(pred_prices)
                    
                    # Fetch actual price for that date
                    ticker = yf.Ticker(symbol)
                    hist = ticker.history(start=date_str, end=(datetime.strptime(date_str, "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d"))
                    
                    if not hist.empty:
                        actual_close = float(hist['Close'].iloc[0])
                        hit = (actual_close > last_close) == (predicted_close > last_close)
                        
                        all_history.append({
                            "date": date_str,
                            "symbol": symbol,
                            "last_close": last_close,
                            "predicted_close": predicted_close,
                            "actual_close": actual_close,
                            "hit": hit
                        })
                        print(f"Propagated {symbol} for {date_str}")
            except Exception as e:
                print(f"Error processing {filename}: {e}")

    if all_history:
        history_df = pd.DataFrame(all_history)
        history_df.to_csv(history_path, index=False, encoding="utf-8-sig")
        print(f"Saved {len(all_history)} records to {history_path}")

if __name__ == "__main__":
    backfill()
