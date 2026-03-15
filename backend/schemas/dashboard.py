from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class DashboardAccessState(BaseModel):
    access_level: Literal["pro", "non_pro"]
    preview_mode: Literal["full", "preview"]
    delayed_by_minutes: int | None = None
    visible_sections: list[str]
    locked_sections: list[str]
    upgrade_message: str | None = None


class WatchlistItem(BaseModel):
    id: str
    symbol: str
    display_name: str
    market: str
    sort_order: int


class MarketSnapshot(BaseModel):
    symbol: str
    price: float
    previous_close: float
    change_amount: float
    change_rate: float
    volume: int
    market_status: Literal["preopen", "open", "closed", "halted", "delayed"]
    as_of: str
    is_delayed: bool


class PriceAlert(BaseModel):
    id: str
    symbol: str
    condition_type: Literal["at", "above", "below"]
    target_price: float = Field(gt=0)
    delivery_channels: list[str]
    status: Literal["active", "paused", "triggered"]


class PortfolioHolding(BaseModel):
    id: str
    symbol: str
    buy_price: float = Field(gt=0)
    quantity: float = Field(gt=0)
    current_price: float | None = None
    profit_loss: float | None = None
    return_rate: float | None = None


class PortfolioSummary(BaseModel):
    total_cost_basis: float
    total_market_value: float
    total_profit_loss: float
    total_return_rate: float
    calculated_at: str
