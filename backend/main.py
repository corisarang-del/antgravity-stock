import asyncio
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from data.pipeline import MARKET_TICKER_SYMBOLS, TICKERS
from routers import dashboard, dividends, market_full, predict, screener, sectors, sentiment, stocks, tips
from services.market_snapshot_service import MarketSnapshotService
from services.cache_warmer import start_scheduler, stop_scheduler, warm_all_from_supabase


def _warmup_caches() -> None:
    """서버 시작 시 주요 캐시를 백그라운드로 워밍업 (Supabase 없이도 동작)."""
    try:
        from services.prediction_service import get_prediction_payload
        get_prediction_payload("SPY", horizon=1)
    except Exception:
        pass

    try:
        svc = MarketSnapshotService()
        svc.preview_items()
    except Exception:
        pass

    # 재무 데이터 프리페치 — Supabase가 비어있을 때 외부 API에서 미리 로드
    try:
        from services.fundamentals_service import get_fundamentals
        for symbol in TICKERS:
            try:
                get_fundamentals(symbol)
            except Exception:
                pass
    except Exception:
        pass

    # 섹터 히트맵 프리페치 — 첫 탭 전환 시 지연 방지
    try:
        from services.sectors_service import get_sectors
        get_sectors()
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. APScheduler 시작 (매일 KST 07:00 재워밍 등록)
    start_scheduler()

    # 2. 블로킹 캐시 워밍은 스레드풀에서 (이벤트 루프 차단 방지)
    loop = asyncio.get_running_loop()
    loop.run_in_executor(None, _warmup_caches)

    # 3. Supabase → TtlCache 워밍 (비동기, cold start 지연 방지)
    asyncio.create_task(warm_all_from_supabase())

    yield

    # 4. 종료 시 스케줄러 정리
    stop_scheduler()


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
    allow_headers=["Content-Type", "Authorization", "X-User-ID"]
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
