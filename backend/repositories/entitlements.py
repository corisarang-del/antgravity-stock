from __future__ import annotations

from datetime import datetime, timedelta

from core.config import settings
from core.supabase_client import get_supabase
from repositories._store import STORE


class EntitlementRepository:
    def get_current(self, user_id: str) -> dict:
        try:
            if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
                supabase = get_supabase()
                response = (
                    supabase.table("subscription_entitlements")
                    .select("*")
                    .eq("user_id", user_id)
                    .order("expires_at", desc=True)
                    .limit(1)
                    .execute()
                )
                if response.data:
                    return response.data[0]
        except Exception:
            pass

        with STORE.synchronized():
            if user_id not in STORE.entitlements:
                STORE.entitlements[user_id] = {
                    "user_id": user_id,
                    "status": "active" if user_id.startswith("pro_") else "expired",
                    "plan_code": "pro-monthly" if user_id.startswith("pro_") else "free",
                    "started_at": datetime.utcnow().isoformat(),
                    "expires_at": (datetime.utcnow() + timedelta(days=30)).isoformat(),
                    "last_verified_at": datetime.utcnow().isoformat(),
                }
            return STORE.entitlements[user_id]
