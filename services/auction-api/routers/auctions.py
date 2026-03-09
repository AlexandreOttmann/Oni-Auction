import json
import logging

from fastapi import APIRouter, Depends, HTTPException
import redis.asyncio as aioredis

from dependencies import get_redis
from shared.schemas.auction import AuctionState, AuctionStatus, AuctionType, BidEntry

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auctions", tags=["auctions"])


@router.get("/{auction_id}", response_model=AuctionState)
async def get_auction(
    auction_id: str,
    r: aioredis.Redis = Depends(get_redis),
):
    """
    Return full auction state from Redis.
    Used by clients on initial page load before connecting to WebSocket.
    """
    # Resolve lot_id from auction
    lot_id = await r.hget(f"auction:{auction_id}", "lot_id")
    if not lot_id:
        raise HTTPException(status_code=404, detail={"code": "AUCTION_NOT_FOUND"})

    lot_id = lot_id.decode()
    state = await r.hgetall(f"lot:{lot_id}:state")

    if not state:
        raise HTTPException(status_code=404, detail={"code": "LOT_STATE_NOT_FOUND"})

    # Decode bytes
    s = {k.decode(): v.decode() for k, v in state.items()}

    # Last 20 bids for initial snapshot (full history is in WebSocket updates)
    raw_history = await r.lrange(f"lot:{lot_id}:history", 0, 19)
    bid_history = [BidEntry(**json.loads(entry)) for entry in raw_history]

    return AuctionState(
        auction_id=auction_id,
        lot_id=lot_id,
        title=s.get("title", ""),
        auction_type=AuctionType(s.get("auction_type", "ENGLISH")),
        status=AuctionStatus(s.get("status", "ACTIVE")),
        currency=s.get("currency", "USD"),
        highest_bid=float(s["highest_bid"]) if "highest_bid" in s else None,
        current_price=float(s["current_price"]) if "current_price" in s else None,
        price_floor=float(s["price_floor"]) if "price_floor" in s else None,
        price_step=float(s["price_step"]) if "price_step" in s else None,
        current_round=int(s["current_round"]) if "current_round" in s else None,
        leader=s.get("leader"),
        ends_at=s.get("ends_at", ""),
        bid_count=int(s.get("bid_count", 0)),
        bid_history=bid_history,
    )
