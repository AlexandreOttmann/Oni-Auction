import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
import redis.asyncio as aioredis
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from dependencies import get_db, get_redis
from routers.auth import get_current_user
from shared.schemas.auction import AuctionState, AuctionStatus, AuctionType, BidEntry

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auctions", tags=["auctions"])


class AuctionListItem(BaseModel):
    auction_id: str
    title: str
    auction_type: AuctionType
    status: AuctionStatus
    current_bid: Optional[float] = None
    leader: Optional[str] = None
    ends_at: Optional[str] = None
    bidder_count: int
    bids_per_min: float


@router.get("", response_model=list[AuctionListItem])
async def list_auctions(
    _: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all auctions with live bid summary from the database."""
    result = await db.execute(text("""
        SELECT
            a.id          AS auction_id,
            a.title       AS title,
            a.type        AS auction_type,
            a.status      AS status,
            a.ends_at     AS ends_at,
            MAX(b.amount) AS current_bid,
            u.name        AS leader,
            COUNT(b.id)   AS bid_count,
            COUNT(DISTINCT b.user_id) AS bidder_count,
            COUNT(b.id) FILTER (
                WHERE b.placed_at > NOW() - INTERVAL '5 minutes'
            )::float / 5.0  AS bids_per_min
        FROM auctions a
        LEFT JOIN bids b ON b.auction_id = a.id AND b.status = 'VALID'
        LEFT JOIN users u ON u.id = (
            SELECT user_id FROM bids
            WHERE auction_id = a.id AND status = 'VALID'
            ORDER BY amount DESC LIMIT 1
        )
        GROUP BY a.id, a.title, a.type, a.status, a.ends_at, u.name
        ORDER BY a.starts_at DESC NULLS LAST
    """))
    rows = result.mappings().all()
    return [
        AuctionListItem(
            auction_id=str(row["auction_id"]),
            title=row["title"],
            auction_type=AuctionType(row["auction_type"]),
            status=AuctionStatus(row["status"]),
            current_bid=float(row["current_bid"]) if row["current_bid"] is not None else None,
            leader=row["leader"],
            ends_at=row["ends_at"].isoformat() if row["ends_at"] else None,
            bidder_count=row["bidder_count"] or 0,
            bids_per_min=float(row["bids_per_min"] or 0.0),
        )
        for row in rows
    ]


@router.get("/{auction_id}", response_model=AuctionState)
async def get_auction(
    auction_id: str,
    _: dict = Depends(get_current_user),
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
