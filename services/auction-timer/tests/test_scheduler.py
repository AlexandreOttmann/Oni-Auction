"""
Unit tests for services/auction-timer/scheduler.py.

All Redis, Kafka, and publish calls are mocked.
Time is controlled via freezegun so determinism is guaranteed.
"""

from datetime import datetime, timezone
from unittest.mock import MagicMock, call, patch

import pytest
from freezegun import freeze_time

# scheduler imports its dependencies at module load time, so we patch them
# before the module-level names are bound.
import scheduler
from scheduler import (
    _close_english,
    _handle_dutch_active,
    _handle_english_active,
    _handle_english_closing,
    _handle_scheduled,
    _parse_dt,
    _process_lot,
    tick,
)


# ──────────────────────────────────────────────
# _parse_dt
# ──────────────────────────────────────────────

class TestParseDt:
    def test_iso_with_offset(self):
        result = _parse_dt("2025-06-01T12:00:00+00:00")
        assert result == datetime(2025, 6, 1, 12, 0, 0, tzinfo=timezone.utc)

    def test_z_suffix(self):
        result = _parse_dt("2025-06-01T12:00:00Z")
        assert result == datetime(2025, 6, 1, 12, 0, 0, tzinfo=timezone.utc)

    def test_empty_string_returns_none(self):
        assert _parse_dt("") is None

    def test_bad_string_returns_none(self):
        assert _parse_dt("not-a-date") is None


# ──────────────────────────────────────────────
# _handle_scheduled
# ──────────────────────────────────────────────

class TestHandleScheduled:
    @freeze_time("2025-06-01T12:00:00Z")
    def test_skips_when_not_yet_started(self):
        r = MagicMock()
        now = datetime(2025, 6, 1, 12, 0, 0, tzinfo=timezone.utc)
        state = {"starts_at": "2025-06-01T13:00:00Z"}  # 1h in the future

        with patch.object(scheduler, "open_lot") as mock_open:
            _handle_scheduled(r, "lot-1", "auction-1", state, now)
            mock_open.assert_not_called()

    @freeze_time("2025-06-01T14:00:00Z")
    def test_opens_lot_when_starts_at_passed(self):
        r = MagicMock()
        now = datetime(2025, 6, 1, 14, 0, 0, tzinfo=timezone.utc)
        state = {"starts_at": "2025-06-01T13:00:00Z"}  # 1h in the past

        with patch.object(scheduler, "open_lot") as mock_open, \
             patch.object(scheduler, "produce") as mock_produce, \
             patch.object(scheduler, "publish_to_channel") as mock_pub:
            _handle_scheduled(r, "lot-1", "auction-1", state, now)
            mock_open.assert_called_once_with(r, "lot-1")
            mock_produce.assert_called_once()
            mock_pub.assert_called_once()

    def test_skips_when_starts_at_missing(self):
        r = MagicMock()
        now = datetime(2025, 6, 1, 14, 0, 0, tzinfo=timezone.utc)

        with patch.object(scheduler, "open_lot") as mock_open:
            _handle_scheduled(r, "lot-1", "auction-1", {}, now)
            mock_open.assert_not_called()


# ──────────────────────────────────────────────
# _handle_english_active
# ──────────────────────────────────────────────

