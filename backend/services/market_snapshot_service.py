from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta

import pandas as pd
import yfinance as yf

from core.supabase_client import get_supabase
from data.pipeline import TICKERS
from schemas.dashboard import MarketSnapshot
from services.fallback_data_service import FallbackDataService
from services.runtime_cache import TtlCache


SNAPSHOT_CACHE = TtlCache[MarketSnapshot](ttl_seconds=60)


class MarketSnapshotService:
    def __init__(self) -> None:
        self.fallbacks = FallbackDataService()

    def _load_from_yfinance(self, symbol: str) -> tuple[float, float, int]:
        try:
            ticker = yf.Ticker(symbol)
            frame = ticker.history(period="5d", auto_adjust=True)
        except Exception:
            return 0.0, 0.0, 0

        if frame.empty:
            return 0.0, 0.0, 0

        price = float(frame["Close"].iloc[-1])
        previous_close = float(frame["Close"].iloc[-2]) if len(frame) > 1 else price
        volume = int(frame["Volume"].iloc[-1]) if "Volume" in frame.columns else 0
        return price, previous_close, volume

    def _load_from_training_sample(self, symbol: str) -> tuple[float, float, int]:
        frame = self.fallbacks.load_training_rows(symbol)
        if frame.empty:
            latest = self.fallbacks.load_last_close_from_reports(symbol)
            if latest is None:
                return 0.0, 0.0, 0
            last_close, predicted_close = latest
            return last_close, predicted_close, 0

        latest = frame.iloc[-1]
        previous = frame.iloc[-2] if len(frame) > 1 else latest
        return float(latest["close"]), float(previous["close"]), int(latest["volume"])

    def get_snapshot(self, symbol: str, is_delayed: bool) -> MarketSnapshot:
        cache_key = f"{symbol}:{int(is_delayed)}"
        cached = SNAPSHOT_CACHE.get(cache_key)
        if cached is not None:
            return cached

        price, previous_close, volume = self._load_from_yfinance(symbol)
        if price == 0.0 and previous_close == 0.0:
            price, previous_close, volume = self._load_from_training_sample(symbol)

        change_amount = price - previous_close
        change_rate = (change_amount / previous_close * 100) if previous_close else 0.0

        snapshot = MarketSnapshot(
            symbol=symbol,
            price=round(price, 2),
            previous_close=round(previous_close, 2),
            change_amount=round(change_amount, 2),
            change_rate=round(change_rate, 2),
            volume=volume,
            market_status="delayed" if is_delayed else "open",
            as_of=datetime.utcnow().isoformat(),
            is_delayed=is_delayed,
        )
        return SNAPSHOT_CACHE.set(cache_key, snapshot)

    def preview_items(self) -> list[MarketSnapshot]:
        symbols = list(TICKERS.keys())[:3]
        # 순차 → 병렬: 3개 종목 동시 호출로 1.4s → ~0.5s
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(self.get_snapshot, symbol, True) for symbol in symbols]
            return [f.result() for f in futures]


# ──────────────────────────────────────────────
# Phase 9: 전체 시장 벌크 수집 함수
# @TASK T9 - 전체 시장 데이터 벌크 수집
# @SPEC docs/PRD.md#프로-대시보드-시장-데이터
# ──────────────────────────────────────────────

_logger = logging.getLogger(__name__)

_BATCH_SIZE = 500
_YF_BATCH_SIZE = 1000


def _batch_upsert(table: str, rows: list[dict], on_conflict: str) -> int:
    """rows를 _BATCH_SIZE 단위로 나눠 Supabase upsert. 성공 행 수 반환."""
    if not rows:
        return 0
    client = get_supabase()
    total = 0
    for i in range(0, len(rows), _BATCH_SIZE):
        chunk = rows[i : i + _BATCH_SIZE]
        try:
            client.table(table).upsert(chunk, on_conflict=on_conflict).execute()
            total += len(chunk)
        except Exception:
            _logger.exception("batch upsert 실패: table=%s, offset=%d", table, i)
    return total


