"""GET /api/market/full and /api/market/full/search endpoints"""
from __future__ import annotations

import logging
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from api.dependencies import require_pro_access
from core.supabase_client import get_supabase
from data.pipeline import TICKERS as _PIPELINE_TICKERS
from services.runtime_cache import TtlCache

# symbol → 한글명 fallback (ticker_universe 미적재 시 사용)
_TICKERS_NAME_MAP: dict[str, str] = {
    sym: meta["name"] for sym, meta in _PIPELINE_TICKERS.items()
}

logger = logging.getLogger(__name__)

router = APIRouter()

_FULL_CACHE: TtlCache[dict] = TtlCache(ttl_seconds=300)

# sort 방향: 숫자 컬럼은 DESC, name은 ASC
_SORT_DESC_FIELDS = {"market_cap", "change_pct", "per"}


class MarketStock(BaseModel):
    symbol: str
    market: str
    name: str | None = None
    sector: str | None = None
    close: float | None = None
    change_pct: float | None = None
    market_cap: float | None = None
    per: float | None = None
    pbr: float | None = None
    snapshot_date: str | None = None


class MarketFullResponse(BaseModel):
    items: list[MarketStock]
    total: int
    page: int
    limit: int


class SearchResponse(BaseModel):
    items: list[MarketStock]
    total: int


def _get_latest_snapshot_date() -> str | None:
    """market_snapshot 테이블에서 최신 snapshot_date 조회."""
    sb = get_supabase()
    resp = (
        sb.table("market_snapshot")
        .select("snapshot_date")
        .order("snapshot_date", desc=True)
        .limit(1)
        .execute()
    )
    if resp.data:
        return resp.data[0]["snapshot_date"]
    return None


def _fetch_snapshots(snapshot_date: str) -> list[dict[str, Any]]:
    """특정 날짜의 모든 market_snapshot 행 조회."""
    sb = get_supabase()
    resp = (
        sb.table("market_snapshot")
        .select("symbol, market, close, change_pct, market_cap, per, pbr, snapshot_date")
        .eq("snapshot_date", snapshot_date)
        .execute()
    )
    return resp.data or []


def _fetch_universe() -> list[dict[str, Any]]:
    """ticker_universe 전체 조회 (Supabase 기본 limit 1000 우회 — 페이지네이션)."""
    sb = get_supabase()
    all_rows: list[dict[str, Any]] = []
    page_size = 1000
    offset = 0
    while True:
        resp = (
            sb.table("ticker_universe")
            .select("symbol, market, name, sector, industry")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = resp.data or []
        all_rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return all_rows


def _merge(snapshots: list[dict], universe: list[dict]) -> list[dict]:
    """snapshot + universe를 symbol 기준으로 병합."""
    uni_map = {row["symbol"]: row for row in universe}
    merged: list[dict] = []
    seen: set[str] = set()

    for snap in snapshots:
        sym = snap["symbol"]
        seen.add(sym)
        uni = uni_map.get(sym, {})
        merged.append({
            "symbol": sym,
            "market": snap.get("market") or uni.get("market", ""),
            "name": uni.get("name") or _TICKERS_NAME_MAP.get(sym),
            "sector": uni.get("sector"),
            "close": snap.get("close"),
            "change_pct": snap.get("change_pct"),
            "market_cap": snap.get("market_cap"),
            "per": snap.get("per"),
            "pbr": snap.get("pbr"),
            "snapshot_date": snap.get("snapshot_date"),
        })

    # universe에만 있고 snapshot에 없는 종목도 포함
    for uni in universe:
        if uni["symbol"] not in seen:
            sym = uni["symbol"]
            merged.append({
                "symbol": sym,
                "market": uni.get("market", ""),
                "name": uni.get("name") or _TICKERS_NAME_MAP.get(sym),
                "sector": uni.get("sector"),
                "close": None,
                "change_pct": None,
                "market_cap": None,
                "per": None,
                "pbr": None,
                "snapshot_date": None,
            })

    return merged


def _load_all() -> list[dict]:
    """캐시된 전체 데이터 로드."""
    cached = _FULL_CACHE.get("__all__")
    if cached is not None:
        return cached

    snapshot_date = _get_latest_snapshot_date()
    if snapshot_date is None:
        # snapshot 없으면 universe만
        universe = _fetch_universe()
        items = _merge([], universe)
    else:
        snapshots = _fetch_snapshots(snapshot_date)
        universe = _fetch_universe()
        items = _merge(snapshots, universe)

    return _FULL_CACHE.set("__all__", items)


def _sort_key(item: dict, sort_field: str):
    """정렬 키 생성. None은 맨 뒤로 보낸다."""
    val = item.get(sort_field)
    if sort_field == "name":
        return (0, val or "") if val is not None else (1, "")
    # 숫자 필드: None이면 가장 작은 값 취급 (DESC에서 맨 뒤)
    return (0, val) if val is not None else (1, 0)


@router.get("/full", response_model=MarketFullResponse)
async def market_full(
    market: Literal["KR", "US", "all"] = "all",
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=100, ge=1, le=200),
    sort: Literal["market_cap", "change_pct", "per", "name"] = "market_cap",
    sector: str | None = None,
    _access=Depends(require_pro_access),
):
    """전체 종목 시장 데이터 (페이지네이션)"""
    try:
        all_items = _load_all()
    except Exception as exc:
        logger.exception("market_full 조회 실패")
        raise HTTPException(status_code=503, detail="시장 데이터를 일시적으로 조회할 수 없습니다.") from exc

    # 필터
    filtered = all_items
    if market != "all":
        filtered = [i for i in filtered if i.get("market") == market]
    if sector:
        filtered = [i for i in filtered if i.get("sector") == sector]

    # 정렬
    desc = sort in _SORT_DESC_FIELDS
    filtered.sort(key=lambda x: _sort_key(x, sort), reverse=desc)

    total = len(filtered)
    offset = (page - 1) * limit
    page_items = filtered[offset:offset + limit]

    return MarketFullResponse(
        items=[MarketStock(**i) for i in page_items],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/full/search", response_model=SearchResponse)
async def market_full_search(
    q: str = Query(..., min_length=1),
    _access=Depends(require_pro_access),
):
    """종목 검색 (이름/심볼 ILIKE)"""
    try:
        all_items = _load_all()
    except Exception as exc:
        logger.exception("market_full_search 조회 실패")
        raise HTTPException(status_code=503, detail="검색을 일시적으로 수행할 수 없습니다.") from exc

    query_lower = q.lower()
    matched = [
        i for i in all_items
        if query_lower in (i.get("name") or "").lower()
        or query_lower in (i.get("symbol") or "").lower()
    ]

    results = matched[:50]
    return SearchResponse(
        items=[MarketStock(**i) for i in results],
        total=len(matched),
    )
