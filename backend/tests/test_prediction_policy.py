from services.prediction_service import resolve_prediction_mode


def test_cached_prediction_wins_in_production():
    assert resolve_prediction_mode("production", has_cached_prediction=True) == "cached"


def test_production_miss_uses_fallback():
    assert resolve_prediction_mode("production", has_cached_prediction=False) == "fallback"


def test_development_miss_keeps_runtime_compute():
    assert resolve_prediction_mode("development", has_cached_prediction=False) == "runtime"
