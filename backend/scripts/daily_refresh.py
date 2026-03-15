"""일일 재무 데이터 배치 수집 스크립트

GitHub Actions (매일 KST 06:00)에서 실행.
FastAPI 서버 없이 독립 실행 가능.

사용:
    python backend/scripts/daily_refresh.py
    python backend/scripts/daily_refresh.py --symbol NVDA   # 단일 심볼 테스트

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


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="일일 재무 데이터 배치 수집")
    parser.add_argument("--symbol", nargs="+", help="수집할 심볼 (생략 시 전체)")
    args = parser.parse_args()

    main(symbols=args.symbol)
