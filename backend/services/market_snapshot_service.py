from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

import pandas as pd
import yfinance as yf

from data.pipeline import TICKERS
from schemas.dashboard import MarketSnapshot
from services.fallback_data_service import FallbackDataService
from services.runtime_cache import TtlCache


SNAPSHOT_CACHE = TtlCache[MarketSnapshot](ttl_seconds=60)


class MarketSnapshotService:
    def __init__(self) -> None:
        self.fallbacks = FallbackDataService()

    def _load_from_yfinance(self, symbol: str) -> tuple[float, float, int]:
        try:
            ticker = yf.Ticker(symbol)
            frame = ticker.history(period="5d", auto_adjust=True)
        except Exception:
            return 0.0, 0.0, 0

        if frame.empty:
            return 0.0, 0.0, 0

        price = float(frame["Close"].iloc[-1])
        previous_close = float(frame["Close"].iloc[-2]) if len(frame) > 1 else price
        volume = int(frame["Volume"].iloc[-1]) if "Volume" in frame.columns else 0
        return price, previous_close, volume

    def _load_from_training_sample(self, symbol: str) -> tuple[float, float, int]:
        frame = self.fallbacks.load_training_rows(symbol)
        if frame.empty:
            latest = self.fallbacks.load_last_close_from_reports(symbol)
            if latest is None:
                return 0.0, 0.0, 0
            last_close, predicted_close = latest
            return last_close, predicted_close, 0

        latest = frame.iloc[-1]
        previous = frame.iloc[-2] if len(frame) > 1 else latest
        return float(latest["close"]), float(previous["close"]), int(latest["volume"])

    def get_snapshot(self, symbol: str, is_delayed: bool) -> MarketSnapshot:
        cache_key = f"{symbol}:{int(is_delayed)}"
        cached = SNAPSHOT_CACHE.get(cache_key)
        if cached is not None:
            return cached

        price, previous_close, volume = self._load_from_yfinance(symbol)
        if price == 0.0 and previous_close == 0.0:
            price, previous_close, volume = self._load_from_training_sample(symbol)

        change_amount = price - previous_close
        change_rate = (change_amount / previous_close * 100) if previous_close else 0.0

        snapshot = MarketSnapshot(
            symbol=symbol,
            price=round(price, 2),
            previous_close=round(previous_close, 2),
            change_amount=round(change_amount, 2),
            change_rate=round(change_rate, 2),
            volume=volume,
            market_status="delayed" if is_delayed else "open",
            as_of=datetime.utcnow().isoformat(),
            is_delayed=is_delayed,
        )
        return SNAPSHOT_CACHE.set(cache_key, snapshot)

    def preview_items(self) -> list[MarketSnapshot]:
        symbols = list(TICKERS.keys())[:3]
        # 순차 → 병렬: 3개 종목 동시 호출로 1.4s → ~0.5s
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(self.get_snapshot, symbol, True) for symbol in symbols]
            return [f.result() for f in futures]
