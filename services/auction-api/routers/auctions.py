import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
import redis.asyncio as aioredis
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from dependencies import get_db, get_redis
from routers.auth import get_current_user
from shared.kafka import topics
from shared.kafka.producer import produce
from shared.schemas.auction import AuctionState, AuctionStatus, AuctionType, BidEntry
from shared.schemas.events import AuctionEventType, AuctionLifecycleEvent

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auctions", tags=["auctions"])


# ── Request / Response schemas ─────────────────────────────────────────────────

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
    seller_id: Optional[str] = None


class LotCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    starting_price: float = Field(..., gt=0)
    reserve_price: Optional[float] = None
    # English
    min_increment: Optional[float] = Field(default=None, gt=0)
    # Dutch
    price_step: Optional[float] = Field(default=None, gt=0)
    round_duration: Optional[int] = Field(default=None, ge=5, le=300)
    price_floor: Optional[float] = Field(default=None, gt=0)

    @field_validator("reserve_price")
    @classmethod
    def reserve_gte_starting(cls, v, info):
        if v is not None and "starting_price" in info.data and v < info.data["starting_price"]:
            raise ValueError("reserve_price must be >= starting_price")
        return v

    @field_validator("price_floor")
    @classmethod
    def floor_lt_starting(cls, v, info):
        if v is not None and "starting_price" in info.data and v >= info.data["starting_price"]:
            raise ValueError("price_floor must be < starting_price")
        return v


class AuctionCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    type: AuctionType
    starts_at: Optional[str] = None   # ISO UTC
    seller_id: str
    status: AuctionStatus = AuctionStatus.DRAFT
    lots: list[LotCreate] = Field(..., min_length=1, max_length=10)


class AuctionCreateResponse(BaseModel):
    auction_id: str
    lot_ids: list[str]
    status: AuctionStatus


# ── Helpers ────────────────────────────────────────────────────────────────────

