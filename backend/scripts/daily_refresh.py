"""일일 재무 데이터 배치 수집 스크립트

GitHub Actions (매일 KST 06:00)에서 실행.
FastAPI 서버 없이 독립 실행 가능.

사용:
    python backend/scripts/daily_refresh.py
    python backend/scripts/daily_refresh.py --symbol NVDA   # 단일 심볼 테스트
    python backend/scripts/daily_refresh.py --phase universe --market KR
    python backend/scripts/daily_refresh.py --phase snapshot --market all
    python backend/scripts/daily_refresh.py --phase snapshot --date 20260315

환경변수 (GitHub Secrets 또는 .env):
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
    DART_API_KEY
"""
from __future__ import annotations

import asyncio
import sys
import os
import time
from pathlib import Path

# backend/ 를 모듈 경로에 추가 (standalone 실행용)
sys.path.insert(0, str(Path(__file__).parent.parent))

os.environ.setdefault("APP_ENV", "production")

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

# 환경변수 로드 후 임포트
from services.fundamentals_service import _fetch_kr_fundamentals, _fetch_us_fundamentals, _KR_CORP_CODE  # noqa: E402
from services.history_service import _fetch_kr_history, _fetch_us_history  # noqa: E402
import services.financials_cache_service as db_cache  # noqa: E402

TICKERS = {
    # KR
    "005930.KS": "삼성전자",
    "000660.KS": "SK하이닉스",
    "005380.KS": "현대자동차",
    "012330.KS": "현대모비스",
    "267270.KS": "효성중공업",
    # US
    "TSLA": "테슬라",
    "NVDA": "엔비디아",
    "AAPL": "애플",
    "GOOGL": "알파벳",
    "MSFT": "마이크로소프트",
    "PLTR": "팔란티어",
    "HOOD": "로빈후드",
    "SPY": "S&P 500 ETF",
    "VOO": "Vanguard ETF",
}


def _fetch_fundamentals(symbol: str) -> dict:
    if symbol in _KR_CORP_CODE:
        return _fetch_kr_fundamentals(symbol)
    return _fetch_us_fundamentals(symbol)


def _fetch_history(symbol: str) -> dict:
    if symbol in _KR_CORP_CODE:
        return _fetch_kr_history(symbol)
    return _fetch_us_history(symbol)


def refresh_symbol(symbol: str, name: str) -> tuple[bool, bool]:
    """심볼 1개 수집 후 Supabase upsert. (fundamentals_ok, history_ok) 반환."""
    fund_ok = hist_ok = False

    try:
        fund_data = _fetch_fundamentals(symbol)
        db_cache.write_fundamentals(symbol, fund_data)
        fund_ok = True
    except Exception as e:
        print(f"  [FAIL] fundamentals {symbol}: {e}")

    try:
        hist_data = _fetch_history(symbol)
        db_cache.write_history(symbol, hist_data)
        hist_ok = True
    except Exception as e:
        print(f"  [FAIL] history {symbol}: {e}")

    return fund_ok, hist_ok


def main(symbols: list[str] | None = None) -> None:
    targets = {s: TICKERS[s] for s in symbols if s in TICKERS} if symbols else TICKERS

    print(f"[daily_refresh] 시작 — {len(targets)}개 심볼")
    start = time.time()

    success = fail = 0
    for symbol, name in targets.items():
        print(f"  → {symbol} ({name})")
        fund_ok, hist_ok = refresh_symbol(symbol, name)

        if fund_ok and hist_ok:
            print(f"  [OK] {symbol}")
            success += 1
        else:
            print(f"  [PARTIAL] {symbol} fund={fund_ok} hist={hist_ok}")
            fail += 1

        # rate limit 방지: 심볼 간 1초 대기
        time.sleep(1)

    elapsed = time.time() - start
    print(f"\n[daily_refresh] 완료 — 성공 {success}, 실패 {fail}, 소요 {elapsed:.1f}s")

    if fail > 0:
        sys.exit(1)


def run_universe(market: str) -> None:
    """ticker_universe 수집 (KR/US 전체 시장)."""
    from services.market_snapshot_service import (
        collect_ticker_universe_kr,
        collect_ticker_universe_us,
    )

    print(f"[universe] 시작 — market={market}")

    if market in ("KR", "all"):
        count = collect_ticker_universe_kr()
        print(f"[universe] KR: {count}건 upsert")

    if market in ("US", "all"):
        count = collect_ticker_universe_us()
        print(f"[universe] US: {count}건 upsert")

    print("[universe] 완료")


def run_snapshot(market: str, date_str: str) -> None:
    """market_snapshot 수집 (일일 가격 데이터)."""
    from services.market_snapshot_service import (
        collect_kr_snapshot,
        collect_us_snapshot,
        _cleanup_old_snapshots,
    )

    print(f"[snapshot] 시작 — market={market}, date={date_str}")

    if market in ("KR", "all"):
        count = collect_kr_snapshot()
        print(f"[snapshot] KR: {count}건 upsert")

    if market in ("US", "all"):
        count = collect_us_snapshot()
        print(f"[snapshot] US: {count}건 upsert")

    _cleanup_old_snapshots()
    print("[snapshot] 오래된 스냅샷 정리 완료")


if __name__ == "__main__":
    import argparse
    import datetime

    parser = argparse.ArgumentParser(description="일일 데이터 배치 수집")
    parser.add_argument("--symbol", nargs="+", help="수집할 심볼 (fundamentals phase용)")
    parser.add_argument(
        "--phase",
        choices=["fundamentals", "universe", "snapshot"],
        default="fundamentals",
        help="수집 단계",
    )
    parser.add_argument(
        "--market",
        choices=["KR", "US", "all"],
        default="all",
        help="대상 시장 (universe/snapshot phase용)",
    )
    parser.add_argument(
        "--date",
        help="YYYYMMDD 형식 날짜 (snapshot phase용, 기본: 오늘)",
    )
    args = parser.parse_args()

    if args.phase == "fundamentals":
        main(symbols=args.symbol)
    elif args.phase == "universe":
        run_universe(args.market)
    elif args.phase == "snapshot":
        date_str = args.date or datetime.date.today().strftime("%Y%m%d")
        run_snapshot(args.market, date_str)
