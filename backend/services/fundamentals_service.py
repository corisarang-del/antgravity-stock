"""재무지표 + Investment Score 서비스

- KR 종목: dartlab Company().ratios (정규화된 재무)
- US 종목: yfinance Ticker().info
- Investment Score 5카테고리 계산
- 30분 TTL 인메모리 캐시
"""
from __future__ import annotations

from typing import Any

import yfinance as yf

from services.runtime_cache import TtlCache

# ──────────────────────────────────────────────
# KR 종목 → DART corp_code 매핑
# ──────────────────────────────────────────────
_KR_CORP_CODE: dict[str, str] = {
    "005930.KS": "005930",  # 삼성전자
    "000660.KS": "000660",  # SK하이닉스
    "005380.KS": "005380",  # 현대자동차
    "012330.KS": "012330",  # 현대모비스
    "267270.KS": "267270",  # 효성중공업
    "035420.KS": "035420",  # NAVER
}

# 30분 TTL 캐시
_FUND_CACHE: TtlCache[dict] = TtlCache(ttl_seconds=1800)


# ──────────────────────────────────────────────
# Investment Score 계산
# ──────────────────────────────────────────────
def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def _score_quality(roe: float | None, gross_margin: float | None, operating_margin: float | None) -> int:
    """ROE/마진 기반 Quality 점수 (최대 25)"""
    score = 0.0
    if roe is not None:
        score += _clamp(roe / 0.30, 0, 1) * 10
    if gross_margin is not None:
        score += _clamp(gross_margin / 0.50, 0, 1) * 8
    if operating_margin is not None:
        score += _clamp(operating_margin / 0.25, 0, 1) * 7
    return round(score)


def _score_growth(earnings_growth: float | None, revenue_growth: float | None) -> int:
    """성장률 기반 Growth 점수 (최대 20)"""
    score = 0.0
    if earnings_growth is not None:
        score += _clamp(earnings_growth / 0.50, 0, 1) * 12
    if revenue_growth is not None:
        score += _clamp(revenue_growth / 0.30, 0, 1) * 8
    return round(score)


def _score_strength(current_ratio: float | None, debt_to_equity: float | None) -> int:
    """재무건전성 기반 Strength 점수 (최대 15)"""
    score = 0.0
    if current_ratio is not None:
        score += _clamp(current_ratio / 3.0, 0, 1) * 8
    if debt_to_equity is not None:
        # D/E 낮을수록 좋음
        score += _clamp(1 - debt_to_equity / 2.0, 0, 1) * 7
    return round(score)


def _score_cash(fcf_yield: float | None, dividend_yield: float | None) -> int:
    """현금흐름 기반 Cash 점수 (최대 15)"""
    score = 0.0
    if fcf_yield is not None:
        score += _clamp(fcf_yield / 0.05, 0, 1) * 12
    if dividend_yield is not None:
        score += _clamp(dividend_yield / 0.03, 0, 1) * 3
    return round(score)


def _score_valuation(trailing_pe: float | None, peg_ratio: float | None, price_to_book: float | None) -> int:
    """밸류에이션 기반 Valuation 점수 (최대 25)"""
    score = 0.0
    if trailing_pe is not None and trailing_pe > 0:
        # PER 낮을수록 좋음 (10~40 범위)
        score += _clamp((40 - trailing_pe) / 30, 0, 1) * 10
    if peg_ratio is not None and peg_ratio > 0:
        # PEG 낮을수록 좋음 (1 이하가 이상적)
        score += _clamp((2 - peg_ratio) / 2, 0, 1) * 10
    if price_to_book is not None and price_to_book > 0:
        score += _clamp((5 - price_to_book) / 5, 0, 1) * 5
    return round(score)


def _grade(total: int) -> str:
    if total >= 80:
        return "S"
    if total >= 65:
        return "A"
    if total >= 50:
        return "B"
    if total >= 35:
        return "C"
    return "D"


def _build_score(data: dict[str, Any]) -> dict[str, Any]:
    quality = _score_quality(data.get("roe"), data.get("gross_margin"), data.get("operating_margin"))
    growth = _score_growth(data.get("earnings_growth"), data.get("revenue_growth"))
    strength = _score_strength(data.get("current_ratio"), data.get("debt_to_equity"))
    cash = _score_cash(data.get("fcf_yield"), data.get("dividend_yield"))
    valuation = _score_valuation(data.get("trailing_pe"), data.get("peg_ratio"), data.get("price_to_book"))
    total = quality + growth + strength + cash + valuation
    return {
        "quality": quality,
        "growth": growth,
        "strength": strength,
        "cash": cash,
        "valuation": valuation,
        "total": total,
        "grade": _grade(total),
    }


