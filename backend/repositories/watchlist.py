from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from repositories._store import STORE


class WatchlistRepository:
    def list_items(self, user_id: str) -> list[dict]:
        with STORE.synchronized():
            return sorted(STORE.watchlists[user_id], key=lambda item: item["sort_order"])

    def add_item(self, user_id: str, symbol: str, display_name: str, market: str) -> dict:
        with STORE.synchronized():
            if any(item["symbol"] == symbol for item in STORE.watchlists[user_id]):
                raise ValueError("이미 등록된 종목이다.")

            item = {
                "id": str(uuid4()),
                "user_id": user_id,
                "symbol": symbol,
                "display_name": display_name,
                "market": market,
                "sort_order": len(STORE.watchlists[user_id]) + 1,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }
            STORE.watchlists[user_id].append(item)
            return item

    def delete_item(self, user_id: str, item_id: str) -> None:
        with STORE.synchronized():
            STORE.watchlists[user_id] = [
                item for item in STORE.watchlists[user_id] if item["id"] != item_id
            ]
