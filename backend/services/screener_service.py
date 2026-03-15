"""AI 스크리너 서비스

- 11개 투자 전략 필터
- AND/OR 조합 로직
- Investment Score 기반 랭킹
- market_snapshot 기반 전체 시장(~8,000종목) 지원
"""
from __future__ import annotations

import logging
from typing import Any

from core.supabase_client import get_supabase
from data.pipeline import TICKERS
from services.fundamentals_service import get_fundamentals

logger = logging.getLogger(__name__)


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


def _load_snapshot_universe(market: str = "all") -> list[dict]:
    """market_snapshot + ticker_universe에서 최신 스냅샷 로드.

    테이블이 비어있거나 에러 발생 시 빈 리스트 반환.
    """
    try:
        sb = get_supabase()

        # 최신 snapshot_date 조회
        date_res = (
            sb.table("market_snapshot")
            .select("snapshot_date")
            .order("snapshot_date", desc=True)
            .limit(1)
            .execute()
        )
        if not date_res.data:
            return []

        latest_date = date_res.data[0]["snapshot_date"]

        # 해당 날짜의 전체 스냅샷 로드
        query = sb.table("market_snapshot").select("*").eq("snapshot_date", latest_date)
        if market != "all":
            query = query.eq("market", market.upper())
        snap_res = query.execute()

        if not snap_res.data:
            return []

        # ticker_universe에서 name/sector 메타데이터 로드
        symbols = [row["symbol"] for row in snap_res.data]
        meta_res = (
            sb.table("ticker_universe")
            .select("symbol, name, sector")
            .in_("symbol", symbols)
            .execute()
        )
        meta_map: dict[str, dict] = {}
        if meta_res.data:
            for row in meta_res.data:
                meta_map[row["symbol"]] = row

        # 병합
        universe: list[dict] = []
        for row in snap_res.data:
            sym = row["symbol"]
            meta = meta_map.get(sym, {})
            universe.append({
                "symbol": sym,
                "market": row.get("market", ""),
                "name": meta.get("name", sym),
                "sector": meta.get("sector"),
                "close": row.get("close"),
                "change_pct": row.get("change_pct"),
                "market_cap": row.get("market_cap"),
                "per": row.get("per"),
                "pbr": row.get("pbr"),
            })

        return universe
    except Exception:
        logger.exception("market_snapshot 로드 실패")
        return []


def _apply_basic_filters(
    candidates: list[dict],
    *,
    per_max: float | None = None,
    pbr_max: float | None = None,
    market_cap_min: float | None = None,
    change_pct_min: float | None = None,
) -> list[dict]:
    """스냅샷 후보에 기본 숫자 필터 적용."""
    filtered: list[dict] = []
    for c in candidates:
        if per_max is not None and (c.get("per") is None or c["per"] > per_max):
            continue
        if pbr_max is not None and (c.get("pbr") is None or c["pbr"] > pbr_max):
            continue
        if market_cap_min is not None and (c.get("market_cap") is None or c["market_cap"] < market_cap_min):
            continue
        if change_pct_min is not None and (c.get("change_pct") is None or c["change_pct"] < change_pct_min):
            continue
        filtered.append(c)
    return filtered


def run_screener(
    strategies: list[str],
    combination: str = "AND",
    market: str = "all",
    per_max: float | None = None,
    pbr_max: float | None = None,
    market_cap_min: float | None = None,
    change_pct_min: float | None = None,
) -> dict[str, Any]:
    """스크리닝 실행 (2-tier: snapshot -> strategy filters)"""

    # 전략 필터가 필요한지 판단
    skip_strategies = not strategies or strategies == ["all"]
    valid_strategies = [s for s in strategies if s in _STRATEGY_MAP] if not skip_strategies else []
    if not skip_strategies and not valid_strategies:
        valid_strategies = ["high_score"]

    # ── Tier 1: snapshot universe 로드 ──
    snapshot = _load_snapshot_universe(market)

    # snapshot이 비어있으면 기존 TICKERS 폴백 (레거시 동작)
    if not snapshot:
        return _run_screener_legacy(valid_strategies, combination, market)

    # 기본 숫자 필터 적용
    candidates = _apply_basic_filters(
        snapshot,
        per_max=per_max,
        pbr_max=pbr_max,
        market_cap_min=market_cap_min,
        change_pct_min=change_pct_min,
    )

    # ── Tier 2: 전략 필터 ──
    results: list[dict] = []

    if skip_strategies or not valid_strategies:
        # 전략 필터 없이 전체 후보 반환
        for c in candidates:
            results.append({
                "symbol": c["symbol"],
                "name": c["name"],
                "market": c["market"],
                "score": 0,
                "market_cap": _fmt_mktcap(c.get("market_cap")),
                "roe": None,
                "pe": c.get("per"),
                "peg": None,
                "sector": c.get("sector"),
                "close": c.get("close"),
                "change_pct": c.get("change_pct"),
                "pbr": c.get("pbr"),
            })
    else:
        for c in candidates:
            try:
                f = get_fundamentals(c["symbol"])
            except Exception:
                continue

            flags = [_STRATEGY_MAP[s](f) for s in valid_strategies]
            passed = all(flags) if combination == "AND" else any(flags)
            if not passed:
                continue

            results.append({
                "symbol": c["symbol"],
                "name": c["name"],
                "market": c["market"],
                "score": (f.get("score") or {}).get("total", 0),
                "market_cap": _fmt_mktcap(f.get("market_cap") or c.get("market_cap")),
                "roe": f.get("roe"),
                "pe": f.get("trailing_pe"),
                "peg": f.get("peg_ratio"),
                "sector": f.get("sector") or c.get("sector"),
                "close": c.get("close"),
                "change_pct": c.get("change_pct"),
                "pbr": c.get("pbr"),
            })

    results.sort(key=lambda x: x["score"], reverse=True)
    return {"count": len(results), "results": results}


def _run_screener_legacy(
    valid_strategies: list[str],
    combination: str,
    market: str,
) -> dict[str, Any]:
    """기존 TICKERS 기반 폴백 (market_snapshot이 비어있을 때)."""
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
            "close": None,
            "change_pct": None,
            "pbr": None,
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    return {"count": len(results), "results": results}
