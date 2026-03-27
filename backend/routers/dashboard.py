from __future__ import annotations

import time
from collections import defaultdict

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from api.dependencies import resolve_user_id_from_authorization
from data.pipeline import TICKERS
from repositories.alerts import AlertsRepository
from repositories.dashboard_supabase import DashboardSupabaseRepository
from repositories.portfolio import PortfolioRepository
from repositories.stock_search import StockSearchRepository
from repositories.watchlist import WatchlistRepository
from services.access_control import AccessControlService
from services.alert_dispatcher import AlertDispatcher
from services.dashboard_service import DashboardService
from services.market_snapshot_service import MarketSnapshotService
from services.portfolio_calculator import PortfolioCalculator
from services.dashboard_supabase_service import DashboardSupabaseService

router = APIRouter()

access_service = AccessControlService()
dashboard_service = DashboardService()
watchlist_repository = WatchlistRepository()
search_repository = StockSearchRepository()
alerts_repository = AlertsRepository()
portfolio_repository = PortfolioRepository()
snapshot_service = MarketSnapshotService()
portfolio_calculator = PortfolioCalculator()
alert_dispatcher = AlertDispatcher()
dashboard_supabase_repository = DashboardSupabaseRepository()
dashboard_supabase_service = DashboardSupabaseService(
    repository=dashboard_supabase_repository,
    snapshot_service=snapshot_service,
    alert_dispatcher=alert_dispatcher,
)

_WRITE_RATE_STORE: dict[str, list[float]] = defaultdict(list)
_WRITE_RATE_WINDOW_SECONDS = 60
_WRITE_RATE_LIMIT = 30


class WatchlistCreateRequest(BaseModel):
    symbol: str
    name: str | None = None
    sector: str | None = None


class AlertCreateRequest(BaseModel):
    symbol: str
    name: str | None = None
    condition_type: str
    target_price: float = Field(gt=0)
    delivery_channels: list[str]


class AlertUpdateRequest(BaseModel):
    status: str | None = None
    target_price: float | None = Field(default=None, gt=0)
    delivery_channels: list[str] | None = None


class HoldingCreateRequest(BaseModel):
    symbol: str
    name: str | None = None
    sector: str | None = None
    current_price: float | None = Field(default=None, gt=0)
    buy_price: float = Field(gt=0)
    quantity: float = Field(gt=0)


class HoldingUpdateRequest(BaseModel):
    buy_price: float | None = Field(default=None, gt=0)
    quantity: float | None = Field(default=None, gt=0)


def _user_id() -> str:
    raise RuntimeError("request header 기반 helper로 교체 필요")


def _user_id_from_request(request: Request) -> str:
    return resolve_user_id_from_authorization(request.headers.get("Authorization"))


def _require_pro(request: Request) -> str:
    user_id = _user_id_from_request(request)
    access = access_service.get_access_state(user_id)
    if access.access_level != "pro":
        raise HTTPException(
            status_code=403,
            detail={
                "code": "PRO_REQUIRED",
                "message": "프로 구독이 필요한 기능이다.",
                "upgradeRequired": True,
            },
        )
    return user_id


def _enforce_write_rate_limit(actor_key: str, action: str) -> None:
    now = time.time()
    window_start = now - _WRITE_RATE_WINDOW_SECONDS
    key = f"{actor_key}:{action}"
    hits = _WRITE_RATE_STORE[key] = [timestamp for timestamp in _WRITE_RATE_STORE[key] if timestamp > window_start]
    if len(hits) >= _WRITE_RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "RATE_LIMITED",
                "message": "요청이 너무 많다. 잠시 후 다시 시도해라.",
            },
        )
    hits.append(now)


@router.get("/access")
async def get_dashboard_access(request: Request):
    user_id = _user_id_from_request(request)
    return access_service.get_access_state(user_id).model_dump()


