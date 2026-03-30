from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from core.supabase_client import get_supabase


def _is_fresh(fetched_at: str, ttl_seconds: int) -> bool:
    parsed = datetime.fromisoformat(fetched_at.replace("Z", "+00:00"))
    return datetime.now(timezone.utc) - parsed < timedelta(seconds=ttl_seconds)


def read_cache_entry(table: str, key_column: str, key: str, ttl_seconds: int) -> dict[str, Any] | None:
    try:
        res = (
            get_supabase()
            .table(table)
            .select(f"{key_column}, data, fetched_at")
            .eq(key_column, key)
            .single()
            .execute()
        )
        row = res.data
        if not row:
            return None
        return {
            "key": row[key_column],
            "data": row["data"],
            "fetched_at": row["fetched_at"],
            "is_fresh": _is_fresh(row["fetched_at"], ttl_seconds),
        }
    except Exception:
        return None


def write_cache_entry(table: str, key_column: str, key: str, data: Any) -> None:
    try:
        (
            get_supabase()
            .table(table)
            .upsert(
                {
                    key_column: key,
                    "data": data,
                    "fetched_at": datetime.now(timezone.utc).isoformat(),
                },
                on_conflict=key_column,
            )
            .execute()
        )
    except Exception:
        pass
