from __future__ import annotations

import os
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from data.pipeline import TICKERS
from services.prediction_service import get_prediction_payload


BASE_DIR = Path(__file__).resolve().parents[1]
REPORTS_DIR = BASE_DIR / "reports"
OUTPUT_DIR = REPORTS_DIR / "daily_csv"


def run_daily_precompute(horizon: int = 1) -> dict:
    records: list[dict] = []

    for symbol in TICKERS:
        payload = get_prediction_payload(
            symbol,
            horizon=horizon,
            use_runtime_cache=False,
            persist=True,
        )
        records.append(payload)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    run_date = datetime.utcnow().date().isoformat()
    output_path = OUTPUT_DIR / f"precomputed_prediction_{run_date}.csv"
    pd.DataFrame(records).to_csv(output_path, index=False, encoding="utf-8-sig")

    return {
        "count": len(records),
        "output_path": str(output_path),
    }


if __name__ == "__main__":
    result = run_daily_precompute()
    print(f"precomputed predictions: {result['count']}")
    print(f"saved to: {result['output_path']}")
