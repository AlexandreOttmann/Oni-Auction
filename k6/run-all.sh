#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# Oni Load Test Runner — runs all k6 scenarios sequentially with JSON output
#
# Prerequisites:
#   1. brew install k6
#   2. docker compose up -d (all services running)
#   3. bash infra/scripts/seed-redis.sh
#
# Usage:
#   bash k6/run-all.sh [scenario]
#
# Examples:
#   bash k6/run-all.sh                      # run all scenarios
#   bash k6/run-all.sh concurrent-bidders   # single scenario
#   bash k6/run-all.sh dutch-race           # atomicity test
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
export BASE_URL="${BASE_URL:-http://localhost:8000}"
export WS_HOST="${WS_HOST:-localhost:8001}"

# English ACTIVE hot lot (from seed-redis.sh)
export LOT_ID="${LOT_ID:-eeee0001-0000-0000-0000-000000000000}"
export AUCTION_ID="${AUCTION_ID:-aaaa0001-0000-0000-0000-000000000000}"

RESULTS_DIR="k6/results"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$RESULTS_DIR"

K6_BIN="${K6_BIN:-k6}"

check_k6() {
  if ! command -v "$K6_BIN" &>/dev/null; then
    echo "❌  k6 not found. Install: brew install k6"
    exit 1
  fi
  echo "✓  k6 found: $($K6_BIN version)"
}

check_services() {
  echo "→ Checking service health..."
  if ! curl -sf "${BASE_URL}/health" &>/dev/null; then
    echo "❌  auction-api not reachable at ${BASE_URL}"
    echo "    Run: docker compose -f infra/docker/docker-compose.yml up -d"
    exit 1
  fi
  if ! curl -sf "http://${WS_HOST}/health" &>/dev/null; then
    echo "❌  websocket-service not reachable at ${WS_HOST}"
    exit 1
  fi
  echo "  ✓ auction-api and websocket-service healthy"
}

run_scenario() {
  local name="$1"
  local script="k6/${name}.js"
  local output="${RESULTS_DIR}/${TIMESTAMP}-${name}.json"

  echo ""
  echo "════════════════════════════════════════"
  echo "  Running: ${name}"
  echo "  Output:  ${output}"
  echo "════════════════════════════════════════"

  "$K6_BIN" run \
    --out "json=${output}" \
    --summary-trend-stats "avg,p(50),p(90),p(95),p(99),max" \
    "${script}" \
    && echo "  ✅  ${name} PASSED" \
    || echo "  ❌  ${name} FAILED (check thresholds above)"
}

reseed() {
  echo ""
  echo "→ Re-seeding Redis for next scenario..."
  bash infra/scripts/seed-redis.sh > /dev/null
  echo "  ✓ Redis re-seeded"
}

# ── Main ──────────────────────────────────────────────────────────────────────
check_k6
check_services

# Raise file descriptor limit for WS test
ulimit -n 65536 2>/dev/null || true

SCENARIO="${1:-all}"

case "$SCENARIO" in
  all)
    run_scenario concurrent-bidders
    reseed
    run_scenario ws-viewers
    reseed
    run_scenario bid-storm
    reseed
    # Dutch race uses Dutch lot — override env vars
    LOT_ID="dddd0001-0000-0000-0000-000000000000" \
    AUCTION_ID="aaaa0006-0000-0000-0000-000000000000" \
    run_scenario dutch-race
    reseed
    run_scenario mixed-realistic
    ;;
  dutch-race)
    # Dutch race needs the Dutch lot IDs
    LOT_ID="dddd0001-0000-0000-0000-000000000000" \
    AUCTION_ID="aaaa0006-0000-0000-0000-000000000000" \
    run_scenario dutch-race
    ;;
  *)
    run_scenario "$SCENARIO"
    ;;
esac

echo ""
echo "════════════════════════════════════════"
echo "  Load test complete."
echo "  Results in: ${RESULTS_DIR}/"
echo "════════════════════════════════════════"
