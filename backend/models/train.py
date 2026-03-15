from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.preprocessing import MinMaxScaler
from torch.utils.data import DataLoader, TensorDataset

from core.config import settings
from core.supabase_client import get_supabase
from data.pipeline import TICKERS
from data.preprocess import FEATURES, HORIZON, LOOKBACK, build_features
from models.lstm_model import AntLSTM, AntPredictor, CHECKPOINT_DIR, MODEL_VERSION


DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
BASE_DIR = Path(__file__).resolve().parents[1]
REPORTS_DIR = BASE_DIR / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

MIN_DA = 53.0
MAX_MAPE = 80.0
MAX_RMSE = 1.0


def _optional_supabase():
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return None
    try:
        return get_supabase()
    except Exception:
        return None


def _load_stock_frame(symbol: str) -> pd.DataFrame:
    supabase = _optional_supabase()
    if supabase is not None:
        try:
            rows = (
                supabase.table("stocks")
                .select("date,open,high,low,close,volume")
                .eq("symbol", symbol)
                .order("date", desc=False)
                .execute()
            )
            if rows.data:
                frame = pd.DataFrame(rows.data)
                frame["date"] = pd.to_datetime(frame["date"])
                return frame.set_index("date")
        except Exception:
            pass

    for filename in ["training_data_daily.csv", "training_data_sample.csv"]:
        path = REPORTS_DIR / filename
        if not path.exists():
            continue
        frame = pd.read_csv(path)
        frame = frame.loc[frame["symbol"] == symbol].copy()
        if frame.empty:
            continue
        date_column = "Date" if "Date" in frame.columns else "date"
        frame[date_column] = pd.to_datetime(frame[date_column])
        frame = frame.rename(columns={date_column: "date"})
        return frame.set_index("date")[["open", "high", "low", "close", "volume"]]

    raise ValueError(f"failed to load training data: {symbol}")


def _load_vix_frame(index: pd.Index) -> pd.DataFrame | None:
    supabase = _optional_supabase()
    if supabase is not None:
        try:
            since = pd.to_datetime(index.min()).date().isoformat()
            rows = (
                supabase.table("stocks")
                .select("date,close")
                .eq("symbol", "^VIX")
                .gte("date", since)
                .order("date", desc=False)
                .execute()
            )
            if rows.data:
                frame = pd.DataFrame(rows.data)
                frame["date"] = pd.to_datetime(frame["date"])
                return frame.rename(columns={"close": "close"}).set_index("date")
        except Exception:
            pass
    return None


def load_data(symbol: str) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    stock_frame = _load_stock_frame(symbol)
    if len(stock_frame) < LOOKBACK + HORIZON + 30:
        raise ValueError(f"insufficient training rows: {symbol}")

    vix_frame = _load_vix_frame(stock_frame.index)
    features_df = build_features(stock_frame, vix_df=vix_frame)
    if len(features_df) < LOOKBACK + HORIZON + 30:
        raise ValueError(f"insufficient feature rows: {symbol}")

    scaler = MinMaxScaler()
    scaled = scaler.fit_transform(features_df.values)

    X, y = [], []
    close_index = FEATURES.index("close")
    for i in range(LOOKBACK, len(scaled) - HORIZON + 1):
        X.append(scaled[i - LOOKBACK:i])
        y.append(scaled[i:i + HORIZON, close_index])

    X_all = np.array(X, dtype=np.float32)
    y_all = np.array(y, dtype=np.float32)
    split = max(1, int(len(X_all) * 0.8))
    return X_all[:split], y_all[:split], X_all[split:], y_all[split:]


def mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.mean(np.abs((y_true - y_pred) / (y_true + 1e-8))) * 100)


def rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.sqrt(np.mean((y_true - y_pred) ** 2)))


def directional_accuracy(y_true: np.ndarray, y_pred: np.ndarray, x_last_close: np.ndarray) -> float:
    true_dir = y_true[:, 0] > x_last_close
    pred_dir = y_pred[:, 0] > x_last_close
    return float(np.mean(true_dir == pred_dir) * 100)


def _load_previous_report(symbol: str) -> dict | None:
    path = REPORTS_DIR / f"model_report_{MODEL_VERSION}_{symbol.replace('.', '_')}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def _should_promote(symbol: str, metrics: dict[str, float]) -> tuple[bool, str, dict | None]:
    if metrics["da"] < MIN_DA:
        return False, f"directional accuracy below threshold: {metrics['da']:.2f} < {MIN_DA:.2f}", _load_previous_report(symbol)
    if metrics["mape"] > MAX_MAPE:
        return False, f"mape above threshold: {metrics['mape']:.2f} > {MAX_MAPE:.2f}", _load_previous_report(symbol)
    if metrics["rmse"] > MAX_RMSE:
        return False, f"rmse above threshold: {metrics['rmse']:.4f} > {MAX_RMSE:.4f}", _load_previous_report(symbol)

    previous = _load_previous_report(symbol)
    if previous is None:
        return True, "no previous report", None

    previous_metrics = previous.get("metrics", {})
    previous_da = float(previous_metrics.get("da", 0.0))
    previous_mape = float(previous_metrics.get("mape", 9999.0))

    if metrics["da"] + 0.5 < previous_da:
        return False, f"directional accuracy regressed: {metrics['da']:.2f} < {previous_da:.2f}", previous
    if metrics["mape"] > previous_mape + 5.0:
        return False, f"mape regressed: {metrics['mape']:.2f} > {previous_mape:.2f}", previous

    return True, "passed thresholds", previous


