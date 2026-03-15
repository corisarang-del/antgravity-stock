"""GET /api/stocks/dividends/calendar"""
from __future__ import annotations

from collections import defaultdict
from typing import Any

import yfinance as yf
from fastapi import APIRouter, HTTPException, Query

from data.pipeline import TICKERS
from services.runtime_cache import TtlCache

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
                        "pay_date": None,  # yfinance는 pay_date 제공 안 함
                        "amount": round(float(amount), 4),
                        "yield": None,
                    })
        return events
    except Exception:
        return []


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

    result = {"calendar": dict(calendar), "summary": summary}
    try:
        return _DIV_CACHE.set(cache_key, result)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
