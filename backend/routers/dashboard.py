from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from api.dependencies import get_current_user_id
from data.pipeline import TICKERS
from repositories.alerts import AlertsRepository
from repositories.portfolio import PortfolioRepository
from repositories.stock_search import StockSearchRepository
from repositories.watchlist import WatchlistRepository
from services.access_control import AccessControlService
from services.alert_dispatcher import AlertDispatcher
from services.dashboard_service import DashboardService
from services.market_snapshot_service import MarketSnapshotService
from services.portfolio_calculator import PortfolioCalculator

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


class WatchlistCreateRequest(BaseModel):
    symbol: str


class AlertCreateRequest(BaseModel):
    symbol: str
    condition_type: str
    target_price: float = Field(gt=0)
    delivery_channels: list[str]


class AlertUpdateRequest(BaseModel):
    status: str | None = None
    target_price: float | None = Field(default=None, gt=0)
    delivery_channels: list[str] | None = None


class HoldingCreateRequest(BaseModel):
    symbol: str
    buy_price: float = Field(gt=0)
    quantity: float = Field(gt=0)


class HoldingUpdateRequest(BaseModel):
    buy_price: float | None = Field(default=None, gt=0)
    quantity: float | None = Field(default=None, gt=0)


def _user_id() -> str:
    return get_current_user_id()


def _require_pro() -> str:
    user_id = _user_id()
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


@router.get("/access")
async def get_dashboard_access():
    user_id = _user_id()
    return access_service.get_access_state(user_id).model_dump()


@router.get("/search")
async def search_stocks(q: str):
    return {"items": search_repository.search(q)}


@router.get("/watchlist-snapshot")
async def get_watchlist_snapshot():
    user_id = _user_id()
    access = access_service.get_access_state(user_id)
    items = dashboard_service.get_watchlist_snapshots(user_id, preview=access.access_level != "pro")
    return {"mode": "full" if access.access_level == "pro" else "preview", "items": items}


@router.get("/watchlist")
async def list_watchlist():
    user_id = _require_pro()
    items = watchlist_repository.list_items(user_id)
    return {
        "items": [
            {
                "id": item["id"],
                "symbol": item["symbol"],
                "displayName": item["display_name"],
                "market": item["market"],
                "sortOrder": item["sort_order"],
            }
            for item in items
        ]
    }


@router.post("/watchlist", status_code=201)
async def create_watchlist_item(request: WatchlistCreateRequest):
    user_id = _require_pro()
    if request.symbol not in TICKERS:
        raise HTTPException(status_code=404, detail="지원하지 않는 종목이다.")
    item = watchlist_repository.add_item(
        user_id=user_id,
        symbol=request.symbol,
        display_name=TICKERS[request.symbol]["name"],
        market=TICKERS[request.symbol]["market"],
    )
    return {
        "id": item["id"],
        "symbol": item["symbol"],
        "displayName": item["display_name"],
        "market": item["market"],
        "sortOrder": item["sort_order"],
    }


@router.delete("/watchlist/{item_id}", status_code=204)
async def delete_watchlist_item(item_id: str):
    user_id = _require_pro()
    watchlist_repository.delete_item(user_id, item_id)


@router.get("/alerts")
async def list_alerts():
    user_id = _require_pro()
    return {
        "items": alerts_repository.list_items(user_id),
        "triggered": dashboard_service.evaluate_alerts(user_id),
    }


@router.post("/alerts", status_code=201)
async def create_alert(request: AlertCreateRequest):
    user_id = _require_pro()
    channels = alert_dispatcher.validate_channels(request.delivery_channels)
    alert = alerts_repository.create_item(
        user_id,
        {
            "symbol": request.symbol,
            "condition_type": request.condition_type,
            "target_price": request.target_price,
            "delivery_channels": channels,
        },
    )
    return alert


@router.patch("/alerts/{alert_id}")
async def update_alert(alert_id: str, request: AlertUpdateRequest):
    user_id = _require_pro()
    payload = request.model_dump(exclude_none=True)
    if "delivery_channels" in payload:
        payload["delivery_channels"] = alert_dispatcher.validate_channels(payload["delivery_channels"])
    return alerts_repository.update_item(user_id, alert_id, payload)


@router.delete("/alerts/{alert_id}", status_code=204)
async def delete_alert(alert_id: str):
    user_id = _require_pro()
    alerts_repository.delete_item(user_id, alert_id)


@router.get("/news/{symbol}")
async def get_news(symbol: str):
    _require_pro()
    return dashboard_service.get_news(symbol)


@router.get("/disclosures/{symbol}")
async def get_disclosures(symbol: str):
    _require_pro()
    return dashboard_service.get_disclosures(symbol)


@router.get("/portfolio/holdings")
async def list_holdings():
    user_id = _require_pro()
    return {"items": dashboard_service.get_portfolio_holdings(user_id)}


@router.post("/portfolio/holdings", status_code=201)
async def create_holding(request: HoldingCreateRequest):
    user_id = _require_pro()
    holding = portfolio_repository.create_item(
        user_id,
        {
            "symbol": request.symbol,
            "buy_price": request.buy_price,
            "quantity": request.quantity,
        },
    )
    return holding


@router.patch("/portfolio/holdings/{holding_id}")
async def update_holding(holding_id: str, request: HoldingUpdateRequest):
    user_id = _require_pro()
    updated = portfolio_repository.update_item(user_id, holding_id, request.model_dump(exclude_none=True))
    snapshot = snapshot_service.get_snapshot(updated["symbol"], is_delayed=False)
    return portfolio_calculator.enrich_holding(updated, snapshot.price).model_dump()


@router.delete("/portfolio/holdings/{holding_id}", status_code=204)
async def delete_holding(holding_id: str):
    user_id = _require_pro()
    portfolio_repository.delete_item(user_id, holding_id)


@router.get("/portfolio/summary")
async def get_portfolio_summary():
    user_id = _require_pro()
    return dashboard_service.get_portfolio_summary(user_id)
