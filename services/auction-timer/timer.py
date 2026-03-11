"""
Auction Timer — lot lifecycle manager.

Two concurrent threads:
  scheduler   — ticks every TICK_INTERVAL seconds, drives lot state transitions
  soft-close  — Kafka consumer on auction_updates, extends ends_at on last-minute English bids

Signals: SIGTERM / SIGINT trigger graceful shutdown (threads are daemon — process exits when main returns).
"""

import logging
import signal
import threading

import redis

from scheduler import run_scheduler
from settings import settings
from soft_close import run_soft_close

logging.basicConfig(
    level=logging.DEBUG if settings.ENVIRONMENT == "development" else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

_stop_event = threading.Event()


def _handle_shutdown(sig, frame):
    logger.info("Shutdown signal received (sig=%d) — stopping", sig)
    _stop_event.set()


def main() -> None:
    signal.signal(signal.SIGTERM, _handle_shutdown)
    signal.signal(signal.SIGINT, _handle_shutdown)

    r = redis.Redis.from_url(settings.REDIS_URL, decode_responses=False)

    scheduler_thread = threading.Thread(
        target=run_scheduler,
        args=(r,),
        name="scheduler",
        daemon=True,
    )
    soft_close_thread = threading.Thread(
        target=run_soft_close,
        args=(r,),
        name="soft-close",
        daemon=True,
    )

    scheduler_thread.start()
    soft_close_thread.start()

    logger.info("Auction timer running — press Ctrl+C to stop")

    # Block until a shutdown signal is received
    _stop_event.wait()

    logger.info("Auction timer stopped")
    r.close()


if __name__ == "__main__":
    main()