# ──────────────────────────────────────────────
# US 종목: yfinance .info
# ──────────────────────────────────────────────
def _fetch_us_fundamentals(symbol: str) -> dict[str, Any]:
    info = yf.Ticker(symbol).info

    def _f(key: str) -> float | None:
        val = info.get(key)
        return float(val) if val is not None and val != "Infinity" else None

    # FCF yield 추산 (freeCashflow / marketCap)
    fcf = _f("freeCashflow")
    mktcap = _f("marketCap")
    fcf_yield = (fcf / mktcap) if fcf and mktcap and mktcap > 0 else None

    data: dict[str, Any] = {
        "symbol": symbol,
        "source": "yfinance",
        "roe": _f("returnOnEquity"),
        "gross_margin": _f("grossMargins"),
        "operating_margin": _f("operatingMargins"),
        "net_margin": _f("profitMargins"),
        "debt_to_equity": _f("debtToEquity"),
        "current_ratio": _f("currentRatio"),
        "trailing_pe": _f("trailingPE"),
        "price_to_book": _f("priceToBook"),
        "peg_ratio": _f("pegRatio"),
        "ev_to_ebitda": _f("enterpriseToEbitda"),
        "earnings_growth": _f("earningsGrowth"),
        "revenue_growth": _f("revenueGrowth"),
        "market_cap": _f("marketCap"),
        "dividend_yield": _f("dividendYield"),
        "fifty_two_week_high": _f("fiftyTwoWeekHigh"),
        "fifty_two_week_low": _f("fiftyTwoWeekLow"),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "fcf_yield": fcf_yield,
    }
    data["score"] = _build_score(data)
    return data


# ──────────────────────────────────────────────
# KR 종목: dartlab
# ──────────────────────────────────────────────
def _fetch_kr_fundamentals(symbol: str) -> dict[str, Any]:
    corp_code = _KR_CORP_CODE.get(symbol)

    # dartlab 시도
    if corp_code:
        try:
            from dartlab import Company  # type: ignore[import]

            c = Company(corp_code)
            ratios = c.ratios

            # ratios DataFrame에서 최신 연도 행 추출
            latest = ratios.iloc[-1] if ratios is not None and not ratios.empty else None

            def _r(col: str) -> float | None:
                if latest is None:
                    return None
                val = latest.get(col)
                return float(val) / 100 if val is not None else None  # % → ratio

            roe = _r("ROE")
            operating_margin = _r("영업이익률")
            net_margin = _r("순이익률")
            debt_ratio = _r("부채비율")
            debt_to_equity = (debt_ratio / (1 - debt_ratio)) if debt_ratio and debt_ratio < 1 else None

            data: dict[str, Any] = {
                "symbol": symbol,
                "source": "dartlab",
                "roe": roe,
                "gross_margin": None,
                "operating_margin": operating_margin,
                "net_margin": net_margin,
                "debt_to_equity": debt_to_equity,
                "current_ratio": None,
                "trailing_pe": None,
                "price_to_book": None,
                "peg_ratio": None,
                "ev_to_ebitda": None,
                "earnings_growth": None,
                "revenue_growth": None,
                "market_cap": None,
                "dividend_yield": None,
                "fifty_two_week_high": None,
                "fifty_two_week_low": None,
                "sector": None,
                "industry": None,
                "fcf_yield": None,
            }
        except Exception:
            data = _kr_fallback_via_yfinance(symbol)
    else:
        data = _kr_fallback_via_yfinance(symbol)

    # yfinance로 price/mktcap 보강
    try:
        info = yf.Ticker(symbol).info

        def _f(key: str) -> float | None:
            val = info.get(key)
            return float(val) if val is not None else None

        if data.get("trailing_pe") is None:
            data["trailing_pe"] = _f("trailingPE")
        if data.get("price_to_book") is None:
            data["price_to_book"] = _f("priceToBook")
        if data.get("market_cap") is None:
            data["market_cap"] = _f("marketCap")
        if data.get("fifty_two_week_high") is None:
            data["fifty_two_week_high"] = _f("fiftyTwoWeekHigh")
        if data.get("fifty_two_week_low") is None:
            data["fifty_two_week_low"] = _f("fiftyTwoWeekLow")
        if data.get("sector") is None:
            data["sector"] = info.get("sector") or "산업재"
    except Exception:
        pass

    data["score"] = _build_score(data)
    return data


def _kr_fallback_via_yfinance(symbol: str) -> dict[str, Any]:
    """dartlab 실패 시 yfinance로 폴백"""
    info = yf.Ticker(symbol).info

    def _f(key: str) -> float | None:
        val = info.get(key)
        return float(val) if val is not None else None

    fcf = _f("freeCashflow")
    mktcap = _f("marketCap")
    fcf_yield = (fcf / mktcap) if fcf and mktcap and mktcap > 0 else None

    return {
        "symbol": symbol,
        "source": "yfinance_fallback",
        "roe": _f("returnOnEquity"),
        "gross_margin": _f("grossMargins"),
        "operating_margin": _f("operatingMargins"),
        "net_margin": _f("profitMargins"),
        "debt_to_equity": _f("debtToEquity"),
        "current_ratio": _f("currentRatio"),
        "trailing_pe": _f("trailingPE"),
        "price_to_book": _f("priceToBook"),
        "peg_ratio": _f("pegRatio"),
        "ev_to_ebitda": _f("enterpriseToEbitda"),
        "earnings_growth": _f("earningsGrowth"),
        "revenue_growth": _f("revenueGrowth"),
        "market_cap": _f("marketCap"),
        "dividend_yield": _f("dividendYield"),
        "fifty_two_week_high": _f("fiftyTwoWeekHigh"),
        "fifty_two_week_low": _f("fiftyTwoWeekLow"),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "fcf_yield": fcf_yield,
    }


# ──────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────
def get_fundamentals(symbol: str) -> dict[str, Any]:
    cached = _FUND_CACHE.get(symbol)
    if cached is not None:
        return cached

    if symbol in _KR_CORP_CODE:
        data = _fetch_kr_fundamentals(symbol)
    else:
        data = _fetch_us_fundamentals(symbol)

    return _FUND_CACHE.set(symbol, data)
