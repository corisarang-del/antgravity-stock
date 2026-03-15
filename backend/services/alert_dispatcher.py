from __future__ import annotations

from datetime import datetime
import os


class AlertDispatcher:
    def available_channels(self) -> list[str]:
        channels = ["toast"]
        if os.getenv("DASHBOARD_PUSH_ENABLED", "true").lower() == "true":
            channels.append("push")
        if os.getenv("DASHBOARD_EMAIL_ENABLED", "true").lower() == "true":
            channels.append("email")
        return channels

    def validate_channels(self, channels: list[str]) -> list[str]:
        allowed = set(self.available_channels())
        valid = [channel for channel in channels if channel in allowed]
        if not valid:
            raise ValueError("최소 한 개 이상의 사용 가능한 알림 채널이 필요하다.")
        return valid

    def evaluate_alert(self, alert: dict, current_price: float) -> bool:
        condition_type = alert["condition_type"]
        target_price = float(alert["target_price"])
        if condition_type == "above":
            return current_price >= target_price
        if condition_type == "below":
            return current_price <= target_price
        return abs(current_price - target_price) < 0.01

    def record_dispatch(
        self,
        alert: dict,
        delivery_status: str = "queued",
        failure_reason: str | None = None,
    ) -> dict:
        return {
            "alert_id": alert["id"],
            "channel": "toast",
            "delivery_status": delivery_status,
            "attempted_at": datetime.utcnow().isoformat(),
            "completed_at": datetime.utcnow().isoformat() if delivery_status != "queued" else None,
            "failure_reason": failure_reason,
        }
