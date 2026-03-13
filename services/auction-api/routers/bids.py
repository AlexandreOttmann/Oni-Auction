import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
import redis.asyncio as aioredis
from confluent_kafka import Producer
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from dependencies import get_db, get_kafka_producer, get_redis
from routers.auth import get_current_user
from shared.kafka import topics
from shared.kafka.producer import produce
from shared.schemas.auction import AuctionStatus, AuctionType
from shared.schemas.bid import BidEvent, PlaceBidRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/bids", tags=["bids"])


# ── Response schema ────────────────────────────────────────────────────────────

class MyBidEntry(BaseModel):
    auction_id: str
    title: str
    lot_id: str
    auction_type: AuctionType
    status: AuctionStatus
    user_bid_status: str           # winning | outbid | closed_won | closed_lost | closed_no_winner
    user_last_bid: float
    current_price: float           # highest_bid (English) or current_price (Dutch) at query time
    ends_at: Optional[str] = None
    final_price: Optional[float] = None
    user_won: Optional[bool] = None
    closed_at: Optional[str] = None


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/mine", response_model=list[MyBidEntry])
async def get_my_bids(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    r: aioredis.Redis = Depends(get_redis),
):
    """
    Return every auction the authenticated buyer has bid in, with their bid status.

    user_bid_status values:
      - winning        : user's bid is currently the highest (ACTIVE/CLOSING)
      - outbid         : user has been outbid (ACTIVE/CLOSING)
      - closed_won     : auction closed, user won
      - closed_lost    : auction closed, user lost
      - closed_no_winner: auction closed with no winner (Dutch price floor hit)

    BUYER and ADMIN may call this. SELLER is forbidden.
    """
    if current_user.get("role") not in ("BUYER", "ADMIN"):
        raise HTTPException(
            status_code=403,
            detail={"code": "FORBIDDEN", "message": "Only buyers may view bid history"},
        )

    user_id = str(current_user["id"])

    # One row per auction the user has bid in, with their max bid and auction state
    result = await db.execute(text("""
        SELECT
            a.id          AS auction_id,
            a.title       AS title,
            a.type        AS auction_type,
            a.status      AS status,
            a.lot_id      AS lot_id,
            a.ends_at     AS ends_at,
            MAX(b.amount) AS user_last_bid,
            -- highest valid bid in the whole auction (may be another user)
            (
                SELECT MAX(b2.amount) FROM bids b2
                WHERE b2.auction_id = a.id AND b2.status = 'VALID'
            )             AS highest_bid,
            -- winner for closed auctions (user_id of the winning bid)
            (
                SELECT b3.user_id FROM bids b3
                WHERE b3.auction_id = a.id AND b3.status = 'VALID'
                ORDER BY b3.amount DESC LIMIT 1
            )             AS winner_id,
            -- closed_at: when the auction ended (use ends_at as proxy if closed)
            CASE WHEN a.status IN ('CLOSED', 'SETTLED') THEN a.ends_at END AS closed_at
        FROM auctions a
        JOIN bids b ON b.auction_id = a.id AND b.user_id = :user_id AND b.status = 'VALID'
        GROUP BY a.id, a.title, a.type, a.status, a.lot_id, a.ends_at
        ORDER BY
            CASE a.status WHEN 'ACTIVE' THEN 0 WHEN 'CLOSING' THEN 1 ELSE 2 END,
            a.ends_at ASC NULLS LAST
    """), {"user_id": user_id})

    rows = result.mappings().all()
    entries: list[MyBidEntry] = []

    for row in rows:
        auction_id = str(row["auction_id"])
        lot_id = str(row["lot_id"]) if row["lot_id"] else ""
        status = AuctionStatus(row["status"])
        auction_type = AuctionType(row["auction_type"])
        user_last_bid = float(row["user_last_bid"])
        highest_bid_db = float(row["highest_bid"]) if row["highest_bid"] is not None else 0.0
        winner_id = str(row["winner_id"]) if row["winner_id"] else None
        ends_at = row["ends_at"].isoformat() if row["ends_at"] else None
        closed_at = row["closed_at"].isoformat() if row["closed_at"] else None

        # For ACTIVE/CLOSING auctions, prefer Redis current price for accuracy
        current_price = highest_bid_db
        if status in (AuctionStatus.ACTIVE, AuctionStatus.CLOSING, AuctionStatus.PAUSED) and lot_id:
            lot_state = await r.hgetall(f"lot:{lot_id}:state")
            if lot_state:
                s = {k.decode(): v.decode() for k, v in lot_state.items()}
                if auction_type == AuctionType.DUTCH:
                    current_price = float(s["current_price"]) if "current_price" in s else highest_bid_db
                else:
                    current_price = float(s["highest_bid"]) if "highest_bid" in s else highest_bid_db

        # Determine user_bid_status
        if status in (AuctionStatus.ACTIVE, AuctionStatus.CLOSING, AuctionStatus.PAUSED):
            if current_price > 0 and user_last_bid >= current_price:
                user_bid_status = "winning"
            else:
                user_bid_status = "outbid"
            final_price = None
            user_won = None
        else:
            # CLOSED / SETTLED
            final_price = highest_bid_db if highest_bid_db > 0 else None
            if winner_id is None:
                user_bid_status = "closed_no_winner"
                user_won = False
            elif winner_id == user_id:
                user_bid_status = "closed_won"
                user_won = True
            else:
                user_bid_status = "closed_lost"
                user_won = False

        entries.append(MyBidEntry(
            auction_id=auction_id,
            title=row["title"],
            lot_id=lot_id,
            auction_type=auction_type,
            status=status,
            user_bid_status=user_bid_status,
            user_last_bid=user_last_bid,
            current_price=current_price,
            ends_at=ends_at,
            final_price=final_price,
            user_won=user_won,
            closed_at=closed_at,
        ))

    return entries


