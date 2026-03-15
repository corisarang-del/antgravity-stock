from __future__ import annotations

from datetime import datetime, timedelta

import pandas as pd
import yfinance as yf
from fastapi import HTTPException

from core.config import settings
from core.supabase_client import get_supabase
from data.pipeline import TICKERS
from data.preprocess import LOOKBACK, build_features, make_sequences
from models.lstm_model import AntPredictor
from services.fallback_data_service import FallbackDataService
from services.runtime_cache import TtlCache


_predictors: dict[str, AntPredictor] = {}
_fallbacks = FallbackDataService()
PREDICTION_CACHE = TtlCache[dict](ttl_seconds=300)


def get_optional_supabase():
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return None
    try:
        return get_supabase()
    except Exception:
        return None


def _get_predictor(symbol: str) -> AntPredictor:
    if symbol not in _predictors:
        _predictors[symbol] = AntPredictor(symbol)
    return _predictors[symbol]


def load_history(symbol: str, supabase) -> pd.DataFrame:
    if supabase is not None:
        try:
            rows = (
                supabase.table("stocks")
                .select("date,open,high,low,close,volume")
                .eq("symbol", symbol)
                .order("date", desc=False)
                .limit(LOOKBACK + 90)
                .execute()
            )
            if rows.data:
                frame = pd.DataFrame(rows.data).set_index("date")
                frame.index = pd.to_datetime(frame.index)
                return frame
        except Exception:
            pass

    # yf.Ticker().history()로 thread-safe하게 처리
    try:
        ticker = yf.Ticker(symbol)
        frame = ticker.history(period="1y", auto_adjust=True)
    except Exception:
        frame = pd.DataFrame()

    if frame.empty:
        sample = _fallbacks.load_training_rows(symbol)
        if sample.empty:
            return pd.DataFrame()
        return sample.set_index("date")

    frame = frame.rename(
        columns={
            "Open": "open",
            "High": "high",
            "Low": "low",
            "Close": "close",
            "Volume": "volume",
        }
    )
    return frame[["open", "high", "low", "close", "volume"]]


def build_fallback_payload(symbol: str, today: str) -> dict:
    latest_result = _fallbacks.load_latest_prediction_row(symbol)
    if latest_result is None:
        raise HTTPException(status_code=422, detail="가격 데이터를 불러오지 못했다.")

    last_close = float(latest_result["last_close"])
    predicted_price = float(latest_result["predicted_close"])
    regime_label = "bullish" if predicted_price > last_close else "bearish" if predicted_price < last_close else "sideways"
    delta = abs(predicted_price - last_close)
    volatility = round((delta / last_close * 100) if last_close else 0.0, 2)
    risk_level = "High" if volatility >= 3 else "Medium" if volatility >= 1 else "Low"

    return {
        "symbol": symbol,
        "name": TICKERS[symbol]["name"],
        "market": TICKERS[symbol]["market"],
        "predicted_date": today,
        "prediction_dates": [(datetime.utcnow().date() + timedelta(days=1)).isoformat()],
        "predicted_prices": [round(predicted_price, 2)],
        "volatility": volatility,
        "risk_level": risk_level,
        "last_close": round(last_close, 2),
        "model_name": "AntLSTM v1 report fallback",
        "regime_label": regime_label,
        "prediction_interval_low": round(min(last_close, predicted_price), 2),
        "prediction_interval_high": round(max(last_close, predicted_price), 2),
        "diagnostics_source": "local-runtime",
        "vectrix_poc_score": None,
    }


def get_prediction_payload(
    symbol: str,
    horizon: int = 1,
    *,
    use_runtime_cache: bool = True,
    persist: bool = True,
) -> dict:
    if symbol not in TICKERS:
        raise HTTPException(status_code=404, detail=f"지원하지 않는 종목: {symbol}")

    cache_key = f"{symbol}:{horizon}"
    if use_runtime_cache:
        cached_payload = PREDICTION_CACHE.get(cache_key)
        if cached_payload is not None:
            return cached_payload

    supabase = get_optional_supabase()
    today = datetime.utcnow().date().isoformat()

    if supabase is not None:
        try:
            cached = (
                supabase.table("predictions")
                .select("*")
                .eq("symbol", symbol)
                .eq("predicted_date", today)
                .limit(1)
                .execute()
            )
            if cached.data:
                payload = cached.data[0]
                return PREDICTION_CACHE.set(cache_key, payload) if use_runtime_cache else payload
        except Exception:
            pass

    df = load_history(symbol, supabase)
    if df.empty:
        payload = build_fallback_payload(symbol, today)
        return PREDICTION_CACHE.set(cache_key, payload) if use_runtime_cache else payload

    features_df = build_features(df)
    if len(features_df) < LOOKBACK:
        payload = build_fallback_payload(symbol, today)
        return PREDICTION_CACHE.set(cache_key, payload) if use_runtime_cache else payload

    sequence = features_df.values[-LOOKBACK:]
    _, _, scaler = make_sequences(features_df)
    sequence_scaled = scaler.transform(sequence)

    predictor = _get_predictor(symbol)
    result = predictor.predict(sequence_scaled)

    close_min = scaler.data_min_[0]
    close_max = scaler.data_max_[0]
    predicted_prices = [value * (close_max - close_min) + close_min for value in result["predicted_prices"]]

    last_close = float(df["close"].iloc[-1])
    predicted_price = float(predicted_prices[0]) if predicted_prices else last_close
    interval_width = max(abs(predicted_price - last_close) * 0.5, max(last_close * 0.01, 0.5))
    prediction_interval_low = round(predicted_price - interval_width, 2)
    prediction_interval_high = round(predicted_price + interval_width, 2)
    regime_label = "bullish" if predicted_price > last_close else "bearish" if predicted_price < last_close else "sideways"

    risk_level = result["risk_level"]
    if risk_level == "Mid":
        risk_level = "Medium"

    last_date = features_df.index[-1]
    pred_dates = pd.bdate_range(start=last_date + timedelta(days=1), periods=horizon)

    payload = {
        "symbol": symbol,
        "name": TICKERS[symbol]["name"],
        "market": TICKERS[symbol]["market"],
        "predicted_date": today,
        "prediction_dates": [d.date().isoformat() for d in pred_dates],
        "predicted_prices": [round(price, 2) for price in predicted_prices[:horizon]],
        "volatility": round(float(result["volatility"]) * 100, 2),
        "risk_level": risk_level,
        "last_close": round(last_close, 2),
        "model_name": "AntLSTM v1",
        "regime_label": regime_label,
        "prediction_interval_low": prediction_interval_low,
        "prediction_interval_high": prediction_interval_high,
        "diagnostics_source": "local-runtime" if supabase is None else "supabase-cache",
        "vectrix_poc_score": None,
    }

    if persist and supabase is not None:
        try:
            supabase.table("predictions").upsert(payload, on_conflict="symbol,predicted_date").execute()
        except Exception:
            pass

    return PREDICTION_CACHE.set(cache_key, payload) if use_runtime_cache else payload
