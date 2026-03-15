from __future__ import annotations

import re

from fastapi import Header, HTTPException

from schemas.dashboard import DashboardAccessState
from services.access_control import AccessControlService

ANONYMOUS_USER_ID = "anonymous_free_user"
# Supabase UUID 형식만 허용 (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
_UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE)


def _validate_user_id(raw: str | None) -> str:
    if not isinstance(raw, str) or not raw.strip():
        return ANONYMOUS_USER_ID
    stripped = raw.strip()
    if not _UUID_RE.match(stripped):
        return ANONYMOUS_USER_ID
    return stripped


def get_current_user_id(x_user_id: str | None = Header(default=None)) -> str:
    return _validate_user_id(x_user_id)


def get_dashboard_access_state(
    x_user_id: str | None = Header(default=None, alias="x-user-id"),
) -> DashboardAccessState:
    service = AccessControlService()
    user_id = _validate_user_id(x_user_id)
    return service.get_access_state(user_id)


def require_pro_access(x_user_id: str | None = Header(default=None, alias="x-user-id")):
    validated = _validate_user_id(x_user_id)
    if validated == ANONYMOUS_USER_ID:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Login required"})

    state = AccessControlService().get_access_state(x_user_id)
    if state.access_level != "pro":
        raise HTTPException(
            status_code=403,
            detail={
                "code": "PRO_REQUIRED",
                "message": "PRO subscription required",
                "upgradeRequired": True,
            },
        )
    return state
