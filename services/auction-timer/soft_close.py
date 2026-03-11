"""
Soft-close Kafka consumer.

Listens to `auction_updates` for BID_ACCEPTED events on English lots.
When a valid bid arrives within SOFT_CLOSE_WINDOW seconds of ends_at,
extend ends_at by SOFT_CLOSE_EXTENSION seconds and notify clients.

This keeps the timer as the single source of truth for lot lifecycle
while the bid-worker stays focused on bid validation.
"""

import json
import logging
from datetime import datetime, timedelta, timezone

import redis

from redis_ops import extend_lot_ends_at, get_lot_state, publish_to_channel
from settings import settings
from shared.kafka import topics
from shared.kafka.consumer import get_consumer

logger = logging.getLogger(__name__)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_dt(s: str) -> datetime | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None


def _check_soft_close(r: redis.Redis, event: dict) -> None:
    if event.get("event_type") != "BID_ACCEPTED":
        return

    lot_id     = event.get("lot_id")
    auction_id = event.get("auction_id")
    if not lot_id:
        return

    state = get_lot_state(r, lot_id)
    if not state:
        return

    # Soft-close only applies to English lots
    if state.get("auction_type", "ENGLISH") != "ENGLISH":
        return

    status = state.get("status", "")
    if status not in ("ACTIVE", "CLOSING"):
        return

    ends_at = _parse_dt(state.get("ends_at", ""))
    if ends_at is None:
        return

    now = _now()
    seconds_remaining = (ends_at - now).total_seconds()

    if 0 < seconds_remaining <= settings.SOFT_CLOSE_WINDOW:
        new_ends_at = ends_at + timedelta(seconds=settings.SOFT_CLOSE_EXTENSION)
        new_ends_at_str = new_ends_at.isoformat().replace("+00:00", "Z")

        extend_lot_ends_at(r, lot_id, new_ends_at_str)

        # Notify all WS subscribers that the lot end time has been extended
        notification = {
            "event_type": "LOT_EXTENDED",
            "entity":     "lot",
            "auction_id": auction_id,
            "lot_id":     lot_id,
            "ends_at":    new_ends_at_str,
            "timestamp":  now.isoformat().replace("+00:00", "Z"),
        }
        publish_to_channel(r, f"lot:{lot_id}", notification)

        logger.info(
            "SOFT_CLOSE | lot=%s extended by %ds → new ends_at=%s",
            lot_id, settings.SOFT_CLOSE_EXTENSION, new_ends_at_str,
        )


def run_soft_close(r: redis.Redis) -> None:
    consumer = get_consumer(
        group_id="auction-timer-soft-close",
        topics=[topics.AUCTION_UPDATES],
    )
    logger.info(
        "Soft-close consumer started | window=%ds extension=%ds",
        settings.SOFT_CLOSE_WINDOW, settings.SOFT_CLOSE_EXTENSION,
    )

    while True:
        msg = consumer.poll(timeout=1.0)
        if msg is None or msg.error():
            continue

        try:
            event = json.loads(msg.value())
            _check_soft_close(r, event)
        except Exception:
            logger.exception("Error in soft-close handler")
        finally:
            consumer.commit(msg)
