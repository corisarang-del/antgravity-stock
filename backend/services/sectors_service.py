"""섹터 히트맵 서비스

- Supabase market_snapshot + ticker_universe 기반 (~610개 종목)
- KR 종목 섹터: KRX API (_fetch_krx_sector)
- US 종목 섹터: yfinance info (ThreadPoolExecutor 병렬)
- 4시간 TTL 캐시
- Supabase 실패 시 기존 TICKERS 14개 폴백
"""
from __future__ import annotations

import logging
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

import httpx
import yfinance as yf

from core.supabase_client import get_supabase
from data.pipeline import TICKERS
from services.financials_cache_service import read_all_fundamentals
from services.runtime_cache import TtlCache

logger = logging.getLogger(__name__)

_SECTOR_CACHE: TtlCache[dict] = TtlCache(ttl_seconds=14400)  # 4시간

# KRX 종목코드 (숫자 6자리) -> 업종 캐시
_KRX_SECTOR_CACHE: dict[str, str] = {}

# 프로세스 내 영구 캐시 (재시작 전까지 유지)
_SYMBOL_SECTOR_CACHE: dict[str, str] = {}
_SYMBOL_MKTCAP_CACHE: dict[str, int] = {}

# 폴백용 KR 심볼 -> 종목코드 매핑
_KR_SYMBOLS_CODE: dict[str, str] = {
    "005930.KS": "005930",
    "000660.KS": "000660",
    "005380.KS": "005380",
    "012330.KS": "012330",
    "267270.KS": "267270",
}


def _fetch_krx_sector(code: str) -> str:
    """KRX API로 업종 조회"""
    if code in _KRX_SECTOR_CACHE:
        return _KRX_SECTOR_CACHE[code]

    isin = f"KR7{code}003"
    try:
        resp = httpx.post(
            "http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd",
            data={"bld": "dbms/MDC/STAT/standard/MDCSTAT03901", "isuCd": isin},
            timeout=5.0,
        )
        resp.raise_for_status()
        items = resp.json().get("output", [])
        if items:
            sector = items[0].get("IDX_NM", "기타")
            _KRX_SECTOR_CACHE[code] = sector
            return sector
    except Exception:
        pass

    return "기타"


def _extract_kr_code(symbol: str) -> str:
    """005930.KS -> 005930"""
    m = re.match(r"^(\d{6})\.", symbol)
    return m.group(1) if m else ""


def _fetch_yf_sector(symbol: str) -> str:
    """yfinance로 US 종목 섹터 조회 (단일 호출)"""
    try:
        info = yf.Ticker(symbol).info
        sector = info.get("sector") or "Other"
        mktcap = info.get("marketCap")
        if mktcap and symbol not in _SYMBOL_MKTCAP_CACHE:
            _SYMBOL_MKTCAP_CACHE[symbol] = int(mktcap)
        return sector
    except Exception:
        return "Other"


def _resolve_sectors_bulk(
    missing_us: list[str],
    missing_kr: list[str],
) -> None:
    """섹터 미확인 종목들을 병렬로 일괄 조회 후 _SYMBOL_SECTOR_CACHE에 저장"""
    # US: ThreadPoolExecutor 병렬
    if missing_us:
        with ThreadPoolExecutor(max_workers=20) as pool:
            futures = {pool.submit(_fetch_yf_sector, sym): sym for sym in missing_us}
            for fut in as_completed(futures):
                sym = futures[fut]
                try:
                    sector = fut.result()
                except Exception:
                    sector = "Other"
                _SYMBOL_SECTOR_CACHE[sym] = sector

    # KR: KRX API (rate limit 고려, 순차)
    for sym in missing_kr:
        code = _extract_kr_code(sym)
        if code:
            sector = _fetch_krx_sector(code)
        else:
            sector = "기타"
        _SYMBOL_SECTOR_CACHE[sym] = sector


