from __future__ import annotations

from core.config import settings
from core.supabase_client import get_supabase
from data.pipeline import TICKERS


class DashboardSupabaseRepository:
    def is_enabled(self) -> bool:
        return bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY)

    def resolve_ticker_name(self, symbol: str) -> str:
        if symbol in TICKERS:
            return TICKERS[symbol]["name"]

        normalized_symbol = f"{symbol}.KS" if symbol.isdigit() and len(symbol) == 6 else symbol
        if normalized_symbol in TICKERS:
            return TICKERS[normalized_symbol]["name"]

        return symbol

    def list_watchlist(self, user_id: str) -> list[dict] | None:
        if not self.is_enabled():
            return None

        try:
            supabase = get_supabase()
            response = (
                supabase.table("watchlist")
                .select("id,symbol,name,sector,added_at")
                .eq("user_id", user_id)
                .order("added_at", desc=True)
                .execute()
            )
        except Exception:
            return None

        return [
            {
                "id": item["id"],
                "symbol": item["symbol"],
                "name": item["name"],
                "sector": item.get("sector", ""),
                "addedAt": item["added_at"],
            }
            for item in (response.data or [])
        ]

    def create_watchlist(self, user_id: str, symbol: str, name: str | None, sector: str | None) -> dict | None:
        if not self.is_enabled():
            return None

        supabase = get_supabase()
        response = (
            supabase.table("watchlist")
            .insert(
                {
                    "user_id": user_id,
                    "symbol": symbol,
                    "name": name or self.resolve_ticker_name(symbol),
                    "sector": sector or "",
                }
            )
            .select("id,symbol,name,sector,added_at")
            .single()
            .execute()
        )
        item = response.data
        return {
            "id": item["id"],
            "symbol": item["symbol"],
            "name": item["name"],
            "sector": item.get("sector", ""),
            "addedAt": item["added_at"],
        }

    def delete_watchlist(self, user_id: str, item_id: str) -> bool:
        if not self.is_enabled():
            return False

        supabase = get_supabase()
        supabase.table("watchlist").delete().eq("id", item_id).eq("user_id", user_id).execute()
        return True

    def list_alerts(self, user_id: str) -> list[dict] | None:
        if not self.is_enabled():
            return None

        try:
            supabase = get_supabase()
            response = (
                supabase.table("price_alerts")
                .select("id,symbol,name,alert_type,target_price,is_active,created_at")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )
        except Exception:
            return None

        return [
            {
                "id": item["id"],
                "symbol": item["symbol"],
                "name": item["name"],
                "alertType": item["alert_type"],
                "targetPrice": item["target_price"],
                "isActive": item["is_active"],
                "createdAt": item["created_at"],
            }
            for item in (response.data or [])
        ]

    def create_alert(self, user_id: str, symbol: str, name: str | None, condition_type: str, target_price: float) -> dict | None:
        if not self.is_enabled():
            return None

        supabase = get_supabase()
        response = (
            supabase.table("price_alerts")
            .insert(
                {
                    "user_id": user_id,
                    "symbol": symbol,
                    "name": name or self.resolve_ticker_name(symbol),
                    "alert_type": condition_type,
                    "target_price": target_price,
                    "is_active": True,
                }
            )
            .select("id,symbol,name,alert_type,target_price,is_active,created_at")
            .single()
            .execute()
        )
        item = response.data
        return {
            "id": item["id"],
            "symbol": item["symbol"],
            "name": item["name"],
            "alertType": item["alert_type"],
            "targetPrice": item["target_price"],
            "isActive": item["is_active"],
            "createdAt": item["created_at"],
        }

    def update_alert(
        self,
        user_id: str,
        alert_id: str,
        *,
        is_active: bool | None = None,
        target_price: float | None = None,
    ) -> dict | None:
        if not self.is_enabled():
            return None

        updates: dict[str, object] = {}
        if is_active is not None:
            updates["is_active"] = is_active
        if target_price is not None:
            updates["target_price"] = target_price

        supabase = get_supabase()
        response = (
            supabase.table("price_alerts")
            .update(updates)
            .eq("id", alert_id)
            .eq("user_id", user_id)
            .select("id,symbol,name,alert_type,target_price,is_active,created_at")
            .single()
            .execute()
        )
        item = response.data
        return {
            "id": item["id"],
            "symbol": item["symbol"],
            "name": item["name"],
            "alertType": item["alert_type"],
            "targetPrice": item["target_price"],
            "isActive": item["is_active"],
            "createdAt": item["created_at"],
        }

    def delete_alert(self, user_id: str, alert_id: str) -> bool:
        if not self.is_enabled():
            return False

        supabase = get_supabase()
        supabase.table("price_alerts").delete().eq("id", alert_id).eq("user_id", user_id).execute()
        return True

    def list_holdings(self, user_id: str) -> list[dict] | None:
        if not self.is_enabled():
            return None

        try:
            supabase = get_supabase()
            response = (
                supabase.table("portfolio_holdings")
                .select("id,symbol,name,quantity,avg_price,current_price,sector,created_at")
                .eq("user_id", user_id)
                .order("created_at", desc=False)
                .execute()
            )
        except Exception:
            return None

        return [
            {
                "id": item["id"],
                "symbol": item["symbol"],
                "name": item["name"],
                "quantity": item["quantity"],
                "avgPrice": item["avg_price"],
                "currentPrice": item["current_price"],
                "sector": item.get("sector", ""),
            }
            for item in (response.data or [])
        ]

    def create_holding(
        self,
        user_id: str,
        *,
        symbol: str,
        name: str | None,
        sector: str | None,
        quantity: float,
        buy_price: float,
        current_price: float | None,
    ) -> dict | None:
        if not self.is_enabled():
            return None

        supabase = get_supabase()
        response = (
            supabase.table("portfolio_holdings")
            .insert(
                {
                    "user_id": user_id,
                    "symbol": symbol,
                    "name": name or self.resolve_ticker_name(symbol),
                    "sector": sector or "",
                    "quantity": quantity,
                    "avg_price": buy_price,
                    "current_price": current_price or buy_price,
                }
            )
            .select("id,symbol,name,quantity,avg_price,current_price,sector")
            .single()
            .execute()
        )
        item = response.data
        return {
            "id": item["id"],
            "symbol": item["symbol"],
            "name": item["name"],
            "quantity": item["quantity"],
            "avgPrice": item["avg_price"],
            "currentPrice": item["current_price"],
            "sector": item.get("sector", ""),
        }

    def delete_holding(self, user_id: str, holding_id: str) -> bool:
        if not self.is_enabled():
            return False

        supabase = get_supabase()
        supabase.table("portfolio_holdings").delete().eq("id", holding_id).eq("user_id", user_id).execute()
        return True
