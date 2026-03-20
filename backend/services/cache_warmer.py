"""APScheduler 기반 캐시 워머

역할:
- 서버 시작 시: Supabase → TtlCache 전체 워밍 (cold start 지연 방지)
- 매일 KST 07:00: 재워밍 (GitHub Actions 완료 1h 후)

워밍 대상: ticker_universe의 모든 심볼 (fundamentals + history + sectors + dividends)
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger(__name__)

# GitHub Actions cron이 KST 06:00 → 완료 예상 06:30 → 여유 30분 후 07:00 재워밍
_REWARM_HOUR_KST = 7
_REWARM_MINUTE_KST = 0

# 섹터 워밍: 재무 워밍(07:00) 완료 후 10분
_SECTOR_HOUR_KST = 7
_SECTOR_MINUTE_KST = 10

# 스크리너 사전 실행: 섹터 워밍(07:10) 완료 후 20분 여유
_SCREENER_HOUR_KST = 7
_SCREENER_MINUTE_KST = 30

# 자동 사전 실행할 전략 조합 (자주 조회되는 것들)
_SCREENER_PRESETS: list[tuple[list[str], str, str]] = [
    (["high_score"], "AND", "all"),
    (["value"],      "AND", "KR"),
    (["value"],      "AND", "US"),
    (["quality"],    "AND", "all"),
    (["momentum"],   "AND", "all"),
    (["dividend"],   "AND", "all"),
]

_scheduler: AsyncIOScheduler | None = None

# 캐시된 심볼 목록
_ALL_SYMBOLS_CACHE: list[str] | None = None


def _get_all_symbols() -> list[str]:
    """ticker_universe에서 전체 심볼 로드 (캐시)."""
    global _ALL_SYMBOLS_CACHE
    if _ALL_SYMBOLS_CACHE is not None:
        return _ALL_SYMBOLS_CACHE

    from core.config import settings
    _ALL_SYMBOLS_CACHE = []

    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return _ALL_SYMBOLS_CACHE

    try:
        from supabase import create_client
        sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

        # 페이지네이션으로 전체 조회 (기본 limit 1000 우회)
        all_rows: list[dict[str, Any]] = []
        page_size = 1000
        offset = 0

        while True:
            res = (
                sb.table("ticker_universe")
                .select("symbol")
                .range(offset, offset + page_size - 1)
                .execute()
            )
            rows = res.data or []
            all_rows.extend(rows)
            if len(rows) < page_size:
                break
            offset += page_size

        _ALL_SYMBOLS_CACHE = [r["symbol"] for r in all_rows]
    except Exception:
        logger.exception("[cache_warmer] ticker_universe 로드 실패")

    return _ALL_SYMBOLS_CACHE


async def warm_all_from_supabase() -> None:
    """Supabase 데이터를 TtlCache에 로드. 없는 심볼은 건너뜀."""
    import services.financials_cache_service as db_cache
    from services.fundamentals_service import _FUND_CACHE
    from services.history_service import _HISTORY_CACHE

    symbols = _get_all_symbols()
    if not symbols:
        logger.warning("[cache_warmer] 워밍할 심볼 없음")
        return

    logger.info(f"[cache_warmer] 워밍 시작 — {len(symbols)}개 심볼")

    warmed_fund = warmed_hist = 0

    # 배치 처리 (100개마다 로깅)
    for i, symbol in enumerate(symbols):
        fund_data = db_cache.read_fundamentals(symbol)
        if fund_data is not None:
            _FUND_CACHE.set(symbol, fund_data)
            warmed_fund += 1

        hist_data = db_cache.read_history(symbol)
        if hist_data is not None:
            _HISTORY_CACHE.set(symbol, hist_data)
            warmed_hist += 1

        # 100개마다 진행 로깅 및 yield
        if (i + 1) % 100 == 0:
            logger.info(f"[cache_warmer] 진행: {i + 1}/{len(symbols)}")
            await asyncio.sleep(0)

    logger.info(f"[cache_warmer] 워밍 완료 — fundamentals {warmed_fund}/{len(symbols)}, history {warmed_hist}/{len(symbols)}")


async def warm_screener_cache() -> None:
    """자주 쓰는 스크리너 전략을 사전 실행해 _SCREENER_CACHE에 저장."""
    from services.screener_service import run_screener

    success = 0
    for strategies, combination, market in _SCREENER_PRESETS:
        try:
            run_screener(strategies=strategies, combination=combination, market=market)
            success += 1
        except Exception:
            logger.exception(f"[cache_warmer] 스크리너 사전 실행 실패: {strategies}/{market}")
        await asyncio.sleep(0)  # 이벤트 루프 양보

    logger.info(f"[cache_warmer] 스크리너 워밍 완료 — {success}/{len(_SCREENER_PRESETS)} 전략")


async def warm_sector_cache() -> None:
    """섹터 히트맵 데이터를 사전 계산해 _SECTOR_CACHE에 저장."""
    from services.sectors_service import get_sectors, _SECTOR_CACHE

    try:
        # get_sectors() 내부에서 캐시에 저장됨
        result = get_sectors()
        sector_count = len(result.get("sectors", []))
        logger.info(f"[cache_warmer] 섹터 워밍 완료 — {sector_count}개 섹터")
    except Exception:
        logger.exception("[cache_warmer] 섹터 워밍 실패")


def start_scheduler() -> AsyncIOScheduler:
    """APScheduler 시작. FastAPI lifespan에서 호출."""
    global _scheduler

    _scheduler = AsyncIOScheduler(timezone="Asia/Seoul")

    # 매일 KST 07:00 재무 캐시 재워밍
    _scheduler.add_job(
        warm_all_from_supabase,
        trigger="cron",
        hour=_REWARM_HOUR_KST,
        minute=_REWARM_MINUTE_KST,
        id="daily_rewarm",
        replace_existing=True,
    )

    # 매일 KST 07:10 섹터 히트맵 워밍 (재무 워밍 완료 후)
    _scheduler.add_job(
        warm_sector_cache,
        trigger="cron",
        hour=_SECTOR_HOUR_KST,
        minute=_SECTOR_MINUTE_KST,
        id="daily_sector_warm",
        replace_existing=True,
    )

    # 매일 KST 07:30 스크리너 사전 실행 (섹터 워밍 완료 후)
    _scheduler.add_job(
        warm_screener_cache,
        trigger="cron",
        hour=_SCREENER_HOUR_KST,
        minute=_SCREENER_MINUTE_KST,
        id="daily_screener_warm",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info(
        f"[cache_warmer] 스케줄러 시작 — "
        f"재무 KST {_REWARM_HOUR_KST:02d}:{_REWARM_MINUTE_KST:02d}, "
        f"섹터 KST {_SECTOR_HOUR_KST:02d}:{_SECTOR_MINUTE_KST:02d}, "
        f"스크리너 KST {_SCREENER_HOUR_KST:02d}:{_SCREENER_MINUTE_KST:02d}"
    )
    return _scheduler


def stop_scheduler() -> None:
    """APScheduler 정리. FastAPI lifespan yield 이후 호출."""
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[cache_warmer] 스케줄러 종료")
