"""
WebSocket Service

Two responsibilities:
1. WS endpoint /ws/lot/{lot_id} — accepts client connections, sends state snapshot on connect
2. Kafka consumer loop — consumes auction_updates + auction_events, broadcasts via Redis pub/sub

Architecture (from kafka-design.md):
  Kafka → consumer loop → Redis pub/sub publish → Redis sub listener → broadcast to WS clients

The Redis pub/sub hop lets multiple WS service instances share the same subscriptions.
"""

import asyncio
import json
import logging
from contextlib import asynccontextmanager

import redis.asyncio as aioredis
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from connection_manager import manager
from lot_state import get_lot_snapshot
from settings import settings

logging.basicConfig(
    level=logging.DEBUG if settings.ENVIRONMENT == "development" else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# Background tasks
# ─────────────────────────────────────────────

async def kafka_to_redis_loop(app: FastAPI) -> None:
    """
    Consume auction_updates + auction_events from Kafka,
    publish each event to the matching Redis pub/sub channel.
    """
    from confluent_kafka import Consumer
    consumer = Consumer({
        "bootstrap.servers": settings.KAFKA_BOOTSTRAP_SERVERS,
        "group.id": "ws-broadcasters",
        "auto.offset.reset": "latest",       # WS clients only need live updates
        "enable.auto.commit": True,           # fire-and-forget — no durability needed for broadcast
    })
    consumer.subscribe(["auction_updates", "auction_events"])
    logger.info("Kafka consumer started — watching auction_updates + auction_events")

    r: aioredis.Redis = app.state.redis

    try:
        while True:
            msg = consumer.poll(0.01)
            if msg and not msg.error():
                try:
                    event = json.loads(msg.value())
                    lot_id = event.get("lot_id")
                    auction_id = event.get("auction_id")

                    if lot_id:
                        await r.publish(f"lot:{lot_id}", json.dumps(event))
                    if auction_id:
                        await r.publish(f"auction:{auction_id}", json.dumps(event))
                except Exception as e:
                    logger.exception("Error processing Kafka message: %s", e)
            await asyncio.sleep(0)
    finally:
        consumer.close()


async def redis_subscriber_loop(app: FastAPI) -> None:
    """
    Subscribe to Redis pub/sub channels for all currently connected lots.
    Broadcast received events to matching WebSocket clients.
    """
    # Use a separate Redis connection for pub/sub (blocking mode)
    r_sub = aioredis.from_url(settings.REDIS_URL)
    pubsub = r_sub.pubsub()

    # Subscribe to a wildcard pattern — catches lot:*, auction:*, user:*
    await pubsub.psubscribe("lot:*", "auction:*", "user:*")
    logger.info("Redis pub/sub subscriber ready — listening on lot:*, auction:*, user:*")

    try:
        async for message in pubsub.listen():
            if message["type"] not in ("pmessage", "message"):
                continue
            try:
                channel = message["channel"].decode() if isinstance(message["channel"], bytes) else message["channel"]
                data = json.loads(message["data"])

                # Route to the right room by lot_id from the event payload
                lot_id = data.get("lot_id")
                if lot_id and lot_id in manager.rooms:
                    await manager.broadcast(lot_id, data)

            except Exception as e:
                logger.exception("Error in Redis subscriber: %s", e)
    finally:
        await pubsub.unsubscribe()
        await r_sub.aclose()


# ─────────────────────────────────────────────
# App lifecycle
# ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = aioredis.from_url(settings.REDIS_URL)
    logger.info("Starting websocket-service")

    kafka_task = asyncio.create_task(kafka_to_redis_loop(app))
    sub_task = asyncio.create_task(redis_subscriber_loop(app))

    yield

    kafka_task.cancel()
    sub_task.cancel()
    await app.state.redis.aclose()
    logger.info("websocket-service stopped")


app = FastAPI(title="Oni WebSocket Service", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# WebSocket endpoint
# ─────────────────────────────────────────────

@app.websocket("/ws/lot/{lot_id}")
async def lot_ws(websocket: WebSocket, lot_id: str):
    """
    Connect to a live lot feed.

    Query params:
      auction_id — required, used for state snapshot lookup
    """
    auction_id = websocket.query_params.get("auction_id", "")

    await websocket.accept()
    manager.connect(lot_id, websocket)

    # Send full state snapshot immediately on connect
    snapshot = await get_lot_snapshot(app.state.redis, auction_id, lot_id)
    await websocket.send_json(snapshot)
    logger.info("WS connected | lot=%s auction=%s", lot_id, auction_id)

    try:
        while True:
            # Keep connection alive — client can send pings, we ignore them
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(lot_id, websocket)
        logger.info("WS disconnected | lot=%s", lot_id)


# ─────────────────────────────────────────────
# HTTP endpoints
# ─────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "websocket-service"}


@app.get("/stats")
async def stats():
    return {
        "connected_lots": len(manager.rooms),
        "total_connections": sum(len(v) for v in manager.rooms.values()),
    }
