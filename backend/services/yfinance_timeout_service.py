from __future__ import annotations

import logging
import os
import tempfile
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from typing import Callable, TypeVar

import yfinance as yf

T = TypeVar("T")

logger = logging.getLogger(__name__)
_CACHE_CONFIGURED = False


def ensure_yfinance_cache_configured() -> str:
    global _CACHE_CONFIGURED
    cache_root = os.environ.get("YFINANCE_CACHE_DIR") or os.path.join(
        tempfile.gettempdir(),
        "antgravity-stock",
        "yfinance-cache",
    )

    if _CACHE_CONFIGURED:
        return cache_root

    os.makedirs(cache_root, exist_ok=True)
    yf.set_tz_cache_location(cache_root)
    _CACHE_CONFIGURED = True
    return cache_root


def run_with_timeout(name: str, fn: Callable[[], T], timeout_seconds: float, fallback: T) -> T:
    ensure_yfinance_cache_configured()
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(fn)
        try:
            return future.result(timeout=timeout_seconds)
        except FuturesTimeoutError:
            future.cancel()
            logger.warning("[timeout] %s exceeded %.1fs", name, timeout_seconds)
            return fallback
        except Exception:
            logger.exception("[timeout] %s failed", name)
            return fallback