@router.post("", status_code=202)
async def place_bid(
    body: PlaceBidRequest,
    current_user: dict = Depends(get_current_user),
    producer: Producer = Depends(get_kafka_producer),
    r: aioredis.Redis = Depends(get_redis),
):
    """
    Accept a bid and produce it to Kafka.

    This endpoint does NOT validate the bid amount — only request format
    and lot existence. Amount validation happens in the bid-worker after
    Kafka ordering is guaranteed (partition key = lot_id).

    user_id is always taken from the authenticated session — the request
    body value is ignored to prevent impersonation.
    """
    lot_key = f"lot:{body.lot_id}:state"
    state = await r.hgetall(lot_key)

    if not state:
        raise HTTPException(status_code=404, detail={"code": "LOT_NOT_FOUND"})

    status = state.get(b"status", b"").decode()
    if status not in ("ACTIVE", "CLOSING"):
        raise HTTPException(
            status_code=409,
            detail={"code": "LOT_NOT_ACTIVE"},
        )

    # Role check — only BUYER and ADMIN may place bids; SELLER is read-only
    if current_user.get("role") not in ("BUYER", "ADMIN"):
        raise HTTPException(
            status_code=403,
            detail={"code": "FORBIDDEN", "message": "Only buyers may place bids"},
        )

    # Always use the server-verified user identity — never trust client-supplied user_id
    authenticated_user_id = str(current_user["id"])

    event = BidEvent(
        auction_id=body.auction_id,
        lot_id=body.lot_id,
        user_id=authenticated_user_id,
        amount=body.amount,
        currency=body.currency,
    )

    produce(
        topic=topics.BIDS,
        key=body.lot_id,   # partition key = lot_id — ordering guarantee
        value=event.model_dump(),
    )

    logger.info("Bid accepted | lot=%s user=%s amount=%.2f", body.lot_id, authenticated_user_id, body.amount)

    return {
        "data": {"status": "accepted", "bid_id": event.bid_id},
        "meta": {"lot_id": body.lot_id},
    }
