"""
Unit tests for services/auction-timer/soft_close.py.

_check_soft_close is the only public function under test.
All Redis helpers and settings are mocked.
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

from freezegun import freeze_time

import soft_close
from soft_close import _check_soft_close


FROZEN_NOW = "2025-06-01T12:00:00Z"
NOW = datetime(2025, 6, 1, 12, 0, 0, tzinfo=timezone.utc)


def _make_english_state(ends_at: str, status: str = "CLOSING") -> dict:
    return {
        "auction_type": "ENGLISH",
        "status": status,
        "ends_at": ends_at,
    }


class TestCheckSoftClose:
    @freeze_time(FROZEN_NOW)
    def test_ignores_non_bid_accepted_events(self):
        r = MagicMock()
        event = {"event_type": "LOT_CLOSED", "lot_id": "lot-1", "auction_id": "auction-1"}

        with patch.object(soft_close, "get_lot_state") as mock_state:
            _check_soft_close(r, event)
            mock_state.assert_not_called()

    @freeze_time(FROZEN_NOW)
    def test_ignores_event_with_no_lot_id(self):
        r = MagicMock()
        event = {"event_type": "BID_ACCEPTED", "auction_id": "auction-1"}

        with patch.object(soft_close, "get_lot_state") as mock_state:
            _check_soft_close(r, event)
            mock_state.assert_not_called()

    @freeze_time(FROZEN_NOW)
    def test_ignores_dutch_lots(self):
        r = MagicMock()
        event = {"event_type": "BID_ACCEPTED", "lot_id": "lot-1", "auction_id": "auction-1"}
        state = {"auction_type": "DUTCH", "status": "ACTIVE", "ends_at": "2025-06-01T12:04:00Z"}

        with patch.object(soft_close, "get_lot_state", return_value=state), \
             patch.object(soft_close, "extend_lot_ends_at") as mock_extend:
            _check_soft_close(r, event)
            mock_extend.assert_not_called()

    @freeze_time(FROZEN_NOW)
    def test_ignores_inactive_lots(self):
        r = MagicMock()
        event = {"event_type": "BID_ACCEPTED", "lot_id": "lot-1", "auction_id": "auction-1"}
        state = {"auction_type": "ENGLISH", "status": "CLOSED", "ends_at": "2025-06-01T12:04:00Z"}

        with patch.object(soft_close, "get_lot_state", return_value=state), \
             patch.object(soft_close, "extend_lot_ends_at") as mock_extend:
            _check_soft_close(r, event)
            mock_extend.assert_not_called()

    @freeze_time(FROZEN_NOW)
    def test_ignores_bid_outside_soft_close_window(self):
        """ends_at is 10 minutes away; default SOFT_CLOSE_WINDOW = 300s (5min). Not within window."""
        r = MagicMock()
        event = {"event_type": "BID_ACCEPTED", "lot_id": "lot-1", "auction_id": "auction-1"}
        ends_at = "2025-06-01T12:10:00Z"  # 600s away
        state = _make_english_state(ends_at, status="ACTIVE")

        with patch.object(soft_close, "get_lot_state", return_value=state), \
             patch.object(soft_close, "extend_lot_ends_at") as mock_extend:
            _check_soft_close(r, event)
            mock_extend.assert_not_called()

    @freeze_time(FROZEN_NOW)
    def test_extends_ends_at_and_publishes_within_window(self):
        """ends_at is 2 minutes away — within the 5 min window → extend by 5 min."""
        r = MagicMock()
        event = {"event_type": "BID_ACCEPTED", "lot_id": "lot-1", "auction_id": "auction-1"}
        ends_at = "2025-06-01T12:02:00Z"  # 120s away
        state = _make_english_state(ends_at, status="CLOSING")

        expected_new_ends_at = (
            datetime(2025, 6, 1, 12, 2, 0, tzinfo=timezone.utc) + timedelta(seconds=300)
        ).isoformat().replace("+00:00", "Z")

        with patch.object(soft_close, "get_lot_state", return_value=state), \
             patch.object(soft_close, "extend_lot_ends_at") as mock_extend, \
             patch.object(soft_close, "publish_to_channel") as mock_pub:
            _check_soft_close(r, event)

            mock_extend.assert_called_once_with(r, "lot-1", expected_new_ends_at)
            mock_pub.assert_called_once()
            pub_payload = mock_pub.call_args[0][2]
            assert pub_payload["event_type"] == "LOT_EXTENDED"
            assert pub_payload["lot_id"] == "lot-1"
            assert pub_payload["ends_at"] == expected_new_ends_at
