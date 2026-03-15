"""섹터 히트맵 서비스

- KR 종목: KRX API로 섹터 분류 + yfinance 가격 변동
- US 종목: yfinance info sector
- 4시간 TTL 캐시
"""
from __future__ import annotations

import logging
from typing import Any

import httpx
import pandas as pd
import yfinance as yf

from data.pipeline import TICKERS
from services.fundamentals_service import get_fundamentals
from services.runtime_cache import TtlCache

logger = logging.getLogger(__name__)

_SECTOR_CACHE: TtlCache[dict] = TtlCache(ttl_seconds=14400)  # 4시간 — 섹터 구성은 하루 1~2회면 충분

# KRX 종목코드 (숫자 6자리) -> 업종 캐시
_KRX_SECTOR_CACHE: dict[str, str] = {}

_KR_SYMBOLS_CODE: dict[str, str] = {
    "005930.KS": "005930",
    "000660.KS": "000660",
    "005380.KS": "005380",
    "012330.KS": "012330",
    "267270.KS": "267270",
}


def _fetch_krx_sector(code: str) -> str:
    """KRX API로 업종 조회"""
    if code in _KRX_SECTOR_CACHE:
        return _KRX_SECTOR_CACHE[code]

    isin = f"KR7{code}003"
    try:
        resp = httpx.post(
            "http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd",
            data={"bld": "dbms/MDC/STAT/standard/MDCSTAT03901", "isuCd": isin},
            timeout=5.0,
        )
        resp.raise_for_status()
        items = resp.json().get("output", [])
        if items:
            sector = items[0].get("IDX_NM", "기타")
            _KRX_SECTOR_CACHE[code] = sector
            return sector
    except Exception:
        pass

    return "기타"


def _get_all_change_pcts(symbols: list[str]) -> dict[str, float]:
    """모든 종목의 당일 등락률을 한 번의 yf.download로 일괄 계산"""
    if not symbols:
        return {}

    result: dict[str, float] = {s: 0.0 for s in symbols}

    try:
        df = yf.download(symbols, period="2d", threads=True, progress=False)
    except Exception:
        logger.warning("yf.download 일괄 호출 실패, 모든 종목 change_pct=0.0 처리")
        return result

    if df.empty:
        return result

    for symbol in symbols:
        try:
            if len(symbols) == 1:
                close_series = df["Close"]
            else:
                if symbol not in df["Close"].columns:
                    continue
                close_series = df["Close"][symbol]

            close_series = close_series.dropna()
            if len(close_series) >= 2:
                prev = float(close_series.iloc[-2])
                curr = float(close_series.iloc[-1])
                if prev > 0:
                    result[symbol] = round((curr - prev) / prev * 100, 2)
        except Exception:
            pass

    return result


def get_sectors() -> dict[str, Any]:
    cached = _SECTOR_CACHE.get("__all__")
    if cached is not None:
        return cached

    # INDEX가 아닌 종목만 수집
    target_symbols = [
        symbol for symbol, meta in TICKERS.items()
        if meta["market"] != "INDEX"
    ]

    # 모든 종목 등락률을 한 번에 조회
    change_pcts = _get_all_change_pcts(target_symbols)

    sector_map: dict[str, list[dict]] = {}

    for symbol in target_symbols:
        meta = TICKERS[symbol]

        # 섹터 이름 결정
        if meta["market"] == "KR":
            code = _KR_SYMBOLS_CODE.get(symbol, "")
            sector_name = _fetch_krx_sector(code) if code else "기타"
        else:
            try:
                info = yf.Ticker(symbol).info
                sector_name = info.get("sector") or "Other"
            except Exception:
                sector_name = "Other"

        try:
            f = get_fundamentals(symbol)
            mktcap = f.get("market_cap") or 0
            score_total = (f.get("score") or {}).get("total", 0)
        except Exception:
            mktcap = 0
            score_total = 0

        change_pct = change_pcts.get(symbol, 0.0)

        ai_signal = "BUY" if score_total >= 65 else ("HOLD" if score_total >= 45 else "WATCH")

        stock_item = {
            "symbol": symbol,
            "name": meta["name"],
            "market": meta["market"],
            "market_cap": mktcap,
            "change_pct": change_pct,
            "ai_signal": ai_signal,
        }

        sector_map.setdefault(sector_name, []).append(stock_item)

    sectors = []
    for name, stocks in sector_map.items():
        total_mktcap = sum(s["market_cap"] for s in stocks)
        avg_change = sum(s["change_pct"] for s in stocks) / len(stocks) if stocks else 0
        sectors.append({
            "name": name,
            "stocks": stocks,
            "total_market_cap": total_mktcap,
            "avg_change_pct": round(avg_change, 2),
        })

    sectors.sort(key=lambda x: x["total_market_cap"], reverse=True)
    result = {"sectors": sectors}
    return _SECTOR_CACHE.set("__all__", result)
