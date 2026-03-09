# Kafka Design

## Why Kafka

Kafka is the core of Oni's architecture. It solves the hardest problems:
- **Race conditions**: partition key = `auction_id` → all bids for one auction go to one partition → processed in strict order
- **Scalability**: add more workers → Kafka redistributes partitions automatically
- **Durability**: bids are never lost even if a worker crashes mid-processing
- **Event replay**: rebuild auction state at any point from the raw event log
- **Decoupling**: API doesn't know about workers; workers don't know about WebSocket service

---

## Topics

| Topic | Purpose | Key | Partitions |
|-------|---------|-----|-----------|
| `bids` | Raw bid submissions from API | `auction_id` | 10 |
| `auction_updates` | Valid bid processed — broadcast to clients | `auction_id` | 10 |
| `invalid_bids` | Bids that failed validation (too low, wrong auction) | `auction_id` | 4 |
| `auction_events` | Lifecycle events: started, closing, closed, settled | `auction_id` | 4 |

---

## Partition Strategy

```
partition = hash(auction_id) % num_partitions
```

**Why this matters:**
- All bids for `auction_car` → same partition → same worker → no race condition
- Worker processes bids one-by-one, in order received
- Redis update is sequential per auction — no concurrent writes to the same auction state
- If we had 10 partitions and 5 workers → each worker handles 2 auctions simultaneously

---

## Consumer Groups

| Group | Topic | Service | Behavior |
|-------|-------|---------|---------|
| `bid-processors` | `bids` | bid-worker | Processes bids, updates Redis, publishes to `auction_updates` |
| `ws-broadcasters` | `auction_updates` | websocket-service | Broadcasts to connected WebSocket clients |
| `auction-closers` | `auction_events` | auction-timer | Handles CLOSING/CLOSED transitions |
| `analytics` | `*` (all) | future service | Consumes all topics for reporting |

---

## Event Schemas

### `bids` topic

```json
{
  "event_type": "BID_PLACED",
  "auction_id": "auction_car",
  "user_id": "user_42",
  "amount": 150.00,
  "timestamp": "2026-03-09T14:32:00Z",
  "bid_id": "bid_uuid_here"
}
```

### `auction_updates` topic

```json
{
  "event_type": "BID_ACCEPTED",
  "auction_id": "auction_car",
  "highest_bid": 150.00,
  "leader": "user_42",
  "bid_id": "bid_uuid_here",
  "timestamp": "2026-03-09T14:32:00.120Z"
}
```

### `invalid_bids` topic

```json
{
  "event_type": "BID_REJECTED",
  "auction_id": "auction_car",
  "user_id": "user_42",
  "amount": 100.00,
  "reason": "BID_TOO_LOW",
  "current_highest": 150.00,
  "timestamp": "2026-03-09T14:32:01Z"
}
```

### `auction_events` topic

```json
{
  "event_type": "AUCTION_CLOSED",
  "auction_id": "auction_car",
  "winner": "user_42",
  "final_price": 150.00,
  "timestamp": "2026-03-09T15:00:00Z"
}
```

Possible `event_type` values: `AUCTION_SCHEDULED`, `AUCTION_STARTED`, `AUCTION_CLOSING`, `AUCTION_CLOSED`, `AUCTION_SETTLED`, `DUTCH_ROUND_ADVANCED`

---

## Bid Processor Logic (Per Event)

```python
def process_bid(event: BidEvent):
    state = redis.get_auction_state(event.auction_id)

    # Dutch auction: compare to current_price, not highest_bid
    if state.auction_type == "DUTCH":
        if event.amount >= state.current_price:
            close_auction_with_winner(event)
        else:
            publish_invalid(event, reason="PRICE_NOT_MET")
        return

    # English auction: must beat current highest bid
    if event.amount > state.highest_bid:
        redis.update_state(event.auction_id, highest_bid=event.amount, leader=event.user_id)
        redis.append_bid_history(event.auction_id, event)
        publish_auction_update(event)
    else:
        publish_invalid(event, reason="BID_TOO_LOW")
```

---

## Scaling Workers

```bash
# Each additional replica gets assigned partitions automatically
kubectl scale deployment bid-worker --replicas=5

# With 10 partitions and 5 workers:
# Worker 1 → partitions 0, 1
# Worker 2 → partitions 2, 3
# Worker 3 → partitions 4, 5
# Worker 4 → partitions 6, 7
# Worker 5 → partitions 8, 9
# Each partition = all bids for specific auction_ids
```

---

## Local Kafka Setup (Docker Compose)

```yaml
kafka:
  image: confluentinc/cp-kafka:7.5.0
  environment:
    KAFKA_BROKER_ID: 1
    KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
    KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
    KAFKA_AUTO_CREATE_TOPICS_ENABLE: "false"
    KAFKA_NUM_PARTITIONS: 10
  depends_on:
    - zookeeper

zookeeper:
  image: confluentinc/cp-zookeeper:7.5.0
  environment:
    ZOOKEEPER_CLIENT_PORT: 2181
```

---

## Shared Kafka Helpers (shared/kafka/)

```python
# shared/kafka/topics.py
BIDS = "bids"
AUCTION_UPDATES = "auction_updates"
INVALID_BIDS = "invalid_bids"
AUCTION_EVENTS = "auction_events"

# shared/kafka/producer.py
from confluent_kafka import Producer

def get_producer() -> Producer:
    return Producer({"bootstrap.servers": settings.KAFKA_BOOTSTRAP_SERVERS})

def produce(producer: Producer, topic: str, key: str, value: dict):
    producer.produce(
        topic=topic,
        key=key.encode(),
        value=json.dumps(value).encode(),
        callback=delivery_report,
    )
    producer.flush()
```
