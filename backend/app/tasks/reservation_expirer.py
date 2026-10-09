from __future__ import annotations

import threading
from typing import Optional

from app.core.config import settings
from app.db.session import session_scope
from app.services import seat_service
from app.utils.logging import logger


class ReservationExpirer:
    """Background worker that releases lapsed seat holds and expires bookings.

    In a multi-worker deployment this should be replaced by a shared scheduler
    (e.g. a single Celery beat task) - see README. Running one expirer per worker
    is still safe: the release is idempotent and guarded by a conditional UPDATE.
    """

    def __init__(self, interval_seconds: int = 60) -> None:
        self.interval_seconds = interval_seconds
        self._stop = threading.Event()
        self._thread: Optional[threading.Thread] = None

    def _run(self) -> None:
        while not self._stop.wait(self.interval_seconds):
            try:
                with session_scope() as db:
                    released = seat_service.release_expired_holds(db, commit=False)
                if released:
                    logger.info("Released %s expired seat hold(s)", released)
            except Exception as exc:  # pragma: no cover - defensive
                logger.warning("Reservation expirer iteration failed: %s", exc)

    def start(self) -> None:
        if self._thread is not None:
            return
        self._thread = threading.Thread(target=self._run, name="reservation-expirer", daemon=True)
        self._thread.start()
        logger.info("Reservation expirer started (interval=%ss)", self.interval_seconds)

    def stop(self) -> None:
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=2)
