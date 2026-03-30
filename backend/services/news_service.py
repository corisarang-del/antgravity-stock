from __future__ import annotations

import io
import re
import zipfile
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from typing import Any
from urllib.parse import quote_plus
import xml.etree.ElementTree as ET

import httpx
import yfinance as yf

from core.config import settings
from data.pipeline import TICKERS
from services.content_cache_service import read_cache_entry, write_cache_entry
from services.runtime_cache import TtlCache

NEWS_CACHE_SECONDS = 30 * 60
NEWS_RUNTIME_CACHE = TtlCache[dict](ttl_seconds=NEWS_CACHE_SECONDS)
_TAG_RE = re.compile(r"<[^>]+>")
_SPACE_RE = re.compile(r"\s+")
_POSITIVE_KEYWORDS = ["buy", "bull", "surge", "strong", "beat", "rebound", "growth", "상승", "호재", "급등"]
_NEGATIVE_KEYWORDS = ["sell", "bear", "drop", "weak", "miss", "cut", "risk", "하락", "악재", "급락"]
_KR_DART_CORP_CODE_CACHE: dict[str, str] | None = None


def _strip_html(value: str | None) -> str:
    if not value:
        return ""
    cleaned = _TAG_RE.sub(" ", value)
    return _SPACE_RE.sub(" ", cleaned).strip()


def _normalize_datetime(value: str | None) -> str:
    if not value:
        return datetime.now(timezone.utc).isoformat()
    try:
        parsed = parsedate_to_datetime(value)
        return parsed.astimezone(timezone.utc).isoformat()
    except Exception:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc).isoformat()
        except Exception:
            return datetime.now(timezone.utc).isoformat()


def _score_sentiment(text: str) -> str:
    lowered = text.lower()
    positive = sum(1 for keyword in _POSITIVE_KEYWORDS if keyword in lowered)
    negative = sum(1 for keyword in _NEGATIVE_KEYWORDS if keyword in lowered)
    if positive > negative:
        return "positive"
    if negative > positive:
        return "negative"
    return "neutral"


def _dedupe_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[str, str]] = set()
    deduped: list[dict[str, Any]] = []
    for item in items:
        key = (item.get("url", ""), item.get("title", ""))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    deduped.sort(key=lambda item: item.get("published_at", ""), reverse=True)
    return deduped


def _google_news_query(symbol: str) -> str:
    meta = TICKERS.get(symbol, {"name": symbol, "market": "US"})
    code = symbol.replace(".KS", "")
    if meta["market"] == "KR":
        return f'"{meta["name"]}" 주식 when:7d'
    return f'"{meta["name"]}" OR "{code}" stock when:7d'


def _fetch_google_news(symbol: str) -> list[dict[str, Any]]:
    query = _google_news_query(symbol)
    url = (
        "https://news.google.com/rss/search?"
        f"q={quote_plus(query)}&hl=ko&gl=KR&ceid=KR:ko"
    )

    try:
        response = httpx.get(url, timeout=4.5)
        response.raise_for_status()
        root = ET.fromstring(response.text)
    except Exception:
        return []

    items: list[dict[str, Any]] = []
    for index, node in enumerate(root.findall(".//item")):
        title = _strip_html(node.findtext("title"))
        link = (node.findtext("link") or "").strip()
        description = _strip_html(node.findtext("description"))
        source = _strip_html(node.findtext("source")) or "Google News"
        published_at = _normalize_datetime(node.findtext("pubDate"))
        if not title or not link:
            continue
        sentiment = _score_sentiment(f"{title} {description}")
        items.append(
            {
                "id": f"google-{symbol}-{index}",
                "title": title,
                "summary": description or title,
                "source": source,
                "published_at": published_at,
                "url": link,
                "kind": "article",
                "sentiment": sentiment,
            }
        )
    return items


def _fetch_yfinance_news(symbol: str) -> list[dict[str, Any]]:
    try:
        articles = getattr(yf.Ticker(symbol), "news", None) or []
    except Exception:
        return []

    items: list[dict[str, Any]] = []
    for index, article in enumerate(articles[:5]):
        title = (article.get("title") or "").strip()
        summary = _strip_html(article.get("summary") or article.get("content") or "")
        link = (
            article.get("link")
            or article.get("canonicalUrl", {}).get("url")
            or article.get("clickThroughUrl", {}).get("url")
            or ""
        )
        provider = article.get("publisher") or article.get("providerPublishTime") or "Yahoo Finance"
        published = article.get("providerPublishTime")
        published_at = (
            datetime.fromtimestamp(published, tz=timezone.utc).isoformat()
            if isinstance(published, (int, float))
            else datetime.now(timezone.utc).isoformat()
        )
        if not title or not link:
            continue
        sentiment = _score_sentiment(f"{title} {summary}")
        items.append(
            {
                "id": f"yf-{symbol}-{index}",
                "title": title,
                "summary": summary or title,
                "source": str(provider),
                "published_at": published_at,
                "url": link,
                "kind": "article",
                "sentiment": sentiment,
            }
        )
    return items


