from __future__ import annotations

from datetime import datetime

from repositories._store import STORE


class MarketFeedsRepository:
    def list_news(self, symbol: str) -> dict:
        if not symbol:
            return {"feed_status": "unavailable", "items": []}
        if STORE.news[symbol]:
            return {"feed_status": "ok", "items": STORE.news[symbol]}
        return {
            "feed_status": "degraded",
            "items": [
                {
                    "headline": f"{symbol} 관련 최신 뉴스",
                    "summary": "외부 피드 연결 전까지 보여주는 캐시 대체 데이터다.",
                    "source": "local-placeholder",
                    "published_at": datetime.utcnow().isoformat(),
                    "url": "https://example.com/news",
                }
            ],
        }

    def list_disclosures(self, symbol: str) -> dict:
        if not symbol:
            return {"feed_status": "unavailable", "items": []}
        if STORE.disclosures[symbol]:
            return {"feed_status": "ok", "items": STORE.disclosures[symbol]}
        return {
            "feed_status": "degraded",
            "items": [
                {
                    "disclosure_type": "earnings",
                    "title": f"{symbol} 주요 공시 placeholder",
                    "source": "local-placeholder",
                    "published_at": datetime.utcnow().isoformat(),
                    "url": "https://example.com/disclosure",
                }
            ],
        }
