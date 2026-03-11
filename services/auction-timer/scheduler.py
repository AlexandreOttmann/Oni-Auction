"""
Lot lifecycle scheduler.

Runs a tight tick loop (default: every 1s). On each tick:
  SCHEDULED lots  → open when starts_at has passed   (→ ACTIVE, LOT_OPENED)
  English ACTIVE  → warn when within CLOSING_WARN_SECONDS of ends_at (→ CLOSING, LOT_CLOSING)
  English CLOSING → close when ends_at has passed    (→ CLOSED, LOT_CLOSED)
  Dutch ACTIVE    → advance round when round_duration expires (DUTCH_ROUND_ADVANCED)
                    close with no winner when price would drop below price_floor
"""

import logging
import time
from datetime import datetime, timezone

import redis

from redis_ops import (
    advance_dutch_round,
    close_dutch_no_winner,
    close_lot_expired,
    get_lot_state,
    init_dutch_round_clock,
    open_lot,
    publish_to_channel,
    scan_lot_ids,
    set_lot_closing,
)
from settings import settings
from shared.kafka import topics
from shared.kafka.producer import produce
from shared.schemas.events import AuctionEventType, AuctionLifecycleEvent

logger = logging.getLogger(__name__)

# Statuses the scheduler cares about (skip CLOSED / SETTLED)
_ACTIVE_STATUSES = {"SCHEDULED", "ACTIVE", "CLOSING"}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_dt(s: str) -> datetime | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None


def _publish_lifecycle(
    r: redis.Redis,
    auction_id: str,
    lot_id: str,
    event_type: AuctionEventType,
    **kwargs,
) -> None:
    event = AuctionLifecycleEvent(
        event_type=event_type,
        entity="lot",
        auction_id=auction_id,
        lot_id=lot_id,
        **kwargs,
    )
    produce(topics.AUCTION_EVENTS, key=auction_id, value=event.model_dump())
    publish_to_channel(r, f"lot:{lot_id}", event.model_dump())


# ─────────────────────────────────────────────────────────
# Per-lot handlers
# ─────────────────────────────────────────────────────────

def _handle_scheduled(r: redis.Redis, lot_id: str, auction_id: str, state: dict, now: datetime) -> None:
    starts_at = _parse_dt(state.get("starts_at", ""))
    if starts_at is None or now < starts_at:
        return

    open_lot(r, lot_id)
    _publish_lifecycle(r, auction_id, lot_id, AuctionEventType.LOT_OPENED)
    logger.info("LOT_OPENED | lot=%s auction=%s", lot_id, auction_id)


def _handle_english_active(r: redis.Redis, lot_id: str, auction_id: str, state: dict, now: datetime) -> None:
    ends_at = _parse_dt(state.get("ends_at", ""))
    if ends_at is None:
        return

    seconds_left = (ends_at - now).total_seconds()

    if seconds_left <= 0:
        # Missed the CLOSING window — close directly
        _close_english(r, lot_id, auction_id, state)
    elif seconds_left <= settings.CLOSING_WARN_SECONDS:
        set_lot_closing(r, lot_id)
        _publish_lifecycle(r, auction_id, lot_id, AuctionEventType.LOT_CLOSING)
        logger.info("LOT_CLOSING | lot=%s seconds_left=%.0f", lot_id, seconds_left)


def _handle_english_closing(r: redis.Redis, lot_id: str, auction_id: str, state: dict, now: datetime) -> None:
    ends_at = _parse_dt(state.get("ends_at", ""))
    if ends_at and now >= ends_at:
        _close_english(r, lot_id, auction_id, state)


def _close_english(r: redis.Redis, lot_id: str, auction_id: str, state: dict) -> None:
    close_lot_expired(r, lot_id)
    winner = state.get("leader") or None
    if winner == "":
        winner = None
    final_price_raw = state.get("highest_bid") or state.get("final_price")
    final_price = float(final_price_raw) if final_price_raw else None

    _publish_lifecycle(
        r, auction_id, lot_id, AuctionEventType.LOT_CLOSED,
        winner=winner,
        final_price=final_price,
        currency=state.get("currency", "USD"),
    )
    logger.info("LOT_CLOSED | lot=%s winner=%s price=%s", lot_id, winner, final_price)


def _handle_dutch_active(r: redis.Redis, lot_id: str, auction_id: str, state: dict, now: datetime) -> None:
    round_started_at = _parse_dt(state.get("round_started_at", ""))

    if round_started_at is None:
        # First tick for this Dutch lot — initialise the round clock
        init_dutch_round_clock(r, lot_id)
        return

    round_duration = int(state.get("round_duration") or 30)
    elapsed = (now - round_started_at).total_seconds()

    if elapsed < round_duration:
        return  # current round still running

    current_price = float(state.get("current_price") or 0)
    price_step    = float(state.get("price_step") or 10)
    price_floor   = float(state.get("price_floor") or 0)
    current_round = int(state.get("current_round") or 1)
    new_price     = round(current_price - price_step, 2)

    if new_price < price_floor:
        close_dutch_no_winner(r, lot_id)
        _publish_lifecycle(
            r, auction_id, lot_id, AuctionEventType.LOT_CLOSED,
            winner=None,
            final_price=None,
            currency=state.get("currency", "USD"),
        )
        logger.info("LOT_CLOSED (floor reached, no winner) | lot=%s floor=%.2f", lot_id, price_floor)
    else:
        new_round = current_round + 1
        advance_dutch_round(r, lot_id, new_price, new_round)
        _publish_lifecycle(
            r, auction_id, lot_id, AuctionEventType.DUTCH_ROUND_ADVANCED,
            current_price=new_price,
            round_number=new_round,
            currency=state.get("currency", "USD"),
        )
        logger.info(
            "DUTCH_ROUND_ADVANCED | lot=%s round=%d price=%.2f",
            lot_id, new_round, new_price,
        )


# ─────────────────────────────────────────────────────────
# Tick
# ─────────────────────────────────────────────────────────

def _process_lot(r: redis.Redis, lot_id: str, now: datetime) -> None:
    state = get_lot_state(r, lot_id)
    if not state:
        return

    status = state.get("status", "")
    if status not in _ACTIVE_STATUSES:
        return

    auction_type = state.get("auction_type", "ENGLISH")
    # auction_id may not be stored on the lot hash in all seed paths — fall back to lot_id
    auction_id = state.get("auction_id") or lot_id

    if status == "SCHEDULED":
        _handle_scheduled(r, lot_id, auction_id, state, now)
    elif status == "ACTIVE":
        if auction_type == "DUTCH":
            _handle_dutch_active(r, lot_id, auction_id, state, now)
        else:
            _handle_english_active(r, lot_id, auction_id, state, now)
    elif status == "CLOSING":
        _handle_english_closing(r, lot_id, auction_id, state, now)


def tick(r: redis.Redis) -> None:
    lot_ids = scan_lot_ids(r)
    now = _now()
    for lot_id in lot_ids:
        try:
            _process_lot(r, lot_id, now)
        except Exception:
            logger.exception("Error processing lot %s", lot_id)


def run_scheduler(r: redis.Redis) -> None:
    logger.info(
        "Scheduler started | tick_interval=%.1fs closing_warn=%ds",
        settings.TICK_INTERVAL, settings.CLOSING_WARN_SECONDS,
    )
    while True:
        try:
            tick(r)
        except Exception:
            logger.exception("Unhandled scheduler tick error")
        time.sleep(settings.TICK_INTERVAL)
