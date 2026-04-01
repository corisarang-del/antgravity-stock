from services import fundamentals_service, news_service, market_diary_service


def test_public_fundamentals_falls_back_to_stale_cache(monkeypatch):
    monkeypatch.setattr(fundamentals_service._FUND_CACHE, "get", lambda symbol: None)
    monkeypatch.setattr(
        fundamentals_service.db_cache,
        "read_fundamentals_entry",
        lambda symbol: {
            "data": {"symbol": symbol, "source": "cache"},
            "fetched_at": "2026-03-30T00:00:00+00:00",
            "is_fresh": False,
        },
    )

    def _raise():
        raise RuntimeError("upstream unavailable")

    monkeypatch.setattr(fundamentals_service, "fetch_and_cache_fundamentals", lambda symbol: _raise())

    payload = fundamentals_service.get_public_fundamentals("NVDA")
    assert payload["cache_status"] == "stale"
    assert payload["symbol"] == "NVDA"


def test_public_fundamentals_short_circuits_slow_refresh(monkeypatch):
    monkeypatch.setattr(fundamentals_service._FUND_CACHE, "get", lambda symbol: None)
    monkeypatch.setattr(
        fundamentals_service.db_cache,
        "read_fundamentals_entry",
        lambda symbol: {
            "data": {"symbol": symbol, "source": "cache", "trailing_pe": None, "price_to_book": None, "peg_ratio": None},
            "fetched_at": "2026-03-30T00:00:00+00:00",
            "is_fresh": False,
        },
    )
    monkeypatch.setattr(fundamentals_service, "run_with_timeout", lambda name, fn, timeout_seconds, fallback: None)

    payload = fundamentals_service.get_public_fundamentals("005930.KS")
    assert payload["cache_status"] == "stale"
    assert payload["symbol"] == "005930.KS"


def test_public_fundamentals_returns_miss_when_cache_entry_absent(monkeypatch):
    monkeypatch.setattr(fundamentals_service._FUND_CACHE, "get", lambda symbol: None)
    monkeypatch.setattr(fundamentals_service.db_cache, "read_fundamentals_entry", lambda symbol: None)

    payload = fundamentals_service.get_public_fundamentals("005930.KS")

    assert payload["cache_status"] == "miss"
    assert payload["symbol"] == "005930.KS"
    assert payload["source"] == "cache-miss"


def test_news_feed_uses_stale_persistent_cache_when_fetch_fails(monkeypatch):
    monkeypatch.setattr(news_service.NEWS_RUNTIME_CACHE, "get", lambda symbol: None)
    monkeypatch.setattr(
        news_service,
        "read_cache_entry",
        lambda table, key_column, key, ttl_seconds: {
            "data": [
                {
                    "id": "cached-1",
                    "title": "cached",
                    "summary": "cached",
                    "source": "cache",
                    "published_at": "2026-03-30T00:00:00+00:00",
                    "url": "https://example.com",
                    "kind": "article",
                    "sentiment": "neutral",
                }
            ],
            "fetched_at": "2026-03-30T00:00:00+00:00",
            "is_fresh": False,
        },
    )
    monkeypatch.setattr(news_service, "_fetch_google_news", lambda symbol: [])
    monkeypatch.setattr(news_service, "_fetch_yfinance_news", lambda symbol: [])
    monkeypatch.setattr(news_service, "_fetch_kr_disclosures", lambda symbol: [])

    payload = news_service.get_stock_news_feed("NVDA")
    assert payload["cache_status"] == "stale"
    assert len(payload["items"]) == 1


def test_market_diary_uses_cached_payload(monkeypatch):
    monkeypatch.setattr(
        market_diary_service,
        "read_cache_entry",
        lambda table, key_column, key, ttl_seconds: {
            "data": {
                "fear_greed": {"score": 61, "label": "탐욕", "prev": 58},
                "market_temperature": {"score": 68, "label": "과열 주의"},
                "symbol_sentiments": [],
                "diary_entries": [],
                "indices": [],
            },
            "fetched_at": "2026-03-30T00:00:00+00:00",
            "is_fresh": True,
        },
    )

    payload = market_diary_service.build_market_diary()
    assert payload["cache_status"] == "fresh"
    assert payload["fear_greed"]["score"] == 61
