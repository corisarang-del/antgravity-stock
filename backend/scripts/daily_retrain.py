from __future__ import annotations

import os
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from data.pipeline import TICKERS
from models.train import train_many


BASE_DIR = Path(__file__).resolve().parents[1]
REPORTS_DIR = BASE_DIR / "reports"


def _write_compare_report(results: list[dict], run_date: str) -> dict:
    csv_path = REPORTS_DIR / f"daily_retrain_compare_{run_date}.csv"
    md_path = REPORTS_DIR / f"daily_retrain_compare_{run_date}.md"

    frame = pd.DataFrame(results)
    frame.to_csv(csv_path, index=False, encoding="utf-8-sig")

    lines = [
        f"# Daily Retrain Compare Report - {run_date}",
        "",
        "| Symbol | Promoted | MAPE | Prev MAPE | Delta MAPE | DA | Prev DA | Delta DA | RMSE | Reason |",
        "| :--- | :---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :--- |",
    ]
    for row in results:
        lines.append(
            "| {symbol} | {promoted} | {mape:.2f} | {previous_mape} | {delta_mape} | {da:.2f} | {previous_da} | {delta_da} | {rmse:.4f} | {reason} |".format(
                symbol=row["symbol"],
                promoted="Y" if row["promoted"] else "N",
                mape=row["mape"],
                previous_mape="-" if row["previous_mape"] is None else f"{float(row['previous_mape']):.2f}",
                delta_mape="-" if row["delta_mape"] is None else f"{float(row['delta_mape']):+.2f}",
                da=row["da"],
                previous_da="-" if row["previous_da"] is None else f"{float(row['previous_da']):.2f}",
                delta_da="-" if row["delta_da"] is None else f"{float(row['delta_da']):+.2f}",
                rmse=row["rmse"],
                reason=row["promotion_reason"],
            )
        )

    md_path.write_text("\n".join(lines), encoding="utf-8")
    return {"csv_path": str(csv_path), "md_path": str(md_path)}


def run_daily_retrain(epochs: int = 30, batch_size: int = 32, lr: float = 1e-3) -> dict:
    results = train_many(list(TICKERS.keys()), epochs=epochs, batch_size=batch_size, lr=lr)
    REPORTS_DIR.mkdir(exist_ok=True)
    run_date = datetime.now().strftime('%Y-%m-%d')
    output_path = REPORTS_DIR / f"daily_retrain_{run_date}.csv"
    pd.DataFrame(results).to_csv(output_path, index=False, encoding="utf-8-sig")
    compare_report = _write_compare_report(results, run_date)
    return {
        "count": len(results),
        "output_path": str(output_path),
        "compare_csv_path": compare_report["csv_path"],
        "compare_md_path": compare_report["md_path"],
    }


if __name__ == "__main__":
    result = run_daily_retrain()
    print(f"retrained models: {result['count']}")
    print(f"saved to: {result['output_path']}")
    print(f"compare csv: {result['compare_csv_path']}")
    print(f"compare md: {result['compare_md_path']}")
