from __future__ import annotations

from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[1]
REPORTS_DIR = BASE_DIR / "reports"


class FallbackDataService:
    def load_training_rows(self, symbol: str) -> pd.DataFrame:
        sample_path = REPORTS_DIR / "training_data_sample.csv"
        if not sample_path.exists():
            return pd.DataFrame()

        frame = pd.read_csv(sample_path)
        filtered = frame.loc[frame["symbol"] == symbol].copy()
        if filtered.empty:
            return pd.DataFrame()

        filtered["Date"] = pd.to_datetime(filtered["Date"])
        filtered = filtered.rename(columns={"Date": "date"})
        return filtered[["date", "open", "high", "low", "close", "volume"]]

    def load_latest_prediction_row(self, symbol: str) -> dict | None:
        results_path = REPORTS_DIR / "historical_results.csv"
        if not results_path.exists():
            return None

        frame = pd.read_csv(results_path)
        filtered = frame.loc[frame["symbol"] == symbol].copy()
        if filtered.empty:
            return None

        filtered["date"] = pd.to_datetime(filtered["date"])
        latest = filtered.sort_values("date").iloc[-1]
        return latest.to_dict()

    def load_last_close_from_reports(self, symbol: str) -> tuple[float, float] | None:
        latest = self.load_latest_prediction_row(symbol)
        if latest is None:
            return None

        return float(latest["last_close"]), float(latest["predicted_close"])
