# Data Models

## Redis — Auction State (Source of Truth for Live State)

Redis holds the live state of every active auction. Fast reads for WebSocket broadcasts and bid validation.

### Auction State Hash

```
Key:   auction:{auction_id}
Type:  Hash

Fields:
  auction_type    "ENGLISH" | "DUTCH"
  status          "SCHEDULED" | "ACTIVE" | "CLOSING" | "CLOSED"
  highest_bid     "150.00"           (English)
  current_price   "200.00"           (Dutch — decreases each round)
  price_floor     "50.00"            (Dutch — minimum before no-winner close)
  price_step      "10.00"            (Dutch — drop per round)
  round_duration  "30"               (Dutch — seconds per round)
  current_round   "3"                (Dutch)
  leader          "user_42"
  ends_at         "2026-03-09T15:00:00Z"
  title           "Vintage Car"
  lot_id          "lot_uuid"
```

### Bid History List

```
Key:   auction:{auction_id}:bids
Type:  List (LPUSH → newest first)

Each entry (JSON string):
  {
    "bid_id": "uuid",
    "user_id": "user_42",
    "amount": 150.00,
    "timestamp": "2026-03-09T14:32:00Z"
  }

Capped at last 100 bids (LTRIM after each LPUSH).
```

### Connected WebSocket Clients (per auction)

Not stored in Redis for MVP — kept in-memory in the WebSocket service process.
For multi-instance scaling: use Redis Sets.

```
Key:   ws:connections:{auction_id}
Type:  Set
Value: session_id strings
```

---

## API Request/Response Schemas (Pydantic)

Defined in `shared/schemas/` and imported by all Python services.

### PlaceBidRequest

```python
class PlaceBidRequest(BaseModel):
    auction_id: str
    user_id: str
    amount: float = Field(gt=0, description="Must be positive")

    @validator("amount")
    def round_to_cents(cls, v):
        return round(v, 2)
```

### BidEvent (Kafka payload)

```python
class BidEvent(BaseModel):
    event_type: Literal["BID_PLACED"] = "BID_PLACED"
    auction_id: str
    user_id: str
    amount: float
    bid_id: str = Field(default_factory=lambda: str(uuid4()))
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
```

### AuctionUpdateEvent (Kafka payload)

```python
class AuctionUpdateEvent(BaseModel):
    event_type: Literal["BID_ACCEPTED"] = "BID_ACCEPTED"
    auction_id: str
    highest_bid: float
    leader: str
    bid_id: str
    timestamp: str
```

### WebSocket Message (Server → Client)

```typescript
// Sent by WebSocket service to React clients
type WsMessage =
  | { type: "BID_ACCEPTED";  auction_id: string; highest_bid: number; leader: string; timestamp: string }
  | { type: "BID_REJECTED";  auction_id: string; reason: string }
  | { type: "AUCTION_CLOSING"; auction_id: string; ends_at: string }
  | { type: "AUCTION_CLOSED"; auction_id: string; winner: string; final_price: number }
  | { type: "DUTCH_ROUND";   auction_id: string; current_price: number; round: number }
  | { type: "AUCTION_STATE"; auction_id: string; state: AuctionState }  // on connect
```

### AuctionState (Full state snapshot — sent on WS connect)

```typescript
interface AuctionState {
  auction_id: string
  title: string
  auction_type: "ENGLISH" | "DUTCH"
  status: "SCHEDULED" | "ACTIVE" | "CLOSING" | "CLOSED"
  highest_bid?: number        // English
  current_price?: number      // Dutch
  leader?: string
  ends_at: string
  bid_history: BidEntry[]
  current_round?: number      // Dutch
}
```

---

## PostgreSQL — Persistent Records

Kafka and Redis are ephemeral. PostgreSQL is the permanent record.

```sql
-- Auctions
CREATE TABLE auctions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('ENGLISH', 'DUTCH')),
  status      TEXT NOT NULL DEFAULT 'DRAFT',
  lot_id      UUID REFERENCES lots(id),
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lots
CREATE TABLE lots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  starting_price  NUMERIC(12,2) NOT NULL,
  price_floor     NUMERIC(12,2),   -- Dutch
  price_step      NUMERIC(12,2),   -- Dutch
  round_duration  INT,             -- Dutch (seconds)
  seller_id       UUID REFERENCES users(id)
);

-- Bids (permanent record)
CREATE TABLE bids (
  id          UUID PRIMARY KEY,
  auction_id  UUID NOT NULL REFERENCES auctions(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  amount      NUMERIC(12,2) NOT NULL,
  status      TEXT NOT NULL DEFAULT 'VALID',  -- VALID | INVALID
  placed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name  TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role  TEXT NOT NULL CHECK (role IN ('ADMIN', 'BUYER', 'SELLER'))
);
```

---

## Environment Variables (All Services)

```env
# Kafka
KAFKA_BOOTSTRAP_SERVERS=kafka:9092

# Redis
REDIS_URL=redis://redis:6379

# Database
DATABASE_URL=postgresql://oni:password@postgres:5432/oni

# App
SECRET_KEY=changeme
ENVIRONMENT=development
```
