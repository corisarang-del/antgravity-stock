"""POST /api/stocks/screener"""
from __future__ import annotations

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.screener_service import _STRATEGY_MAP, run_screener

router = APIRouter()


class ScreenerRequest(BaseModel):
    strategies: list[str] = Field(default=["high_score"])
    combination: Literal["AND", "OR"] = "AND"
    market: Literal["all", "KR", "US"] = "all"
    per_max: float | None = Field(default=None, ge=0, le=1000)
    pbr_max: float | None = Field(default=None, ge=0, le=100)
    market_cap_min: float | None = Field(default=None, ge=0)
    change_pct_min: float | None = Field(default=None, ge=-100, le=100)


@router.post("/screener")
async def screener(req: ScreenerRequest):
    """AI 스크리너: 11개 전략 필터로 종목 선별"""
    return run_screener(
        strategies=req.strategies,
        combination=req.combination,
        market=req.market,
        per_max=req.per_max,
        pbr_max=req.pbr_max,
        market_cap_min=req.market_cap_min,
        change_pct_min=req.change_pct_min,
    )


@router.get("/screener/strategies")
async def list_strategies():
    """사용 가능한 투자 전략 목록"""
    return {"strategies": list(_STRATEGY_MAP.keys())}
