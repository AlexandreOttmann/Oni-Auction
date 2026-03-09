"""
PostgreSQL persistence for the bid-worker.

The bid-worker (not the API) is the source of truth for the permanent bid record.
We use synchronous psycopg2 here to keep the worker loop simple — no asyncio.
"""

import logging
import os

import psycopg2
import psycopg2.extras

logger = logging.getLogger(__name__)

_conn = None


def get_conn():
    global _conn
    if _conn is None or _conn.closed:
        # Convert asyncpg URL to psycopg2 format
        url = os.environ.get("DATABASE_URL", "postgresql://oni:onidev@postgres:5432/oni")
        url = url.replace("postgresql+asyncpg://", "postgresql://")
        _conn = psycopg2.connect(url)
        _conn.autocommit = True
    return _conn


def insert_bid(bid_id: str, auction_id: str, lot_id: str, user_id: str,
               amount: float, status: str = "VALID") -> None:
    try:
        conn = get_conn()
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO bids (id, auction_id, lot_id, user_id, amount, status)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
                """,
                (bid_id, auction_id, lot_id, user_id, amount, status),
            )
    except Exception as e:
        logger.error("Failed to insert bid %s into DB: %s", bid_id, e)
        # Don't raise — DB write failure must not crash the worker or skip Kafka commit.
        # The Kafka log is the source of truth; bids can be replayed into DB later.
