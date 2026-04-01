from services import history_service


def test_public_history_returns_miss_when_cache_entry_absent(monkeypatch):
    monkeypatch.setattr(history_service._HISTORY_CACHE, "get", lambda symbol: None)
    monkeypatch.setattr(history_service.db_cache, "read_history_entry", lambda symbol: None)

    payload = history_service.get_public_financial_history("005930.KS")

    assert payload["cache_status"] == "miss"
    assert payload["symbol"] == "005930.KS"
    assert payload["annual"] == []
