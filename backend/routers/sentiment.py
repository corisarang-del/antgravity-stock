from __future__ import annotations

import re
import time
from collections import defaultdict
from datetime import datetime, timedelta

from google import genai
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from core.config import settings
from core.supabase_client import get_supabase

router = APIRouter()

try:
    _genai_client = genai.Client(api_key=settings.GEMINI_API_KEY) if settings.GEMINI_API_KEY else None
except Exception:
    _genai_client = None


# ── Rate Limiter (인메모리, per-IP, sliding window) ──────────────────────────
_rate_store: dict[str, list[float]] = defaultdict(list)
_RATE_LIMIT = 10   # 최대 요청 수
_RATE_WINDOW = 60  # 윈도우 (초)


def _check_rate_limit(ip: str) -> None:
    now = time.time()
    window_start = now - _RATE_WINDOW
    hits = _rate_store[ip] = [t for t in _rate_store[ip] if t > window_start]
    if len(hits) >= _RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"요청이 너무 많다. {_RATE_WINDOW}초 후 다시 시도해라.",
        )
    hits.append(now)


# ── Prompt Injection 방어 ─────────────────────────────────────────────────────
_INJECTION_PATTERN = re.compile(
    r"(ignore\s+previous|forget\s+instructions?|system\s*:|\[INST\]|<\|im_start\|>|you\s+are\s+now)",
    re.IGNORECASE,
)


def _sanitize_for_prompt(text: str) -> str:
    """사용자 생성 텍스트를 Gemini 프롬프트 삽입 전 정제."""
    sanitized = _INJECTION_PATTERN.sub("[removed]", text)
    return sanitized[:200]  # 길이 제한


POSITIVE_KEYWORDS = ["buy", "bull", "long", "surge", "breakout", "strong", "rebound"]
NEGATIVE_KEYWORDS = ["sell", "bear", "panic", "drop", "weak", "crash", "dump"]


def keyword_sentiment(text: str) -> dict:
    lowered = text.lower()
    positive = sum(1 for keyword in POSITIVE_KEYWORDS if keyword in lowered)
    negative = sum(1 for keyword in NEGATIVE_KEYWORDS if keyword in lowered)
    total = positive + negative or 1
    score = (positive - negative) / total
    label = "positive" if score > 0.1 else "negative" if score < -0.1 else "neutral"
    return {"score": round(score, 3), "label": label, "positive": positive, "negative": negative}


def resolve_market_temperature(score: float) -> str:
    if score >= 0.4:
        return "hot"
    if score >= 0.15:
        return "warm"
    if score <= -0.4:
        return "cold"
    if score <= -0.15:
        return "cool"
    return "neutral"


def build_history(avg_score: float) -> list[int]:
    base = max(8, min(92, round((avg_score + 1) * 50)))
    return [
        max(0, min(100, base - 9)),
        max(0, min(100, base - 4)),
        max(0, min(100, base + 2)),
        max(0, min(100, base - 3)),
        max(0, min(100, base)),
        max(0, min(100, base + 5)),
        max(0, min(100, base - 2)),
    ]


def build_investor_sentiment(avg_score: float, post_count: int) -> dict[str, int]:
    scale = max(post_count, 1)
    individual = int(round(avg_score * scale * 120))
    foreign = int(round(avg_score * scale * 80 * -1))
    institution = int(round(avg_score * scale * 55))
    return {
        "individual": individual,
        "foreign": foreign,
        "institution": institution,
    }


def fallback_summary(symbol: str, avg_score: float, post_count: int) -> str:
    if post_count == 0:
        return f"No recent posts were found for {symbol}. A neutral rule-based summary is shown."
    if avg_score > 0.1:
        return f"Positive signals are stronger than negative ones for {symbol}. Momentum traders are still in control."
    if avg_score < -0.1:
        return f"Negative signals dominate recent chatter for {symbol}. Defensive positioning is preferred."
    return f"Sentiment is balanced for {symbol}. Traders are waiting for a clearer directional trigger."


