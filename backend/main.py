import asyncio
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from data.pipeline import MARKET_TICKER_SYMBOLS, TICKERS
from routers import dashboard, dividends, market_full, predict, screener, sectors, sentiment, stocks, tips
from services.market_snapshot_service import MarketSnapshotService
from services.cache_warmer import start_scheduler, stop_scheduler, warm_all_from_supabase, warm_sector_cache


def _warmup_caches() -> None:
    """서버 시작 시 Supabase와 무관한 캐시만 워밍.

    Supabase 기반 캐시(fundamentals, history, sectors)는 warm_all_from_supabase/warm_sector_cache에서 처리.
    """
    # prediction 캐시
    try:
        from services.prediction_service import get_prediction_payload
        get_prediction_payload("SPY", horizon=1)
    except Exception:
        pass

    # market snapshot 미리보기
    try:
        svc = MarketSnapshotService()
        svc.preview_items()
    except Exception:
        pass

    # 배당 캘린더 프리페치 — 현재 월 캐시 미리 계산 (첫 탭 전환 시 즉시 반환)
    try:
        from datetime import date
        from routers.dividends import _compute_dividend_calendar, _DIV_CACHE
        today = date.today()
        cache_key = f"{today.year}-{today.month:02d}"
        if _DIV_CACHE.get(cache_key) is None:
            result = _compute_dividend_calendar(today.year, today.month)
            _DIV_CACHE.set(cache_key, result)
    except Exception:
        pass


# 백그라운드 태스크 참조 저장 (GC 방지)
_background_tasks: list[asyncio.Task] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 서버 먼저 시작, 워밍은 백그라운드에서 (논블로킹)
    loop = asyncio.get_running_loop()

    # 워밍을 executor에서 실행 (완전히 분리)
    loop.run_in_executor(None, _warmup_sync_caches)

    yield

    # 서버 ready 후 스케줄러 시작 (매일 KST 07:00 재워밍)
    start_scheduler()
    stop_scheduler()
    _background_tasks.clear()


def _warmup_sync_caches() -> None:
    """동기 워밍 (executor에서 실행)."""
    # 1. 기존 워밍
    _warmup_caches()

    # 2. Supabase 캐시 로드 (별도 스레드에서)
    try:
        import asyncio
        from services.cache_warmer import warm_all_from_supabase, warm_sector_cache
        # 새 이벤트 루프에서 실행
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(warm_all_from_supabase())
        loop.run_until_complete(warm_sector_cache())
        loop.close()
    except Exception:
        pass


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
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization"]
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
    return {"status": "ok", "env": settings.APP_ENV}


@app.get("/api/market-ticker")
async def market_ticker():
    symbols = list(MARKET_TICKER_SYMBOLS.keys())
    with ThreadPoolExecutor(max_workers=len(symbols)) as executor:
        return list(executor.map(_build_ticker_item, symbols))
