# Kafka Design

## Why Kafka

Kafka is the core of Oni's architecture. It solves the hardest problems:
- **Race conditions**: partition key = `lot_id` → all bids for one lot go to one partition → processed in strict order
- **Scalability**: add more workers → Kafka redistributes partitions automatically
- **Durability**: bids are never lost even if a worker crashes mid-processing
- **Event replay**: rebuild auction state at any point from the raw event log
- **Decoupling**: API doesn't know about workers; workers don't know about WebSocket service

---

## Data Model Hierarchy

```
Auction
└── Lot (one or many per auction)
    └── Item (one or many per lot — physical goods being auctioned)
```

**Example:** Auction "Car Parts Sale"
- Lot A: Body → items: tires, windows, metal body, seats
- Lot B: Engine → items: starter, oil pan, pistons, crankshaft

**Key implication:** Bidding and ordering guarantees are at **lot level**, not auction level.
Multiple lots within one auction can run and close independently.
Partition key = `lot_id` everywhere.

---

## Topics

| Topic | Purpose | Partition Key | Partitions |
|-------|---------|--------------|-----------|
| `bids` | Raw bid submissions from API | `lot_id` | 10 |
| `auction_updates` | Valid bid processed — broadcast to clients | `lot_id` | 10 |
| `invalid_bids` | Bids that failed validation | `lot_id` | 4 |
| `auction_events` | Lifecycle events: started, closing, closed, settled | `auction_id` | 4 |
| `bids_dlq` | Dead-letter queue — bids that failed after 3 retries | `lot_id` | 4 |

**Note:** `auction_events` uses `auction_id` as key because lifecycle events concern the whole auction.
All bid-related topics use `lot_id` for ordering guarantees at the lot level.

---

## Partition Strategy

```
partition = hash(lot_id) % num_partitions
```

