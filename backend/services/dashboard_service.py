from __future__ import annotations

from repositories.alerts import AlertsRepository
from repositories.market_feeds import MarketFeedsRepository
from repositories.portfolio import PortfolioRepository
from repositories.watchlist import WatchlistRepository
from services.alert_dispatcher import AlertDispatcher
from services.market_snapshot_service import MarketSnapshotService
from services.portfolio_calculator import PortfolioCalculator


class DashboardService:
    def __init__(self) -> None:
        self.alerts = AlertsRepository()
        self.watchlists = WatchlistRepository()
        self.portfolio = PortfolioRepository()
        self.snapshots = MarketSnapshotService()
        self.feeds = MarketFeedsRepository()
        self.dispatcher = AlertDispatcher()
        self.portfolio_calculator = PortfolioCalculator()

    def get_watchlist_snapshots(self, user_id: str, preview: bool) -> list[dict]:
        if preview:
            return [item.model_dump() for item in self.snapshots.preview_items()]

        items = self.watchlists.list_items(user_id)
        if not items:
            return [item.model_dump() for item in self.snapshots.preview_items()]
        return [
            self.snapshots.get_snapshot(item["symbol"], is_delayed=False).model_dump()
            for item in items
        ]

    def get_news(self, symbol: str) -> dict:
        try:
            result = self.feeds.list_news(symbol)
        except Exception:
            return {"feedStatus": "unavailable", "items": []}
        return {"feedStatus": result["feed_status"], "items": result["items"]}

    def get_disclosures(self, symbol: str) -> dict:
        try:
            result = self.feeds.list_disclosures(symbol)
        except Exception:
            return {"feedStatus": "unavailable", "items": []}
        return {"feedStatus": result["feed_status"], "items": result["items"]}

    def format_triggered_alert_payload(self, alert: dict, current_price: float) -> dict:
        return {
            "title": f"{alert['symbol']} 알림 도달",
            "message": f"{alert['symbol']} 현재가 {current_price:.2f}가 조건을 충족했다.",
            "status": "triggered",
        }

    def evaluate_alerts(self, user_id: str) -> list[dict]:
        payloads: list[dict] = []
        for alert in self.alerts.list_items(user_id):
            snapshot = self.snapshots.get_snapshot(alert["symbol"], is_delayed=False)
            if not self.dispatcher.evaluate_alert(alert, snapshot.price):
                continue
            event = self.dispatcher.record_dispatch(alert, delivery_status="sent")
            self.alerts.save_delivery_event(alert["id"], event)
            payloads.append(self.format_triggered_alert_payload(alert, snapshot.price))
        return payloads

    def get_portfolio_holdings(self, user_id: str) -> list[dict]:
        enriched = []
        for item in self.portfolio.list_items(user_id):
            snapshot = self.snapshots.get_snapshot(item["symbol"], is_delayed=False)
            enriched.append(self.portfolio_calculator.enrich_holding(item, snapshot.price).model_dump())
        return enriched

    def get_portfolio_summary(self, user_id: str) -> dict:
        enriched = []
        for item in self.portfolio.list_items(user_id):
            snapshot = self.snapshots.get_snapshot(item["symbol"], is_delayed=False)
            enriched.append(self.portfolio_calculator.enrich_holding(item, snapshot.price))
        return self.portfolio_calculator.summarize(enriched).model_dump()