def _save_report(symbol: str, metrics: dict[str, float], history: list[dict], promoted: bool, reason: str) -> None:
    report = {
        "version": MODEL_VERSION,
        "symbol": symbol,
        "name": TICKERS.get(symbol, {}).get("name", symbol),
        "evaluated_at": datetime.now(UTC).isoformat(),
        "metrics": {
            "mape": round(metrics["mape"], 4),
            "da": round(metrics["da"], 4),
            "rmse": round(metrics["rmse"], 6),
        },
        "promoted": promoted,
        "promotion_reason": reason,
        "history": history,
    }
    path = REPORTS_DIR / f"model_report_{MODEL_VERSION}_{symbol.replace('.', '_')}.json"
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")


def train(symbol: str, epochs: int = 30, batch_size: int = 32, lr: float = 1e-3) -> dict:
    X_train, y_train, X_val, y_val = load_data(symbol)
    if len(X_train) == 0 or len(X_val) == 0:
        raise ValueError(f"empty train/validation split: {symbol}")

    close_index = FEATURES.index("close")
    x_val_last_close = X_val[:, -1, close_index]
    train_loader = DataLoader(
        TensorDataset(torch.from_numpy(X_train), torch.from_numpy(y_train)),
        batch_size=batch_size,
        shuffle=True,
    )

    model = AntLSTM().to(DEVICE)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    criterion = nn.MSELoss()

    best_state: dict | None = None
    best_val_loss = float("inf")
    history: list[dict] = []

    for epoch in range(1, epochs + 1):
        model.train()
        train_loss = 0.0

        for xb, yb in train_loader:
            xb, yb = xb.to(DEVICE), yb.to(DEVICE)
            optimizer.zero_grad()
            pred = model(xb)
            loss = criterion(pred, yb)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            train_loss += loss.item()

        train_loss /= max(len(train_loader), 1)

        model.eval()
        with torch.no_grad():
            val_pred = model(torch.from_numpy(X_val).to(DEVICE)).cpu().numpy()

        val_loss = float(np.mean((val_pred - y_val) ** 2))
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_state = {key: value.detach().cpu().clone() for key, value in model.state_dict().items()}

        if epoch == 1 or epoch % 5 == 0 or epoch == epochs:
            history.append(
                {
                    "epoch": epoch,
                    "train_loss": round(train_loss, 6),
                    "val_loss": round(val_loss, 6),
                    "mape": round(mape(y_val.flatten(), val_pred.flatten()), 4),
                    "da": round(directional_accuracy(y_val, val_pred, x_val_last_close), 4),
                    "rmse": round(rmse(y_val.flatten(), val_pred.flatten()), 6),
                }
            )

    if best_state is None:
        raise ValueError(f"missing best state: {symbol}")

    best_model = AntLSTM()
    best_model.load_state_dict(best_state)
    best_model.eval()

    with torch.no_grad():
        final_pred = best_model(torch.from_numpy(X_val)).numpy()

    metrics = {
        "mape": mape(y_val.flatten(), final_pred.flatten()),
        "da": directional_accuracy(y_val, final_pred, x_val_last_close),
        "rmse": rmse(y_val.flatten(), final_pred.flatten()),
    }
    promoted, reason, previous_report = _should_promote(symbol, metrics)

    checkpoint_path = CHECKPOINT_DIR / f"{symbol.replace('.', '_')}_{MODEL_VERSION}.pt"
    if promoted:
        AntPredictor.save(best_model, symbol)

    _save_report(symbol, metrics, history, promoted, reason)

    return {
        "symbol": symbol,
        "mape": metrics["mape"],
        "da": metrics["da"],
        "rmse": metrics["rmse"],
        "checkpoint": str(checkpoint_path),
        "promoted": promoted,
        "promotion_reason": reason,
        "previous_mape": None if previous_report is None else previous_report.get("metrics", {}).get("mape"),
        "previous_da": None if previous_report is None else previous_report.get("metrics", {}).get("da"),
        "previous_rmse": None if previous_report is None else previous_report.get("metrics", {}).get("rmse"),
        "delta_mape": None if previous_report is None else metrics["mape"] - float(previous_report.get("metrics", {}).get("mape", 0.0)),
        "delta_da": None if previous_report is None else metrics["da"] - float(previous_report.get("metrics", {}).get("da", 0.0)),
        "delta_rmse": None if previous_report is None else metrics["rmse"] - float(previous_report.get("metrics", {}).get("rmse", 0.0)),
    }


def train_many(symbols: list[str], epochs: int = 30, batch_size: int = 32, lr: float = 1e-3) -> list[dict]:
    results = []
    for symbol in symbols:
        results.append(train(symbol, epochs=epochs, batch_size=batch_size, lr=lr))
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AntLSTM v1 retraining")
    parser.add_argument("--symbol", type=str)
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-3)
    args = parser.parse_args()

    targets = list(TICKERS.keys()) if args.all else [args.symbol]
    if not targets or targets == [None]:
        raise SystemExit("--symbol or --all is required")

    results = train_many(targets, epochs=args.epochs, batch_size=args.batch, lr=args.lr)
    print(json.dumps(results, ensure_ascii=False, indent=2))
