from __future__ import annotations

from datetime import datetime, timedelta

import pandas as pd
import yfinance as yf
from fastapi import APIRouter, HTTPException, Query

from core.config import settings
from core.supabase_client import get_supabase
from data.pipeline import TICKERS
from services.fallback_data_service import FallbackDataService
from services.fundamentals_service import get_fundamentals
from services.history_service import get_financial_history
from services.prediction_service import get_prediction_payload
from services.runtime_cache import TtlCache

router = APIRouter()
fallbacks = FallbackDataService()
STOCK_RESPONSE_CACHE = TtlCache[dict](ttl_seconds=300)
STOCK_BUNDLE_CACHE = TtlCache[dict](ttl_seconds=300)


def _optional_supabase():
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return None
    try:
        return get_supabase()
    except Exception:
        return None


def _rows_from_yfinance(symbol: str, period: str) -> list[dict]:
    # yf.Ticker().history()로 thread-safe하게 처리
    try:
        ticker = yf.Ticker(symbol)
        frame = ticker.history(period=period, auto_adjust=True)
    except Exception:
        return []

    if frame.empty:
        return []

    return [
        {
            "date": index.date().isoformat(),
            "open": float(row["Open"]),
            "high": float(row["High"]),
            "low": float(row["Low"]),
            "close": float(row["Close"]),
            "volume": int(row["Volume"]),
        }
        for index, row in frame.iterrows()
    ]


def _rows_from_training_sample(symbol: str) -> list[dict]:
    frame = fallbacks.load_training_rows(symbol)
    if frame.empty:
        return []

    return [
        {
            "date": row["date"].date().isoformat() if isinstance(row["date"], pd.Timestamp) else str(row["date"]),
            "open": float(row["open"]),
            "high": float(row["high"]),
            "low": float(row["low"]),
            "close": float(row["close"]),
            "volume": int(row["volume"]),
        }
        for _, row in frame.iterrows()
    ]


def _load_stock_payload(symbol: str, period: str) -> dict:
    cache_key = f"{symbol}:{period}"
    cached_payload = STOCK_RESPONSE_CACHE.get(cache_key)
    if cached_payload is not None:
        return cached_payload

    supabase = _optional_supabase()
    data: list[dict] = []

    if supabase is not None:
        try:
            period_days = {"1mo": 30, "3mo": 90, "6mo": 180, "1y": 365}
            since = (datetime.utcnow() - timedelta(days=period_days[period])).date().isoformat()
            rows = (
                supabase.table("stocks")
                .select("date,open,high,low,close,volume")
                .eq("symbol", symbol)
                .gte("date", since)
                .order("date")
                .execute()
            )
            data = rows.data or []
        except Exception:
            data = []

    if not data:
        data = _rows_from_yfinance(symbol, period)

    if not data:
        data = _rows_from_training_sample(symbol)

    payload = {
        "symbol": symbol,
        "name": TICKERS[symbol]["name"],
        "market": TICKERS[symbol]["market"],
        "data": data,
    }
    return STOCK_RESPONSE_CACHE.set(cache_key, payload)


@router.get("/{symbol}/bundle")
async def get_stock_bundle(
    symbol: str,
    period: str = Query(default="3mo", enum=["1mo", "3mo", "6mo", "1y"]),
):
    if symbol not in TICKERS:
        raise HTTPException(status_code=404, detail=f"지원하지 않는 종목: {symbol}")

    cache_key = f"{symbol}:{period}"
    cached_bundle = STOCK_BUNDLE_CACHE.get(cache_key)
    if cached_bundle is not None:
        return cached_bundle

    detail = _load_stock_payload(symbol, period)
    prediction = get_prediction_payload(symbol, horizon=1)
    bundle = {"detail": detail, "prediction": prediction}
    return STOCK_BUNDLE_CACHE.set(cache_key, bundle)


@router.get("/{symbol}")
async def get_stock(
    symbol: str,
    period: str = Query(default="3mo", enum=["1mo", "3mo", "6mo", "1y"]),
):
    if symbol not in TICKERS:
        raise HTTPException(status_code=404, detail=f"지원하지 않는 종목: {symbol}")
    return _load_stock_payload(symbol, period)


@router.get("/{symbol}/fundamentals")
async def get_stock_fundamentals(symbol: str):
    """재무지표 + Investment Score (30분 TTL 캐시)"""
    if symbol not in TICKERS:
        raise HTTPException(status_code=404, detail=f"지원하지 않는 종목: {symbol}")
    try:
        return get_fundamentals(symbol)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"재무 데이터 조회 실패: {exc}") from exc


@router.get("/{symbol}/history")
async def get_stock_history(symbol: str):
    """5개년 재무 히스토리 (24시간 TTL 캐시)"""
    if symbol not in TICKERS:
        raise HTTPException(status_code=404, detail=f"지원하지 않는 종목: {symbol}")
    try:
        return get_financial_history(symbol)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"재무 히스토리 조회 실패: {exc}") from exc


@router.get("/")
async def list_symbols():
    return [{"symbol": symbol, "name": meta["name"], "market": meta["market"]} for symbol, meta in TICKERS.items()]
