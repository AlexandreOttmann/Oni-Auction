"""
Unit tests for services/bid-worker/processor.py.

Redis, Kafka producer, and DB are all mocked.
"""

from unittest.mock import MagicMock, call, patch
from uuid import uuid4

import pytest
import redis

import processor
from processor import process_bid
from shared.schemas.bid import BidEvent


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def _make_bid(amount: float = 1500.0, lot_id: str = "lot-1", auction_id: str = "auction-1") -> BidEvent:
    return BidEvent(
        auction_id=auction_id,
        lot_id=lot_id,
        user_id="user-42",
        amount=amount,
        currency="USD",
        bid_id=str(uuid4()),
    )


def _english_state(highest_bid: float = 1000.0, status: str = "ACTIVE") -> dict:
    return {
        "auction_type": "ENGLISH",
        "status": status,
        "highest_bid": str(highest_bid),
        "bid_count": "5",
        "ends_at": "2025-06-01T13:00:00Z",
        "currency": "USD",
    }


def _dutch_state(current_price: float = 1000.0, status: str = "ACTIVE") -> dict:
    return {
        "auction_type": "DUTCH",
        "status": status,
        "current_price": str(current_price),
        "currency": "USD",
    }


# ──────────────────────────────────────────────
# English auction
# ──────────────────────────────────────────────

class TestProcessEnglish:
    def test_valid_bid_accepted(self):
        """Bid above highest → Redis update, DB insert VALID, Kafka produce."""
        r = MagicMock()
        event = _make_bid(amount=1500.0)
        state = _english_state(highest_bid=1000.0)

        with patch.object(processor, "get_lot_state", return_value=state), \
             patch.object(processor, "update_lot_english") as mock_redis, \
             patch.object(processor, "insert_bid") as mock_db, \
             patch.object(processor, "produce") as mock_produce, \
             patch.object(processor, "publish_to_channel") as mock_pub:
            process_bid(event, r)

            mock_redis.assert_called_once_with(r, event, 6)
            mock_db.assert_called_once_with(
                event.bid_id, event.auction_id, event.lot_id,
                event.user_id, event.amount, "VALID",
            )
            mock_produce.assert_called_once()
            mock_pub.assert_called_once()

    def test_bid_too_low_rejected(self):
        """Bid <= highest → DB insert INVALID, invalid_bids topic, no Redis update."""
        r = MagicMock()
        event = _make_bid(amount=500.0)
        state = _english_state(highest_bid=1000.0)

        with patch.object(processor, "get_lot_state", return_value=state), \
             patch.object(processor, "update_lot_english") as mock_redis, \
             patch.object(processor, "insert_bid") as mock_db, \
             patch.object(processor, "produce") as mock_produce:
            process_bid(event, r)

            mock_redis.assert_not_called()
            mock_db.assert_called_once_with(
                event.bid_id, event.auction_id, event.lot_id,
                event.user_id, event.amount, "INVALID",
            )
            # produce called once for invalid_bids topic
            assert mock_produce.call_count == 1
            topic_used = mock_produce.call_args.kwargs.get("topic") or mock_produce.call_args[1].get("topic")
            from shared.kafka import topics
            assert topic_used == topics.INVALID_BIDS

    def test_equal_to_highest_is_rejected(self):
        """Bid must STRICTLY exceed current highest — equal is not accepted."""
        r = MagicMock()
        event = _make_bid(amount=1000.0)
        state = _english_state(highest_bid=1000.0)

        with patch.object(processor, "get_lot_state", return_value=state), \
             patch.object(processor, "update_lot_english") as mock_redis, \
             patch.object(processor, "insert_bid"), \
             patch.object(processor, "produce"):
            process_bid(event, r)
            mock_redis.assert_not_called()

    def test_bid_on_closing_lot_accepted(self):
        """CLOSING lots still accept bids (soft-close keeps them open)."""
        r = MagicMock()
        event = _make_bid(amount=1500.0)
        state = _english_state(highest_bid=1000.0, status="CLOSING")

        with patch.object(processor, "get_lot_state", return_value=state), \
             patch.object(processor, "update_lot_english") as mock_redis, \
             patch.object(processor, "insert_bid"), \
             patch.object(processor, "produce"), \
             patch.object(processor, "publish_to_channel"):
            process_bid(event, r)
            mock_redis.assert_called_once()


# ──────────────────────────────────────────────
# Dutch auction
# ──────────────────────────────────────────────

