from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from data.pipeline import TICKERS
from repositories._store import STORE


class PortfolioRepository:
    MAX_HOLDINGS_PER_USER = 200

    def list_items(self, user_id: str) -> list[dict]:
        with STORE.synchronized():
            return list(STORE.holdings[user_id])

    def create_item(self, user_id: str, payload: dict) -> dict:
        self._validate_payload(payload)
        with STORE.synchronized():
            if len(STORE.holdings[user_id]) >= self.MAX_HOLDINGS_PER_USER:
                raise ValueError("보유 항목은 최대 200개 lot까지 등록할 수 있다.")
            item = {
                "id": str(uuid4()),
                "user_id": user_id,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                **payload,
            }
            STORE.holdings[user_id].append(item)
            return item

    def update_item(self, user_id: str, holding_id: str, payload: dict) -> dict:
        self._validate_payload(payload, partial=True)
        with STORE.synchronized():
            for index, item in enumerate(STORE.holdings[user_id]):
                if item["id"] == holding_id:
                    updated = {
                        **item,
                        **payload,
                        "updated_at": datetime.utcnow().isoformat(),
                    }
                    STORE.holdings[user_id][index] = updated
                    return updated
        raise ValueError("보유 항목을 찾을 수 없다.")

    def delete_item(self, user_id: str, holding_id: str) -> None:
        with STORE.synchronized():
            STORE.holdings[user_id] = [
                item for item in STORE.holdings[user_id] if item["id"] != holding_id
            ]

    def _validate_payload(self, payload: dict, partial: bool = False) -> None:
        if not partial or "symbol" in payload:
            symbol = payload.get("symbol")
            if symbol not in TICKERS:
                raise ValueError("지원하지 않는 종목이다.")
        if not partial or "buy_price" in payload:
            buy_price = payload.get("buy_price")
            if buy_price is None or float(buy_price) <= 0:
                raise ValueError("매수 단가는 0보다 커야 한다.")
        if not partial or "quantity" in payload:
            quantity = payload.get("quantity")
            if quantity is None or float(quantity) <= 0:
                raise ValueError("수량은 0보다 커야 한다.")
