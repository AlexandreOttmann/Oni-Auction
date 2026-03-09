from enum import StrEnum
from typing import Optional
from pydantic import BaseModel, Field


class AuctionType(StrEnum):
    ENGLISH = "ENGLISH"
    DUTCH = "DUTCH"


class AuctionStatus(StrEnum):
    SCHEDULED = "SCHEDULED"
    ACTIVE = "ACTIVE"
    CLOSING = "CLOSING"
    CLOSED = "CLOSED"
    SETTLED = "SETTLED"


class BidEntry(BaseModel):
    bid_id: str
    user_id: str
    amount: float
    timestamp: str


class AuctionState(BaseModel):
    """Full state snapshot — sent to clients on WebSocket connect."""

    auction_id: str
    lot_id: str
    title: str
    auction_type: AuctionType
    status: AuctionStatus
    currency: str = "USD"

    # English auction
    highest_bid: Optional[float] = None
    leader: Optional[str] = None

    # Dutch auction
    current_price: Optional[float] = None
    price_floor: Optional[float] = None
    price_step: Optional[float] = None
    current_round: Optional[int] = None

    ends_at: str
    bid_count: int = 0
    bid_history: list[BidEntry] = Field(default_factory=list)