def _load_from_supabase() -> list[dict] | None:
    """Supabase에서 최신 snapshot + ticker_universe 조인 데이터 로드.

    반환: [{symbol, name, market, sector, change_pct, market_cap}, ...] 또는 None(실패)
    """
    try:
        client = get_supabase()

        # 최신 snapshot_date 조회
        date_res = (
            client.table("market_snapshot")
            .select("snapshot_date")
            .order("snapshot_date", desc=True)
            .limit(1)
            .execute()
        )
        if not date_res.data:
            logger.warning("market_snapshot에 데이터 없음")
            return None
        latest_date = date_res.data[0]["snapshot_date"]

        # 최신 날짜의 snapshot 전체 로드 (페이지네이션)
        snapshots: list[dict] = []
        page_size = 1000
        offset = 0
        while True:
            res = (
                client.table("market_snapshot")
                .select("symbol, market, change_pct, market_cap")
                .eq("snapshot_date", latest_date)
                .range(offset, offset + page_size - 1)
                .execute()
            )
            batch = res.data or []
            snapshots.extend(batch)
            if len(batch) < page_size:
                break
            offset += page_size

        if not snapshots:
            return None

        # ticker_universe에서 name, sector 로드
        symbols = [s["symbol"] for s in snapshots]
        universe_map: dict[str, dict] = {}

        # 1000개씩 나눠서 조회
        for i in range(0, len(symbols), 1000):
            chunk = symbols[i : i + 1000]
            uni_res = (
                client.table("ticker_universe")
                .select("symbol, name, sector")
                .in_("symbol", chunk)
                .execute()
            )
            for row in (uni_res.data or []):
                universe_map[row["symbol"]] = row

        # 결합
        result: list[dict] = []
        for snap in snapshots:
            sym = snap["symbol"]
            uni = universe_map.get(sym, {})
            result.append({
                "symbol": sym,
                "name": uni.get("name") or sym,
                "market": snap.get("market") or "US",
                "sector": uni.get("sector"),
                "change_pct": snap.get("change_pct") or 0.0,
                "market_cap": snap.get("market_cap") or 0,
            })

        logger.info(
            "Supabase 로드 완료: %d개 종목 (snapshot_date=%s)",
            len(result),
            latest_date,
        )
        return result

    except Exception:
        logger.exception("Supabase 섹터 데이터 로드 실패 -- 폴백 사용")
        return None


def _get_all_change_pcts(symbols: list[str]) -> dict[str, float]:
    """폴백용: 모든 종목의 당일 등락률을 한 번의 yf.download로 일괄 계산"""
    if not symbols:
        return {}

    result: dict[str, float] = {s: 0.0 for s in symbols}

    try:
        df = yf.download(symbols, period="2d", threads=True, progress=False)
    except Exception:
        logger.warning("yf.download 일괄 호출 실패, 모든 종목 change_pct=0.0 처리")
        return result

    if df.empty:
        return result

    for symbol in symbols:
        try:
            if len(symbols) == 1:
                close_series = df["Close"]
            else:
                if symbol not in df["Close"].columns:
                    continue
                close_series = df["Close"][symbol]

            close_series = close_series.dropna()
            if len(close_series) >= 2:
                prev = float(close_series.iloc[-2])
                curr = float(close_series.iloc[-1])
                if prev > 0:
                    result[symbol] = round((curr - prev) / prev * 100, 2)
        except Exception:
            pass

    return result


def _build_from_fallback() -> dict[str, Any]:
    """기존 TICKERS 14개 기반 폴백 로직"""
    target_symbols = [
        symbol for symbol, meta in TICKERS.items()
        if meta["market"] != "INDEX"
    ]

    change_pcts = _get_all_change_pcts(target_symbols)
    sector_map: dict[str, list[dict]] = {}

    for symbol in target_symbols:
        meta = TICKERS[symbol]

        if meta["market"] == "KR":
            code = _KR_SYMBOLS_CODE.get(symbol, "")
            sector_name = _fetch_krx_sector(code) if code else "기타"
        else:
            try:
                info = yf.Ticker(symbol).info
                sector_name = info.get("sector") or "Other"
            except Exception:
                sector_name = "Other"

        try:
            f = get_fundamentals(symbol)
            mktcap = f.get("market_cap") or 0
            score_total = (f.get("score") or {}).get("total", 0)
        except Exception:
            mktcap = 0
            score_total = 0

        change_pct = change_pcts.get(symbol, 0.0)
        ai_signal = (
            "BUY" if score_total >= 65
            else ("HOLD" if score_total >= 45 else "WATCH")
        )

        stock_item = {
            "symbol": symbol,
            "name": meta["name"],
            "market": meta["market"],
            "market_cap": mktcap,
            "change_pct": change_pct,
            "ai_signal": ai_signal,
        }
        sector_map.setdefault(sector_name, []).append(stock_item)

    return _assemble_sectors(sector_map)


