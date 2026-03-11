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
from jose import JWTError, jwt

from connection_manager import manager
from lot_state import get_lot_snapshot
from settings import settings

_ALGORITHM = "HS256"
_COOKIE_NAME = "oni_token"


def _authenticate_websocket(websocket: WebSocket) -> str | None:
    """
    Validate the HttpOnly JWT cookie on the WebSocket handshake.
    Returns the user_id (sub claim) on success, None on failure.
    Browsers send cookies automatically on same-origin WS upgrades.
    """
    token = websocket.cookies.get(_COOKIE_NAME)
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[_ALGORITHM])
        user_id = payload.get("sub")
        return user_id if user_id else None
    except JWTError:
        return None

logging.basicConfig(
    level=logging.DEBUG if settings.ENVIRONMENT == "development" else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# Background tasks
# ─────────────────────────────────────────────

async def watcher_count_broadcast_loop() -> None:
    """
    Broadcast live viewer counts to each active lot every 2 seconds.

    Replaces the per-connect/disconnect broadcast that caused O(n²) fanout
    under load: with 1000 simultaneous connects, the old approach triggered
    ~500,000 send_json calls in a burst, saturating the event loop.
    """
    while True:
        await asyncio.sleep(2)
        for lot_id in list(manager.rooms.keys()):
            count = manager.watcher_count(lot_id)
            if count > 0:
                await manager.broadcast(lot_id, {
                    "event_type": "WATCHER_COUNT",
                    "lot_id": lot_id,
                    "count": count,
                })


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
    watcher_task = asyncio.create_task(watcher_count_broadcast_loop())

    yield

    kafka_task.cancel()
    sub_task.cancel()
    watcher_task.cancel()
    await app.state.redis.aclose()
    logger.info("websocket-service stopped")


app = FastAPI(title="Oni WebSocket Service", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["Content-Type"],
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

    Authentication: requires a valid oni_token HttpOnly cookie (same JWT as REST API).
    """
    user_id = _authenticate_websocket(websocket)
    if not user_id:
        await websocket.close(code=1008, reason="Unauthorized")
        return

    auction_id = websocket.query_params.get("auction_id", "")

    await websocket.accept()
    manager.connect(lot_id, websocket)

    try:
        # Send full state snapshot immediately on connect
        snapshot = await get_lot_snapshot(app.state.redis, auction_id, lot_id)
        await websocket.send_json(snapshot)
        logger.info("WS connected | lot=%s auction=%s user=%s", lot_id, auction_id, user_id)

        while True:
            # Keep connection alive — client can send pings, we ignore them
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(lot_id, websocket)
        logger.info("WS disconnected | lot=%s", lot_id)


@app.websocket("/ws/auction/{auction_id}")
async def auction_ws(websocket: WebSocket, auction_id: str):
    """
    Connect to a live auction feed by auction_id (resolves lot_id internally).

    Clients connect with the auction_id they have from the URL — the service
    looks up the lot_id from Redis and joins the correct room.

    Authentication: requires a valid oni_token HttpOnly cookie (same JWT as REST API).
    """
    user_id = _authenticate_websocket(websocket)
    if not user_id:
        await websocket.close(code=1008, reason="Unauthorized")
        return

    r: aioredis.Redis = app.state.redis

    await websocket.accept()

    lot_id_bytes = await r.hget(f"auction:{auction_id}", "lot_id")

    if not lot_id_bytes:
        await websocket.send_json({"type": "ERROR", "code": "AUCTION_NOT_FOUND"})
        await websocket.close()
        return

    lot_id = lot_id_bytes.decode()
    manager.connect(lot_id, websocket)

    try:
        snapshot = await get_lot_snapshot(r, auction_id, lot_id)
        await websocket.send_json(snapshot)
        logger.info("WS connected | auction=%s lot=%s user=%s", auction_id, lot_id, user_id)

        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(lot_id, websocket)
        logger.info("WS disconnected | auction=%s lot=%s", auction_id, lot_id)


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
