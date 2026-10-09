from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import Request

from app.core.config import settings
from app.core.exceptions import RateLimitError


class SlidingWindowLimiter:
    """Minimal in-memory sliding window limiter (per instance / process).

    Suitable for a single-process deployment. For multi-process production use a
    shared store (e.g. Redis) - see README "Scaling" section.
    """

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, key: str, limit: int, window_seconds: int = 60) -> None:
        now = time.monotonic()
        with self._lock:
            bucket = self._hits[key]
            cutoff = now - window_seconds
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()
            if len(bucket) >= limit:
                raise RateLimitError()
            bucket.append(now)


limiter = SlidingWindowLimiter()


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(request: Request, bucket: str, limit: int) -> None:
    if settings.environment == "test":
        return
    limiter.check(f"{bucket}:{client_ip(request)}", limit=limit)