class TestProcessDutch:
    def test_bid_meets_price_wins(self):
        """Bid >= current_price → lot closed at current_price, LOT_CLOSED event."""
        r = MagicMock()
        event = _make_bid(amount=1000.0)
        state = _dutch_state(current_price=1000.0)

        with patch.object(processor, "get_lot_state", return_value=state), \
             patch.object(processor, "close_lot") as mock_close, \
             patch.object(processor, "insert_bid") as mock_db, \
             patch.object(processor, "produce") as mock_produce, \
             patch.object(processor, "publish_to_channel") as mock_pub:
            process_bid(event, r)

            mock_close.assert_called_once_with(r, "lot-1", winner="user-42", final_price=1000.0)
            # DB insert at current_price, not bid amount
            mock_db.assert_called_once_with(
                event.bid_id, event.auction_id, event.lot_id,
                event.user_id, 1000.0, "VALID",
            )
            mock_produce.assert_called_once()
            mock_pub.assert_called_once()

    def test_bid_above_price_also_wins(self):
        """Bid > current_price still wins (buyer pays current_price)."""
        r = MagicMock()
        event = _make_bid(amount=1200.0)
        state = _dutch_state(current_price=1000.0)

        with patch.object(processor, "get_lot_state", return_value=state), \
             patch.object(processor, "close_lot") as mock_close, \
             patch.object(processor, "insert_bid") as mock_db, \
             patch.object(processor, "produce"), \
             patch.object(processor, "publish_to_channel"):
            process_bid(event, r)

            mock_close.assert_called_once()
            # Still inserted at current_price
            _, _, _, _, price_arg, _ = mock_db.call_args[0]
            assert price_arg == 1000.0

    def test_bid_below_price_rejected(self):
        """Bid < current_price → PRICE_NOT_MET invalid event, no close."""
        r = MagicMock()
        event = _make_bid(amount=500.0)
        state = _dutch_state(current_price=1000.0)

        with patch.object(processor, "get_lot_state", return_value=state), \
             patch.object(processor, "close_lot") as mock_close, \
             patch.object(processor, "insert_bid") as mock_db, \
             patch.object(processor, "produce") as mock_produce:
            process_bid(event, r)

            mock_close.assert_not_called()
            mock_db.assert_called_once_with(
                event.bid_id, event.auction_id, event.lot_id,
                event.user_id, event.amount, "INVALID",
            )


# ──────────────────────────────────────────────
# Guard rails
# ──────────────────────────────────────────────

class TestProcessBidGuards:
    def test_lot_not_found_publishes_invalid(self):
        r = MagicMock()
        event = _make_bid()

        with patch.object(processor, "get_lot_state", return_value=None), \
             patch.object(processor, "produce") as mock_produce:
            process_bid(event, r)
            mock_produce.assert_called_once()
            payload = mock_produce.call_args[1].get("value") or mock_produce.call_args[0][2]
            assert payload["reason"] == "LOT_NOT_FOUND"

    def test_closed_lot_publishes_invalid(self):
        r = MagicMock()
        event = _make_bid()
        state = _english_state(status="CLOSED")

        with patch.object(processor, "get_lot_state", return_value=state), \
             patch.object(processor, "produce") as mock_produce:
            process_bid(event, r)
            mock_produce.assert_called_once()
            payload = mock_produce.call_args[1].get("value") or mock_produce.call_args[0][2]
            assert payload["reason"] == "LOT_CLOSED"


# ──────────────────────────────────────────────
# Redis retry + DLQ
# ──────────────────────────────────────────────

class TestRedisRetryAndDLQ:
    def test_retries_on_redis_error_then_succeeds(self):
        """First call raises RedisError, second succeeds → no DLQ."""
        r = MagicMock()
        event = _make_bid(amount=1500.0)
        state = _english_state(highest_bid=1000.0)

        call_count = 0

        def flaky_get_state(_r, _lot_id):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise redis.RedisError("timeout")
            return state

        with patch.object(processor, "get_lot_state", side_effect=flaky_get_state), \
             patch.object(processor, "update_lot_english"), \
             patch.object(processor, "insert_bid"), \
             patch.object(processor, "produce"), \
             patch.object(processor, "publish_to_channel"), \
             patch("time.sleep"):  # time is imported locally in processor's except block
            process_bid(event, r)

        assert call_count == 2

    def test_sends_to_dlq_after_three_redis_failures(self):
        """3 consecutive RedisErrors → DLQ, no valid produce."""
        r = MagicMock()
        event = _make_bid()

        with patch.object(processor, "get_lot_state", side_effect=redis.RedisError("timeout")), \
             patch.object(processor, "produce") as mock_produce, \
             patch("time.sleep"):  # time is imported locally in processor's except block
            process_bid(event, r)

        # Should produce exactly once, to the DLQ topic
        assert mock_produce.call_count == 1
        from shared.kafka import topics
        topic_used = mock_produce.call_args[1].get("topic") or mock_produce.call_args[0][0]
        assert topic_used == topics.BIDS_DLQ