class TestHandleEnglishActive:
    def test_skips_when_plenty_of_time_remaining(self):
        r = MagicMock()
        now = datetime(2025, 6, 1, 12, 0, 0, tzinfo=timezone.utc)
        state = {"ends_at": "2025-06-01T13:00:00Z"}  # 60min left

        with patch.object(scheduler, "set_lot_closing") as mock_closing, \
             patch.object(scheduler, "close_lot_expired") as mock_close:
            _handle_english_active(r, "lot-1", "auction-1", state, now)
            mock_closing.assert_not_called()
            mock_close.assert_not_called()

    def test_transitions_to_closing_within_warn_window(self):
        r = MagicMock()
        # 2 minutes left, CLOSING_WARN_SECONDS default = 300 (5 min)
        now = datetime(2025, 6, 1, 12, 58, 0, tzinfo=timezone.utc)
        state = {"ends_at": "2025-06-01T13:00:00Z"}

        with patch.object(scheduler, "set_lot_closing") as mock_closing, \
             patch.object(scheduler, "produce"), \
             patch.object(scheduler, "publish_to_channel"):
            _handle_english_active(r, "lot-1", "auction-1", state, now)
            mock_closing.assert_called_once_with(r, "lot-1")

    def test_closes_directly_when_ends_at_passed(self):
        r = MagicMock()
        now = datetime(2025, 6, 1, 14, 0, 0, tzinfo=timezone.utc)
        state = {"ends_at": "2025-06-01T13:00:00Z", "leader": "user-42", "highest_bid": "1500"}

        with patch.object(scheduler, "close_lot_expired") as mock_close, \
             patch.object(scheduler, "produce"), \
             patch.object(scheduler, "publish_to_channel"):
            _handle_english_active(r, "lot-1", "auction-1", state, now)
            mock_close.assert_called_once_with(r, "lot-1")

    def test_skips_when_ends_at_missing(self):
        r = MagicMock()
        now = datetime(2025, 6, 1, 12, 0, 0, tzinfo=timezone.utc)
        with patch.object(scheduler, "set_lot_closing") as mock_closing:
            _handle_english_active(r, "lot-1", "auction-1", {}, now)
            mock_closing.assert_not_called()


# ──────────────────────────────────────────────
# _handle_english_closing
# ──────────────────────────────────────────────

class TestHandleEnglishClosing:
    def test_closes_when_ends_at_passed(self):
        r = MagicMock()
        now = datetime(2025, 6, 1, 14, 0, 0, tzinfo=timezone.utc)
        state = {"ends_at": "2025-06-01T13:00:00Z", "leader": "user-1", "highest_bid": "2000"}

        with patch.object(scheduler, "close_lot_expired") as mock_close, \
             patch.object(scheduler, "produce"), \
             patch.object(scheduler, "publish_to_channel"):
            _handle_english_closing(r, "lot-1", "auction-1", state, now)
            mock_close.assert_called_once_with(r, "lot-1")

    def test_skips_when_ends_at_in_future(self):
        r = MagicMock()
        now = datetime(2025, 6, 1, 12, 0, 0, tzinfo=timezone.utc)
        state = {"ends_at": "2025-06-01T13:00:00Z"}

        with patch.object(scheduler, "close_lot_expired") as mock_close:
            _handle_english_closing(r, "lot-1", "auction-1", state, now)
            mock_close.assert_not_called()


# ──────────────────────────────────────────────
# _handle_dutch_active
# ──────────────────────────────────────────────

