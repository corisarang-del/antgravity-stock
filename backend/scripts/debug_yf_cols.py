import yfinance as yf
import pandas as pd

symbol = "TSLA"
df = yf.download(symbol, start="2024-01-01", end="2024-01-10", auto_adjust=True)
print("--- Columns ---")
print(df.columns)
print("--- Type ---")
print(type(df.columns))

if isinstance(df.columns, pd.MultiIndex):
    print("Is MultiIndex")
    print([c for c in df.columns])
