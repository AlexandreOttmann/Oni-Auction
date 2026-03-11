/**
 * Scenario 5 — Dutch Auction Race Condition Test
 *
 * Fires 100 simultaneous bids at the Dutch active lot at the same moment.
 * Only ONE should be accepted (the first to be processed by bid-worker).
 * All others must be 409 (LOT_NOT_ACTIVE after the winner closes it).
 *
 * Validates the Dutch win atomicity: Redis HGETALL + conditional HSET in
 * bid-worker must ensure exactly one winner despite burst concurrency.
 *
 * Usage:
 *   BASE_URL=http://localhost:8000 \
 *   LOT_ID=dddd0001-0000-0000-0000-000000000000 \
 *   AUCTION_ID=aaaa0006-0000-0000-0000-000000000000 \
 *   k6 run k6/dutch-race.js
 *
 * NOTE: Re-seed Redis between runs — the Dutch lot will be closed after the
 *       first run. Run: bash infra/scripts/seed-redis.sh
 */
import http from 'k6/http'
import { check } from 'k6'
import { Counter } from 'k6/metrics'
import { loginAndGetCookie, cookieHeaders } from './helpers/auth.js'

const accepted = new Counter('dutch_bids_accepted')
const rejected = new Counter('dutch_bids_rejected_409')
const errors   = new Counter('dutch_unexpected_errors')

export const options = {
  scenarios: {
    dutch_race: {
      executor: 'shared-iterations',
      vus: 100,
      iterations: 100,   // exactly 100 simultaneous attempts
      maxDuration: '10s',
    },
  },
  thresholds: {
    // Exactly 1 bid should be accepted — worker guarantees atomicity
    'dutch_bids_accepted':     ['count<=1'],
    // No unexpected server errors
    'dutch_unexpected_errors': ['count==0'],
  },
}

const BASE_URL   = __ENV.BASE_URL   || 'http://localhost:8000'
// Dutch ACTIVE lot from seed-redis.sh (round 1, price=800)
const LOT_ID     = __ENV.LOT_ID     || 'dddd0001-0000-0000-0000-000000000000'
const AUCTION_ID = __ENV.AUCTION_ID || 'aaaa0006-0000-0000-0000-000000000000'
const STRIKE_AMOUNT = 800  // current Dutch price (round 1)

const TEST_USERS = [
  { email: 'buyer@oni.local',  password: 'oni-dev-password' },
  { email: 'buyer2@oni.local', password: 'oni-dev-password' },
  { email: 'buyer3@oni.local', password: 'oni-dev-password' },
]

export function setup() {
  return { cookies: TEST_USERS.map((u) => loginAndGetCookie(u.email, u.password)) }
}

export default function ({ cookies }) {
  const cookie = cookies[__VU % cookies.length]

  const res = http.post(
    `${BASE_URL}/bids`,
    JSON.stringify({ auction_id: AUCTION_ID, lot_id: LOT_ID, amount: STRIKE_AMOUNT }),
    { headers: cookieHeaders(cookie) },
  )

  if (res.status === 202) {
    accepted.add(1)
    console.log(`VU ${__VU}: Dutch bid ACCEPTED`)
  } else if (res.status === 409) {
    rejected.add(1)
  } else {
    errors.add(1)
    console.error(`VU ${__VU}: Unexpected ${res.status}: ${res.body}`)
  }

  check(res, { 'dutch response valid': (r) => [202, 409].includes(r.status) })
}

export function handleSummary(data) {
  const acceptCount = data.metrics['dutch_bids_accepted']?.values?.count || 0
  const msg = acceptCount === 1
    ? '✅  Dutch race: exactly 1 winner — atomicity confirmed'
    : `❌  Dutch race: ${acceptCount} winners detected — RACE CONDITION BUG`
  console.log(msg)
  return {}
}
