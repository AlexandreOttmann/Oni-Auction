"""
Core bid processing logic.

Rules:
- English: bid must strictly exceed current highest_bid → update Redis, publish BID_ACCEPTED
- Dutch:   bid must meet or exceed current_price → close lot immediately, publish LOT_CLOSED
- All invalid bids → publish to invalid_bids topic (never silently dropped)
- All valid bids → persisted to PostgreSQL by this worker (not the API)
"""

import json
import logging

import redis

from db import insert_bid
from redis_client import (
    close_lot,
    get_lot_state,
    publish_to_channel,
    update_lot_english,
)
from shared.kafka import topics
from shared.kafka.producer import produce
from shared.schemas.bid import AuctionUpdateEvent, BidEvent, InvalidBidEvent
from shared.schemas.events import AuctionEventType, AuctionLifecycleEvent

logger = logging.getLogger(__name__)


def process_bid(event: BidEvent, r: redis.Redis, attempts: int = 0) -> None:
    try:
        state = get_lot_state(r, event.lot_id)

        if state is None:
            logger.warning("Lot state not found for lot=%s — publishing invalid", event.lot_id)
            _publish_invalid(event, reason="LOT_NOT_FOUND")
            return

        status = state.get("status", "")
        if status not in ("ACTIVE", "CLOSING"):
            _publish_invalid(event, reason="LOT_CLOSED", state=state)
            return

        auction_type = state.get("auction_type", "ENGLISH")

        if auction_type == "DUTCH":
            _process_dutch(event, state, r)
        else:
            _process_english(event, state, r)

    except redis.RedisError as e:
        if attempts < 3:
            import time
            wait = 0.1 * (2 ** attempts)   # 100ms, 200ms, 400ms
            logger.warning("Redis error on attempt %d, retrying in %.1fs: %s", attempts + 1, wait, e)
            time.sleep(wait)
            process_bid(event, r, attempts + 1)
        else:
            logger.error("Redis error after 3 attempts for bid %s — sending to DLQ", event.bid_id)
            _publish_dlq(event, reason="REDIS_TIMEOUT", attempts=attempts)


# ─────────────────────────────────────────────
# English auction
# ─────────────────────────────────────────────

def _process_english(event: BidEvent, state: dict, r: redis.Redis) -> None:
    current_highest = float(state.get("highest_bid") or 0)
    lot_ends_at = state.get("ends_at", "")
    bid_count = int(state.get("bid_count") or 0) + 1

    if event.amount > current_highest:
        update_lot_english(r, event, bid_count)
        insert_bid(event.bid_id, event.auction_id, event.lot_id, event.user_id, event.amount, "VALID")

        update_event = AuctionUpdateEvent(
            auction_id=event.auction_id,
            lot_id=event.lot_id,
            highest_bid=event.amount,
            currency=event.currency,
            leader=event.user_id,
            bid_id=event.bid_id,
            bid_count=bid_count,
            lot_ends_at=lot_ends_at,
        )
        produce(topic=topics.AUCTION_UPDATES, key=event.lot_id, value=update_event.model_dump())

        # Also push to Redis pub/sub for WS service (sub-10ms path)
        publish_to_channel(r, f"lot:{event.lot_id}", update_event.model_dump())

        logger.info("BID_ACCEPTED | lot=%s amount=%.2f leader=%s", event.lot_id, event.amount, event.user_id)

    else:
        insert_bid(event.bid_id, event.auction_id, event.lot_id, event.user_id, event.amount, "INVALID")
        _publish_invalid(event, reason="BID_TOO_LOW", state=state)
        logger.info("BID_TOO_LOW | lot=%s amount=%.2f current_highest=%.2f", event.lot_id, event.amount, current_highest)


# ─────────────────────────────────────────────
# Dutch auction
# ─────────────────────────────────────────────

def _process_dutch(event: BidEvent, state: dict, r: redis.Redis) -> None:
    current_price = float(state.get("current_price") or 0)

    if event.amount >= current_price:
        close_lot(r, event.lot_id, winner=event.user_id, final_price=current_price)
        insert_bid(event.bid_id, event.auction_id, event.lot_id, event.user_id, current_price, "VALID")

        lifecycle = AuctionLifecycleEvent(
            event_type=AuctionEventType.LOT_CLOSED,
            entity="lot",
            auction_id=event.auction_id,
            lot_id=event.lot_id,
            winner=event.user_id,
            final_price=current_price,
            currency=event.currency,
        )
        produce(topic=topics.AUCTION_EVENTS, key=event.auction_id, value=lifecycle.model_dump())
        publish_to_channel(r, f"lot:{event.lot_id}", lifecycle.model_dump())

        logger.info("DUTCH_WIN | lot=%s winner=%s price=%.2f", event.lot_id, event.user_id, current_price)

    else:
        insert_bid(event.bid_id, event.auction_id, event.lot_id, event.user_id, event.amount, "INVALID")
        _publish_invalid(event, reason="PRICE_NOT_MET", state=state)
        logger.info("PRICE_NOT_MET | lot=%s amount=%.2f current_price=%.2f", event.lot_id, event.amount, current_price)


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def _publish_invalid(event: BidEvent, reason: str, state: dict | None = None) -> None:
    invalid = InvalidBidEvent(
        auction_id=event.auction_id,
        lot_id=event.lot_id,
        user_id=event.user_id,
        amount=event.amount,
        currency=event.currency,
        reason=reason,
        current_highest=float(state["highest_bid"]) if state and "highest_bid" in state else None,
        current_price=float(state["current_price"]) if state and "current_price" in state else None,
        bid_id=event.bid_id,
    )
    produce(topic=topics.INVALID_BIDS, key=event.lot_id, value=invalid.model_dump())


def _publish_dlq(event: BidEvent, reason: str, attempts: int) -> None:
    from datetime import datetime, timezone
    from shared.schemas.events import DLQEvent
    dlq = DLQEvent(
        auction_id=event.auction_id,
        lot_id=event.lot_id,
        original_event=event.model_dump(),
        failure_reason=reason,
        attempts=attempts,
        first_attempt_at=event.timestamp,
    )
    produce(topic=topics.BIDS_DLQ, key=event.lot_id, value=dlq.model_dump())
