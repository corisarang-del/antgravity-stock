"""Supabase 재무 캐시 서비스

financials_cache / history_cache 테이블에 JSONB 형태로 저장.
service_role 키로만 접근 (RLS로 프론트 차단).

Read 조건: fetched_at이 25시간 이내 (GH Actions cron 지연 ±30분 허용)
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any

from supabase import create_client, Client

from core.config import settings

# 25시간 = 24h(TTL) + 1h(GH Actions 지연 버퍼)
_CACHE_VALID_HOURS = 25


def _client() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def _is_fresh(fetched_at_str: str) -> bool:
    fetched_at = datetime.fromisoformat(fetched_at_str.replace("Z", "+00:00"))
    age = datetime.now(timezone.utc) - fetched_at
    return age < timedelta(hours=_CACHE_VALID_HOURS)


# ──────────────────────────────────────────────────────────
# fundamentals_cache
# ──────────────────────────────────────────────────────────

def read_fundamentals(symbol: str) -> dict[str, Any] | None:
    """Supabase에서 재무지표 조회. 25h 이내 데이터만 반환."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return None
    try:
        res = (
            _client()
            .table("financials_cache")
            .select("data, fetched_at")
            .eq("symbol", symbol)
            .single()
            .execute()
        )
        row = res.data
        if row and _is_fresh(row["fetched_at"]):
            return row["data"]
    except Exception:
        pass
    return None


def write_fundamentals(symbol: str, data: dict[str, Any]) -> None:
    """Supabase에 재무지표 upsert."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return
    try:
        _client().table("financials_cache").upsert(
            {
                "symbol": symbol,
                "data": data,
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            },
            on_conflict="symbol",
        ).execute()
    except Exception:
        pass


# ──────────────────────────────────────────────────────────
# history_cache
# ──────────────────────────────────────────────────────────

def read_history(symbol: str) -> dict[str, Any] | None:
    """Supabase에서 5개년 히스토리 조회. 25h 이내 데이터만 반환."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return None
    try:
        res = (
            _client()
            .table("history_cache")
            .select("data, fetched_at")
            .eq("symbol", symbol)
            .single()
            .execute()
        )
        row = res.data
        if row and _is_fresh(row["fetched_at"]):
            return row["data"]
    except Exception:
        pass
    return None


def write_history(symbol: str, data: dict[str, Any]) -> None:
    """Supabase에 5개년 히스토리 upsert."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return
    try:
        _client().table("history_cache").upsert(
            {
                "symbol": symbol,
                "data": data,
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            },
            on_conflict="symbol",
        ).execute()
    except Exception:
        pass
