"""AI 스크리너 서비스

- 11개 투자 전략 필터
- AND/OR 조합 로직
- Investment Score 기반 랭킹
"""
from __future__ import annotations

from typing import Any

from data.pipeline import TICKERS
from services.fundamentals_service import get_fundamentals


# ──────────────────────────────────────────────
# 전략 필터 함수 (모두 fundamentals dict를 받아 bool 반환)
# ──────────────────────────────────────────────

def _strategy_warren_buffett(f: dict) -> bool:
    """ROE ≥ 15%, 부채비율 ≤ 0.5, 순이익률 ≥ 10%"""
    return (
        (f.get("roe") or 0) >= 0.15
        and (f.get("debt_to_equity") or 999) <= 0.5
        and (f.get("net_margin") or 0) >= 0.10
    )


def _strategy_peter_lynch(f: dict) -> bool:
    """PEG ≤ 1.5, 수익성장 ≥ 15%"""
    return (
        (f.get("peg_ratio") or 999) <= 1.5
        and (f.get("earnings_growth") or 0) >= 0.15
    )


def _strategy_momentum(f: dict) -> bool:
    """수익성장 ≥ 25%, 매출성장 ≥ 20%"""
    return (
        (f.get("earnings_growth") or 0) >= 0.25
        and (f.get("revenue_growth") or 0) >= 0.20
    )


def _strategy_value(f: dict) -> bool:
    """PBR ≤ 2, PER ≤ 20"""
    return (
        0 < (f.get("price_to_book") or 999) <= 2
        and 0 < (f.get("trailing_pe") or 999) <= 20
    )


def _strategy_dividend(f: dict) -> bool:
    """배당수익률 ≥ 2%"""
    return (f.get("dividend_yield") or 0) >= 0.02


def _strategy_quality(f: dict) -> bool:
    """ROE ≥ 20%, 영업마진 ≥ 15%, 유동비율 ≥ 1.5"""
    return (
        (f.get("roe") or 0) >= 0.20
        and (f.get("operating_margin") or 0) >= 0.15
        and (f.get("current_ratio") or 0) >= 1.5
    )


def _strategy_growth(f: dict) -> bool:
    """매출성장 ≥ 20%, 수익성장 ≥ 20%"""
    return (
        (f.get("revenue_growth") or 0) >= 0.20
        and (f.get("earnings_growth") or 0) >= 0.20
    )


def _strategy_deep_value(f: dict) -> bool:
    """PBR ≤ 1, EV/EBITDA ≤ 8"""
    return (
        0 < (f.get("price_to_book") or 999) <= 1
        and 0 < (f.get("ev_to_ebitda") or 999) <= 8
    )


def _strategy_fcf(f: dict) -> bool:
    """FCF yield ≥ 3%"""
    return (f.get("fcf_yield") or 0) >= 0.03


def _strategy_low_debt(f: dict) -> bool:
    """부채비율 ≤ 0.3"""
    return (f.get("debt_to_equity") or 999) <= 0.3


def _strategy_high_score(f: dict) -> bool:
    """Investment Score ≥ 60"""
    return (f.get("score") or {}).get("total", 0) >= 60


_STRATEGY_MAP: dict[str, Any] = {
    "warren_buffett": _strategy_warren_buffett,
    "peter_lynch": _strategy_peter_lynch,
    "momentum": _strategy_momentum,
    "value": _strategy_value,
    "dividend": _strategy_dividend,
    "quality": _strategy_quality,
    "growth": _strategy_growth,
    "deep_value": _strategy_deep_value,
    "fcf": _strategy_fcf,
    "low_debt": _strategy_low_debt,
    "high_score": _strategy_high_score,
}


def _fmt_mktcap(val: float | None) -> str:
    if val is None:
        return "N/A"
    if val >= 1e12:
        return f"{val/1e12:.1f}T"
    if val >= 1e9:
        return f"{val/1e9:.1f}B"
    if val >= 1e6:
        return f"{val/1e6:.1f}M"
    return str(int(val))


def run_screener(strategies: list[str], combination: str = "AND", market: str = "all") -> dict[str, Any]:
    """스크리닝 실행"""
    valid_strategies = [s for s in strategies if s in _STRATEGY_MAP]
    if not valid_strategies:
        valid_strategies = ["high_score"]

    results: list[dict] = []

    for symbol, meta in TICKERS.items():
        if market != "all" and meta["market"] != market.upper():
            continue

        try:
            f = get_fundamentals(symbol)
        except Exception:
            continue

        flags = [_STRATEGY_MAP[s](f) for s in valid_strategies]
        passed = all(flags) if combination == "AND" else any(flags)
        if not passed:
            continue

        results.append({
            "symbol": symbol,
            "name": meta["name"],
            "market": meta["market"],
            "score": (f.get("score") or {}).get("total", 0),
            "market_cap": _fmt_mktcap(f.get("market_cap")),
            "roe": f.get("roe"),
            "pe": f.get("trailing_pe"),
            "peg": f.get("peg_ratio"),
            "sector": f.get("sector"),
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    return {"count": len(results), "results": results}
