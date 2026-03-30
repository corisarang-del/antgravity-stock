from core.config import (
    should_enable_scheduler_by_default,
    should_enable_startup_warmup_by_default,
)


def test_production_defaults_disable_server_background_work():
    assert should_enable_startup_warmup_by_default("production") is False
    assert should_enable_scheduler_by_default("production") is False


def test_development_defaults_enable_server_background_work():
    assert should_enable_startup_warmup_by_default("development") is True
    assert should_enable_scheduler_by_default("development") is True