@router.get("/search")
async def search_stocks(q: str):
    return {"items": search_repository.search(q)}


@router.get("/watchlist-snapshot")
async def get_watchlist_snapshot(request: Request):
    user_id = _user_id_from_request(request)
    access = access_service.get_access_state(user_id)
    items = dashboard_service.get_watchlist_snapshots(user_id, preview=access.access_level != "pro")
    return {"mode": "full" if access.access_level == "pro" else "preview", "items": items}


@router.get("/watchlist")
async def list_watchlist(request: Request):
    user_id = _user_id_from_request(request)

    supabase_items = dashboard_supabase_service.list_watchlist(user_id)
    if supabase_items is not None:
        return {"items": supabase_items}

    # Supabase를 사용할 수 없을 때만 기존 인메모리 store 폴백
    items = watchlist_repository.list_items(user_id)
    return {
        "items": [
            {
                "id": item["id"],
                "symbol": item["symbol"],
                "name": item["display_name"],
                "sector": item.get("market", ""),
                "addedAt": item["created_at"],
                "displayName": item["display_name"],
                "market": item["market"],
                "sortOrder": item["sort_order"],
            }
            for item in items
        ]
    }


@router.post("/watchlist", status_code=201)
async def create_watchlist_item(payload: WatchlistCreateRequest, request: Request):
    user_id = _user_id_from_request(request)
    _enforce_write_rate_limit(user_id, "watchlist:create")

    try:
        item = dashboard_supabase_service.create_watchlist(
            user_id,
            payload.symbol,
            payload.name,
            payload.sector,
        )
        if item is not None:
            return item
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"관심종목 추가 실패: {exc}") from exc

    item = watchlist_repository.add_item(
        user_id=user_id,
        symbol=payload.symbol,
        display_name=payload.name or dashboard_supabase_repository.resolve_ticker_name(payload.symbol),
        market=payload.sector or "",
    )
    return {
        "id": item["id"],
        "symbol": item["symbol"],
        "name": item["display_name"],
        "sector": item.get("market", ""),
        "addedAt": item["created_at"],
    }


@router.delete("/watchlist/{item_id}", status_code=204)
async def delete_watchlist_item(item_id: str, request: Request):
    user_id = _user_id_from_request(request)
    _enforce_write_rate_limit(user_id, "watchlist:delete")

    if dashboard_supabase_service.delete_watchlist(user_id, item_id):
        return

    watchlist_repository.delete_item(user_id, item_id)


@router.get("/alerts")
async def list_alerts(request: Request):
    user_id = _user_id_from_request(request)

    supabase_payload = dashboard_supabase_service.list_alerts(user_id)
    if supabase_payload is not None:
        return supabase_payload

    return {
        "items": alerts_repository.list_items(user_id),
        "triggered": dashboard_service.evaluate_alerts(user_id),
    }


@router.post("/alerts", status_code=201)
async def create_alert(payload: AlertCreateRequest, request: Request):
    user_id = _user_id_from_request(request)
    _enforce_write_rate_limit(user_id, "alerts:create")
    channels = alert_dispatcher.validate_channels(payload.delivery_channels)

    try:
        item = dashboard_supabase_service.create_alert(
            user_id,
            payload.symbol,
            payload.name,
            payload.condition_type,
            payload.target_price,
        )
        if item is not None:
            return {**item, "deliveryChannels": channels}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"알림 추가 실패: {exc}") from exc

    alert = alerts_repository.create_item(
        user_id,
        {
            "symbol": request.symbol,
            "condition_type": payload.condition_type,
            "target_price": payload.target_price,
            "delivery_channels": channels,
        },
    )
    return alert


