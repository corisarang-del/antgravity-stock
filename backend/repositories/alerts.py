from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from repositories._store import STORE


class AlertsRepository:
    VALID_CONDITION_TYPES = {"at", "above", "below"}
    VALID_STATUSES = {"active", "paused", "triggered"}
    MAX_ALERTS_PER_USER = 100

    def list_items(self, user_id: str) -> list[dict]:
        with STORE.synchronized():
            return list(STORE.alerts[user_id])

    def create_item(self, user_id: str, payload: dict) -> dict:
        self._validate_payload(payload)
        with STORE.synchronized():
            if len(STORE.alerts[user_id]) >= self.MAX_ALERTS_PER_USER:
                raise ValueError("알림은 최대 100개까지 등록할 수 있다.")
            item = {
                "id": str(uuid4()),
                "user_id": user_id,
                "status": "active",
                "last_evaluated_at": None,
                "last_triggered_at": None,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                **payload,
            }
            STORE.alerts[user_id].append(item)
            return item

    def update_item(self, user_id: str, alert_id: str, payload: dict) -> dict:
        self._validate_payload(payload, partial=True)
        with STORE.synchronized():
            for index, item in enumerate(STORE.alerts[user_id]):
                if item["id"] == alert_id:
                    next_status = payload.get("status", item["status"])
                    self._validate_transition(item["status"], next_status)
                    updated = {
                        **item,
                        **payload,
                        "updated_at": datetime.utcnow().isoformat(),
                    }
                    STORE.alerts[user_id][index] = updated
                    return updated
        raise ValueError("알림을 찾을 수 없다.")

    def delete_item(self, user_id: str, alert_id: str) -> None:
        with STORE.synchronized():
            STORE.alerts[user_id] = [
                item for item in STORE.alerts[user_id] if item["id"] != alert_id
            ]

    def save_delivery_event(self, alert_id: str, event: dict) -> dict:
        with STORE.synchronized():
            STORE.alert_delivery_events[alert_id].append(event)
            return event

    def _validate_payload(self, payload: dict, partial: bool = False) -> None:
        if not partial or "condition_type" in payload:
            condition_type = payload.get("condition_type")
            if condition_type not in self.VALID_CONDITION_TYPES:
                raise ValueError("지원하지 않는 알림 조건이다.")

        if "status" in payload and payload["status"] not in self.VALID_STATUSES:
            raise ValueError("지원하지 않는 알림 상태다.")

        if not partial or "target_price" in payload:
            target_price = payload.get("target_price")
            if target_price is None or float(target_price) <= 0:
                raise ValueError("목표 가격은 0보다 커야 한다.")

        if not partial or "delivery_channels" in payload:
            channels = payload.get("delivery_channels") or []
            if not channels:
                raise ValueError("최소 한 개 이상의 알림 채널이 필요하다.")

    def _validate_transition(self, current_status: str, next_status: str) -> None:
        allowed = {
            "active": {"active", "paused", "triggered"},
            "paused": {"paused", "active"},
            "triggered": {"triggered", "active"},
        }
        if next_status not in allowed.get(current_status, set()):
            raise ValueError("허용되지 않는 알림 상태 전환이다.")
