"""
In-memory WebSocket connection registry.

rooms: lot_id → set of active WebSocket connections

For multi-instance scaling, replace with Redis Sets.
See .claude/context/kafka-design.md — ws:connections:{auction_id}
"""

import logging
from collections import defaultdict

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.rooms: dict[str, set[WebSocket]] = defaultdict(set)

    def connect(self, lot_id: str, ws: WebSocket) -> None:
        self.rooms[lot_id].add(ws)
        logger.debug("WS connected | lot=%s total=%d", lot_id, len(self.rooms[lot_id]))

    def disconnect(self, lot_id: str, ws: WebSocket) -> None:
        self.rooms[lot_id].discard(ws)
        if not self.rooms[lot_id]:
            del self.rooms[lot_id]
        logger.debug("WS disconnected | lot=%s", lot_id)

    async def broadcast(self, lot_id: str, message: dict) -> None:
        dead: set[WebSocket] = set()
        for ws in self.rooms.get(lot_id, set()):
            try:
                await ws.send_json(message)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.disconnect(lot_id, ws)

    async def send_personal(self, ws: WebSocket, message: dict) -> None:
        try:
            await ws.send_json(message)
        except Exception as e:
            logger.debug("Failed to send personal message: %s", e)


manager = ConnectionManager()
