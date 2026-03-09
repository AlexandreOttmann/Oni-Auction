from datetime import datetime, timezone
from typing import Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class PlaceBidRequest(BaseModel):
    """Incoming bid from the client — validated at the API boundary."""

    auction_id: str
    lot_id: str
    user_id: str
    amount: float = Field(gt=0, description="Must be positive, rounded to 2 decimal places")
    currency: str = "USD"

    @field_validator("amount")
    @classmethod
    def round_to_cents(cls, v: float) -> float:
        return round(v, 2)


class BidEvent(BaseModel):
    """Kafka payload for the 'bids' topic. Partition key = lot_id."""

    event_type: Literal["BID_PLACED"] = "BID_PLACED"
    entity: Literal["lot"] = "lot"
    auction_id: str
    lot_id: str
    user_id: str
    amount: float
    currency: str = "USD"
    bid_id: str = Field(default_factory=lambda: str(uuid4()))
    timestamp: str = Field(default_factory=_now_iso)


class AuctionUpdateEvent(BaseModel):
    """Kafka payload for the 'auction_updates' topic — broadcast to WS clients."""

    event_type: Literal["BID_ACCEPTED"] = "BID_ACCEPTED"
    entity: Literal["lot"] = "lot"
    auction_id: str
    lot_id: str
    highest_bid: float
    currency: str = "USD"
    leader: str
    bid_id: str
    bid_count: int
    lot_ends_at: str   # may be extended on soft-close
    timestamp: str = Field(default_factory=_now_iso)


class InvalidBidEvent(BaseModel):
    """Kafka payload for the 'invalid_bids' topic."""

    event_type: Literal["BID_REJECTED"] = "BID_REJECTED"
    entity: Literal["lot"] = "lot"
    auction_id: str
    lot_id: str
    user_id: str
    amount: float
    currency: str = "USD"
    reason: str   # BID_TOO_LOW | PRICE_NOT_MET | LOT_CLOSED | AUCTION_NOT_ACTIVE | DUPLICATE_BID
    current_highest: Optional[float] = None   # English — what the minimum would have been
    current_price: Optional[float] = None     # Dutch — current round price
    bid_id: str
    timestamp: str = Field(default_factory=_now_iso)