def collect_ticker_universe_kr() -> int:
    """PyKRX로 KOSPI/KOSDAQ 전체 종목 메타 수집 -> ticker_universe upsert.

    KOSPI 종목은 .KS, KOSDAQ 종목은 .KQ 접미사를 부여한다.

    Returns: upserted row count
    """
    try:
        from pykrx import stock as krx
    except ImportError as exc:
        raise ImportError(
            "pykrx 패키지가 필요함: pip install pykrx"
        ) from exc

    rows: list[dict] = []

    for market_code, suffix in (("KOSPI", ".KS"), ("KOSDAQ", ".KQ")):
        try:
            today_str = date.today().strftime("%Y%m%d")
            tickers = krx.get_market_ticker_list(today_str, market=market_code)
        except Exception:
            _logger.exception("pykrx %s 티커 목록 조회 실패", market_code)
            continue

        for ticker in tickers:
            ticker_str = str(ticker).strip()
            if not ticker_str:
                continue
            try:
                name = krx.get_market_ticker_name(ticker_str)
            except Exception:
                name = ""
            rows.append(
                {
                    "symbol": f"{ticker_str}{suffix}",
                    "name": name,
                    "market": "KR",
                    "sector": None,
                    "industry": None,
                }
            )

    count = _batch_upsert("ticker_universe", rows, on_conflict="symbol")
    _logger.info("ticker_universe KR upsert 완료: %d건", count)
    return count


def collect_ticker_universe_us() -> int:
    """SEC EDGAR company_tickers.json으로 미국 전체 티커 수집 -> ticker_universe upsert.

    Returns: upserted row count
    """
    try:
        import httpx
    except ImportError as exc:
        raise ImportError("httpx 패키지가 필요함: pip install httpx") from exc

    url = "https://www.sec.gov/files/company_tickers.json"
    headers = {"User-Agent": "AntGravity contact@example.com"}

    try:
        resp = httpx.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        _logger.exception("SEC EDGAR 티커 목록 다운로드 실패")
        return 0

    rows: list[dict] = []
    for entry in data.values():
        ticker = str(entry.get("ticker", "")).strip()
        # 알파벳만, 길이 1~5
        if not ticker or len(ticker) > 5 or not ticker.isalpha():
            continue
        rows.append(
            {
                "symbol": ticker,
                "name": str(entry.get("title", "")).strip(),
                "market": "US",
                "sector": None,
                "industry": None,
            }
        )

    count = _batch_upsert("ticker_universe", rows, on_conflict="symbol")
    _logger.info("ticker_universe US upsert 완료: %d건", count)
    return count


def collect_kr_snapshot(date_str: str | None = None) -> int:
    """PyKRX 벌크 API로 KOSPI + KOSDAQ 전체 OHLCV + 재무지표 수집 -> market_snapshot upsert.

    Args:
        date_str: "YYYYMMDD" 형식. None이면 최근 영업일.
    Returns: upserted row count
    """
    try:
        from pykrx import stock as krx
    except ImportError as exc:
        raise ImportError("pykrx 패키지가 필요함: pip install pykrx") from exc

    try:
        target_date = date_str or krx.get_nearest_business_day_in_a_week()
    except Exception:
        _logger.exception("최근 영업일 조회 실패")
        return 0

    rows: list[dict] = []
    snapshot_date = (
        f"{target_date[:4]}-{target_date[4:6]}-{target_date[6:8]}"
    )

    for market_code, suffix in (("KOSPI", ".KS"), ("KOSDAQ", ".KQ")):
        try:
            ohlcv = krx.get_market_ohlcv_by_ticker(target_date, market=market_code)
            fund = krx.get_market_fundamental_by_ticker(target_date, market=market_code)
        except Exception:
            _logger.exception("pykrx %s 데이터 조회 실패 (date=%s)", market_code, target_date)
            continue

        if ohlcv.empty:
            continue

        # fund가 비어있으면 빈 DataFrame으로 join 처리
        merged = ohlcv.join(fund, how="left") if not fund.empty else ohlcv

        for ticker_code, row in merged.iterrows():
            ticker_str = str(ticker_code).strip()
            close_val = float(row.get("종가", 0))
            if close_val <= 0:
                continue

            open_val = float(row.get("시가", 0))
            high_val = float(row.get("고가", 0))
            low_val = float(row.get("저가", 0))
            volume_val = int(row.get("거래량", 0))
            market_cap = int(row.get("시가총액", 0)) if "시가총액" in row.index else None
            per_val = float(row.get("PER", 0)) if "PER" in row.index else None
            pbr_val = float(row.get("PBR", 0)) if "PBR" in row.index else None

            rows.append(
                {
                    "symbol": f"{ticker_str}{suffix}",
                    "snapshot_date": snapshot_date,
                    "open": open_val,
                    "high": high_val,
                    "low": low_val,
                    "close": close_val,
                    "volume": volume_val,
                    "market_cap": market_cap,
                    "per": per_val,
                    "pbr": pbr_val,
                    "change_pct": None,
                }
            )

    count = _batch_upsert("market_snapshot", rows, on_conflict="symbol,snapshot_date")
    _logger.info("market_snapshot KR upsert 완료: %d건 (date=%s)", count, target_date)
    return count


