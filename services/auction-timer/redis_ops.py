"""
Redis helpers for auction-timer.

All lot state lives under:
  lot:{lot_id}:state  → Hash (status, auction_type, ends_at, starts_at,
                               highest_bid, leader, bid_count,
                               current_price, price_floor, price_step,
                               round_duration, current_round, round_started_at,
                               currency, auction_id, title)
"""

import json
import logging
from datetime import datetime, timezone

import redis

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def get_lot_state(r: redis.Redis, lot_id: str) -> dict | None:
    raw = r.hgetall(f"lot:{lot_id}:state")
    if not raw:
        return None
    return {k.decode(): v.decode() for k, v in raw.items()}


def scan_lot_ids(r: redis.Redis) -> list[str]:
    """Return all lot IDs from Redis SCAN (pattern lot:*:state)."""
    lot_ids: list[str] = []
    cursor = 0
    while True:
        cursor, keys = r.scan(cursor, match="lot:*:state", count=100)
        for key in keys:
            parts = key.decode().split(":")
            if len(parts) == 3:
                lot_ids.append(parts[1])
        if cursor == 0:
            break
    return lot_ids


def open_lot(r: redis.Redis, lot_id: str) -> None:
    """Transition SCHEDULED → ACTIVE."""
    r.hset(f"lot:{lot_id}:state", mapping={
        "status":    "ACTIVE",
        "opened_at": _now_iso(),
    })


def set_lot_closing(r: redis.Redis, lot_id: str) -> None:
    """Transition ACTIVE → CLOSING (English soft-close warning window)."""
    r.hset(f"lot:{lot_id}:state", "status", "CLOSING")


def close_lot_expired(r: redis.Redis, lot_id: str) -> None:
    """Close an English lot that has passed ends_at."""
    r.hset(f"lot:{lot_id}:state", "status", "CLOSED")


def advance_dutch_round(
    r: redis.Redis, lot_id: str, new_price: float, new_round: int
) -> None:
    """Update current_price, current_round, and round_started_at after a round expires."""
    r.hset(f"lot:{lot_id}:state", mapping={
        "current_price":    str(new_price),
        "current_round":    str(new_round),
        "round_started_at": _now_iso(),
    })


def init_dutch_round_clock(r: redis.Redis, lot_id: str) -> None:
    """Set round_started_at on first timer tick for a Dutch lot that lacks it."""
    r.hset(f"lot:{lot_id}:state", "round_started_at", _now_iso())


def close_dutch_no_winner(r: redis.Redis, lot_id: str) -> None:
    """Close a Dutch lot when price drops below floor with no winner."""
    r.hset(f"lot:{lot_id}:state", mapping={
        "status": "CLOSED",
        "winner": "",
    })


def extend_lot_ends_at(r: redis.Redis, lot_id: str, new_ends_at: str) -> None:
    """Soft-close extension: push ends_at forward and revert CLOSING → ACTIVE."""
    r.hset(f"lot:{lot_id}:state", mapping={
        "ends_at": new_ends_at,
        "status":  "ACTIVE",
    })


def publish_to_channel(r: redis.Redis, channel: str, message: dict) -> None:
    r.publish(channel, json.dumps(message))