**Why this matters:**
- All bids for lot `lot_body` → same partition → same worker → no race condition
- Worker processes bids one-by-one, in order received
- Redis update is sequential per lot — no concurrent writes to the same lot state
- Two lots in the same auction can be processed by different workers simultaneously (correct — they're independent)
- With 10 partitions and 5 workers → each worker handles 2 partitions

---

## Consumer Groups

| Group | Topic | Service | Behavior |
|-------|-------|---------|---------|
| `bid-processors` | `bids` | bid-worker | Validates bids, updates Redis, publishes to `auction_updates` |
| `ws-broadcasters` | `auction_updates`, `auction_events` | websocket-service | Broadcasts to subscribed WS clients |
| `auction-closers` | `auction_events` | auction-timer | Handles CLOSING/CLOSED lot and auction transitions |
| `dlq-alerter` | `bids_dlq` | bid-worker (DLQ handler) | Alerts ops, persists failed bids for manual review |
| `analytics` | `*` (all) | future service | Consumes all topics for reporting |

---

## Event Schemas

All events carry `auction_id`, `lot_id`, and `entity` for client-side routing.
The `entity` field supports future canvas-like UI where each entity is an independently renderable element.

### `bids` topic

```json
{
  "event_type": "BID_PLACED",
  "entity": "lot",
  "auction_id": "auction_uuid",
  "lot_id": "lot_uuid",
  "user_id": "user_uuid",
  "amount": 150.00,
  "currency": "USD",
  "timestamp": "2026-03-09T14:32:00.000Z",
  "bid_id": "bid_uuid"
}
```

### `auction_updates` topic

```json
{
  "event_type": "BID_ACCEPTED",
  "entity": "lot",
  "auction_id": "auction_uuid",
  "lot_id": "lot_uuid",
  "highest_bid": 150.00,
  "currency": "USD",
  "leader": "user_uuid",
  "bid_id": "bid_uuid",
  "bid_count": 12,
  "lot_ends_at": "2026-03-09T15:00:00.000Z",
  "timestamp": "2026-03-09T14:32:00.120Z"
}
```

`bid_count` — social proof signal for buyers.
`lot_ends_at` — updated here if the auction type extends on last-minute bids (English soft-close).

### `invalid_bids` topic

```json
{
  "event_type": "BID_REJECTED",
  "entity": "lot",
  "auction_id": "auction_uuid",
  "lot_id": "lot_uuid",
  "user_id": "user_uuid",
  "amount": 100.00,
  "currency": "USD",
  "reason": "BID_TOO_LOW",
  "current_highest": 150.00,
  "timestamp": "2026-03-09T14:32:01.000Z",
  "bid_id": "bid_uuid"
}
```

Possible `reason` values: `BID_TOO_LOW`, `PRICE_NOT_MET`, `LOT_CLOSED`, `AUCTION_NOT_ACTIVE`, `DUPLICATE_BID`

### `auction_events` topic

```json
{
  "event_type": "LOT_CLOSED",
  "entity": "lot",
  "auction_id": "auction_uuid",
  "lot_id": "lot_uuid",
  "winner": "user_uuid",
  "final_price": 150.00,
  "currency": "USD",
  "timestamp": "2026-03-09T15:00:00.000Z"
}
```

Possible `event_type` values:
- Auction-level: `AUCTION_SCHEDULED`, `AUCTION_STARTED`, `AUCTION_CLOSED`, `AUCTION_SETTLED`
- Lot-level: `LOT_OPENED`, `LOT_CLOSING`, `LOT_CLOSED`, `LOT_SETTLED`, `DUTCH_ROUND_ADVANCED`

### `bids_dlq` topic

```json
{
  "event_type": "BID_FAILED",
  "entity": "lot",
  "auction_id": "auction_uuid",
  "lot_id": "lot_uuid",
  "original_event": { "...": "original bids topic payload" },
  "failure_reason": "REDIS_TIMEOUT",
  "attempts": 3,
  "first_attempt_at": "2026-03-09T14:32:00.000Z",
  "failed_at": "2026-03-09T14:32:03.100Z"
}
```

---

## Bid Processor Logic (Per Event)

```python
async def process_bid(event: BidEvent, attempts: int = 0) -> None:
    try:
        state = await redis.get_lot_state(event.lot_id)

        if state is None or state.status != "ACTIVE":
            await publish_invalid(event, reason="LOT_CLOSED")
            return

        # Dutch auction: first bid at or above current_price wins
        if state.auction_type == "DUTCH":
            if event.amount >= state.current_price:
                await close_lot_with_winner(event, state)
            else:
                await publish_invalid(event, reason="PRICE_NOT_MET")
            return

        # English auction: must strictly beat current highest bid
        if event.amount > state.highest_bid:
            await redis.update_lot_state(
                lot_id=event.lot_id,
                highest_bid=event.amount,
                leader=event.user_id,
                bid_count=state.bid_count + 1,
            )
            await redis.append_bid_history(event.lot_id, event)
            await publish_auction_update(event, state)
        else:
            await publish_invalid(event, reason="BID_TOO_LOW")

    except RedisError as e:
        if attempts < 3:
            await asyncio.sleep(0.1 * (2 ** attempts))  # 100ms, 200ms, 400ms
            return await process_bid(event, attempts + 1)
        else:
            await publish_dlq(event, reason="REDIS_TIMEOUT", attempts=attempts)
```

**Manual commit rule:** offset is committed only after `process_bid` completes successfully or the event is published to DLQ. A worker crash replays from last committed offset — bids are never silently lost.

---

## Two Real-Time Planes

The canvas UI has two fundamentally different event classes that require different infrastructure:

```
                    ┌─────────────────────────────────────┐
                    │           WS Service                 │
                    │                                      │
   Client ──WS──►  │  ┌──────────────┐  ┌─────────────┐  │
                    │  │  Bid plane   │  │ Canvas plane│  │
                    │  │  (Kafka      │  │ (Redis      │  │
                    │  │   consumer)  │  │  Pub/Sub)   │  │
                    │  └──────┬───────┘  └──────┬──────┘  │
                    └─────────┼─────────────────┼─────────┘
                              │                 │
                        Kafka topics       Redis Pub/Sub
                        bids               cursor:{lot_id}
                        auction_updates    presence:{lot_id}
                        auction_events     field:{lot_id}
```

| | Bid plane | Canvas plane |
|--|-----------|--------------|
| **Transport** | Kafka → WS service → Redis → clients | WS service → Redis → clients (Kafka bypassed) |
| **Frequency** | Low (seconds between bids) | Very high (≤60fps per user) |
| **Persistence** | Required (legal record, replay) | Never needed |
| **Ordering** | Critical | Not important |
| **Latency target** | < 100ms p99 | < 16ms (1 frame) |
| **Examples** | BID_ACCEPTED, LOT_CLOSED | cursor move, field focus, user presence |

**Bid path:** Client → `POST /bids` → Kafka `bids` topic → bid-worker → `auction_updates` topic → WS service Kafka consumer → Redis pub/sub → all WS instances → clients

**Canvas path:** Client → WS message → WS service receives → immediately publishes to Redis channel → all WS instances → their connected clients. Nothing hits disk. No Kafka hop.

**Card bid submission:** When a user clicks "Place Bid" on a canvas card, that single action crosses from canvas plane to bid plane — it becomes a REST call with full Kafka durability. The canvas interaction (typing, hovering, focusing) stays ephemeral until that commit moment.

---

## Redis State Keys

```
# Bid plane — durable auction state
lot:{lot_id}:state        → Hash: highest_bid, leader, bid_count, status, current_price, auction_type, lot_ends_at
lot:{lot_id}:history      → List (capped at 500): bid events in order
auction:{auction_id}:lots → Set: lot_ids belonging to this auction

# Canvas plane — ephemeral, no TTL needed (evicted naturally)
presence:{lot_id}         → Hash: user_id → {display_name, color, joined_at, last_seen_at}
cursor:{lot_id}:{user_id} → String: {x, y, updated_at}  — expires after 5s of inactivity
```

TTL: bid plane keys expire 24h after `LOT_SETTLED`. Canvas plane keys are ephemeral by design — cursor keys have a 5s TTL refreshed on each update; presence is removed on WS disconnect.

---

## Redis Pub/Sub Channels

### Bid plane channels
```
lot:{lot_id}          → BID_ACCEPTED, BID_REJECTED (personal), LOT_CLOSING, LOT_CLOSED
auction:{auction_id}  → AUCTION_STARTED, AUCTION_CLOSED
user:{user_id}        → OUTBID, WON, PAYMENT_DUE  (personal, routed per session)
```

### Canvas plane channels
```
cursor:{lot_id}       → cursor position updates for all users watching this lot
presence:{lot_id}     → user joined/left/idle events
field:{lot_id}        → field focus, typing indicators, hover state on canvas cards
```

The WS server subscribes to `lot:{lot_id}` + `cursor:{lot_id}` + `presence:{lot_id}` when a client connects to a lot view.
It additionally subscribes to `user:{user_id}` for personal alerts.

### Canvas event schemas (Redis Pub/Sub, never persisted)

```json
// cursor:{lot_id}
{
  "type": "CURSOR_MOVED",
  "user_id": "user_uuid",
  "color": "#FF6B6B",
  "x": 0.432,
  "y": 0.187,
  "t": 1741530720123
}

// presence:{lot_id}
{
  "type": "USER_JOINED",
  "user_id": "user_uuid",
  "display_name": "Acme Corp",
  "color": "#FF6B6B",
  "t": 1741530720000
}

// field:{lot_id}
{
  "type": "FIELD_FOCUSED",
  "user_id": "user_uuid",
  "card_id": "lot_uuid",
  "field": "bid_amount",
  "t": 1741530720200
}
```

`x` and `y` are normalized floats (0.0–1.0) relative to the canvas viewport — resolution-independent.
`color` is assigned per user-session on connect and stored in `presence:{lot_id}` for the duration.

---

## Async Producer Pattern (No Blocking Flush)

`flush()` after every message adds 10-50ms latency — unacceptable for Figma-like realtime.

```python
# shared/kafka/producer.py
import asyncio
from confluent_kafka import Producer
from typing import Callable

_producer: Producer | None = None

def get_producer() -> Producer:
    global _producer
    if _producer is None:
        _producer = Producer({
            "bootstrap.servers": settings.KAFKA_BOOTSTRAP_SERVERS,
            "queue.buffering.max.ms": 5,       # max 5ms batching delay
            "queue.buffering.max.messages": 100_000,
            "compression.type": "lz4",
            "acks": "all",                      # wait for all ISR replicas
        })
    return _producer

def produce(topic: str, key: str, value: dict, on_delivery: Callable | None = None) -> None:
    """Non-blocking produce. Delivery is confirmed via callback."""
    producer = get_producer()
    producer.produce(
        topic=topic,
        key=key.encode(),
        value=json.dumps(value).encode(),
        callback=on_delivery or _default_delivery_report,
    )
    producer.poll(0)  # non-blocking: triggers delivery callbacks for completed sends

async def flush_on_shutdown() -> None:
    """Call once during graceful shutdown to drain the queue."""
    get_producer().flush(timeout=10)

def _default_delivery_report(err, msg) -> None:
    if err:
        logger.error("Kafka delivery failed | topic=%s key=%s err=%s",
                     msg.topic(), msg.key(), err)
```

---

## Scaling Workers

```bash
# Each additional replica gets assigned partitions automatically
kubectl scale deployment bid-worker --replicas=5

# With 10 partitions and 5 workers:
# Worker 1 → partitions 0, 1  (handles all lots whose lot_id hashes to 0 or 1)
# Worker 2 → partitions 2, 3
# Worker 3 → partitions 4, 5
# Worker 4 → partitions 6, 7
# Worker 5 → partitions 8, 9
```

Scale trigger: Kafka consumer lag on `bid-processors` group > 1000 messages → add replicas.
Kubernetes HPA watches this via `keda` (KEDA Kafka scaler).

---

## Local Kafka Setup (Docker Compose — KRaft mode, no Zookeeper)

Zookeeper is deprecated since Kafka 3.x and removed in Kafka 4.x. We use KRaft (Kafka's built-in Raft consensus) from the start.

```yaml
kafka:
  image: confluentinc/cp-kafka:7.9.0
  environment:
    KAFKA_NODE_ID: 1
    KAFKA_PROCESS_ROLES: broker,controller
    KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
    KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
    KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
    KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,CONTROLLER:PLAINTEXT
    KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
    KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
    KAFKA_AUTO_CREATE_TOPICS_ENABLE: "false"
    KAFKA_NUM_PARTITIONS: 10
    KAFKA_DEFAULT_REPLICATION_FACTOR: 1       # 1 for local dev; 3 in production
    KAFKA_LOG_DIRS: /var/lib/kafka/data
    CLUSTER_ID: "oni-local-cluster-1"         # must be base64 UUID, stable across restarts
  volumes:
    - kafka_data:/var/lib/kafka/data
  healthcheck:
    test: ["CMD", "kafka-broker-api-versions", "--bootstrap-server", "localhost:9092"]
    interval: 10s
    timeout: 5s
    retries: 5

volumes:
  kafka_data:
```

Topic creation on startup (run once via init container or script):

```bash
kafka-topics --bootstrap-server kafka:9092 --create --topic bids            --partitions 10 --replication-factor 1
kafka-topics --bootstrap-server kafka:9092 --create --topic auction_updates  --partitions 10 --replication-factor 1
kafka-topics --bootstrap-server kafka:9092 --create --topic invalid_bids     --partitions 4  --replication-factor 1
kafka-topics --bootstrap-server kafka:9092 --create --topic auction_events   --partitions 4  --replication-factor 1
kafka-topics --bootstrap-server kafka:9092 --create --topic bids_dlq         --partitions 4  --replication-factor 1
```

---

## Shared Kafka Helpers (shared/kafka/)

```python
# shared/kafka/topics.py
BIDS = "bids"
AUCTION_UPDATES = "auction_updates"
INVALID_BIDS = "invalid_bids"
AUCTION_EVENTS = "auction_events"
BIDS_DLQ = "bids_dlq"
```

See producer pattern above. Consumer helper:

```python
# shared/kafka/consumer.py
from confluent_kafka import Consumer, KafkaError

def get_consumer(group_id: str, topics: list[str]) -> Consumer:
    consumer = Consumer({
        "bootstrap.servers": settings.KAFKA_BOOTSTRAP_SERVERS,
        "group.id": group_id,
        "auto.offset.reset": "earliest",
        "enable.auto.commit": False,          # ALWAYS manual commit
        "max.poll.interval.ms": 300_000,
    })
    consumer.subscribe(topics)
    return consumer
```
