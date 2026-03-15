from __future__ import annotations

from repositories.entitlements import EntitlementRepository
from schemas.dashboard import DashboardAccessState


class AccessControlService:
    def __init__(self, repository: EntitlementRepository | None = None) -> None:
        self.repository = repository or EntitlementRepository()

    def get_access_state(self, user_id: str) -> DashboardAccessState:
        entitlement = self.repository.get_current(user_id)
        is_pro = entitlement.get("status") in {"active", "grace"}
        if is_pro:
            return DashboardAccessState(
                access_level="pro",
                preview_mode="full",
                delayed_by_minutes=None,
                visible_sections=["watchlist", "alerts", "news", "disclosures", "portfolio"],
                locked_sections=[],
                upgrade_message=None,
            )
        return DashboardAccessState(
            access_level="non_pro",
            preview_mode="preview",
            delayed_by_minutes=15,
            visible_sections=["watchlistPreview", "delayedPriceSummary"],
            locked_sections=["alerts", "portfolio", "detailedNews", "disclosures", "watchlistManagement"],
            upgrade_message="프로 구독 시 실시간 워치리스트, 알림, 공시, 포트폴리오 기능이 열린다.",
        )
