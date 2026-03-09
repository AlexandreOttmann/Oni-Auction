#!/bin/bash
# Seed a test English auction and a test Dutch auction into Redis.
# Run once after docker compose up to get live data for the API and frontend.
#
# Usage: bash infra/scripts/seed-redis.sh

REDIS_CLI="docker exec oni-redis redis-cli"

AUCTION_ID="auction-test-english-001"
LOT_ID="lot-test-english-001"

echo "Seeding English auction..."
$REDIS_CLI HSET "lot:${LOT_ID}:state" \
  auction_type   ENGLISH \
  status         ACTIVE \
  title          "Car Parts Sale — Lot A: Body" \
  currency       USD \
  highest_bid    0 \
  leader         "" \
  bid_count      0 \
  ends_at        "2026-12-31T23:59:59Z"

$REDIS_CLI HSET "auction:${AUCTION_ID}" \
  lot_id "${LOT_ID}"

echo "English auction seeded: auction_id=${AUCTION_ID} lot_id=${LOT_ID}"

# ─────────────────────────────────────────────
DUTCH_AUCTION_ID="auction-test-dutch-001"
DUTCH_LOT_ID="lot-test-dutch-001"

echo "Seeding Dutch auction..."
$REDIS_CLI HSET "lot:${DUTCH_LOT_ID}:state" \
  auction_type   DUTCH \
  status         ACTIVE \
  title          "Car Parts Sale — Lot B: Engine" \
  currency       USD \
  current_price  500 \
  price_floor    100 \
  price_step     50 \
  current_round  1 \
  leader         "" \
  bid_count      0 \
  ends_at        "2026-12-31T23:59:59Z"

$REDIS_CLI HSET "auction:${DUTCH_AUCTION_ID}" \
  lot_id "${DUTCH_LOT_ID}"

echo "Dutch auction seeded: auction_id=${DUTCH_AUCTION_ID} lot_id=${DUTCH_LOT_ID}"

echo ""
echo "Test endpoints:"
echo "  GET  http://localhost:8000/auctions/${AUCTION_ID}"
echo "  GET  http://localhost:8000/auctions/${DUTCH_AUCTION_ID}"
echo "  POST http://localhost:8000/bids"
echo "       {\"auction_id\":\"${AUCTION_ID}\",\"lot_id\":\"${LOT_ID}\",\"user_id\":\"00000000-0000-0000-0000-000000000002\",\"amount\":150.00}"
echo "  WS   ws://localhost:8001/ws/lot/${LOT_ID}?auction_id=${AUCTION_ID}"
