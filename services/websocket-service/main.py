# TODO: implement websocket-service (Phase 2)
# WebSocket endpoint: /ws/auction/{auction_id}
# Consumes from auction_updates + auction_events Kafka topics
# Broadcasts to subscribed WS clients via Redis Pub/Sub
# See .claude/context/kafka-design.md for full architecture

from fastapi import FastAPI

app = FastAPI(title="Oni WebSocket Service", version="0.1.0")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "websocket-service"}
