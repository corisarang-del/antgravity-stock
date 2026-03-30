"""재무지표 + Investment Score 서비스

- KR 종목: dartlab Company().ratios (정규화된 재무) + 네이버 금융 (PER/PBR)
- US 종목: yfinance Ticker().info
- Investment Score 5카테고리 계산
- Read 우선순위: TtlCache(인메모리) → Supabase → 외부API
"""
from __future__ import annotations

from typing import Any

import requests
import yfinance as yf

from core.config import settings
from services.runtime_cache import TtlCache
import services.financials_cache_service as db_cache


# ──────────────────────────────────────────────
# 네이버 금융 크롤링 (KR 종목 PER/PBR)
# ──────────────────────────────────────────────
def _fetch_naver_per_pbr(symbol: str) -> dict[str, float | None]:
    """네이버 금융에서 PER, PBR 조회.

    Args:
        symbol: KR 종목 코드 (예: "005930.KS")

    Returns:
        {"per": float | None, "pbr": float | None}
    """
    # 005930.KS → 005930
    code = symbol.replace(".KS", "").replace(".KQ", "")

    try:
        url = f"https://finance.naver.com/item/main.nhn?code={code}"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

        resp = requests.get(url, headers=headers, timeout=5)
        resp.raise_for_status()

        from bs4 import BeautifulSoup
        soup = BeautifulSoup(resp.text, "html.parser")

        per_el = soup.select_one("#_per")
        pbr_el = soup.select_one("#_pbr")

        per = float(per_el.text) if per_el and per_el.text else None
        pbr = float(pbr_el.text) if pbr_el and pbr_el.text else None

        return {"per": per, "pbr": pbr}
    except Exception:
        return {"per": None, "pbr": None}

# ──────────────────────────────────────────────
# KR 종목 → DART corp_code 매핑 (동적 로드)
# ──────────────────────────────────────────────
_KR_CORP_CODE_CACHE: dict[str, str] | None = None


def _get_kr_corp_codes() -> dict[str, str]:
    """ticker_universe에서 KR 종목 corp_code 매핑 로드 (캐시)."""
    global _KR_CORP_CODE_CACHE
    if _KR_CORP_CODE_CACHE is not None:
        return _KR_CORP_CODE_CACHE

    _KR_CORP_CODE_CACHE = {}
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return _KR_CORP_CODE_CACHE

    try:
        from supabase import create_client
        sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

        # 페이지네이션으로 전체 KR 종목 로드 (Supabase 기본 limit=1000)
        page_size = 1000
        offset = 0
        while True:
            res = (
                sb.table("ticker_universe")
                .select("symbol")
                .eq("market", "KR")
                .range(offset, offset + page_size - 1)
                .execute()
            )
            batch = res.data or []
            for row in batch:
                symbol = row["symbol"]
                # 005930.KS → 005930
                corp_code = symbol.replace(".KS", "").replace(".KQ", "")
                _KR_CORP_CODE_CACHE[symbol] = corp_code
            if len(batch) < page_size:
                break
            offset += page_size
    except Exception:
        pass

    return _KR_CORP_CODE_CACHE


# 하위호환용 (레거시 코드에서 직접 접근 시)
_KR_CORP_CODE: dict[str, str] = {}  # 초기화는 _get_kr_corp_codes()에서