def _require_admin(current_user: dict) -> None:
    if current_user.get("role") != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail={"code": "FORBIDDEN", "message": "Admin role required"},
        )


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[AuctionListItem])
async def list_auctions(
    seller_id: Optional[str] = None,
    _: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Return all auctions with live bid summary from the database.

    Optional query param: ?seller_id=<uuid> — filters to auctions whose
    primary lot belongs to the specified seller. Used by the Seller view.
    """
    seller_filter = "AND l.seller_id = :seller_id" if seller_id else ""
    result = await db.execute(text(f"""
        SELECT
            a.id          AS auction_id,
            a.title       AS title,
            a.type        AS auction_type,
            a.status      AS status,
            a.ends_at     AS ends_at,
            l.seller_id   AS seller_id,
            MAX(b.amount) AS current_bid,
            u.name        AS leader,
            COUNT(DISTINCT b.user_id) AS bidder_count,
            COUNT(b.id) FILTER (
                WHERE b.placed_at > NOW() - INTERVAL '5 minutes'
            )::float / 5.0  AS bids_per_min
        FROM auctions a
        LEFT JOIN lots l ON l.id = a.lot_id
        LEFT JOIN bids b ON b.auction_id = a.id AND b.status = 'VALID'
        LEFT JOIN users u ON u.id = (
            SELECT user_id FROM bids
            WHERE auction_id = a.id AND status = 'VALID'
            ORDER BY amount DESC LIMIT 1
        )
        WHERE 1=1 {seller_filter}
        GROUP BY a.id, a.title, a.type, a.status, a.ends_at, l.seller_id, u.name
        ORDER BY a.starts_at DESC NULLS LAST
    """), {"seller_id": seller_id} if seller_id else {})
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
            seller_id=str(row["seller_id"]) if row["seller_id"] else None,
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
    lot_id = await r.hget(f"auction:{auction_id}", "lot_id")
    if not lot_id:
        raise HTTPException(status_code=404, detail={"code": "AUCTION_NOT_FOUND"})

    lot_id = lot_id.decode()
    state = await r.hgetall(f"lot:{lot_id}:state")

    if not state:
        raise HTTPException(status_code=404, detail={"code": "LOT_STATE_NOT_FOUND"})

    s = {k.decode(): v.decode() for k, v in state.items()}

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


@router.post("", response_model=AuctionCreateResponse, status_code=201)
async def create_auction(
    body: AuctionCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new auction with one or more lots (ADMIN only).

    Inserts all lots; auctions.lot_id is set to the first lot (current single-lot
    Redis model). All created lot_ids are returned in the response.

    Status may be DRAFT, SCHEDULED, or ACTIVE. The auction-timer service
    transitions SCHEDULED → ACTIVE at starts_at.
    """
    _require_admin(current_user)

    seller_result = await db.execute(
        text("SELECT id FROM users WHERE id = :id AND role = 'SELLER'"),
        {"id": body.seller_id},
    )
    if not seller_result.mappings().first():
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_SELLER", "message": "seller_id must reference a user with SELLER role"},
        )

    if body.type == AuctionType.DUTCH:
        for i, lot in enumerate(body.lots):
            missing = [f for f in ("price_step", "round_duration", "price_floor") if getattr(lot, f) is None]
            if missing:
                raise HTTPException(
                    status_code=400,
                    detail={"code": "MISSING_DUTCH_FIELDS", "lot_index": i, "missing": missing},
                )

    lot_ids: list[str] = []
    first_lot_id: Optional[str] = None

    for lot in body.lots:
        lot_id = str(uuid4())
        lot_ids.append(lot_id)
        await db.execute(text("""
            INSERT INTO lots (id, title, description, starting_price, price_floor, price_step, round_duration, seller_id)
            VALUES (:id, :title, :description, :starting_price, :price_floor, :price_step, :round_duration, :seller_id)
        """), {
            "id": lot_id,
            "title": lot.title,
            "description": lot.description,
            "starting_price": lot.starting_price,
            "price_floor": lot.price_floor,
            "price_step": lot.price_step,
            "round_duration": lot.round_duration,
            "seller_id": body.seller_id,
        })
        if first_lot_id is None:
            first_lot_id = lot_id

    starts_at = None
    if body.starts_at:
        try:
            starts_at = datetime.fromisoformat(body.starts_at.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail={"code": "INVALID_STARTS_AT"})

    auction_id = str(uuid4())
    await db.execute(text("""
        INSERT INTO auctions (id, title, type, status, lot_id, starts_at, created_by)
        VALUES (:id, :title, :type, :status, :lot_id, :starts_at, :created_by)
    """), {
        "id": auction_id,
        "title": body.title,
        "type": body.type.value,
        "status": body.status.value,
        "lot_id": first_lot_id,
        "starts_at": starts_at,
        "created_by": str(current_user["id"]),
    })
    await db.commit()

    logger.info(
        "Auction created | id=%s type=%s status=%s lots=%d created_by=%s",
        auction_id, body.type, body.status, len(lot_ids), current_user["id"],
    )
    return AuctionCreateResponse(auction_id=auction_id, lot_ids=lot_ids, status=body.status)


@router.post("/{auction_id}/extend", status_code=200)
async def extend_auction(
    auction_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    r: aioredis.Redis = Depends(get_redis),
):
    """
    Add 5 minutes to ends_at for the active lot (ADMIN only).

    Updates DB + Redis, then publishes AUCTION_EXTENDED so the WebSocket
    service can push the new ends_at to all connected clients.
    """
    _require_admin(current_user)

    result = await db.execute(
        text("SELECT id, status, ends_at, lot_id FROM auctions WHERE id = :id"),
        {"id": auction_id},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail={"code": "AUCTION_NOT_FOUND"})
    if row["status"] not in ("ACTIVE", "CLOSING"):
        raise HTTPException(
            status_code=409,
            detail={"code": "AUCTION_NOT_EXTENDABLE", "status": row["status"]},
        )

    current_ends = row["ends_at"]
    if current_ends.tzinfo is None:
        current_ends = current_ends.replace(tzinfo=timezone.utc)
    new_ends = current_ends + timedelta(minutes=5)
    new_ends_iso = new_ends.isoformat().replace("+00:00", "Z")

    await db.execute(
        text("UPDATE auctions SET status = 'ACTIVE', ends_at = :ends_at WHERE id = :id"),
        {"ends_at": new_ends, "id": auction_id},
    )
    await db.commit()

    lot_id = str(row["lot_id"]) if row["lot_id"] else None
    if lot_id:
        # Also flip CLOSING back to ACTIVE since we've given more time
        await r.hset(f"lot:{lot_id}:state", mapping={"ends_at": new_ends_iso, "status": "ACTIVE"})

    event = AuctionLifecycleEvent(
        event_type=AuctionEventType.AUCTION_EXTENDED,
        entity="auction",
        auction_id=auction_id,
        lot_id=lot_id,
        new_ends_at=new_ends_iso,
    )
    produce(topic=topics.AUCTION_EVENTS, key=auction_id, value=event.model_dump())

    logger.info("Auction extended | id=%s new_ends_at=%s admin=%s", auction_id, new_ends_iso, current_user["id"])
    return {"data": {"new_ends_at": new_ends_iso}, "meta": {"auction_id": auction_id}}


