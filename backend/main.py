import asyncio
import logging
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from data.pipeline import MARKET_TICKER_SYMBOLS, TICKERS
from routers import dashboard, dividends, market_full, predict, screener, sectors, sentiment, stocks, tips
from services.market_snapshot_service import MarketSnapshotService
from services.cache_warmer import start_scheduler, stop_scheduler, warm_all_from_supabase, warm_sector_cache

if not logging.getLogger().handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )

logger = logging.getLogger(__name__)


def _warmup_caches() -> None:
    """서버 시작 시 Supabase와 무관한 캐시만 워밍.

    Supabase 기반 캐시(fundamentals, history, sectors)는 warm_all_from_supabase/warm_sector_cache에서 처리.
    """
    # prediction 캐시
    try:
        logger.info("[startup] prediction warmup start")
        from services.prediction_service import get_prediction_payload
        get_prediction_payload("SPY", horizon=1)
        logger.info("[startup] prediction warmup done")
    except Exception:
        logger.exception("[startup] prediction warmup failed")

    # market snapshot 미리보기
    try:
        logger.info("[startup] market snapshot preview warmup start")
        svc = MarketSnapshotService()
        svc.preview_items()
        logger.info("[startup] market snapshot preview warmup done")
    except Exception:
        logger.exception("[startup] market snapshot preview warmup failed")

    # 배당 캘린더 프리페치 — 현재 월 캐시 미리 계산 (첫 탭 전환 시 즉시 반환)
    try:
        logger.info("[startup] dividends warmup start")
        from datetime import date
        from routers.dividends import _compute_dividend_calendar, _DIV_CACHE
        today = date.today()
        cache_key = f"{today.year}-{today.month:02d}"
        if _DIV_CACHE.get(cache_key) is None:
            result = _compute_dividend_calendar(today.year, today.month)
            _DIV_CACHE.set(cache_key, result)
        logger.info("[startup] dividends warmup done")
    except Exception:
        logger.exception("[startup] dividends warmup failed")


_background_jobs: list[object] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "[startup] lifespan begin env=%s warmup_enabled=%s cors_origins=%d",
        settings.APP_ENV,
        settings.startup_warmup_enabled,
        len(settings.cors_origins_list),
    )

    loop = asyncio.get_running_loop()
    scheduler_started = False

    if settings.startup_warmup_enabled:
        logger.info("[startup] scheduling background warmup")
        future = loop.run_in_executor(None, _warmup_sync_caches)
        _background_jobs.append(future)
    else:
        logger.info("[startup] background warmup skipped by config")

    if settings.server_scheduler_enabled:
        try:
            start_scheduler()
            scheduler_started = True
            logger.info("[startup] scheduler started")
        except Exception:
            logger.exception("[startup] scheduler start failed")
    else:
        logger.info("[startup] scheduler skipped by config")

    logger.info("[startup] application ready")

    yield

    logger.info("[shutdown] lifespan begin")
    if scheduler_started:
        try:
            stop_scheduler()
            logger.info("[shutdown] scheduler stopped")
        except Exception:
            logger.exception("[shutdown] scheduler stop failed")

    _background_jobs.clear()
    logger.info("[shutdown] lifespan complete")


def _warmup_sync_caches() -> None:
    """동기 워밍 (executor에서 실행)."""
    try:
        logger.info("[startup] background warmup thread begin")
        _warmup_caches()
        logger.info("[startup] background warmup local phase done")

        if not settings.supabase_admin_enabled:
            logger.info("[startup] supabase warmup skipped - SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing")
            return

        logger.info("[startup] supabase warmup phase start")
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(warm_all_from_supabase())
        loop.run_until_complete(warm_sector_cache())
        loop.close()
        logger.info("[startup] supabase warmup phase done")
    except Exception:
        logger.exception("[startup] background warmup thread failed")


app = FastAPI(
    title="Ant Gravity API",
    description="AI 투자 보조 서비스 API",
    version="0.1.0",
    docs_url="/docs" if settings.APP_ENV == "development" else None,
    redoc_url=None,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(stocks.router, prefix="/api/stocks", tags=["stocks"])
app.include_router(screener.router, prefix="/api/stocks", tags=["screener"])
app.include_router(dividends.router, prefix="/api/stocks", tags=["dividends"])
app.include_router(predict.router, prefix="/api/predict", tags=["predict"])
app.include_router(sentiment.router, prefix="/api/sentiment", tags=["sentiment"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(tips.router, prefix="/api/tips", tags=["tips"])
app.include_router(sectors.router, prefix="/api/market", tags=["market"])
app.include_router(market_full.router, prefix="/api/market", tags=["market"])

market_ticker_service = MarketSnapshotService()


def _build_ticker_item(symbol: str) -> dict:
    snapshot = market_ticker_service.get_snapshot(symbol, is_delayed=False)
    metadata = TICKERS.get(symbol) or MARKET_TICKER_SYMBOLS[symbol]
    return {
        "symbol": symbol,
        "display_name": metadata["name"],
        "market": metadata["market"],
        "price": snapshot.price,
        "change_amount": snapshot.change_amount,
        "change_rate": snapshot.change_rate,
        "as_of": snapshot.as_of
    }


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


@app.get("/api/market-ticker")
async def market_ticker():
    symbols = list(MARKET_TICKER_SYMBOLS.keys())
    with ThreadPoolExecutor(max_workers=len(symbols)) as executor:
        return list(executor.map(_build_ticker_item, symbols))