@router.patch("/alerts/{alert_id}")
async def update_alert(alert_id: str, request_body: AlertUpdateRequest, request: Request):
    user_id = _user_id_from_request(request)
    _enforce_write_rate_limit(user_id, "alerts:update")
    payload = request_body.model_dump(exclude_none=True)
    if "delivery_channels" in payload:
        payload["delivery_channels"] = alert_dispatcher.validate_channels(payload["delivery_channels"])

    try:
        item = dashboard_supabase_service.update_alert(
            user_id,
            alert_id,
            is_active=(payload["status"] == "active") if "status" in payload else None,
            target_price=payload.get("target_price"),
        )
        if item is not None:
            return item
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"알림 수정 실패: {exc}") from exc

    return alerts_repository.update_item(user_id, alert_id, payload)


@router.delete("/alerts/{alert_id}", status_code=204)
async def delete_alert(alert_id: str, request: Request):
    user_id = _user_id_from_request(request)
    _enforce_write_rate_limit(user_id, "alerts:delete")

    if dashboard_supabase_service.delete_alert(user_id, alert_id):
        return

    alerts_repository.delete_item(user_id, alert_id)


@router.get("/news/{symbol}")
async def get_news(symbol: str, request: Request):
    _require_pro(request)
    return dashboard_service.get_news(symbol)


@router.get("/disclosures/{symbol}")
async def get_disclosures(symbol: str, request: Request):
    _require_pro(request)
    return dashboard_service.get_disclosures(symbol)


@router.get("/portfolio/holdings")
async def list_holdings(request: Request):
    user_id = _user_id_from_request(request)

    supabase_items = dashboard_supabase_service.list_holdings(user_id)
    if supabase_items is not None:
        return {"items": supabase_items}

    return {
        "items": [
            {
                "id": item.id,
                "symbol": item.symbol,
                "name": TICKERS.get(item.symbol, {}).get("name", item.symbol),
                "quantity": item.quantity,
                "avgPrice": item.buy_price,
                "currentPrice": item.current_price,
                "sector": "",
            }
            for item in dashboard_service.get_portfolio_holdings(user_id)
        ]
    }


@router.post("/portfolio/holdings", status_code=201)
async def create_holding(payload: HoldingCreateRequest, request: Request):
    user_id = _require_pro(request)
    _enforce_write_rate_limit(user_id, "portfolio:create")

    try:
        item = dashboard_supabase_service.create_holding(
            user_id,
            symbol=payload.symbol,
            name=payload.name,
            sector=payload.sector,
            quantity=payload.quantity,
            buy_price=payload.buy_price,
            current_price=payload.current_price,
        )
        if item is not None:
            return item
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"포트폴리오 추가 실패: {exc}") from exc

    holding = portfolio_repository.create_item(
        user_id,
        {
            "symbol": request.symbol,
            "buy_price": payload.buy_price,
            "quantity": payload.quantity,
        },
    )
    return holding


@router.patch("/portfolio/holdings/{holding_id}")
async def update_holding(holding_id: str, request_body: HoldingUpdateRequest, request: Request):
    user_id = _require_pro(request)
    _enforce_write_rate_limit(user_id, "portfolio:update")
    updated = portfolio_repository.update_item(user_id, holding_id, request_body.model_dump(exclude_none=True))
    snapshot = snapshot_service.get_snapshot(updated["symbol"], is_delayed=False)
    return portfolio_calculator.enrich_holding(updated, snapshot.price).model_dump()


@router.delete("/portfolio/holdings/{holding_id}", status_code=204)
async def delete_holding(holding_id: str, request: Request):
    user_id = _require_pro(request)
    _enforce_write_rate_limit(user_id, "portfolio:delete")

    if dashboard_supabase_service.delete_holding(user_id, holding_id):
        return

    portfolio_repository.delete_item(user_id, holding_id)


@router.get("/portfolio/summary")
async def get_portfolio_summary(request: Request):
    user_id = _user_id_from_request(request)

    summary = dashboard_supabase_service.summarize_holdings(user_id)
    if summary is not None:
        return summary

    return dashboard_service.get_portfolio_summary(user_id)
