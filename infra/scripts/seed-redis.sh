#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# Oni Dev Seed — 8 comprehensive auction scenarios
#
# Scenarios
#   1. English  ACTIVE   — hot bidding, 3 bids, ends in 2 hours
#   2. English  CLOSING  — ends in 4 minutes (soft-close zone), 5 bids
#   3. English  SCHEDULED — upcoming, starts in 30 minutes, no bids
#   4. English  CLOSED   — finished 1 hour ago, winner declared, 6 bids
#   5. English  ACTIVE   — cold start, no bids yet
#   6. Dutch    ACTIVE   — round 1 just started (advances in 30 s)
#   7. Dutch    ACTIVE   — mid-descent, round 4, price still falling
#   8. Dutch    CLOSED   — winner struck in round 3
#
# Seeds: Redis lot state + bid history  AND  PostgreSQL lots / auctions / bids
# Usage: bash infra/scripts/seed-redis.sh
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

REDIS="docker exec oni-redis redis-cli"
PG="docker exec -e PGPASSWORD=onidev -i oni-postgres psql -U oni -d oni -q"

# ── Timestamp helpers (Python for cross-platform date math) ──────────────────
ts() { python3 -c "
from datetime import datetime, timezone, timedelta
base = datetime.now(timezone.utc)
print((base + timedelta($1)).strftime('%Y-%m-%dT%H:%M:%SZ'))
"; }

NOW=$(ts "seconds=0")
PAST_3H=$(ts "hours=-3")
PAST_2H=$(ts "hours=-2")
PAST_90M=$(ts "minutes=-90")
PAST_1H=$(ts "hours=-1")
PAST_45M=$(ts "minutes=-45")
PAST_30M=$(ts "minutes=-30")
PAST_15M=$(ts "minutes=-15")
PAST_10M=$(ts "minutes=-10")
PAST_5M=$(ts "minutes=-5")
PAST_2M=$(ts "minutes=-2")
FUTURE_4M=$(ts "minutes=4")
FUTURE_30M=$(ts "minutes=30")
FUTURE_2H=$(ts "hours=2")

# ── Fixed IDs ─────────────────────────────────────────────────────────────────
# Users
ADMIN="00000000-0000-0000-0000-000000000001"
BUYER1="00000000-0000-0000-0000-000000000002"   # Acme Corp (existing)
SELLER="00000000-0000-0000-0000-000000000003"   # Parts Seller (existing)
BUYER2="00000000-0000-0000-0000-000000000004"   # GlobalParts Inc
BUYER3="00000000-0000-0000-0000-000000000005"   # Stellar Logistics

# Lots
LOT_ENG_HOT="eeee0001-0000-0000-0000-000000000000"
LOT_ENG_CLOSING="eeee0002-0000-0000-0000-000000000000"
LOT_ENG_UPCOMING="eeee0003-0000-0000-0000-000000000000"
LOT_ENG_CLOSED="eeee0004-0000-0000-0000-000000000000"
LOT_ENG_COLD="eeee0005-0000-0000-0000-000000000000"
LOT_DUTCH_ACTIVE="dddd0001-0000-0000-0000-000000000000"
LOT_DUTCH_MID="dddd0002-0000-0000-0000-000000000000"
LOT_DUTCH_CLOSED="dddd0003-0000-0000-0000-000000000000"

# Auctions
AUC_ENG_HOT="aaaa0001-0000-0000-0000-000000000000"
AUC_ENG_CLOSING="aaaa0002-0000-0000-0000-000000000000"
AUC_ENG_UPCOMING="aaaa0003-0000-0000-0000-000000000000"
AUC_ENG_CLOSED="aaaa0004-0000-0000-0000-000000000000"
AUC_ENG_COLD="aaaa0005-0000-0000-0000-000000000000"
AUC_DUTCH_ACTIVE="aaaa0006-0000-0000-0000-000000000000"
AUC_DUTCH_MID="aaaa0007-0000-0000-0000-000000000000"
AUC_DUTCH_CLOSED="aaaa0008-0000-0000-0000-000000000000"


# ═══════════════════════════════════════════════════════════════════════════════
# PostgreSQL seed
# ═══════════════════════════════════════════════════════════════════════════════
echo "→ Seeding PostgreSQL..."

$PG <<SQL
-- Extra buyers (password = bcrypt of "oni-dev-password", same as existing users)
INSERT INTO users (id, name, email, role, password_hash) VALUES
  ('${BUYER2}', 'GlobalParts Inc',    'buyer2@oni.local', 'BUYER',
   '\$2b\$12\$vruTHK745pOXMw26KIGoB.kZvzJBkAvdDUTrUftYSidtWmXPf7dY.'),
  ('${BUYER3}', 'Stellar Logistics', 'buyer3@oni.local', 'BUYER',
   '\$2b\$12\$vruTHK745pOXMw26KIGoB.kZvzJBkAvdDUTrUftYSidtWmXPf7dY.')
ON CONFLICT DO NOTHING;

-- ── Lots ─────────────────────────────────────────────────────────────────────
INSERT INTO lots (id, title, description, starting_price, seller_id) VALUES
  ('${LOT_ENG_HOT}',     'Aerospace Fasteners — Grade A',   'High-spec titanium bolts, lot of 10,000',  150.00, '${SELLER}'),
  ('${LOT_ENG_CLOSING}', 'Industrial Hydraulic Seals',      'Parker series, 500-unit pallet',            800.00, '${SELLER}'),
  ('${LOT_ENG_UPCOMING}','Forged Steel Brackets — Batch 7', 'Heavy-duty, 50mm gauge, 200 units',         300.00, '${SELLER}'),
  ('${LOT_ENG_CLOSED}',  'CNC Machined Shafts × 500',       'ISO 9001 certified, 304 stainless',        1000.00, '${SELLER}'),
  ('${LOT_ENG_COLD}',    'Polymer Sealing Compound 50L',    'Chemical-resistant, drum quantity',          250.00, '${SELLER}')
ON CONFLICT DO NOTHING;

INSERT INTO lots (id, title, description, starting_price, price_floor, price_step, round_duration, seller_id) VALUES
  ('${LOT_DUTCH_ACTIVE}', 'Electronic Control Modules × 20', 'Siemens S7, refurbished, tested',  800.00, 200.00, 100.00, 30,  '${SELLER}'),
  ('${LOT_DUTCH_MID}',    'Pneumatic Actuators — 12-pack',   'Festo DSBC series, 63mm bore',     500.00, 100.00,  50.00, 60,  '${SELLER}'),
  ('${LOT_DUTCH_CLOSED}', 'Servo Drive Units × 8',           'ABB ACS880 series, 15kW rated',    600.00, 150.00,  75.00, 45,  '${SELLER}')
ON CONFLICT DO NOTHING;

-- ── Auctions ─────────────────────────────────────────────────────────────────
INSERT INTO auctions (id, title, type, status, lot_id, starts_at, ends_at, created_by) VALUES
  ('${AUC_ENG_HOT}',      'Q2 MRO Procurement — Body Parts',    'ENGLISH', 'ACTIVE',     '${LOT_ENG_HOT}',      '${PAST_3H}',    '${FUTURE_2H}',  '${ADMIN}'),
  ('${AUC_ENG_CLOSING}',  'Seal & Gasket Clearance',            'ENGLISH', 'CLOSING',    '${LOT_ENG_CLOSING}',  '${PAST_2H}',    '${FUTURE_4M}',  '${ADMIN}'),
  ('${AUC_ENG_UPCOMING}', 'Structural Steel — March Batch',     'ENGLISH', 'SCHEDULED',  '${LOT_ENG_UPCOMING}', '${FUTURE_30M}', '${FUTURE_2H}',  '${ADMIN}'),
  ('${AUC_ENG_CLOSED}',   'Precision Shaft Sale — Feb Surplus', 'ENGLISH', 'CLOSED',     '${LOT_ENG_CLOSED}',   '${PAST_3H}',    '${PAST_1H}',    '${ADMIN}'),
  ('${AUC_ENG_COLD}',     'Polymer Compound — Spot Sale',       'ENGLISH', 'ACTIVE',     '${LOT_ENG_COLD}',     '${PAST_30M}',   '${FUTURE_2H}',  '${ADMIN}'),
  ('${AUC_DUTCH_ACTIVE}', 'PLC Modules — Dutch Clearance',      'DUTCH',   'ACTIVE',     '${LOT_DUTCH_ACTIVE}', '${PAST_5M}',    '${FUTURE_2H}',  '${ADMIN}'),
  ('${AUC_DUTCH_MID}',    'Actuators — Descending Bid',         'DUTCH',   'ACTIVE',     '${LOT_DUTCH_MID}',    '${PAST_30M}',   '${FUTURE_2H}',  '${ADMIN}'),
  ('${AUC_DUTCH_CLOSED}', 'Servo Drives — Dutch (Settled)',     'DUTCH',   'CLOSED',     '${LOT_DUTCH_CLOSED}', '${PAST_2H}',    '${PAST_1H}',    '${ADMIN}')
ON CONFLICT DO NOTHING;

-- ── Bids ─────────────────────────────────────────────────────────────────────
-- English Hot (3 bids, ascending)
INSERT INTO bids (id, auction_id, lot_id, user_id, amount, status, placed_at) VALUES
  ('b0010001-0000-0000-0000-000000000000', '${AUC_ENG_HOT}', '${LOT_ENG_HOT}', '${BUYER1}', 200.00, 'VALID', '${PAST_2H}'),
  ('b0010002-0000-0000-0000-000000000000', '${AUC_ENG_HOT}', '${LOT_ENG_HOT}', '${BUYER2}', 350.00, 'VALID', '${PAST_90M}'),
  ('b0010003-0000-0000-0000-000000000000', '${AUC_ENG_HOT}', '${LOT_ENG_HOT}', '${BUYER3}', 500.00, 'VALID', '${PAST_45M}')
ON CONFLICT DO NOTHING;

-- English Closing (5 bids, tight competition)
INSERT INTO bids (id, auction_id, lot_id, user_id, amount, status, placed_at) VALUES
  ('b0020001-0000-0000-0000-000000000000', '${AUC_ENG_CLOSING}', '${LOT_ENG_CLOSING}', '${BUYER1}',  900.00, 'VALID', '${PAST_90M}'),
  ('b0020002-0000-0000-0000-000000000000', '${AUC_ENG_CLOSING}', '${LOT_ENG_CLOSING}', '${BUYER2}',  950.00, 'VALID', '${PAST_45M}'),
  ('b0020003-0000-0000-0000-000000000000', '${AUC_ENG_CLOSING}', '${LOT_ENG_CLOSING}', '${BUYER3}', 1050.00, 'VALID', '${PAST_30M}'),
  ('b0020004-0000-0000-0000-000000000000', '${AUC_ENG_CLOSING}', '${LOT_ENG_CLOSING}', '${BUYER1}', 1100.00, 'VALID', '${PAST_10M}'),
  ('b0020005-0000-0000-0000-000000000000', '${AUC_ENG_CLOSING}', '${LOT_ENG_CLOSING}', '${BUYER2}', 1200.00, 'VALID', '${PAST_5M}')
ON CONFLICT DO NOTHING;

-- English Closed (6 bids, BUYER1 won at 2500)
INSERT INTO bids (id, auction_id, lot_id, user_id, amount, status, placed_at) VALUES
  ('b0040001-0000-0000-0000-000000000000', '${AUC_ENG_CLOSED}', '${LOT_ENG_CLOSED}', '${BUYER2}', 1100.00, 'VALID', '${PAST_3H}'),
  ('b0040002-0000-0000-0000-000000000000', '${AUC_ENG_CLOSED}', '${LOT_ENG_CLOSED}', '${BUYER1}', 1250.00, 'VALID', '${PAST_3H}'),
  ('b0040003-0000-0000-0000-000000000000', '${AUC_ENG_CLOSED}', '${LOT_ENG_CLOSED}', '${BUYER3}', 1500.00, 'VALID', '${PAST_2H}'),
  ('b0040004-0000-0000-0000-000000000000', '${AUC_ENG_CLOSED}', '${LOT_ENG_CLOSED}', '${BUYER2}', 1800.00, 'VALID', '${PAST_2H}'),
  ('b0040005-0000-0000-0000-000000000000', '${AUC_ENG_CLOSED}', '${LOT_ENG_CLOSED}', '${BUYER1}', 2200.00, 'VALID', '${PAST_90M}'),
  ('b0040006-0000-0000-0000-000000000000', '${AUC_ENG_CLOSED}', '${LOT_ENG_CLOSED}', '${BUYER1}', 2500.00, 'VALID', '${PAST_1H}')
ON CONFLICT DO NOTHING;

-- Dutch Closed (BUYER3 struck at 450 in round 3)
INSERT INTO bids (id, auction_id, lot_id, user_id, amount, status, placed_at) VALUES
  ('b0080001-0000-0000-0000-000000000000', '${AUC_DUTCH_CLOSED}', '${LOT_DUTCH_CLOSED}', '${BUYER3}', 450.00, 'VALID', '${PAST_90M}')
ON CONFLICT DO NOTHING;
SQL

echo "  ✓ PostgreSQL seeded"


# ═══════════════════════════════════════════════════════════════════════════════
# Redis seed — lot state hashes + bid history lists
# ═══════════════════════════════════════════════════════════════════════════════
echo "→ Flushing stale lot + auction keys..."
for LOT in $LOT_ENG_HOT $LOT_ENG_CLOSING $LOT_ENG_UPCOMING $LOT_ENG_CLOSED $LOT_ENG_COLD \
           $LOT_DUTCH_ACTIVE $LOT_DUTCH_MID $LOT_DUTCH_CLOSED; do
  $REDIS DEL "lot:${LOT}:state" "lot:${LOT}:history" > /dev/null
done
for AUC in $AUC_ENG_HOT $AUC_ENG_CLOSING $AUC_ENG_UPCOMING $AUC_ENG_CLOSED $AUC_ENG_COLD \
           $AUC_DUTCH_ACTIVE $AUC_DUTCH_MID $AUC_DUTCH_CLOSED; do
  $REDIS DEL "auction:${AUC}" > /dev/null
done

# ── auction:{auction_id} → lot_id mapping (required by WS service + REST API) ─
echo "→ Seeding auction→lot mappings..."
$REDIS HSET "auction:${AUC_ENG_HOT}"      lot_id "${LOT_ENG_HOT}"      > /dev/null
$REDIS HSET "auction:${AUC_ENG_CLOSING}"  lot_id "${LOT_ENG_CLOSING}"  > /dev/null
$REDIS HSET "auction:${AUC_ENG_UPCOMING}" lot_id "${LOT_ENG_UPCOMING}" > /dev/null
$REDIS HSET "auction:${AUC_ENG_CLOSED}"   lot_id "${LOT_ENG_CLOSED}"   > /dev/null
$REDIS HSET "auction:${AUC_ENG_COLD}"     lot_id "${LOT_ENG_COLD}"     > /dev/null
$REDIS HSET "auction:${AUC_DUTCH_ACTIVE}" lot_id "${LOT_DUTCH_ACTIVE}" > /dev/null
$REDIS HSET "auction:${AUC_DUTCH_MID}"    lot_id "${LOT_DUTCH_MID}"    > /dev/null
$REDIS HSET "auction:${AUC_DUTCH_CLOSED}" lot_id "${LOT_DUTCH_CLOSED}" > /dev/null

# ── Helper: push a bid into lot history ──────────────────────────────────────
push_bid() {
  local lot=$1 bid_id=$2 user_id=$3 amount=$4 ts=$5
  $REDIS LPUSH "lot:${lot}:history" \
    "{\"bid_id\":\"${bid_id}\",\"user_id\":\"${user_id}\",\"amount\":${amount},\"currency\":\"USD\",\"timestamp\":\"${ts}\"}" \
    > /dev/null
}

# ─────────────────────────────────────────────────────────────────────────────
# 1. English — ACTIVE, hot bidding, 3 bids, ends in 2h
# ─────────────────────────────────────────────────────────────────────────────
echo "→ [1/8] English ACTIVE (hot, 3 bids, ends 2h)"
$REDIS HSET "lot:${LOT_ENG_HOT}:state" \
  auction_type  ENGLISH \
  auction_id    "${AUC_ENG_HOT}" \
  status        ACTIVE \
  title         "Aerospace Fasteners — Grade A" \
  currency      USD \
  highest_bid   500 \
  leader        "${BUYER3}" \
  bid_count     3 \
  ends_at       "${FUTURE_2H}" > /dev/null

push_bid "$LOT_ENG_HOT" "b0010001-0000-0000-0000-000000000000" "$BUYER1" 200.00 "$PAST_2H"
push_bid "$LOT_ENG_HOT" "b0010002-0000-0000-0000-000000000000" "$BUYER2" 350.00 "$PAST_90M"
push_bid "$LOT_ENG_HOT" "b0010003-0000-0000-0000-000000000000" "$BUYER3" 500.00 "$PAST_45M"

# ─────────────────────────────────────────────────────────────────────────────
# 2. English — CLOSING, ends in 4 minutes, 5 bids (soft-close zone)
# ─────────────────────────────────────────────────────────────────────────────
echo "→ [2/8] English CLOSING (ends 4min, 5 bids)"
$REDIS HSET "lot:${LOT_ENG_CLOSING}:state" \
  auction_type  ENGLISH \
  auction_id    "${AUC_ENG_CLOSING}" \
  status        CLOSING \
  title         "Industrial Hydraulic Seals" \
  currency      USD \
  highest_bid   1200 \
  leader        "${BUYER2}" \
  bid_count     5 \
  ends_at       "${FUTURE_4M}" > /dev/null

push_bid "$LOT_ENG_CLOSING" "b0020001-0000-0000-0000-000000000000" "$BUYER1"  900.00 "$PAST_90M"
push_bid "$LOT_ENG_CLOSING" "b0020002-0000-0000-0000-000000000000" "$BUYER2"  950.00 "$PAST_45M"
push_bid "$LOT_ENG_CLOSING" "b0020003-0000-0000-0000-000000000000" "$BUYER3" 1050.00 "$PAST_30M"
push_bid "$LOT_ENG_CLOSING" "b0020004-0000-0000-0000-000000000000" "$BUYER1" 1100.00 "$PAST_10M"
push_bid "$LOT_ENG_CLOSING" "b0020005-0000-0000-0000-000000000000" "$BUYER2" 1200.00 "$PAST_5M"

# ─────────────────────────────────────────────────────────────────────────────
# 3. English — SCHEDULED, starts in 30 minutes, no bids
# ─────────────────────────────────────────────────────────────────────────────
echo "→ [3/8] English SCHEDULED (upcoming in 30min)"
$REDIS HSET "lot:${LOT_ENG_UPCOMING}:state" \
  auction_type  ENGLISH \
  auction_id    "${AUC_ENG_UPCOMING}" \
  status        SCHEDULED \
  title         "Forged Steel Brackets — Batch 7" \
  currency      USD \
  highest_bid   0 \
  leader        "" \
  bid_count     0 \
  starts_at     "${FUTURE_30M}" \
  ends_at       "${FUTURE_2H}" > /dev/null

# ─────────────────────────────────────────────────────────────────────────────
# 4. English — CLOSED, winner declared, 6 bids
# ─────────────────────────────────────────────────────────────────────────────
echo "→ [4/8] English CLOSED (winner=${BUYER1}, 6 bids)"
$REDIS HSET "lot:${LOT_ENG_CLOSED}:state" \
  auction_type  ENGLISH \
  auction_id    "${AUC_ENG_CLOSED}" \
  status        CLOSED \
  title         "CNC Machined Shafts × 500" \
  currency      USD \
  highest_bid   2500 \
  final_price   2500 \
  leader        "${BUYER1}" \
  bid_count     6 \
  ends_at       "${PAST_1H}" > /dev/null

push_bid "$LOT_ENG_CLOSED" "b0040001-0000-0000-0000-000000000000" "$BUYER2" 1100.00 "$PAST_3H"
push_bid "$LOT_ENG_CLOSED" "b0040002-0000-0000-0000-000000000000" "$BUYER1" 1250.00 "$PAST_3H"
push_bid "$LOT_ENG_CLOSED" "b0040003-0000-0000-0000-000000000000" "$BUYER3" 1500.00 "$PAST_2H"
push_bid "$LOT_ENG_CLOSED" "b0040004-0000-0000-0000-000000000000" "$BUYER2" 1800.00 "$PAST_2H"
push_bid "$LOT_ENG_CLOSED" "b0040005-0000-0000-0000-000000000000" "$BUYER1" 2200.00 "$PAST_90M"
push_bid "$LOT_ENG_CLOSED" "b0040006-0000-0000-0000-000000000000" "$BUYER1" 2500.00 "$PAST_1H"

# ─────────────────────────────────────────────────────────────────────────────
# 5. English — ACTIVE, cold start, no bids
# ─────────────────────────────────────────────────────────────────────────────
echo "→ [5/8] English ACTIVE (cold, 0 bids)"
$REDIS HSET "lot:${LOT_ENG_COLD}:state" \
  auction_type  ENGLISH \
  auction_id    "${AUC_ENG_COLD}" \
  status        ACTIVE \
  title         "Polymer Sealing Compound 50L" \
  currency      USD \
  highest_bid   0 \
  leader        "" \
  bid_count     0 \
  ends_at       "${FUTURE_2H}" > /dev/null

# ─────────────────────────────────────────────────────────────────────────────
# 6. Dutch — ACTIVE, round 1, just started (advances in ~30s)
# ─────────────────────────────────────────────────────────────────────────────
echo "→ [6/8] Dutch ACTIVE (round 1, price=800, advances in 30s)"
$REDIS HSET "lot:${LOT_DUTCH_ACTIVE}:state" \
  auction_type    DUTCH \
  auction_id      "${AUC_DUTCH_ACTIVE}" \
  status          ACTIVE \
  title           "Electronic Control Modules × 20" \
  currency        USD \
  current_price   800 \
  price_floor     200 \
  price_step      100 \
  round_duration  30 \
  current_round   1 \
  round_started_at "${NOW}" \
  leader          "" \
  bid_count       0 \
  ends_at         "${FUTURE_2H}" > /dev/null

# ─────────────────────────────────────────────────────────────────────────────
# 7. Dutch — ACTIVE, mid-descent, round 4, price=350
# ─────────────────────────────────────────────────────────────────────────────
echo "→ [7/8] Dutch ACTIVE (round 4, price=350, descending)"
$REDIS HSET "lot:${LOT_DUTCH_MID}:state" \
  auction_type    DUTCH \
  auction_id      "${AUC_DUTCH_MID}" \
  status          ACTIVE \
  title           "Pneumatic Actuators — 12-pack" \
  currency        USD \
  current_price   350 \
  price_floor     100 \
  price_step      50 \
  round_duration  60 \
  current_round   4 \
  round_started_at "${PAST_30M}" \
  leader          "" \
  bid_count       0 \
  ends_at         "${FUTURE_2H}" > /dev/null

# ─────────────────────────────────────────────────────────────────────────────
# 8. Dutch — CLOSED, BUYER3 struck at 450 in round 3
# ─────────────────────────────────────────────────────────────────────────────
echo "→ [8/8] Dutch CLOSED (winner=${BUYER3}, struck at 450)"
$REDIS HSET "lot:${LOT_DUTCH_CLOSED}:state" \
  auction_type  DUTCH \
  auction_id    "${AUC_DUTCH_CLOSED}" \
  status        CLOSED \
  title         "Servo Drive Units × 8" \
  currency      USD \
  current_price 450 \
  final_price   450 \
  price_floor   150 \
  price_step    75 \
  round_duration 45 \
  current_round 3 \
  leader        "${BUYER3}" \
  bid_count     1 \
  ends_at       "${PAST_1H}" > /dev/null

push_bid "$LOT_DUTCH_CLOSED" "b0080001-0000-0000-0000-000000000000" "$BUYER3" 450.00 "$PAST_90M"


# ═══════════════════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "✅  All 8 scenarios seeded"
echo ""
echo "┌─────────────────────────────────────────────────────────────────────────┐"
echo "│  #  Type     Status    Scenario                         lot_id          │"
echo "├─────────────────────────────────────────────────────────────────────────┤"
echo "│  1  English  ACTIVE    Hot bidding (3 bids, 2h left)   eeee0001...      │"
echo "│  2  English  CLOSING   Ends in 4min (5 bids)           eeee0002...      │"
echo "│  3  English  SCHEDULED Upcoming in 30min, no bids      eeee0003...      │"
echo "│  4  English  CLOSED    Winner: Acme Corp @ 2500        eeee0004...      │"
echo "│  5  English  ACTIVE    Cold start, no bids yet         eeee0005...      │"
echo "│  6  Dutch    ACTIVE    Round 1, price=800 (drops 30s)  dddd0001...      │"
echo "│  7  Dutch    ACTIVE    Round 4, price=350 (falling)    dddd0002...      │"
echo "│  8  Dutch    CLOSED    Stellar struck @ 450 (round 3)  dddd0003...      │"
echo "└─────────────────────────────────────────────────────────────────────────┘"
echo ""
echo "REST endpoints (auction-api :8000)"
echo "  GET  /auctions                                    ← all 8 auctions"
echo "  GET  /auctions/${AUC_ENG_HOT}    ← English hot"
echo "  GET  /auctions/${AUC_ENG_CLOSING} ← English closing"
echo "  GET  /auctions/${AUC_DUTCH_ACTIVE} ← Dutch active"
echo ""
echo "WebSocket (:8001)"
echo "  ws://localhost:8001/ws/lot/${LOT_ENG_HOT}?auction_id=${AUC_ENG_HOT}"
echo "  ws://localhost:8001/ws/lot/${LOT_DUTCH_ACTIVE}?auction_id=${AUC_DUTCH_ACTIVE}"
echo ""
echo "Place a bid (English hot):"
echo "  POST /bids"
echo "  { \"auction_id\": \"${AUC_ENG_HOT}\","
echo "    \"lot_id\":     \"${LOT_ENG_HOT}\","
echo "    \"user_id\":    \"${BUYER1}\","
echo "    \"amount\":     550.00 }"
echo ""
echo "Strike Dutch (active round 1):"
echo "  POST /bids"
echo "  { \"auction_id\": \"${AUC_DUTCH_ACTIVE}\","
echo "    \"lot_id\":     \"${LOT_DUTCH_ACTIVE}\","
echo "    \"user_id\":    \"${BUYER2}\","
echo "    \"amount\":     800.00 }"
