"""GET /api/stocks/dividends/calendar"""
from __future__ import annotations

import asyncio
import logging
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import yfinance as yf
from fastapi import APIRouter, HTTPException, Query

from core.supabase_client import get_supabase
from data.pipeline import TICKERS
from services.runtime_cache import TtlCache

logger = logging.getLogger(__name__)
router = APIRouter()

_DIV_CACHE: TtlCache[dict] = TtlCache(ttl_seconds=86400)


def _load_symbols_meta() -> dict[str, dict]:
    """market_snapshot 최신 종목 + ticker_universe 메타 로드. 실패 시 14개 폴백."""
    try:
        sb = get_supabase()
        snap = (
            sb.table("market_snapshot")
            .select("snapshot_date")
            .order("snapshot_date", desc=True)
            .limit(1)
            .execute()
        )
        if not snap.data:
            raise ValueError("snapshot 없음")

        snap_date = snap.data[0]["snapshot_date"]
        snaps = (
            sb.table("market_snapshot")
            .select("symbol, market")
            .eq("snapshot_date", snap_date)
            .execute()
        )
        symbols = [r["symbol"] for r in (snaps.data or [])]
        if not symbols:
            raise ValueError("snapshot 종목 없음")

        uni = (
            sb.table("ticker_universe")
            .select("symbol, name, market")
            .in_("symbol", symbols)
            .execute()
        )
        uni_map = {r["symbol"]: r for r in (uni.data or [])}

        return {
            s: {
                "name": uni_map.get(s, {}).get("name") or s,
                "market": uni_map.get(s, {}).get("market") or "US",
            }
            for s in symbols
        }
    except Exception:
        logger.warning("Supabase 종목 로드 실패 — TICKERS 14개 폴백")
        return {
            s: {"name": m["name"], "market": m["market"]}
            for s, m in TICKERS.items()
            if m["market"] != "INDEX"
        }


def _fetch_dividend_events(
    symbol: str, meta: dict, year: int, month: int
) -> list[dict[str, Any]]:
    try:
        divs = yf.Ticker(symbol).dividends
        if divs is None or divs.empty:
            return []
        events = []
        for ts, amount in divs.items():
            if hasattr(ts, "year") and ts.year == year and ts.month == month:
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
    symbols_meta = _load_symbols_meta()
    calendar: dict[str, list] = defaultdict(list)

    def _fetch(item: tuple[str, dict]) -> list[dict]:
        return _fetch_dividend_events(item[0], item[1], year, month)

    with ThreadPoolExecutor(max_workers=50) as pool:
        for events in pool.map(_fetch, symbols_meta.items()):
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
