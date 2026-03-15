"""GET /api/stocks/dividends/calendar"""
from __future__ import annotations

import asyncio
import logging
from collections import defaultdict
from typing import Any

import yfinance as yf
from fastapi import APIRouter, HTTPException, Query

from data.pipeline import TICKERS
from services.runtime_cache import TtlCache

logger = logging.getLogger(__name__)
router = APIRouter()

_DIV_CACHE: TtlCache[dict] = TtlCache(ttl_seconds=86400)


def _fetch_dividend_events(symbol: str, year: int, month: int) -> list[dict[str, Any]]:
    try:
        ticker = yf.Ticker(symbol)
        divs = ticker.dividends

        if divs is None or divs.empty:
            return []

        meta = TICKERS.get(symbol, {})
        events = []
        for ts, amount in divs.items():
            if hasattr(ts, "year"):
                if ts.year == year and ts.month == month:
                    events.append({
                        "symbol": symbol,
                        "name": meta.get("name", symbol),
                        "market": meta.get("market", "US"),
                        "ex_date": ts.date().isoformat(),
                        "pay_date": None,
                        "amount": round(float(amount), 4),
                        "yield": None,
                    })
        return events
    except Exception:
        return []


def _compute_dividend_calendar(year: int, month: int) -> dict[str, Any]:
    """배당 캘린더 계산 (blocking I/O - executor에서 실행)"""
    calendar: dict[str, list] = defaultdict(list)

    for symbol in TICKERS:
        if TICKERS[symbol]["market"] == "INDEX":
            continue
        events = _fetch_dividend_events(symbol, year, month)
        for ev in events:
            calendar[ev["ex_date"]].append(ev)

    summary = [
        {
            "date": date,
            "count": len(items),
            "total_amount": round(sum(ev["amount"] for ev in items), 4),
        }
        for date, items in sorted(calendar.items())
    ]

    return {"calendar": dict(calendar), "summary": summary}


@router.get("/dividends/calendar")
async def dividend_calendar(
    year: int = Query(default=2026),
    month: int = Query(default=3, ge=1, le=12),
):
    """월별 배당 캘린더 (24시간 TTL 캐시)"""
    cache_key = f"{year}-{month:02d}"
    cached = _DIV_CACHE.get(cache_key)
    if cached is not None:
        return cached

    try:
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(None, _compute_dividend_calendar, year, month)
        return _DIV_CACHE.set(cache_key, result)
    except Exception as exc:
        logger.exception("배당 캘린더 조회 실패")
        raise HTTPException(status_code=503, detail="배당 캘린더를 일시적으로 조회할 수 없습니다.") from exc
