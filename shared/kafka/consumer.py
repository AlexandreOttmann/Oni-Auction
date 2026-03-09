"""
Kafka consumer factory.

Always uses manual commit (enable.auto.commit=False).
Offset is committed only after successful processing — never silently lost.
"""

import os

from confluent_kafka import Consumer


def get_consumer(group_id: str, topics: list[str]) -> Consumer:
    """
    Create and subscribe a Kafka consumer.

    Args:
        group_id: Consumer group ID. Use the constants defined per service:
                  "bid-processors"  — bid-worker
                  "ws-broadcasters" — websocket-service
                  "auction-closers" — auction-timer
                  "dlq-alerter"     — bid-worker DLQ handler
        topics:   List of topic names to subscribe to.
    """
    consumer = Consumer({
        "bootstrap.servers": os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092"),
        "group.id": group_id,
        "auto.offset.reset": "earliest",
        "enable.auto.commit": False,      # ALWAYS manual commit — never change this
        "max.poll.interval.ms": 300_000,  # 5 minutes max between polls
        "session.timeout.ms": 30_000,
        "heartbeat.interval.ms": 10_000,
    })
    consumer.subscribe(topics)
    return consumer
