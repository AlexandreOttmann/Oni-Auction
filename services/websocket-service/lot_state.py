"""
Read lot state from Redis for the initial snapshot sent on WS connect.
"""

import json
import logging

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)


async def get_lot_snapshot(r: aioredis.Redis, auction_id: str, lot_id: str) -> dict:
    state_raw = await r.hgetall(f"lot:{lot_id}:state")
    if not state_raw:
        return {"type": "AUCTION_STATE", "auction_id": auction_id, "lot_id": lot_id, "error": "not_found"}

    state = {k.decode(): v.decode() for k, v in state_raw.items()}

    history_raw = await r.lrange(f"lot:{lot_id}:history", 0, 19)
    bid_history = [json.loads(e) for e in history_raw]

    return {
        "type":         "AUCTION_STATE",
        "auction_id":   auction_id,
        "lot_id":       lot_id,
        "title":        state.get("title", ""),
        "auction_type": state.get("auction_type", "ENGLISH"),
        "status":       state.get("status", "ACTIVE"),
        "currency":     state.get("currency", "USD"),
        "highest_bid":  float(state["highest_bid"]) if "highest_bid" in state else None,
        "current_price": float(state["current_price"]) if "current_price" in state else None,
        "current_round": int(state["current_round"]) if "current_round" in state else None,
        "leader":       state.get("leader"),
        "ends_at":      state.get("ends_at", ""),
        "bid_count":    int(state.get("bid_count", 0)),
        "bid_history":  bid_history,
    }
