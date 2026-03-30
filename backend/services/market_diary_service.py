from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Any

import yfinance as yf

from core.config import settings
from data.pipeline import MARKET_TICKER_SYMBOLS, TICKERS
from services.content_cache_service import read_cache_entry, write_cache_entry
from services.news_service import get_stock_news_feed

try:
    from google import genai

    _genai_client = genai.Client(api_key=settings.GEMINI_API_KEY) if settings.GEMINI_API_KEY else None
except Exception:
    _genai_client = None

DIARY_CACHE_SECONDS = settings.DIARY_CACHE_HOURS * 60 * 60
DIARY_SYMBOLS = ["NVDA", "AAPL", "TSLA", "MSFT", "005930.KS", "000660.KS"]
DIARY_INDEX_SYMBOLS = ["^GSPC", "^IXIC", "^KS11"]


def _label_from_score(score: int) -> str:
    if score >= 75:
        return "극탐욕"
    if score >= 55:
        return "탐욕"
    if score >= 45:
        return "중립"
    if score >= 25:
        return "공포"
    return "극공포"


def _temperature_label(score: int) -> str:
    if score >= 70:
        return "과열 주의"
    if score >= 56:
        return "상승 가속"
    if score >= 44:
        return "중립"
    if score >= 30:
        return "냉각"
    return "급격한 냉각"


def _mood_from_avg(avg_score: float) -> str:
    if avg_score > 0.12:
        return "bullish"
    if avg_score < -0.12:
        return "bearish"
    return "neutral"


def _score_from_label(label: str) -> float:
    if label == "positive":
        return 1.0
    if label == "negative":
        return -1.0
    return 0.0


def _fetch_index_change(symbol: str) -> float:
    try:
        frame = yf.Ticker(symbol).history(period="5d", auto_adjust=True)
    except Exception:
        return 0.0
    if frame.empty or len(frame) < 2:
        return 0.0
    latest = float(frame["Close"].iloc[-1])
    previous = float(frame["Close"].iloc[-2])
    if previous == 0:
        return 0.0
    return round((latest - previous) / previous * 100, 2)


def _summarize_with_gemini(title: str, lines: list[str]) -> str | None:
    if not _genai_client or not lines:
        return None
    try:
        response = _genai_client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=(
                f"{title}에 대해 아래 기사 헤드라인을 2문장 한국어 요약으로 정리해라.\n"
                + "\n".join(f"- {line}" for line in lines[:5])
            ),
        )
        text = (response.text or "").strip()
        return text or None
    except Exception:
        return None


def _build_entry(title: str, mood: str, lines: list[str], fallback_body: str, tags: list[str]) -> dict[str, Any]:
    return {
        "id": f"{mood}-{abs(hash(title)) % 100000}",
        "date": datetime.now(timezone.utc).date().isoformat(),
        "mood": mood,
        "title": title,
        "body": _summarize_with_gemini(title, lines) or fallback_body,
        "tags": tags,
    }


def _build_diary_entries(symbol_sentiments: list[dict[str, Any]], index_bias: float) -> list[dict[str, Any]]:
    if not symbol_sentiments:
        return []

    strongest = max(symbol_sentiments, key=lambda item: item["avg_score"])
    weakest = min(symbol_sentiments, key=lambda item: item["avg_score"])
    market_avg = sum(item["avg_score"] for item in symbol_sentiments) / len(symbol_sentiments)
    market_mood = _mood_from_avg(market_avg)

    return [
        _build_entry(
            title=f"{strongest['name']} 강세 심리 우위",
            mood="bullish",
            lines=strongest["headlines"],
            fallback_body=(
                f"{strongest['name']} 관련 실기사 기준으로 긍정 심리가 우세하다. "
                f"기사 {strongest['posts']}건이 반영됐고 일간 흐름은 {strongest['change']}% 수준이다."
            ),
            tags=[strongest["symbol"], "실시간", "강세"],
        ),
        _build_entry(
            title=f"{weakest['name']} 약세 경계 필요",
            mood="bearish",
            lines=weakest["headlines"],
            fallback_body=(
                f"{weakest['name']} 쪽은 부정 심리가 상대적으로 강하다. "
                f"단기 기사 흐름과 가격 변동을 같이 보면 보수적으로 접근하는 편이 낫다."
            ),
            tags=[weakest["symbol"], "리스크", "약세"],
        ),
        _build_entry(
            title="시장 전체 심리 요약",
            mood=market_mood,
            lines=[headline for item in symbol_sentiments for headline in item["headlines"][:1]],
            fallback_body=(
                f"핵심 종목 뉴스와 주요 지수 변화를 합치면 오늘 시장 온도는 {_temperature_label(round(50 + index_bias * 4))} 쪽이다. "
                f"심리 평균은 {market_avg:.2f}이고, 과도한 추격보다 확인 매매가 유리하다."
            ),
            tags=["시장", "지수", "요약"],
        ),
    ]


