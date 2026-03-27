from __future__ import annotations

from datetime import datetime

from repositories.dashboard_supabase import DashboardSupabaseRepository
from services.alert_dispatcher import AlertDispatcher
from services.market_snapshot_service import MarketSnapshotService


class DashboardSupabaseService:
    def __init__(
        self,
        repository: DashboardSupabaseRepository | None = None,
        snapshot_service: MarketSnapshotService | None = None,
        alert_dispatcher: AlertDispatcher | None = None,
    ) -> None:
        self.repository = repository or DashboardSupabaseRepository()
        self.snapshots = snapshot_service or MarketSnapshotService()
        self.dispatcher = alert_dispatcher or AlertDispatcher()

    def list_watchlist(self, user_id: str) -> list[dict] | None:
        return self.repository.list_watchlist(user_id)

    def create_watchlist(self, user_id: str, symbol: str, name: str | None, sector: str | None) -> dict | None:
        return self.repository.create_watchlist(user_id, symbol, name, sector)

    def delete_watchlist(self, user_id: str, item_id: str) -> bool:
        return self.repository.delete_watchlist(user_id, item_id)

    def list_alerts(self, user_id: str) -> dict | None:
        items = self.repository.list_alerts(user_id)
        if items is None:
            return None
        return {
            "items": items,
            "triggered": self.evaluate_triggered_alerts(items),
        }

    def create_alert(self, user_id: str, symbol: str, name: str | None, condition_type: str, target_price: float) -> dict | None:
        return self.repository.create_alert(user_id, symbol, name, condition_type, target_price)

    def update_alert(
        self,
        user_id: str,
        alert_id: str,
        *,
        is_active: bool | None = None,
        target_price: float | None = None,
    ) -> dict | None:
        return self.repository.update_alert(
            user_id,
            alert_id,
            is_active=is_active,
            target_price=target_price,
        )

    def delete_alert(self, user_id: str, alert_id: str) -> bool:
        return self.repository.delete_alert(user_id, alert_id)

    def list_holdings(self, user_id: str) -> list[dict] | None:
        return self.repository.list_holdings(user_id)

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
        return self.repository.create_holding(
            user_id,
            symbol=symbol,
            name=name,
            sector=sector,
            quantity=quantity,
            buy_price=buy_price,
            current_price=current_price,
        )

    def delete_holding(self, user_id: str, holding_id: str) -> bool:
        return self.repository.delete_holding(user_id, holding_id)

    def summarize_holdings(self, user_id: str) -> dict | None:
        items = self.repository.list_holdings(user_id)
        if items is None:
            return None

        total_cost_basis = 0.0
        total_market_value = 0.0

        for item in items:
            avg_price = float(item["avgPrice"])
            quantity = float(item["quantity"])
            current_price = float(item["currentPrice"])
            total_cost_basis += avg_price * quantity
            total_market_value += current_price * quantity

        total_profit_loss = total_market_value - total_cost_basis
        total_return_rate = (total_profit_loss / total_cost_basis * 100) if total_cost_basis else 0.0

        return {
            "total_cost_basis": round(total_cost_basis, 2),
            "total_market_value": round(total_market_value, 2),
            "total_profit_loss": round(total_profit_loss, 2),
            "total_return_rate": round(total_return_rate, 2),
            "calculated_at": datetime.utcnow().isoformat(),
        }

    def evaluate_triggered_alerts(self, items: list[dict]) -> list[dict]:
        payloads: list[dict] = []
        for item in items:
            if not item.get("isActive", False):
                continue

            snapshot = self.snapshots.get_snapshot(item["symbol"], is_delayed=False)
            alert_like = {
                "id": item["id"],
                "symbol": item["symbol"],
                "condition_type": item["alertType"],
                "target_price": item["targetPrice"],
            }
            if not self.dispatcher.evaluate_alert(alert_like, snapshot.price):
                continue

            payloads.append(
                {
                    "title": f"{item['symbol']} 알림 도달",
                    "message": f"{item['symbol']} 현재가 {snapshot.price:.2f}가 조건을 충족했다.",
                    "status": "triggered",
                }
            )

        return payloads
