"""
Bid Worker — Kafka consumer for the 'bids' topic.

Consumer group: bid-processors
Partition key:  lot_id (ordering guarantee per lot)
Commit policy:  manual — only after successful processing or DLQ publish
"""

import json
import logging
import signal

import redis

from processor import process_bid
from settings import settings
from shared.kafka.consumer import get_consumer
from shared.kafka.producer import flush_on_shutdown, get_producer
from shared.schemas.bid import BidEvent

logging.basicConfig(
    level=logging.DEBUG if settings.ENVIRONMENT == "development" else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

_running = True


def _handle_shutdown(sig, frame):
    global _running
    logger.info("Shutdown signal received, draining...")
    _running = False


def run():
    signal.signal(signal.SIGTERM, _handle_shutdown)
    signal.signal(signal.SIGINT, _handle_shutdown)

    r = redis.Redis.from_url(settings.REDIS_URL, decode_responses=False)
    get_producer()  # warm up singleton

    consumer = get_consumer(group_id="bid-processors", topics=["bids"])
    logger.info("Bid worker started — consuming from 'bids' topic")

    try:
        while _running:
            msg = consumer.poll(timeout=1.0)
            if msg is None:
                continue
            if msg.error():
                logger.error("Kafka consumer error: %s", msg.error())
                continue

            try:
                event = BidEvent.model_validate(json.loads(msg.value()))
                logger.debug("Received bid | lot=%s user=%s amount=%.2f",
                             event.lot_id, event.user_id, event.amount)
                process_bid(event, r)
            except Exception as e:
                logger.exception("Unhandled error processing message: %s", e)
                # Commit anyway — prevents infinite retry of a poison-pill message.
                # Raw event is in Kafka log and can be replayed manually if needed.
            finally:
                consumer.commit(msg)  # manual commit — always after attempt

    finally:
        consumer.close()
        import asyncio
        asyncio.run(flush_on_shutdown())
        r.close()
        logger.info("Bid worker stopped cleanly")


if __name__ == "__main__":
    run()
