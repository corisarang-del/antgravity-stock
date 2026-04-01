from routers import stocks


def test_normalize_ohlcv_rows_skips_non_finite_values():
    rows = [
        {
            "date": "2026-04-01",
            "open": 100,
            "high": 110,
            "low": 90,
            "close": 105,
            "volume": 1000,
        },
        {
            "date": "2026-04-02",
            "open": float("nan"),
            "high": 111,
            "low": 91,
            "close": 106,
            "volume": 1001,
        },
        {
            "date": "2026-04-03",
            "open": 102,
            "high": float("inf"),
            "low": 92,
            "close": 107,
            "volume": 1002,
        },
    ]

    normalized = stocks._normalize_ohlcv_rows(rows)

    assert normalized == [
        {
            "date": "2026-04-01",
            "open": 100.0,
            "high": 110.0,
            "low": 90.0,
            "close": 105.0,
            "volume": 1000,
        }
    ]
