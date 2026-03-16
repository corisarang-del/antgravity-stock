"""GET /api/market/sectors"""
from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, HTTPException

from services.sectors_service import get_sectors

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/sectors")
async def market_sectors():
    """섹터별 히트맵 데이터 (5분 TTL 캐시)"""
    try:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, get_sectors)
    except Exception as exc:
        logger.exception("섹터 데이터 조회 실패")
        raise HTTPException(status_code=503, detail="섹터 데이터를 일시적으로 조회할 수 없습니다.") from exc
