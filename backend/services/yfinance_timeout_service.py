from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from typing import Callable, TypeVar


T = TypeVar("T")

logger = logging.getLogger(__name__)


def run_with_timeout(name: str, fn: Callable[[], T], timeout_seconds: float, fallback: T) -> T:
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
