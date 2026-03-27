from __future__ import annotations

import re

from fastapi import Header, HTTPException
from core.supabase_client import get_supabase

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


def _extract_bearer_token(authorization: str | None) -> str | None:
    if not isinstance(authorization, str) or not authorization.strip():
        return None

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Invalid authorization header"})

    token = authorization.replace("Bearer ", "", 1).strip()
    if not token:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Missing bearer token"})

    return token


def resolve_user_id_from_authorization(authorization: str | None) -> str:
    token = _extract_bearer_token(authorization)
    if token is None:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Login required"})

    try:
        response = get_supabase().auth.get_user(jwt=token)
        user = response.user
    except Exception as exc:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Invalid access token"}) from exc

    user_id = getattr(user, "id", None)
    validated = _validate_user_id(user_id)
    if validated == ANONYMOUS_USER_ID:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Invalid access token"})
    return validated


def get_current_user_id(authorization: str | None = Header(default=None, alias="Authorization")) -> str:
    return resolve_user_id_from_authorization(authorization)


def get_dashboard_access_state(
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> DashboardAccessState:
    service = AccessControlService()
    user_id = resolve_user_id_from_authorization(authorization)
    return service.get_access_state(user_id)


def require_pro_access(authorization: str | None = Header(default=None, alias="Authorization")):
    validated = resolve_user_id_from_authorization(authorization)
    state = AccessControlService().get_access_state(validated)
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
