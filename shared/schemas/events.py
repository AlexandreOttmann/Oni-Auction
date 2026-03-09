from datetime import datetime, timezone
from enum import StrEnum
from typing import Any, Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class AuctionEventType(StrEnum):
    # Auction-level
    AUCTION_SCHEDULED = "AUCTION_SCHEDULED"
    AUCTION_STARTED   = "AUCTION_STARTED"
    AUCTION_CLOSED    = "AUCTION_CLOSED"
    AUCTION_SETTLED   = "AUCTION_SETTLED"

    # Lot-level
    LOT_OPENED            = "LOT_OPENED"
    LOT_CLOSING           = "LOT_CLOSING"
    LOT_CLOSED            = "LOT_CLOSED"
    LOT_SETTLED           = "LOT_SETTLED"
    DUTCH_ROUND_ADVANCED  = "DUTCH_ROUND_ADVANCED"


class AuctionLifecycleEvent(BaseModel):
    """Kafka payload for the 'auction_events' topic. Partition key = auction_id."""

    event_type: AuctionEventType
    entity: str   # "auction" | "lot"
    auction_id: str
    lot_id: Optional[str] = None

    # Populated on LOT_CLOSED / AUCTION_CLOSED
    winner: Optional[str] = None
    final_price: Optional[float] = None
    currency: str = "USD"

    # Populated on DUTCH_ROUND_ADVANCED
    current_price: Optional[float] = None
    round_number: Optional[int] = None

    timestamp: str = Field(default_factory=_now_iso)


class DLQEvent(BaseModel):
    """Dead-letter queue payload for the 'bids_dlq' topic."""

    event_type: Literal["BID_FAILED"] = "BID_FAILED"
    entity: Literal["lot"] = "lot"
    auction_id: str
    lot_id: str
    original_event: dict[str, Any]
    failure_reason: str
    attempts: int
    first_attempt_at: str
    failed_at: str = Field(default_factory=_now_iso)
