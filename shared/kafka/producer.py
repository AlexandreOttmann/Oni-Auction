"""
Non-blocking Kafka producer.

Key design decisions:
- Single process-level producer instance (thread-safe in confluent-kafka)
- poll(0) after each produce() triggers delivery callbacks without blocking
- flush() only on graceful shutdown — never after each message
- acks=all ensures no message loss (waits for all ISR replicas)
"""

import json
import logging
import os
from typing import Any, Callable, Optional

from confluent_kafka import Producer

logger = logging.getLogger(__name__)

_producer: Optional[Producer] = None


def get_producer() -> Producer:
    global _producer
    if _producer is None:
        _producer = Producer({
            "bootstrap.servers": os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092"),
            "queue.buffering.max.ms": 5,          # max 5ms batching delay — keeps latency low
            "queue.buffering.max.messages": 100_000,
            "compression.type": "lz4",
            "acks": "all",                         # wait for all ISR replicas — no data loss
            "retries": 5,
            "retry.backoff.ms": 100,
            "enable.idempotence": True,            # exactly-once producer semantics
        })
    return _producer


def produce(
    topic: str,
    key: str,
    value: dict[str, Any],
    on_delivery: Optional[Callable] = None,
) -> None:
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
    """Call once during graceful shutdown to drain the internal queue."""
    if _producer is not None:
        remaining = _producer.flush(timeout=10)
        if remaining > 0:
            logger.warning("Kafka shutdown: %d messages not delivered", remaining)


def _default_delivery_report(err, msg) -> None:
    if err:
        logger.error(
            "Kafka delivery failed | topic=%s key=%s err=%s",
            msg.topic(),
            msg.key().decode() if msg.key() else None,
            err,
        )
    else:
        logger.debug(
            "Kafka delivered | topic=%s partition=%d offset=%d key=%s",
            msg.topic(),
            msg.partition(),
            msg.offset(),
            msg.key().decode() if msg.key() else None,
        )
