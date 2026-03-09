---
name: "senior-backend"
description: "Python backend development for the Oni auction platform. Covers FastAPI, Kafka producers/consumers, Redis state management, PostgreSQL, Pydantic validation, and Docker. Use when building the auction API, bid processor workers, WebSocket service, auction timer service, or any Python service. Always reads .claude/context/ before starting work."
---

# Senior Backend Engineer (Python)

Backend development for Oni using Python, FastAPI, Kafka, Redis, and PostgreSQL.

**Before starting any task:** Read all files in `.claude/context/` — especially `kafka-design.md` and `data-models.md`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API framework | FastAPI (async) |
| Validation | Pydantic v2 |
| Kafka client | `confluent-kafka` |
| Redis client | `redis-py` (async) |
| ORM | SQLAlchemy 2.0 (async) |
| Migrations | Alembic |
| Testing | pytest + pytest-asyncio |
| Containerization | Docker |

---

## Service Responsibility Map

| Service | Path | Does |
|---------|------|------|
| `auction-api` | `services/auction-api/` | REST API — validate bids, produce to Kafka `bids` topic |
| `bid-worker` | `services/bid-worker/` | Consume `bids`, update Redis, publish to `auction_updates` |
| `websocket-service` | `services/websocket-service/` | Consume `auction_updates`, broadcast to WS clients |
| `auction-timer` | `services/auction-timer/` | Manage lifecycle, advance Dutch rounds, publish `auction_events` |

---

## Auction API (FastAPI)

### Structure

```
services/auction-api/
├── main.py
├── routers/
│   ├── bids.py
│   └── auctions.py
├── dependencies.py      ← Kafka producer, Redis client
├── settings.py
└── Dockerfile
```

### POST /bid

```python
# routers/bids.py
from fastapi import APIRouter, Depends, HTTPException
from shared.schemas.bid import PlaceBidRequest, BidEvent
from shared.kafka.producer import produce
from shared.kafka import topics
import redis.asyncio as redis

router = APIRouter()

@router.post("/bid", status_code=202)
async def place_bid(
    body: PlaceBidRequest,
    producer = Depends(get_kafka_producer),
    r: redis.Redis = Depends(get_redis),
):
    # Check auction exists and is ACTIVE
    state = await r.hgetall(f"auction:{body.auction_id}")
    if not state:
        raise HTTPException(404, "Auction not found")
    if state.get(b"status") != b"ACTIVE":
        raise HTTPException(409, {"code": "AUCTION_NOT_ACTIVE"})

    # Produce to Kafka — key = auction_id ensures ordering
    event = BidEvent(
        auction_id=body.auction_id,
        user_id=body.user_id,
        amount=body.amount,
    )
    produce(producer, topics.BIDS, key=body.auction_id, value=event.model_dump())

    return {"status": "accepted", "bid_id": event.bid_id}
```

**Important:** The API does NOT validate the bid amount — only request format and auction existence. Bid amount validation happens in the **bid-worker** after Kafka ordering is guaranteed.

---

## Bid Worker (Kafka Consumer)

```python
# services/bid-worker/worker.py
from confluent_kafka import Consumer
from shared.kafka import topics
from shared.schemas.bid import BidEvent
import redis, json

def run():
    consumer = Consumer({
        "bootstrap.servers": settings.KAFKA_BOOTSTRAP_SERVERS,
        "group.id": "bid-processors",
        "auto.offset.reset": "earliest",
        "enable.auto.commit": False,
    })
    consumer.subscribe([topics.BIDS])
    r = redis.Redis.from_url(settings.REDIS_URL)

    while True:
        msg = consumer.poll(timeout=1.0)
        if msg is None or msg.error():
            continue

        event = BidEvent.model_validate_json(msg.value())
        process_bid(event, r)
        consumer.commit(msg)  # manual commit — only after successful processing

def process_bid(event: BidEvent, r: redis.Redis):
    state = r.hgetall(f"auction:{event.auction_id}")
    auction_type = state.get(b"auction_type", b"ENGLISH").decode()

    if auction_type == "ENGLISH":
        process_english_bid(event, state, r)
    else:
        process_dutch_bid(event, state, r)

def process_english_bid(event: BidEvent, state: dict, r: redis.Redis):
    current_highest = float(state.get(b"highest_bid", b"0"))

    if event.amount > current_highest:
        pipe = r.pipeline()
        pipe.hset(f"auction:{event.auction_id}", mapping={
            "highest_bid": event.amount,
            "leader": event.user_id,
        })
        pipe.lpush(
            f"auction:{event.auction_id}:bids",
            json.dumps({"bid_id": event.bid_id, "user_id": event.user_id,
                        "amount": event.amount, "timestamp": event.timestamp})
        )
        pipe.ltrim(f"auction:{event.auction_id}:bids", 0, 99)  # keep last 100
        pipe.execute()
        publish_update(event, highest_bid=event.amount, leader=event.user_id)
    else:
        publish_invalid(event, reason="BID_TOO_LOW", current_highest=current_highest)

def process_dutch_bid(event: BidEvent, state: dict, r: redis.Redis):
    current_price = float(state.get(b"current_price", b"0"))

    if event.amount >= current_price:
        # First valid bid wins — close the auction immediately
        r.hset(f"auction:{event.auction_id}", mapping={"status": "CLOSED", "leader": event.user_id})
        publish_auction_event(event.auction_id, "AUCTION_CLOSED",
                              winner=event.user_id, final_price=current_price)
    else:
        publish_invalid(event, reason="PRICE_NOT_MET", current_price=current_price)
```

