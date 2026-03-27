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


def _get_kr_corp_codes() -> dict[str, str]:
    """fundamentals_service에서 재사용."""
    from services.fundamentals_service import _get_kr_corp_codes as _get
    return _get()


def _safe_float(val: Any) -> float | None:
    try:
        if val is None:
            return None
        f = float(val)
        # nan, inf 등 JSON 직렬화 불가능한 값은 None으로 변환
        if f != f:  # nan check
            return None
        return f
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

            # 올바른 DataFrame 접근: loc[행이름, 열이름]
            def get_value(df, row_name, col_name):
                try:
                    if df is not None and not df.empty and row_name in df.index and col_name in df.columns:
                        return _safe_float(df.loc[row_name, col_name])
                except (KeyError, TypeError):
                    pass
                return None

            revenue = get_value(financials, "Total Revenue", col)
            net_income = get_value(financials, "Net Income", col)
            operating_income = get_value(financials, "Operating Income", col)
            gross_profit = get_value(financials, "Gross Profit", col)

            fcf = None
            roe = None
            gross_margin = None

            # Cash flow에서 FCF 계산
            op_cf = get_value(cashflow, "Operating Cash Flow", col)
            capex = get_value(cashflow, "Capital Expenditure", col)
            if op_cf is not None and capex is not None:
                fcf = op_cf + capex  # capex는 음수

            # Gross margin 계산
            if revenue and gross_profit and revenue != 0:
                gross_margin = gross_profit / revenue

            # Balance sheet에서 ROE 계산
            equity = get_value(balance, "Stockholders Equity", col)
            if equity and net_income and equity != 0:
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
    # 최근 5개년만 반환
    annual = annual[-5:] if len(annual) > 5 else annual
    return {"symbol": symbol, "annual": annual}


def _fetch_kr_history(symbol: str) -> dict[str, Any]:
    corp_code = _get_kr_corp_codes().get(symbol)

    if corp_code:
        try:
            from dartlab import Company  # type: ignore[import]

            c = Company(corp_code)
            summary = c.fsSummary()

            # dartlab v0.4+: IS/BS/FS가 polars DataFrame
            is_df = summary.IS  # 손익계산서
            bs_df = summary.BS  # 재무상태표

            annual: list[dict] = []

            # IS DataFrame: 행이 항목명, 열이 연도
            # polars DataFrame → dict 변환
            items_map: dict[str, dict[str, float]] = {}
            equity_map: dict[str, dict[str, float]] = {}

            if is_df is not None and len(is_df) > 0:
                item_col = is_df.columns[0]
                rows = is_df.to_dicts()
                for row in rows:
                    item_name = str(row.get(item_col, ""))
                    items_map[item_name] = {
                        col: _safe_float(row.get(col))
                        for col in is_df.columns[1:]
                    }

            # BS DataFrame에서 자본총계 추출 (ROE 계산용)
            if bs_df is not None and len(bs_df) > 0:
                item_col = bs_df.columns[0]
                rows = bs_df.to_dicts()
                for row in rows:
                    item_name = str(row.get(item_col, ""))
                    equity_map[item_name] = {
                        col: _safe_float(row.get(col))
                        for col in bs_df.columns[1:]
                    }

            # 연도별 데이터 구성
            if is_df is not None and len(is_df) > 0:
                years = is_df.columns[1:]
                for year in years:
                    revenue = items_map.get("매출액", {}).get(year)
                    operating_income = items_map.get("영업이익", {}).get(year)
                    net_income = items_map.get("연결총당기순이익", {}).get(year)
                    # 자본총계 (지배기업 소유주 지분 우선, 없으면 자본총계)
                    equity = (
                        equity_map.get("지배기업 소유주 지분", {}).get(year)
                        or equity_map.get("자본총계", {}).get(year)
                    )

                    gross_margin = None
                    if revenue and operating_income and revenue != 0:
                        gross_margin = operating_income / revenue

                    roe = None
                    if net_income and equity and equity != 0:
                        roe = net_income / equity

                    annual.append({
                        "year": str(year),
                        "revenue": revenue,
                        "net_income": net_income,
                        "operating_income": operating_income,
                        "eps": None,
                        "roe": roe,
                        "gross_margin": gross_margin,
                        "fcf": None,
                    })

            annual.sort(key=lambda x: x["year"])
            # 최근 5개년만 반환
            annual = annual[-5:] if len(annual) > 5 else annual
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
    if symbol in _get_kr_corp_codes():
        data = _fetch_kr_history(symbol)
    else:
        data = _fetch_us_history(symbol)

    db_cache.write_history(symbol, data)
    return _HISTORY_CACHE.set(symbol, data)
