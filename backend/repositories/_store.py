from __future__ import annotations

from collections import defaultdict
from threading import Lock


class InMemoryDashboardStore:
    def __init__(self) -> None:
        self._lock = Lock()
        self.entitlements: dict[str, dict] = {}
        self.watchlists: dict[str, list[dict]] = defaultdict(list)
        self.alerts: dict[str, list[dict]] = defaultdict(list)
        self.alert_delivery_events: dict[str, list[dict]] = defaultdict(list)
        self.holdings: dict[str, list[dict]] = defaultdict(list)
        self.news: dict[str, list[dict]] = defaultdict(list)
        self.disclosures: dict[str, list[dict]] = defaultdict(list)

    def synchronized(self):
        return self._lock


STORE = InMemoryDashboardStore()