@router.post("/{auction_id}/pause", status_code=200)
async def pause_auction(
    auction_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    r: aioredis.Redis = Depends(get_redis),
):
    """
    Pause a live auction — halts the timer and rejects new bids (ADMIN only).

    Updates DB + Redis to PAUSED, publishes AUCTION_PAUSED. The auction-timer
    service and bid-worker both check for PAUSED status before processing.

    Requires PAUSED to be in the auctions.status CHECK constraint
    (added to init-db.sql in this change).
    """
    _require_admin(current_user)

    result = await db.execute(
        text("SELECT id, status, lot_id FROM auctions WHERE id = :id"),
        {"id": auction_id},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail={"code": "AUCTION_NOT_FOUND"})
    if row["status"] not in ("ACTIVE", "CLOSING"):
        raise HTTPException(
            status_code=409,
            detail={"code": "AUCTION_NOT_PAUSABLE", "status": row["status"]},
        )

    await db.execute(
        text("UPDATE auctions SET status = 'PAUSED' WHERE id = :id"),
        {"id": auction_id},
    )
    await db.commit()

    lot_id = str(row["lot_id"]) if row["lot_id"] else None
    if lot_id:
        await r.hset(f"lot:{lot_id}:state", "status", "PAUSED")

    event = AuctionLifecycleEvent(
        event_type=AuctionEventType.AUCTION_PAUSED,
        entity="auction",
        auction_id=auction_id,
        lot_id=lot_id,
    )
    produce(topic=topics.AUCTION_EVENTS, key=auction_id, value=event.model_dump())

    logger.info("Auction paused | id=%s admin=%s", auction_id, current_user["id"])
    return {"data": {"status": "PAUSED"}, "meta": {"auction_id": auction_id}}


@router.post("/{auction_id}/close-early", status_code=200)
async def close_auction_early(
    auction_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    r: aioredis.Redis = Depends(get_redis),
):
    """
    Immediately close an auction — current highest bidder wins (ADMIN only).

    Updates DB to CLOSED with ends_at = NOW(), updates Redis, publishes LOT_CLOSED
    so the websocket-service fans out AUCTION_CLOSED to all connected clients.
    """
    _require_admin(current_user)

    result = await db.execute(
        text("SELECT id, status, lot_id FROM auctions WHERE id = :id"),
        {"id": auction_id},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail={"code": "AUCTION_NOT_FOUND"})
    if row["status"] in ("CLOSED", "SETTLED"):
        raise HTTPException(status_code=409, detail={"code": "AUCTION_ALREADY_CLOSED"})

    lot_id = str(row["lot_id"]) if row["lot_id"] else None
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    # Read current winner from Redis (most accurate for live auctions)
    winner: Optional[str] = None
    final_price: Optional[float] = None
    if lot_id:
        lot_state = await r.hgetall(f"lot:{lot_id}:state")
        if lot_state:
            s = {k.decode(): v.decode() for k, v in lot_state.items()}
            winner = s.get("leader")
            price_key = "current_price" if s.get("auction_type") == "DUTCH" else "highest_bid"
            final_price = float(s[price_key]) if price_key in s else None

    await db.execute(
        text("UPDATE auctions SET status = 'CLOSED', ends_at = NOW() WHERE id = :id"),
        {"id": auction_id},
    )
    await db.commit()

    if lot_id:
        await r.hset(f"lot:{lot_id}:state", mapping={"status": "CLOSED", "ends_at": now_iso})

    event = AuctionLifecycleEvent(
        event_type=AuctionEventType.LOT_CLOSED,
        entity="lot",
        auction_id=auction_id,
        lot_id=lot_id,
        winner=winner,
        final_price=final_price,
    )
    produce(topic=topics.AUCTION_EVENTS, key=auction_id, value=event.model_dump())

    logger.info(
        "Auction closed early | id=%s winner=%s final_price=%s admin=%s",
        auction_id, winner, final_price, current_user["id"],
    )
    return {
        "data": {"status": "CLOSED", "winner": winner, "final_price": final_price},
        "meta": {"auction_id": auction_id},
    }
