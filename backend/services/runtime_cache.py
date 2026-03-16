from __future__ import annotations

from dataclasses import dataclass
from threading import Lock
from time import time
from typing import Generic, TypeVar


T = TypeVar("T")


@dataclass
class CacheEntry(Generic[T]):
    value: T
    expires_at: float


class TtlCache(Generic[T]):
    def __init__(self, ttl_seconds: int) -> None:
        self.ttl_seconds = ttl_seconds
        self._entries: dict[str, CacheEntry[T]] = {}
        self._lock = Lock()

    def get(self, key: str) -> T | None:
        now = time()
        with self._lock:
            entry = self._entries.get(key)
            if entry is None:
                return None
            if entry.expires_at <= now:
                self._entries.pop(key, None)
                return None
            return entry.value

    def set(self, key: str, value: T) -> T:
        with self._lock:
            self._entries[key] = CacheEntry(
                value=value,
                expires_at=time() + self.ttl_seconds,
            )
        return value

    def delete(self, key: str) -> None:
        with self._lock:
            self._entries.pop(key, None)