def _get_kr_dart_corp_codes() -> dict[str, str]:
    global _KR_DART_CORP_CODE_CACHE
    if _KR_DART_CORP_CODE_CACHE is not None:
        return _KR_DART_CORP_CODE_CACHE

    _KR_DART_CORP_CODE_CACHE = {}
    if not settings.DART_API_KEY:
        return _KR_DART_CORP_CODE_CACHE

    try:
        response = httpx.get(
            "https://opendart.fss.or.kr/api/corpCode.xml",
            params={"crtfc_key": settings.DART_API_KEY},
            timeout=10,
        )
        response.raise_for_status()
        with zipfile.ZipFile(io.BytesIO(response.content)) as zipped:
            xml_bytes = zipped.read(zipped.namelist()[0])
        root = ET.fromstring(xml_bytes)
        for node in root.findall("list"):
            stock_code = (node.findtext("stock_code") or "").strip()
            corp_code = (node.findtext("corp_code") or "").strip()
            if stock_code and corp_code:
                _KR_DART_CORP_CODE_CACHE[f"{stock_code}.KS"] = corp_code
    except Exception:
        return _KR_DART_CORP_CODE_CACHE

    return _KR_DART_CORP_CODE_CACHE


def _fetch_kr_disclosures(symbol: str) -> list[dict[str, Any]]:
    corp_code = _get_kr_dart_corp_codes().get(symbol)
    if not corp_code or not settings.DART_API_KEY:
        return []

    today = datetime.now(timezone.utc)
    params = {
        "crtfc_key": settings.DART_API_KEY,
        "corp_code": corp_code,
        "bgn_de": (today - timedelta(days=14)).strftime("%Y%m%d"),
        "end_de": today.strftime("%Y%m%d"),
        "last_reprt_at": "Y",
        "page_count": 5,
    }

    try:
        response = httpx.get("https://opendart.fss.or.kr/api/list.json", params=params, timeout=5)
        response.raise_for_status()
        payload = response.json()
    except Exception:
        return []

    if payload.get("status") != "000":
        return []

    items: list[dict[str, Any]] = []
    for index, disclosure in enumerate(payload.get("list", [])[:5]):
        report_name = (disclosure.get("report_nm") or "").strip()
        receipt_no = (disclosure.get("rcept_no") or "").strip()
        receipt_date = (disclosure.get("rcept_dt") or "").strip()
        if not report_name or not receipt_no:
            continue
        published_at = _normalize_datetime(
            f"{receipt_date[:4]}-{receipt_date[4:6]}-{receipt_date[6:8]}T00:00:00+09:00"
            if len(receipt_date) == 8
            else None
        )
        summary = f"{TICKERS.get(symbol, {}).get('name', symbol)} 관련 공시: {report_name}"
        items.append(
            {
                "id": f"dart-{symbol}-{index}",
                "title": report_name,
                "summary": summary,
                "source": "DART",
                "published_at": published_at,
                "url": f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={receipt_no}",
                "kind": "disclosure",
                "sentiment": _score_sentiment(f"{report_name} {summary}"),
            }
        )
    return items


def get_stock_news_feed(symbol: str) -> dict[str, Any]:
    runtime_cached = NEWS_RUNTIME_CACHE.get(symbol)
    if runtime_cached is not None:
        return {"items": runtime_cached, "cache_status": "fresh", "fetched_at": None}

    persistent_cached = read_cache_entry("news_cache", "symbol", symbol, NEWS_CACHE_SECONDS)
    if persistent_cached and persistent_cached["is_fresh"]:
        NEWS_RUNTIME_CACHE.set(symbol, persistent_cached["data"])
        return {
            "items": persistent_cached["data"],
            "cache_status": "fresh",
            "fetched_at": persistent_cached["fetched_at"],
        }

    items = _fetch_google_news(symbol)
    if TICKERS.get(symbol, {}).get("market") == "US" and len(items) < 5:
        items.extend(_fetch_yfinance_news(symbol))
    if TICKERS.get(symbol, {}).get("market") == "KR" and len(items) < 5:
        items.extend(_fetch_kr_disclosures(symbol))

    normalized = _dedupe_items(items)[:8]
    if normalized:
        write_cache_entry("news_cache", "symbol", symbol, normalized)
        NEWS_RUNTIME_CACHE.set(symbol, normalized)
        return {"items": normalized, "cache_status": "fresh", "fetched_at": None}

    if persistent_cached:
        return {
            "items": persistent_cached["data"],
            "cache_status": "stale",
            "fetched_at": persistent_cached["fetched_at"],
        }

    return {"items": [], "cache_status": "miss", "fetched_at": None}
