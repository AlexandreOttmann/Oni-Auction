import logging

from fastapi import APIRouter, Depends, HTTPException
import redis.asyncio as aioredis
from confluent_kafka import Producer

from dependencies import get_kafka_producer, get_redis
from routers.auth import get_current_user
from shared.kafka import topics
from shared.kafka.producer import produce
from shared.schemas.bid import BidEvent, PlaceBidRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/bids", tags=["bids"])


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