---

## WebSocket Service

```python
# services/websocket-service/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from confluent_kafka import Consumer
import asyncio, json

app = FastAPI()
rooms: dict[str, set[WebSocket]] = {}

@app.websocket("/ws/auction/{auction_id}")
async def auction_ws(websocket: WebSocket, auction_id: str):
    await websocket.accept()
    rooms.setdefault(auction_id, set()).add(websocket)

    # Send current state snapshot on connect
    state = await get_auction_state(auction_id)
    await websocket.send_json({"type": "AUCTION_STATE", **state})

    try:
        while True:
            await websocket.receive_text()  # keep-alive
    except WebSocketDisconnect:
        rooms[auction_id].discard(websocket)

async def kafka_broadcast_loop():
    consumer = Consumer({
        "bootstrap.servers": settings.KAFKA_BOOTSTRAP_SERVERS,
        "group.id": "ws-broadcasters",
        "auto.offset.reset": "latest",
    })
    consumer.subscribe([topics.AUCTION_UPDATES, topics.AUCTION_EVENTS])

    while True:
        msg = consumer.poll(0.01)
        if msg and not msg.error():
            event = json.loads(msg.value())
            auction_id = event["auction_id"]
            if auction_id in rooms:
                dead = set()
                for ws in rooms[auction_id]:
                    try:
                        await ws.send_json(event)
                    except Exception:
                        dead.add(ws)
                rooms[auction_id] -= dead
        await asyncio.sleep(0)
```

---

## Shared Schemas (shared/schemas/)

```python
# shared/schemas/bid.py
from pydantic import BaseModel, Field, validator
from typing import Literal
from uuid import uuid4
from datetime import datetime

class PlaceBidRequest(BaseModel):
    auction_id: str
    user_id: str
    amount: float = Field(gt=0)

    @validator("amount")
    def round_to_cents(cls, v):
        return round(v, 2)

class BidEvent(BaseModel):
    event_type: Literal["BID_PLACED"] = "BID_PLACED"
    auction_id: str
    user_id: str
    amount: float
    bid_id: str = Field(default_factory=lambda: str(uuid4()))
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
```

---

## Settings (Each Service)

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    KAFKA_BOOTSTRAP_SERVERS: str = "kafka:9092"
    REDIS_URL: str = "redis://redis:6379"
    DATABASE_URL: str = "postgresql+asyncpg://oni:password@postgres:5432/oni"

    class Config:
        env_file = ".env"

settings = Settings()
```

---

## Dockerfile Pattern

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## API Conventions

### Response Format

```python
# Success
{"data": ..., "meta": {"request_id": "..."}}

# Error
{"error": {"code": "BID_TOO_LOW", "message": "...", "details": {}}, "meta": {...}}
```

### HTTP Status Codes

| Code | Use Case |
|------|----------|
| 202 | Bid accepted (async — processing via Kafka) |
| 400 | Validation error |
| 401 | Authentication required |
| 403 | Permission denied |
| 404 | Auction not found |
| 409 | Auction not active |
| 429 | Rate limit exceeded |

---

## Security Checklist

- [ ] All inputs validated with Pydantic before any processing
- [ ] Kafka partition key = auction_id (race condition prevention)
- [ ] Manual Kafka commit only after successful processing
- [ ] JWT verified on every protected route
- [ ] Rate limiting on POST /bid (Redis sliding window)
- [ ] Secrets via env vars only — never hardcoded
- [ ] No raw SQL — SQLAlchemy only

---

## Common Commands

```bash
uvicorn main:app --reload          # Start API dev server
python -m worker                   # Start bid worker
pytest                             # Run tests
alembic upgrade head               # Run DB migrations
docker compose up                  # Start all services
```
