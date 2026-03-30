from __future__ import annotations

from datetime import datetime, timedelta

import pandas as pd
import yfinance as yf
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from api.dependencies import require_pro_access
from core.config import settings
from core.supabase_client import get_supabase
from data.pipeline import TICKERS
from services.fallback_data_service import FallbackDataService
from services.fundamentals_service import (
    get_cached_fundamentals_bulk,
    get_cached_fundamentals,
)
from services.history_service import get_cached_history
from services.runtime_cache import TtlCache

router = APIRouter()
fallbacks = FallbackDataService()
STOCK_RESPONSE_CACHE = TtlCache[dict](ttl_seconds=300)
STOCK_BUNDLE_CACHE = TtlCache[dict](ttl_seconds=300)


class FundamentalsOverviewRankItem(BaseModel):
    symbol: str
    name: str
    value: float


class FundamentalsOverviewResponse(BaseModel):
    available_count: int
    growth_leaders: list[FundamentalsOverviewRankItem]
    growth_laggards: list[FundamentalsOverviewRankItem]
    top_scores: list[FundamentalsOverviewRankItem]


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


def _ticker_name(symbol: str) -> str:
    return TICKERS.get(symbol, {}).get("name", symbol)


def _build_rank_items(
    cached_map: dict[str, dict | None],
    *,
    metric: str,
    limit: int = 5,
    reverse: bool = True,
) -> list[FundamentalsOverviewRankItem]:
    ranked = [
        FundamentalsOverviewRankItem(
            symbol=symbol,
            name=_ticker_name(symbol),
            value=float(metric_value),
        )
        for symbol, payload in cached_map.items()
        if payload is not None
        for metric_value in [payload.get(metric)]
        if metric_value is not None
    ]
    ranked.sort(key=lambda item: item.value, reverse=reverse)
    return ranked[:limit]


def _build_score_rank_items(
    cached_map: dict[str, dict | None],
    *,
    limit: int = 5,
) -> list[FundamentalsOverviewRankItem]:
    ranked = [
        FundamentalsOverviewRankItem(
            symbol=symbol,
            name=_ticker_name(symbol),
            value=float(payload["score"]["total"]),
        )
        for symbol, payload in cached_map.items()
        if payload is not None and isinstance(payload.get("score"), dict) and payload["score"].get("total") is not None
    ]
    ranked.sort(key=lambda item: item.value, reverse=True)
    return ranked[:limit]


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

    from services.prediction_service import get_prediction_payload

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


@router.get("/fundamentals/batch")
async def get_fundamentals_batch(
    symbols: str = Query(..., description="콤마 구분 심볼 목록 (예: NVDA,005930.KS)"),
    _access=Depends(require_pro_access),
):
    """여러 종목 재무지표를 캐시에서 한 번에 반환."""
    symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
    valid = [s for s in symbol_list if s in TICKERS]
    return get_cached_fundamentals_bulk(valid)


@router.get("/fundamentals/overview", response_model=FundamentalsOverviewResponse)
async def get_fundamentals_overview(_access=Depends(require_pro_access)):
    """개요 탭용 사전 계산 랭킹. 캐시된 재무 데이터만 사용한다."""
    symbols = list(TICKERS.keys())
    cached_map = get_cached_fundamentals_bulk(symbols)
    available_count = sum(1 for payload in cached_map.values() if payload is not None)

    return FundamentalsOverviewResponse(
        available_count=available_count,
        growth_leaders=_build_rank_items(cached_map, metric="earnings_growth", reverse=True),
        growth_laggards=_build_rank_items(cached_map, metric="earnings_growth", reverse=False),
        top_scores=_build_score_rank_items(cached_map),
    )


@router.get("/{symbol}/fundamentals")
async def get_stock_fundamentals(symbol: str, _access=Depends(require_pro_access)):
    """재무지표 + Investment Score (캐시 데이터만 사용)"""
    if symbol not in TICKERS:
        raise HTTPException(status_code=404, detail=f"지원하지 않는 종목: {symbol}")
    cached = get_cached_fundamentals(symbol)
    if cached is not None:
        return cached
    raise HTTPException(status_code=503, detail="캐시된 재무 데이터가 아직 준비되지 않았습니다.")


@router.get("/{symbol}/history")
async def get_stock_history(symbol: str, _access=Depends(require_pro_access)):
    """5개년 재무 히스토리 (캐시 데이터만 사용)"""
    if symbol not in TICKERS:
        raise HTTPException(status_code=404, detail=f"지원하지 않는 종목: {symbol}")
    cached = get_cached_history(symbol)
    if cached is not None:
        return cached
    raise HTTPException(status_code=503, detail="캐시된 재무 히스토리 데이터가 아직 준비되지 않았습니다.")


@router.get("/")
async def list_symbols():
    return [{"symbol": symbol, "name": meta["name"], "market": meta["market"]} for symbol, meta in TICKERS.items()]
