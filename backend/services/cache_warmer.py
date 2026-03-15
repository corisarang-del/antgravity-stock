"""APScheduler 기반 캐시 워머

역할:
- 서버 시작 시: Supabase → TtlCache 전체 워밍 (cold start 지연 방지)
- 매일 KST 07:00: 재워밍 (GitHub Actions 완료 1h 후)

워밍 대상: TICKERS의 모든 심볼 (fundamentals + history)
"""
from __future__ import annotations

import asyncio
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger(__name__)

# GitHub Actions cron이 KST 06:00 → 완료 예상 06:30 → 여유 30분 후 07:00 재워밍
_REWARM_HOUR_KST = 7
_REWARM_MINUTE_KST = 0

_TICKERS = [
    "005930.KS", "000660.KS", "005380.KS", "012330.KS", "267270.KS",
    "TSLA", "NVDA", "AAPL", "GOOGL", "MSFT", "PLTR", "HOOD", "SPY", "VOO",
]

_scheduler: AsyncIOScheduler | None = None


async def warm_all_from_supabase() -> None:
    """Supabase 데이터를 TtlCache에 로드. 없는 심볼은 건너뜀."""
    import services.financials_cache_service as db_cache
    from services.fundamentals_service import _FUND_CACHE
    from services.history_service import _HISTORY_CACHE

    warmed_fund = warmed_hist = 0

    for symbol in _TICKERS:
        fund_data = db_cache.read_fundamentals(symbol)
        if fund_data is not None:
            _FUND_CACHE.set(symbol, fund_data)
            warmed_fund += 1

        hist_data = db_cache.read_history(symbol)
        if hist_data is not None:
            _HISTORY_CACHE.set(symbol, hist_data)
            warmed_hist += 1

        # 짧은 yield로 이벤트 루프 양보
        await asyncio.sleep(0)

    logger.info(f"[cache_warmer] 워밍 완료 — fundamentals {warmed_fund}/{len(_TICKERS)}, history {warmed_hist}/{len(_TICKERS)}")


def start_scheduler() -> AsyncIOScheduler:
    """APScheduler 시작. FastAPI lifespan에서 호출."""
    global _scheduler

    _scheduler = AsyncIOScheduler(timezone="Asia/Seoul")

    # 매일 KST 07:00 재워밍
    _scheduler.add_job(
        warm_all_from_supabase,
        trigger="cron",
        hour=_REWARM_HOUR_KST,
        minute=_REWARM_MINUTE_KST,
        id="daily_rewarm",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info(f"[cache_warmer] 스케줄러 시작 — 매일 KST {_REWARM_HOUR_KST:02d}:{_REWARM_MINUTE_KST:02d} 재워밍")
    return _scheduler


def stop_scheduler() -> None:
    """APScheduler 정리. FastAPI lifespan yield 이후 호출."""
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[cache_warmer] 스케줄러 종료")