# 8시간 TTL 캐시 — 재무데이터는 하루 1~2회 갱신
_FUND_CACHE: TtlCache[dict] = TtlCache(ttl_seconds=28800)


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
# KR 종목: dartlab (v0.4+ dataclass API)
# ──────────────────────────────────────────────
def _fetch_kr_fundamentals(symbol: str) -> dict[str, Any]:
    """KR 종목 재무 데이터 수집.

    최적화된 호출 순서:
    1. dartlab (1차) - ROE, 마진, 성장률, 부채비율
    2. 네이버 금융 (PER/PBR만) - dartlab에서 미제공 시에만
    3. yfinance (보강) - 나머지 누락 필드만

    이전: dartlab + yfinance + 네이버 모두 항상 호출
    개선: dartlab 우선, 필요 시에만 폴백 체인 실행
    """
    corp_code = _get_kr_corp_codes().get(symbol)

    # dartlab 시도
    if corp_code:
        try:
            from dartlab import Company  # type: ignore[import]

            c = Company(corp_code)
            r = c.ratios  # RatioResult dataclass

            # dartlab v0.4+: dataclass 직접 속성 접근 (값은 % 단위)
            def _pct(val: float | None) -> float | None:
                """% → ratio 변환 (8.29 → 0.0829)"""
                return val / 100 if val is not None else None

            roe = _pct(r.roe)
            operating_margin = _pct(r.operatingMargin)
            net_margin = _pct(r.netMargin)
            debt_ratio = _pct(r.debtRatio)  # 부채비율
            current_ratio = r.currentRatio / 100 if r.currentRatio else None  # % → ratio
            revenue_growth = _pct(r.revenueGrowth)
            earnings_growth = _pct(r.netProfitGrowth)

            # 부채비율 → D/E 변환: debt_ratio / (1 - debt_ratio)
            debt_to_equity = (debt_ratio / (1 - debt_ratio)) if debt_ratio and debt_ratio < 1 else None

            # dartlab에서 제공하는 grossMargin 사용
            gross_margin = _pct(r.grossMargin)
            # FCF Yield 계산
            fcf = r.fcf
            fcf_yield = (fcf / r.revenueTTM) if fcf and r.revenueTTM else None

            data: dict[str, Any] = {
                "symbol": symbol,
                "source": "dartlab",
                "roe": roe,
                "gross_margin": gross_margin,
                "operating_margin": operating_margin,
                "net_margin": net_margin,
                "debt_to_equity": debt_to_equity,
                "current_ratio": current_ratio,
                "trailing_pe": r.per,  # dartlab은 None
                "price_to_book": r.pbr,  # dartlab은 None
                "peg_ratio": None,
                "ev_to_ebitda": r.evEbitda,  # dartlab은 None
                "earnings_growth": earnings_growth,
                "revenue_growth": revenue_growth,
                "market_cap": r.marketCap,
                "dividend_yield": None,
                "fifty_two_week_high": None,
                "fifty_two_week_low": None,
                "sector": None,
                "industry": None,
                "fcf_yield": fcf_yield,
            }
        except Exception:
            data = _kr_fallback_via_yfinance(symbol)
    else:
        data = _kr_fallback_via_yfinance(symbol)

    # 최적화: PER/PBR이 없으면 네이버 금융 먼저 시도 (yfinance보다 빠름)
    if data.get("trailing_pe") is None or data.get("price_to_book") is None:
        naver_data = _fetch_naver_per_pbr(symbol)
        if data.get("trailing_pe") is None and naver_data.get("per"):
            data["trailing_pe"] = naver_data["per"]
        if data.get("price_to_book") is None and naver_data.get("pbr"):
            data["price_to_book"] = naver_data["pbr"]

    # yfinance로 나머지 누락 필드만 보강 (전체 호출 최소화)
    missing_fields = [
        k for k in [
            "roe", "market_cap", "fifty_two_week_high", "fifty_two_week_low",
            "sector", "dividend_yield", "ev_to_ebitda",
            "earnings_growth", "revenue_growth", "gross_margin", "fcf_yield"
        ]
        if data.get(k) is None
    ]

    if missing_fields:
        try:
            info = yf.Ticker(symbol).info

            def _f(key: str) -> float | None:
                val = info.get(key)
                return float(val) if val is not None else None

            # 누락 필드만 채움
            if data.get("roe") is None:
                data["roe"] = _f("returnOnEquity")
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
            if data.get("dividend_yield") is None:
                data["dividend_yield"] = _f("dividendYield")
            if data.get("ev_to_ebitda") is None:
                data["ev_to_ebitda"] = _f("enterpriseToEbitda")
            if data.get("earnings_growth") is None:
                data["earnings_growth"] = _f("earningsGrowth")
            if data.get("revenue_growth") is None:
                data["revenue_growth"] = _f("revenueGrowth")
            if data.get("gross_margin") is None:
                data["gross_margin"] = _f("grossMargins")
            if data.get("fcf_yield") is None:
                fcf = _f("freeCashflow")
                mktcap = data.get("market_cap") or _f("marketCap")
                if fcf and mktcap and mktcap > 0:
                    data["fcf_yield"] = fcf / mktcap
        except Exception:
            pass

    # PEG 계산 (PER / EPS 성장률)
    if data.get("peg_ratio") is None:
        per = data.get("trailing_pe")
        growth = data.get("earnings_growth")
        if per and growth and growth > 0:
            data["peg_ratio"] = per / (growth * 100)  # growth는 ratio (0.5 = 50%)

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
def get_cached_fundamentals(symbol: str) -> dict[str, Any] | None:
    # 1. 인메모리 TtlCache
    cached = _FUND_CACHE.get(symbol)
    if cached is not None:
        return cached

    # 2. Supabase (25h 이내 데이터)
    db_data = db_cache.read_fundamentals(symbol)
    if db_data is not None:
        return _FUND_CACHE.set(symbol, db_data)

    return None


def get_cached_fundamentals_bulk(symbols: list[str]) -> dict[str, dict[str, Any] | None]:
    result: dict[str, dict[str, Any] | None] = {}
    missing: list[str] = []

    for symbol in symbols:
        cached = _FUND_CACHE.get(symbol)
        if cached is not None:
            result[symbol] = cached
        else:
            missing.append(symbol)

    if not missing:
        return result

    db_rows = db_cache.read_all_fundamentals()
    for symbol in missing:
        cached = db_rows.get(symbol)
        result[symbol] = _FUND_CACHE.set(symbol, cached) if cached is not None else None

    return result


def fetch_and_cache_fundamentals(symbol: str) -> dict[str, Any]:
    # 3. 외부 API (dartlab / yfinance) → Supabase + TtlCache 저장
    if symbol in _get_kr_corp_codes():
        data = _fetch_kr_fundamentals(symbol)
    else:
        data = _fetch_us_fundamentals(symbol)

    db_cache.write_fundamentals(symbol, data)
    return _FUND_CACHE.set(symbol, data)


def get_fundamentals(symbol: str) -> dict[str, Any]:
    cached = get_cached_fundamentals(symbol)
    if cached is not None:
        return cached
    return fetch_and_cache_fundamentals(symbol)