def _assemble_sectors(sector_map: dict[str, list[dict]]) -> dict[str, Any]:
    """sector_map -> 정렬된 sectors 응답 구성"""
    sectors = []
    for name, stocks in sector_map.items():
        total_mktcap = sum(s["market_cap"] for s in stocks)
        avg_change = (
            sum(s["change_pct"] for s in stocks) / len(stocks)
            if stocks else 0
        )
        sectors.append({
            "name": name,
            "stocks": stocks,
            "total_market_cap": total_mktcap,
            "avg_change_pct": round(avg_change, 2),
        })

    sectors.sort(key=lambda x: x["total_market_cap"], reverse=True)
    return {"sectors": sectors}


def get_sectors() -> dict[str, Any]:
    cached = _SECTOR_CACHE.get("__all__")
    if cached is not None:
        return cached

    # Supabase에서 로드 시도
    rows = _load_from_supabase()

    if rows is None:
        logger.warning("Supabase 로드 실패 -- TICKERS 폴백 사용")
        result = _build_from_fallback()
        return _SECTOR_CACHE.set("__all__", result)

    # 섹터 미확인 종목 분류
    missing_us: list[str] = []
    missing_kr: list[str] = []

    for row in rows:
        sym = row["symbol"]
        # 영구 캐시에 이미 있으면 스킵
        if sym in _SYMBOL_SECTOR_CACHE:
            continue
        # ticker_universe에 sector가 있으면 영구 캐시에 저장
        if row["sector"]:
            _SYMBOL_SECTOR_CACHE[sym] = row["sector"]
            continue
        # sector NULL -> 외부 API로 조회 필요
        if row["market"] == "KR":
            missing_kr.append(sym)
        else:
            missing_us.append(sym)

    if missing_us or missing_kr:
        logger.info(
            "섹터 미확인 종목 조회: US=%d, KR=%d",
            len(missing_us),
            len(missing_kr),
        )
        _resolve_sectors_bulk(missing_us, missing_kr)

    # market_cap 영구 캐시 갱신
    for row in rows:
        mktcap = row.get("market_cap") or 0
        if mktcap > 0:
            _SYMBOL_MKTCAP_CACHE[row["symbol"]] = mktcap

    # fundamentals 캐시 한 번에 로드 (610번 호출 → 1번 호출)
    all_fundamentals = read_all_fundamentals()

    # sector_map 구성
    sector_map: dict[str, list[dict]] = {}

    for row in rows:
        sym = row["symbol"]
        sector_name = _SYMBOL_SECTOR_CACHE.get(sym, "Other")
        mktcap = _SYMBOL_MKTCAP_CACHE.get(sym, row.get("market_cap") or 0)

        # AI signal: 캐시된 fundamentals에서 조회, 없으면 WATCH
        f = all_fundamentals.get(sym, {})
        score_total = (f.get("score") or {}).get("total", 0)

        ai_signal = (
            "BUY" if score_total >= 65
            else ("HOLD" if score_total >= 45 else "WATCH")
        )

        stock_item = {
            "symbol": sym,
            "name": row["name"],
            "market": row["market"],
            "market_cap": mktcap,
            "change_pct": row.get("change_pct") or 0.0,
            "ai_signal": ai_signal,
        }
        sector_map.setdefault(sector_name, []).append(stock_item)

    # 섹터 캐시를 DB에 일괄 저장 (비동기로 실행하지 않고 즉시 실행)
    _persist_sectors_to_db()

    result = _assemble_sectors(sector_map)
    return _SECTOR_CACHE.set("__all__", result)


def _persist_sectors_to_db() -> int:
    """_SYMBOL_SECTOR_CACHE의 섹터를 ticker_universe에 일괄 저장.

    Returns: 업데이트된 행 수
    """
    if not _SYMBOL_SECTOR_CACHE:
        return 0

    try:
        client = get_supabase()

        # 배치 업데이트 (100개씩)
        updated = 0
        batch_size = 100
        items = list(_SYMBOL_SECTOR_CACHE.items())

        for i in range(0, len(items), batch_size):
            batch = items[i:i + batch_size]
            for symbol, sector in batch:
                try:
                    client.table("ticker_universe").update({
                        "sector": sector,
                        "updated_at": "now()"
                    }).eq("symbol", symbol).execute()
                    updated += 1
                except Exception:
                    pass

        if updated > 0:
            logger.info(f"[sectors] DB에 섹터 {updated}개 업데이트 완료")

        return updated
    except Exception:
        logger.exception("[sectors] DB 섹터 업데이트 실패")
        return 0
