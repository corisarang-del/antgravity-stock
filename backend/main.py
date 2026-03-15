import asyncio
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from data.pipeline import MARKET_TICKER_SYMBOLS, TICKERS
from routers import dashboard, predict, sentiment, stocks, tips
from services.market_snapshot_service import MarketSnapshotService


def _warmup_caches() -> None:
    """서버 시작 시 주요 캐시를 백그라운드로 워밍업."""
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 블로킹 작업을 스레드풀에서 실행해 이벤트 루프 차단 방지
    loop = asyncio.get_running_loop()
    loop.run_in_executor(None, _warmup_caches)
    yield


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
app.include_router(predict.router, prefix="/api/predict", tags=["predict"])
app.include_router(sentiment.router, prefix="/api/sentiment", tags=["sentiment"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(tips.router, prefix="/api/tips", tags=["tips"])

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