def normalize_cached_summary(symbol: str, payload: dict | None) -> dict | None:
    if not payload:
        return None

    avg_score = float(payload.get("avg_score", 0))
    post_count = int(payload.get("post_count", 0))
    label = payload.get("label", "neutral")
    if label not in {"positive", "neutral", "negative"}:
        label = "neutral"

    return {
        "symbol": symbol,
        "avg_score": round(avg_score, 3),
        "label": label,
        "summary": payload.get("summary") or fallback_summary(symbol, avg_score, post_count),
        "post_count": post_count,
        "positive_count": int(payload.get("positive_count", 0)),
        "neutral_count": int(payload.get("neutral_count", post_count)),
        "negative_count": int(payload.get("negative_count", 0)),
        "investor_sentiment": payload.get("investor_sentiment") or build_investor_sentiment(avg_score, post_count),
        "fear_greed_index": int(payload.get("fear_greed_index", max(0, min(100, round((avg_score + 1) * 50))))),
        "market_temperature": payload.get("market_temperature") or resolve_market_temperature(avg_score),
        "history": payload.get("history") or build_history(avg_score),
    }


def build_summary_payload(symbol: str, posts_data: list[dict], summary_text: str) -> dict:
    post_count = len(posts_data)
    avg_score = sum(float(post.get("sentiment_score", 0)) for post in posts_data) / max(post_count, 1)
    positive_count = sum(1 for post in posts_data if float(post.get("sentiment_score", 0)) > 0.1)
    negative_count = sum(1 for post in posts_data if float(post.get("sentiment_score", 0)) < -0.1)
    neutral_count = max(0, post_count - positive_count - negative_count)
    label = "positive" if avg_score > 0.1 else "negative" if avg_score < -0.1 else "neutral"

    return {
        "symbol": symbol,
        "avg_score": round(avg_score, 3),
        "label": label,
        "summary": summary_text,
        "post_count": post_count,
        "positive_count": positive_count,
        "neutral_count": neutral_count,
        "negative_count": negative_count,
        "investor_sentiment": build_investor_sentiment(avg_score, post_count),
        "fear_greed_index": max(0, min(100, round((avg_score + 1) * 50))),
        "market_temperature": resolve_market_temperature(avg_score),
        "history": build_history(avg_score),
    }


class PostSentimentRequest(BaseModel):
    text: str


@router.post("/post")
async def analyze_post(req: PostSentimentRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)
    return keyword_sentiment(req.text)


@router.get("/summary/{symbol}")
async def get_summary(symbol: str, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)

    try:
        supabase = get_supabase()
    except Exception:
        supabase = None

    cache_limit = datetime.utcnow() - timedelta(minutes=settings.SENTIMENT_CACHE_MINUTES)

    if supabase is not None:
        try:
            cached = (
                supabase.table("sentiment_cache")
                .select("*")
                .eq("symbol", symbol)
                .gte("created_at", cache_limit.isoformat())
                .limit(1)
                .execute()
            )
            normalized = normalize_cached_summary(symbol, cached.data[0] if cached.data else None)
            if normalized:
                return normalized
        except Exception:
            pass

    posts_data: list[dict] = []
    if supabase is not None:
        try:
            posts = (
                supabase.table("posts")
                .select("content,sentiment_score,sentiment_label")
                .eq("symbol", symbol)
                .order("created_at", desc=True)
                .limit(50)
                .execute()
            )
            posts_data = posts.data or []
        except Exception:
            posts_data = []

    if not posts_data:
        return build_summary_payload(symbol, [], fallback_summary(symbol, 0, 0))

    # Prompt Injection 방어: 각 포스트 내용을 정제 후 삽입
    sanitized_lines = [_sanitize_for_prompt(str(post.get("content", ""))) for post in posts_data[:10]]
    joined_text = "\n".join(sanitized_lines)

    if _genai_client:
        try:
            prompt = (
                f"Summarize recent market sentiment for {symbol} in 2 short sentences. "
                f"Focus on investor mood and risk tone.\n\n"
                f"--- Recent posts ---\n{joined_text}"
            )
            response = _genai_client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
            )
            summary_text = response.text.strip()
        except Exception:
            avg_score = sum(float(post.get("sentiment_score", 0)) for post in posts_data) / max(len(posts_data), 1)
            summary_text = fallback_summary(symbol, avg_score, len(posts_data))
    else:
        avg_score = sum(float(post.get("sentiment_score", 0)) for post in posts_data) / max(len(posts_data), 1)
        summary_text = fallback_summary(symbol, avg_score, len(posts_data))

    result = build_summary_payload(symbol, posts_data, summary_text)

    if supabase is not None:
        try:
            supabase.table("sentiment_cache").upsert(
                {**result, "created_at": datetime.utcnow().isoformat()},
                on_conflict="symbol",
            ).execute()
        except Exception:
            pass

    return result