def collect_us_snapshot() -> int:
    """yfinance.download 배치로 미국 전체 종목 가격 수집 -> market_snapshot upsert.

    ticker_universe에서 US 종목 로드 후 1,000개씩 배치 처리.
    Returns: upserted row count
    """
    client = get_supabase()

    try:
        res = client.table("ticker_universe").select("symbol").eq("market", "US").execute()
        symbols = [r["symbol"] for r in (res.data or [])]
    except Exception:
        _logger.exception("ticker_universe US 종목 조회 실패")
        return 0

    if not symbols:
        _logger.info("ticker_universe에 US 종목 없음. 건너뜀.")
        return 0

    today_str = date.today().isoformat()
    all_rows: list[dict] = []

    for i in range(0, len(symbols), _YF_BATCH_SIZE):
        batch = symbols[i : i + _YF_BATCH_SIZE]
        tickers_str = " ".join(batch)
        try:
            df = yf.download(
                tickers=tickers_str,
                period="2d",
                interval="1d",
                threads=True,
                progress=False,
            )
        except Exception:
            _logger.exception("yfinance download 실패: batch offset=%d", i)
            continue

        if df.empty:
            continue

        # yfinance multi-ticker: MultiIndex columns (Price, Ticker)
        # single ticker: flat columns
        is_multi = isinstance(df.columns, pd.MultiIndex)

        for sym in batch:
            try:
                if is_multi:
                    close_series = df[("Close", sym)]
                else:
                    # 단일 티커일 때
                    if len(batch) == 1:
                        close_series = df["Close"]
                    else:
                        continue

                close_series = close_series.dropna()
                if close_series.empty:
                    continue

                close_val = float(close_series.iloc[-1])
                if close_val <= 0:
                    continue

                change_pct = None
                if len(close_series) >= 2:
                    prev = float(close_series.iloc[-2])
                    if prev > 0:
                        change_pct = round((close_val - prev) / prev * 100, 2)

                open_val = None
                high_val = None
                low_val = None
                vol_val = None

                if is_multi:
                    open_s = df[("Open", sym)].dropna()
                    high_s = df[("High", sym)].dropna()
                    low_s = df[("Low", sym)].dropna()
                    vol_s = df[("Volume", sym)].dropna()
                else:
                    open_s = df["Open"].dropna()
                    high_s = df["High"].dropna()
                    low_s = df["Low"].dropna()
                    vol_s = df["Volume"].dropna()

                if not open_s.empty:
                    open_val = float(open_s.iloc[-1])
                if not high_s.empty:
                    high_val = float(high_s.iloc[-1])
                if not low_s.empty:
                    low_val = float(low_s.iloc[-1])
                if not vol_s.empty:
                    vol_val = int(vol_s.iloc[-1])

                all_rows.append(
                    {
                        "symbol": sym,
                        "snapshot_date": today_str,
                        "open": open_val,
                        "high": high_val,
                        "low": low_val,
                        "close": close_val,
                        "volume": vol_val,
                        "market_cap": None,  # yfinance.download은 시총 미제공 -- ticker_universe 또는 별도 수집 필요
                        "per": None,
                        "pbr": None,
                        "change_pct": change_pct,
                    }
                )
            except Exception:
                _logger.debug("US snapshot 개별 종목 처리 실패: %s", sym)
                continue

    count = _batch_upsert("market_snapshot", all_rows, on_conflict="symbol,snapshot_date")
    _logger.info("market_snapshot US upsert 완료: %d건", count)
    return count


def _cleanup_old_snapshots(keep_days: int = 3) -> None:
    """snapshot_date가 keep_days일 이전인 행 삭제."""
    cutoff = (date.today() - timedelta(days=keep_days)).isoformat()
    client = get_supabase()
    try:
        client.table("market_snapshot").delete().lt("snapshot_date", cutoff).execute()
        _logger.info("market_snapshot 정리 완료: %s 이전 데이터 삭제", cutoff)
    except Exception:
        _logger.exception("market_snapshot 정리 실패")
