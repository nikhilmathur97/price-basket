"""
WebSocket endpoint — real-time price updates pushed to connected clients.
Clients subscribe to product IDs: {"action": "subscribe", "product_ids": ["uuid1", ...]}
"""
import asyncio
import json
import uuid
from typing import Dict, Set

import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.cache.redis_client import get_redis
from app.models.price import PlatformPrice

log = structlog.get_logger(__name__)
router = APIRouter()


class ConnectionManager:
    """Tracks active WebSocket connections and their product subscriptions."""

    def __init__(self):
        # websocket → set of subscribed product_ids
        self._connections: Dict[WebSocket, Set[str]] = {}

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections[ws] = set()
        log.info("ws_connected", total=len(self._connections))

    def disconnect(self, ws: WebSocket) -> None:
        self._connections.pop(ws, None)
        log.info("ws_disconnected", total=len(self._connections))

    def subscribe(self, ws: WebSocket, product_ids: list[str]) -> None:
        self._connections[ws].update(product_ids)

    def unsubscribe(self, ws: WebSocket, product_ids: list[str]) -> None:
        for pid in product_ids:
            self._connections[ws].discard(pid)

    async def broadcast_price_update(self, product_id: str, payload: dict) -> None:
        """Send price update to all clients subscribed to this product."""
        dead = []
        for ws, subscriptions in self._connections.items():
            if product_id in subscriptions:
                try:
                    await ws.send_json({"type": "price_update", "product_id": product_id, **payload})
                except Exception:
                    dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()


@router.websocket("/prices")
async def price_websocket(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            raw = await ws.receive_text()
            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_json({"type": "error", "detail": "Invalid JSON"})
                continue

            action = message.get("action")
            product_ids = message.get("product_ids", [])

            if action == "subscribe":
                manager.subscribe(ws, product_ids)
                await ws.send_json({"type": "subscribed", "product_ids": product_ids})

            elif action == "unsubscribe":
                manager.unsubscribe(ws, product_ids)
                await ws.send_json({"type": "unsubscribed", "product_ids": product_ids})

            elif action == "ping":
                await ws.send_json({"type": "pong"})

            else:
                await ws.send_json({"type": "error", "detail": f"Unknown action: {action}"})

    except WebSocketDisconnect:
        manager.disconnect(ws)


async def push_price_update(product_id: str, prices: list) -> None:
    """
    Called by the Celery worker after a successful price refresh.
    Publishes via Redis pub/sub so multiple API pods can broadcast.
    Falls back to direct broadcast when Redis is unavailable.
    """
    redis = await get_redis()
    if redis is None:
        # No Redis — broadcast directly in this process only
        await manager.broadcast_price_update(product_id, {"prices": prices})
        return
    payload = json.dumps({"product_id": product_id, "prices": prices})
    await redis.publish("price_updates", payload)


async def redis_subscriber_task() -> None:
    """
    Long-running asyncio task that listens to the Redis pub/sub channel
    and broadcasts incoming messages to all relevant WS clients.
    Skipped when Redis is unavailable (single-process direct broadcast is used instead).
    """
    redis = await get_redis()
    if redis is None:
        log.info("redis_pubsub_skipped", reason="Redis unavailable — using direct broadcast")
        return

    pubsub = redis.pubsub()
    await pubsub.subscribe("price_updates")
    log.info("redis_pubsub_listening", channel="price_updates")

    async for message in pubsub.listen():
        if message["type"] != "message":
            continue
        try:
            data = json.loads(message["data"])
            await manager.broadcast_price_update(data["product_id"], {"prices": data.get("prices", [])})
        except Exception as exc:
            log.warning("pubsub_error", error=str(exc))
