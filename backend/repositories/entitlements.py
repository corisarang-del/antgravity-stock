from __future__ import annotations

from datetime import datetime, timezone

from core.config import settings
from core.supabase_client import get_supabase
from repositories._store import STORE


class EntitlementRepository:
    @staticmethod
    def _is_future(value: str | None) -> bool:
        if not value:
            return False
        try:
            normalized = value.replace("Z", "+00:00")
            return datetime.fromisoformat(normalized) > datetime.now(timezone.utc)
        except Exception:
            return False

    def get_current(self, user_id: str) -> dict:
        try:
            if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
                supabase = get_supabase()
                response = (
                    supabase.table("subscriptions")
                    .select("*")
                    .eq("user_id", user_id)
                    .limit(1)
                    .execute()
                )
                if response.data:
                    row = response.data[0]
                    status = row.get("status", "free")
                    plan = row.get("plan", "free")
                    current_period_end = row.get("current_period_end")

                    is_active = plan == "pro" and (
                        status == "active" or
                        (status == "cancelled" and self._is_future(current_period_end))
                    )

                    return {
                        "user_id": user_id,
                        "status": "active" if is_active else "expired",
                        "plan_code": "pro-monthly" if plan == "pro" else "free",
                        "started_at": row.get("current_period_start") or row.get("created_at"),
                        "expires_at": current_period_end,
                        "last_verified_at": row.get("updated_at") or row.get("created_at"),
                    }
        except Exception:
            pass

        with STORE.synchronized():
            if user_id not in STORE.entitlements:
                STORE.entitlements[user_id] = {
                    "user_id": user_id,
                    "status": "expired",
                    "plan_code": "free",
                    "started_at": datetime.now(timezone.utc).isoformat(),
                    "expires_at": None,
                    "last_verified_at": datetime.now(timezone.utc).isoformat(),
                }
            return STORE.entitlements[user_id]