def _build_symbol_sentiment(symbol: str) -> dict[str, Any]:
    feed = get_stock_news_feed(symbol)
    items = feed["items"]
    article_items = [item for item in items if item["kind"] == "article"]
    disclosure_items = [item for item in items if item["kind"] == "disclosure"]
    effective_items = article_items or disclosure_items
    article_count = len(effective_items)

    positive = sum(1 for item in effective_items if item["sentiment"] == "positive")
    negative = sum(1 for item in effective_items if item["sentiment"] == "negative")
    neutral = max(0, article_count - positive - negative)
    bullish = round((positive / article_count) * 100) if article_count else 0
    bearish = round((negative / article_count) * 100) if article_count else 0
    neutral_pct = max(0, 100 - bullish - bearish) if article_count else 100
    avg_score = (
        sum(_score_from_label(item["sentiment"]) for item in effective_items) / article_count
        if article_count
        else 0.0
    )
    change = _fetch_index_change(symbol)
    display_symbol = symbol.replace(".KS", "")

    return {
        "symbol": display_symbol,
        "name": TICKERS.get(symbol, {}).get("name", symbol),
        "bullish": bullish,
        "bearish": bearish,
        "neutral": neutral_pct,
        "posts": article_count,
        "change": round(change),
        "avg_score": avg_score,
        "headlines": [item["title"] for item in effective_items[:5]],
        "cache_status": feed["cache_status"],
    }


def build_market_diary() -> dict[str, Any]:
    cached = read_cache_entry("market_diary_cache", "cache_key", "default", DIARY_CACHE_SECONDS)
    if cached and cached["is_fresh"]:
        return {**cached["data"], "cache_status": "fresh", "fetched_at": cached["fetched_at"]}

    with ThreadPoolExecutor(max_workers=4) as executor:
        symbol_sentiments = list(executor.map(_build_symbol_sentiment, DIARY_SYMBOLS))

    total_weight = sum(max(item["posts"], 1) for item in symbol_sentiments) or 1
    weighted_score = sum(item["avg_score"] * max(item["posts"], 1) for item in symbol_sentiments) / total_weight
    fear_greed_score = max(0, min(100, round((weighted_score + 1) * 50)))

    index_changes = [_fetch_index_change(symbol) for symbol in DIARY_INDEX_SYMBOLS]
    avg_index_change = sum(index_changes) / max(len(index_changes), 1)
    market_temp_score = max(0, min(100, round(fear_greed_score + avg_index_change * 4)))

    payload = {
        "fear_greed": {
            "score": fear_greed_score,
            "label": _label_from_score(fear_greed_score),
            "prev": max(0, min(100, fear_greed_score - round(avg_index_change))),
        },
        "market_temperature": {
            "score": market_temp_score,
            "label": _temperature_label(market_temp_score),
        },
        "symbol_sentiments": symbol_sentiments,
        "diary_entries": _build_diary_entries(symbol_sentiments, avg_index_change),
        "indices": [
            {
                "symbol": symbol,
                "name": MARKET_TICKER_SYMBOLS.get(symbol, {}).get("name", symbol),
                "change_pct": change,
            }
            for symbol, change in zip(DIARY_INDEX_SYMBOLS, index_changes)
        ],
    }

    write_cache_entry("market_diary_cache", "cache_key", "default", payload)
    return {**payload, "cache_status": "fresh", "fetched_at": None}