class TestHandleDutchActive:
    def test_initialises_clock_when_round_started_at_missing(self):
        r = MagicMock()
        now = datetime(2025, 6, 1, 12, 0, 0, tzinfo=timezone.utc)
        state = {}  # no round_started_at

        with patch.object(scheduler, "init_dutch_round_clock") as mock_init:
            _handle_dutch_active(r, "lot-1", "auction-1", state, now)
            mock_init.assert_called_once_with(r, "lot-1")

    def test_skips_when_round_still_running(self):
        r = MagicMock()
        # 10s elapsed, round_duration = 30s
        now = datetime(2025, 6, 1, 12, 0, 10, tzinfo=timezone.utc)
        state = {
            "round_started_at": "2025-06-01T12:00:00Z",
            "round_duration": "30",
            "current_price": "500",
            "price_step": "50",
            "price_floor": "100",
            "current_round": "1",
        }
        with patch.object(scheduler, "advance_dutch_round") as mock_adv, \
             patch.object(scheduler, "close_dutch_no_winner") as mock_close:
            _handle_dutch_active(r, "lot-1", "auction-1", state, now)
            mock_adv.assert_not_called()
            mock_close.assert_not_called()

    def test_advances_round_when_duration_elapsed(self):
        r = MagicMock()
        # 35s elapsed, round_duration = 30s
        now = datetime(2025, 6, 1, 12, 0, 35, tzinfo=timezone.utc)
        state = {
            "round_started_at": "2025-06-01T12:00:00Z",
            "round_duration": "30",
            "current_price": "500",
            "price_step": "50",
            "price_floor": "100",
            "current_round": "1",
            "currency": "USD",
        }
        with patch.object(scheduler, "advance_dutch_round") as mock_adv, \
             patch.object(scheduler, "produce"), \
             patch.object(scheduler, "publish_to_channel"):
            _handle_dutch_active(r, "lot-1", "auction-1", state, now)
            mock_adv.assert_called_once_with(r, "lot-1", 450.0, 2)

    def test_closes_no_winner_when_price_would_drop_below_floor(self):
        r = MagicMock()
        # price_step would take 120 below floor of 100
        now = datetime(2025, 6, 1, 12, 0, 35, tzinfo=timezone.utc)
        state = {
            "round_started_at": "2025-06-01T12:00:00Z",
            "round_duration": "30",
            "current_price": "150",
            "price_step": "100",
            "price_floor": "100",
            "current_round": "3",
            "currency": "USD",
        }
        with patch.object(scheduler, "close_dutch_no_winner") as mock_close, \
             patch.object(scheduler, "produce"), \
             patch.object(scheduler, "publish_to_channel"):
            _handle_dutch_active(r, "lot-1", "auction-1", state, now)
            mock_close.assert_called_once_with(r, "lot-1")


# ──────────────────────────────────────────────
# _process_lot
# ──────────────────────────────────────────────

class TestProcessLot:
    def test_skips_closed_lot(self):
        r = MagicMock()
        now = datetime(2025, 6, 1, 12, 0, 0, tzinfo=timezone.utc)
        state = {"status": "CLOSED", "auction_type": "ENGLISH"}

        with patch.object(scheduler, "get_lot_state", return_value=state), \
             patch.object(scheduler, "close_lot_expired") as mock_close:
            _process_lot(r, "lot-1", now)
            mock_close.assert_not_called()

    def test_skips_missing_lot(self):
        r = MagicMock()
        now = datetime(2025, 6, 1, 12, 0, 0, tzinfo=timezone.utc)

        with patch.object(scheduler, "get_lot_state", return_value=None):
            # Should not raise
            _process_lot(r, "lot-missing", now)

    def test_routes_dutch_active_to_dutch_handler(self):
        r = MagicMock()
        now = datetime(2025, 6, 1, 12, 0, 35, tzinfo=timezone.utc)
        state = {
            "status": "ACTIVE",
            "auction_type": "DUTCH",
            "auction_id": "auction-1",
            "round_started_at": "2025-06-01T12:00:00Z",
            "round_duration": "30",
            "current_price": "500",
            "price_step": "50",
            "price_floor": "100",
            "current_round": "1",
            "currency": "USD",
        }
        with patch.object(scheduler, "get_lot_state", return_value=state), \
             patch.object(scheduler, "advance_dutch_round") as mock_adv, \
             patch.object(scheduler, "produce"), \
             patch.object(scheduler, "publish_to_channel"):
            _process_lot(r, "lot-1", now)
            mock_adv.assert_called_once()

    def test_routes_english_active_to_english_handler(self):
        r = MagicMock()
        now = datetime(2025, 6, 1, 14, 0, 0, tzinfo=timezone.utc)
        state = {
            "status": "ACTIVE",
            "auction_type": "ENGLISH",
            "auction_id": "auction-1",
            "ends_at": "2025-06-01T13:00:00Z",
            "leader": "",
            "highest_bid": "0",
        }
        with patch.object(scheduler, "get_lot_state", return_value=state), \
             patch.object(scheduler, "close_lot_expired") as mock_close, \
             patch.object(scheduler, "produce"), \
             patch.object(scheduler, "publish_to_channel"):
            _process_lot(r, "lot-1", now)
            mock_close.assert_called_once()
