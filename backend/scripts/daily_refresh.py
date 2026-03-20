"""일일 재무 데이터 배치 수집 스크립트

GitHub Actions (매일 KST 06:00)에서 실행.
FastAPI 서버 없이 독립 실행 가능.

사용:
    python backend/scripts/daily_refresh.py
    python backend/scripts/daily_refresh.py --symbol NVDA   # 단일 심볼 테스트
    python backend/scripts/daily_refresh.py --phase universe --market KR
    python backend/scripts/daily_refresh.py --phase snapshot --market all
    python backend/scripts/daily_refresh.py --phase snapshot --date 20260315
    python backend/scripts/daily_refresh.py --phase dividends  # 배당 수집

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
from services.fundamentals_service import _fetch_kr_fundamentals, _fetch_us_fundamentals, _get_kr_corp_codes  # noqa: E402
from services.history_service import _fetch_kr_history, _fetch_us_history  # noqa: E402
import services.financials_cache_service as db_cache  # noqa: E402


def _get_all_symbols() -> dict[str, str]:
    """ticker_universe에서 전체 심볼 로드."""
    from core.config import settings
    from supabase import create_client

    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return {}

    sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

    # 페이지네이션으로 전체 조회
    all_rows: list[dict] = []
    page_size = 1000
    offset = 0

    while True:
        res = (
            sb.table("ticker_universe")
            .select("symbol, name")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        rows = res.data or []
        all_rows.extend(rows)
        if len(rows) < page_size:
            break
        offset += page_size

    return {r["symbol"]: r.get("name", "") for r in all_rows}


# 레거시: 하드코딩된 핵심 종목 (fallback용)
_CORE_TICKERS = {
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
    kr_codes = _get_kr_corp_codes()
    if symbol in kr_codes:
        return _fetch_kr_fundamentals(symbol)
    return _fetch_us_fundamentals(symbol)


def _fetch_history(symbol: str) -> dict:
    kr_codes = _get_kr_corp_codes()
    if symbol in kr_codes:
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
    # 전체 종목 로드 (ticker_universe에서)
    all_tickers = _get_all_symbols() or _CORE_TICKERS

    if symbols:
        targets = {s: all_tickers.get(s, s) for s in symbols if s in all_tickers}
    else:
        targets = all_tickers

    if not targets:
        print("[daily_refresh] 대상 심볼 없음")
        return

    print(f"[daily_refresh] 시작 - {len(targets)}개 심볼")
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
    print(f"\n[daily_refresh] 완료 - 성공 {success}, 실패 {fail}, 소요 {elapsed:.1f}s")

    if fail > 0:
        sys.exit(1)


def run_universe(market: str) -> None:
    """ticker_universe 수집 (KR/US 전체 시장)."""
    from services.market_snapshot_service import (
        collect_ticker_universe_kr,
        collect_ticker_universe_us,
    )

    print(f"[universe] 시작 - market={market}")

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

    print(f"[snapshot] 시작 - market={market}, date={date_str}")

    if market in ("KR", "all"):
        count = collect_kr_snapshot()
        print(f"[snapshot] KR: {count}건 upsert")

    if market in ("US", "all"):
        count = collect_us_snapshot()
        print(f"[snapshot] US: {count}건 upsert")

    _cleanup_old_snapshots()
    print("[snapshot] 오래된 스냅샷 정리 완료")


def run_dividends() -> None:
    """배당 데이터 수집 (전체 종목)."""
    import yfinance as yf
    from concurrent.futures import ThreadPoolExecutor, as_completed

    # market_snapshot에서 전체 종목 심볼 조회
    from core.supabase_client import get_supabase
    sb = get_supabase()

    snap = (
        sb.table("market_snapshot")
        .select("snapshot_date")
        .order("snapshot_date", desc=True)
        .limit(1)
        .execute()
    )
    if not snap.data:
        print("[dividends] snapshot 없음 - 스킵")
        return

    snap_date = snap.data[0]["snapshot_date"]
    snaps = (
        sb.table("market_snapshot")
        .select("symbol")
        .eq("snapshot_date", snap_date)
        .execute()
    )
    symbols = [r["symbol"] for r in (snaps.data or [])]
    if not symbols:
        print("[dividends] 종목 없음 - 스킵")
        return

    total = len(symbols)
    print(f"[dividends] 시작 - {total}개 종목")

    def _fetch(symbol: str) -> tuple[str, list] | None:
        try:
            divs = yf.Ticker(symbol).dividends
            if divs is None or divs.empty:
                return None
            data = []
            for ts, amount in divs.items():
                if hasattr(ts, "year"):
                    data.append({
                        "ex_date": ts.date().isoformat(),
                        "amount": round(float(amount), 4),
                    })
            return (symbol, data) if data else None
        except Exception:
            return None

    # 결과를 모아서 배치로 저장
    results: list[tuple[str, list]] = []
    processed = 0

    with ThreadPoolExecutor(max_workers=20) as pool:
        futures = {pool.submit(_fetch, sym): sym for sym in symbols}
        for fut in as_completed(futures):
            result = fut.result()
            if result:
                results.append(result)

            processed += 1
            # 500개마다 진행 로깅
            if processed % 500 == 0:
                print(f"[dividends] 진행: {processed}/{total} (배당있음: {len(results)})")

    # 배치 저장 (500개씩)
    if results:
        saved = db_cache.write_dividends_batch(results)
        print(f"[dividends] 완료 - {len(results)}개 종목 배당 데이터 저장 (batch: {saved})")
    else:
        print("[dividends] 완료 - 저장할 배당 데이터 없음")


if __name__ == "__main__":
    import argparse
    import datetime

    parser = argparse.ArgumentParser(description="일일 데이터 배치 수집")
    parser.add_argument("--symbol", nargs="+", help="수집할 심볼 (fundamentals phase용)")
    parser.add_argument(
        "--phase",
        choices=["fundamentals", "universe", "snapshot", "dividends"],
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
    elif args.phase == "dividends":
        run_dividends()
