"""GET /api/market/sectors"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from services.sectors_service import get_sectors

router = APIRouter()


@router.get("/sectors")
async def market_sectors():
    """섹터별 히트맵 데이터 (5분 TTL 캐시)"""
    try:
        return get_sectors()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"섹터 데이터 조회 실패: {exc}") from exc
