from __future__ import annotations

import os
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd
import yfinance as yf

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from data.pipeline import TICKERS, fetch_all
from data.preprocess import build_features


BASE_DIR = Path(__file__).resolve().parents[1]
REPORTS_DIR = BASE_DIR / "reports"
OUTPUT_PATH = REPORTS_DIR / "training_data_daily.csv"


def _normalize_columns(frame: pd.DataFrame) -> pd.DataFrame:
    if isinstance(frame.columns, pd.MultiIndex):
        frame.columns = [column[0].lower() for column in frame.columns]
    else:
        frame.columns = [str(column).lower() for column in frame.columns]
    return frame


def _load_vix_frame(period: str = "1y") -> pd.DataFrame:
    vix_frame = yf.download("^VIX", period=period, auto_adjust=True, progress=False)
    if vix_frame.empty:
        return pd.DataFrame()
    return _normalize_columns(vix_frame)


def build_daily_training_rows(period: str = "1y") -> pd.DataFrame:
    vix_frame = _load_vix_frame(period)
    rows: list[dict] = []

    for symbol, meta in TICKERS.items():
        stock_frame = yf.download(symbol, period=period, auto_adjust=True, progress=False)
        if stock_frame.empty:
            continue

        stock_frame = _normalize_columns(stock_frame)
        features = build_features(stock_frame, vix_df=vix_frame if not vix_frame.empty else None)
        if features.empty:
            continue

        latest_date = features.index[-1]
        latest = features.iloc[-1]
        rows.append(
            {
                "date": latest_date.date().isoformat() if hasattr(latest_date, "date") else str(latest_date),
                "symbol": symbol,
                "name": meta["name"],
                "market": meta["market"],
                "open": float(latest["open"]),
                "high": float(latest["high"]),
                "low": float(latest["low"]),
                "close": float(latest["close"]),
                "volume": int(latest["volume"]),
                "vix": float(latest["vix"]),
                "rsi": float(latest["rsi"]),
                "ma5": float(latest["ma5"]),
                "ma20": float(latest["ma20"]),
                "earnings_dday": float(latest["earnings_dday"]),
                "ingested_at": datetime.now().isoformat(timespec="seconds"),
            }
        )

    return pd.DataFrame(rows)


def persist_daily_training_rows(rows: pd.DataFrame) -> Path | None:
    if rows.empty:
        return None

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    if OUTPUT_PATH.exists():
        existing = pd.read_csv(OUTPUT_PATH)
        combined = pd.concat([existing, rows], ignore_index=True)
        combined = combined.drop_duplicates(subset=["date", "symbol"], keep="last")
    else:
        combined = rows

    combined = combined.sort_values(["date", "symbol"]).reset_index(drop=True)
    combined.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig")
    return OUTPUT_PATH


def run_daily_ingest() -> dict:
    fetch_all()
    rows = build_daily_training_rows()
    saved_path = persist_daily_training_rows(rows)
    return {
        "rows": len(rows),
        "output_path": str(saved_path) if saved_path else None,
    }


if __name__ == "__main__":
    result = run_daily_ingest()
    print(f"daily ingest rows: {result['rows']}")
    if result["output_path"]:
        print(f"saved to: {result['output_path']}")
