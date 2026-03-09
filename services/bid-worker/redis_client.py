"""
Redis helpers for bid-worker.

All lot state lives under:
  lot:{lot_id}:state   → Hash  (highest_bid, leader, bid_count, status, ...)
  lot:{lot_id}:history → List  (capped at 500, newest first)
"""

import json
import logging

import redis

from shared.schemas.bid import AuctionUpdateEvent, BidEvent

logger = logging.getLogger(__name__)

LOT_HISTORY_CAP = 500


def get_lot_state(r: redis.Redis, lot_id: str) -> dict | None:
    raw = r.hgetall(f"lot:{lot_id}:state")
    if not raw:
        return None
    return {k.decode(): v.decode() for k, v in raw.items()}


def update_lot_english(r: redis.Redis, event: BidEvent, bid_count: int) -> None:
    """Atomically update highest_bid, leader, bid_count and append to history."""
    pipe = r.pipeline()
    pipe.hset(f"lot:{event.lot_id}:state", mapping={
        "highest_bid": str(event.amount),
        "leader": event.user_id,
        "bid_count": str(bid_count),
    })
    pipe.lpush(f"lot:{event.lot_id}:history", json.dumps({
        "bid_id":    event.bid_id,
        "user_id":   event.user_id,
        "amount":    event.amount,
        "currency":  event.currency,
        "timestamp": event.timestamp,
    }))
    pipe.ltrim(f"lot:{event.lot_id}:history", 0, LOT_HISTORY_CAP - 1)
    pipe.execute()


def close_lot(r: redis.Redis, lot_id: str, winner: str, final_price: float) -> None:
    """Mark lot as CLOSED in Redis (Dutch win or timer expiry)."""
    r.hset(f"lot:{lot_id}:state", mapping={
        "status":      "CLOSED",
        "leader":      winner,
        "final_price": str(final_price),
    })


def publish_to_channel(r: redis.Redis, channel: str, message: dict) -> None:
    r.publish(channel, json.dumps(message))
