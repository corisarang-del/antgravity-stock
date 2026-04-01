from pathlib import Path

from scripts import daily_refresh
from services import fundamentals_service, history_service, yfinance_timeout_service


def test_fetch_and_cache_fundamentals_uses_kr_path_without_corp_code_lookup(monkeypatch):
    monkeypatch.setattr(
        fundamentals_service,
        "_fetch_kr_fundamentals",
        lambda symbol: {"symbol": symbol, "source": "kr", "trailing_pe": 10.0},
    )
    monkeypatch.setattr(fundamentals_service, "_fetch_us_fundamentals", lambda symbol: {"symbol": symbol, "source": "us"})
    monkeypatch.setattr(fundamentals_service.db_cache, "write_fundamentals", lambda symbol, data: None)
    monkeypatch.setattr(fundamentals_service._FUND_CACHE, "set", lambda symbol, data: data)

    payload = fundamentals_service.fetch_and_cache_fundamentals("005930.KS")

    assert payload["source"] == "kr"


def test_fetch_and_cache_fundamentals_rejects_empty_payload(monkeypatch):
    monkeypatch.setattr(fundamentals_service, "_fetch_kr_fundamentals", lambda symbol: {"symbol": symbol, "source": "kr"})
    monkeypatch.setattr(fundamentals_service.db_cache, "write_fundamentals", lambda symbol, data: None)

    try:
        fundamentals_service.fetch_and_cache_fundamentals("005930.KS")
    except ValueError as exc:
        assert "empty" in str(exc)
    else:
        raise AssertionError("empty fundamentals payload should be rejected")


def test_fetch_and_cache_history_uses_kr_path_without_corp_code_lookup(monkeypatch):
    monkeypatch.setattr(history_service, "_fetch_kr_history", lambda symbol: {"symbol": symbol, "annual": [{"year": "2024"}]})
    monkeypatch.setattr(history_service, "_fetch_us_history", lambda symbol: {"symbol": symbol, "annual": []})
    monkeypatch.setattr(history_service.db_cache, "write_history", lambda symbol, data: None)
    monkeypatch.setattr(history_service._HISTORY_CACHE, "set", lambda symbol, data: data)

    payload = history_service.fetch_and_cache_history("005930.KS")

    assert payload["annual"] == [{"year": "2024"}]


def test_fetch_and_cache_history_rejects_empty_payload(monkeypatch):
    monkeypatch.setattr(history_service, "_fetch_kr_history", lambda symbol: {"symbol": symbol, "annual": []})
    monkeypatch.setattr(history_service.db_cache, "write_history", lambda symbol, data: None)

    try:
        history_service.fetch_and_cache_history("005930.KS")
    except ValueError as exc:
        assert "empty" in str(exc)
    else:
        raise AssertionError("empty history payload should be rejected")


def test_daily_refresh_single_symbol_uses_core_fallback_when_universe_unavailable(monkeypatch):
    monkeypatch.setattr(daily_refresh, "_get_all_symbols", lambda: {})
    monkeypatch.setattr(daily_refresh, "refresh_symbols_batch", lambda symbols, max_workers=20: (len(symbols), 0))

    captured: list[tuple[str, str]] = []

    def _capture(symbols, max_workers=20):
        captured.extend(symbols)
        return (len(symbols), 0)

    monkeypatch.setattr(daily_refresh, "refresh_symbols_batch", _capture)

    daily_refresh.main(symbols=["005930.KS"], parallel=True)

    assert captured == [("005930.KS", "삼성전자")]


def test_refresh_symbol_marks_empty_payload_as_failure(monkeypatch):
    monkeypatch.setattr(daily_refresh, "_fetch_fundamentals", lambda symbol: {"symbol": symbol})
    monkeypatch.setattr(daily_refresh, "_fetch_history", lambda symbol: {"symbol": symbol, "annual": []})
    monkeypatch.setattr(daily_refresh.db_cache, "write_fundamentals", lambda symbol, data: None)
    monkeypatch.setattr(daily_refresh.db_cache, "write_history", lambda symbol, data: None)

    fund_ok, hist_ok = daily_refresh.refresh_symbol("005930.KS", "삼성전자")

    assert fund_ok is False
    assert hist_ok is False


def test_yfinance_cache_configuration_uses_writable_temp_dir(monkeypatch):
    cache_dir = Path.cwd() / "output" / "test-yfinance-cache"
    cache_dir.mkdir(parents=True, exist_ok=True)

    monkeypatch.setenv("YFINANCE_CACHE_DIR", str(cache_dir))
    monkeypatch.setattr(yfinance_timeout_service, "_CACHE_CONFIGURED", False)

    configured_dir = yfinance_timeout_service.ensure_yfinance_cache_configured()

    assert configured_dir == str(cache_dir)
