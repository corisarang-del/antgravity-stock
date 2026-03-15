"""5개년 재무 히스토리 서비스

- KR 종목: dartlab Company().BS, Income Statement 기반
- US 종목: yfinance Ticker().financials, balance_sheet, cashflow
- Read 우선순위: TtlCache(인메모리) → Supabase → 외부API
"""
from __future__ import annotations

from typing import Any

import yfinance as yf

from services.runtime_cache import TtlCache
import services.financials_cache_service as db_cache

_HISTORY_CACHE: TtlCache[dict] = TtlCache(ttl_seconds=86400)

_KR_CORP_CODE: dict[str, str] = {
    "005930.KS": "005930",
    "000660.KS": "000660",
    "005380.KS": "005380",
    "012330.KS": "012330",
    "267270.KS": "267270",
    "035420.KS": "035420",
}


def _safe_float(val: Any) -> float | None:
    try:
        return float(val) if val is not None else None
    except (TypeError, ValueError):
        return None


def _fetch_us_history(symbol: str) -> dict[str, Any]:
    ticker = yf.Ticker(symbol)
    financials = ticker.financials  # income statement (연간)
    cashflow = ticker.cashflow
    balance = ticker.balance_sheet

    annual: list[dict] = []

    if financials is not None and not financials.empty:
        for col in financials.columns:
            year = str(col.year) if hasattr(col, "year") else str(col)[:4]
            revenue = _safe_float(financials.get("Total Revenue", {}).get(col))
            net_income = _safe_float(financials.get("Net Income", {}).get(col))
            operating_income = _safe_float(financials.get("Operating Income", {}).get(col))
            gross_profit = _safe_float(financials.get("Gross Profit", {}).get(col))

            fcf = None
            eps = None
            roe = None
            gross_margin = None

            if cashflow is not None and not cashflow.empty and col in cashflow.columns:
                op_cf = _safe_float(cashflow.get("Operating Cash Flow", {}).get(col))
                capex = _safe_float(cashflow.get("Capital Expenditure", {}).get(col))
                if op_cf is not None and capex is not None:
                    fcf = op_cf + capex  # capex는 음수

            if revenue and gross_profit:
                gross_margin = gross_profit / revenue if revenue != 0 else None

            # EPS, ROE는 balance sheet 필요
            if balance is not None and not balance.empty and col in balance.columns:
                equity = _safe_float(balance.get("Stockholders Equity", {}).get(col))
                if equity and net_income:
                    roe = net_income / equity

            annual.append({
                "year": year,
                "revenue": revenue,
                "net_income": net_income,
                "operating_income": operating_income,
                "eps": None,  # yfinance는 EPS를 별도 계산 필요
                "roe": roe,
                "gross_margin": gross_margin,
                "fcf": fcf,
            })

    annual.sort(key=lambda x: x["year"])
    return {"symbol": symbol, "annual": annual}


def _fetch_kr_history(symbol: str) -> dict[str, Any]:
    corp_code = _KR_CORP_CODE.get(symbol)

    if corp_code:
        try:
            from dartlab import Company  # type: ignore[import]

            c = Company(corp_code)
            summary = c.fsSummary()

            annual: list[dict] = []
            if summary is not None and not summary.empty:
                for _, row in summary.iterrows():
                    year = str(row.get("연도", ""))[:4]
                    revenue = _safe_float(row.get("매출액"))
                    operating_income = _safe_float(row.get("영업이익"))
                    net_income = _safe_float(row.get("당기순이익"))

                    gross_margin = None
                    if revenue and operating_income:
                        gross_margin = operating_income / revenue

                    annual.append({
                        "year": year,
                        "revenue": revenue,
                        "net_income": net_income,
                        "operating_income": operating_income,
                        "eps": None,
                        "roe": None,
                        "gross_margin": gross_margin,
                        "fcf": None,
                    })

            annual.sort(key=lambda x: x["year"])
            return {"symbol": symbol, "annual": annual}
        except Exception:
            pass

    # dartlab 실패 시 yfinance 폴백
    return _fetch_us_history(symbol)


def get_financial_history(symbol: str) -> dict[str, Any]:
    # 1. 인메모리 TtlCache
    cached = _HISTORY_CACHE.get(symbol)
    if cached is not None:
        return cached

    # 2. Supabase (25h 이내 데이터)
    db_data = db_cache.read_history(symbol)
    if db_data is not None:
        return _HISTORY_CACHE.set(symbol, db_data)

    # 3. 외부 API (dartlab / yfinance) → Supabase + TtlCache 저장
    if symbol in _KR_CORP_CODE:
        data = _fetch_kr_history(symbol)
    else:
        data = _fetch_us_history(symbol)

    db_cache.write_history(symbol, data)
    return _HISTORY_CACHE.set(symbol, data)
