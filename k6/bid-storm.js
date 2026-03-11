/**
 * Scenario 3 — Bid Storm (Rate Limiter + Kafka Backpressure Test)
 *
 * Fires 500 bid requests/second for 20 seconds = 10,000 total bids.
 * This tests:
 *   - Kafka producer backpressure handling (confluent-kafka's internal queue)
 *   - Redis lock contention under burst load
 *   - FastAPI worker saturation
 *
 * EXPECTED behavior under this load:
 *   - All requests return a response (no timeouts/5xx)
 *   - Most will be 202 (accepted) or 409 (lot closed/not active)
 *   - If rate limiting is active, 429s are counted as healthy
 *   - P99 < 2000ms even at peak
 *
 * Usage:
 *   BASE_URL=http://localhost:8000 \
 *   LOT_ID=eeee0001-0000-0000-0000-000000000000 \
 *   AUCTION_ID=aaaa0001-0000-0000-0000-000000000000 \
 *   k6 run k6/bid-storm.js
 */
import http from 'k6/http'
import { check } from 'k6'
import { Counter, Rate } from 'k6/metrics'
import { loginAndGetCookie, cookieHeaders } from './helpers/auth.js'

const unexpectedErrors = new Counter('unexpected_errors')
const errorRate        = new Rate('error_rate')

export const options = {
  scenarios: {
    bid_storm: {
      executor: 'constant-arrival-rate',
      rate: 500,              // 500 iterations/second
      timeUnit: '1s',
      duration: '20s',
      preAllocatedVUs: 150,   // pre-warm VU pool
      maxVUs: 300,
    },
  },
  thresholds: {
    // Even under storm, nothing should take > 2s
    'http_req_duration': ['p(99)<2000'],
    // Fewer than 1% truly unexpected errors (non 202/409/429)
    'error_rate': ['rate<0.01'],
  },
}

const BASE_URL   = __ENV.BASE_URL   || 'http://localhost:8000'
const LOT_ID     = __ENV.LOT_ID     || 'eeee0001-0000-0000-0000-000000000000'
const AUCTION_ID = __ENV.AUCTION_ID || 'aaaa0001-0000-0000-0000-000000000000'

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
  const amount = Math.floor(Math.random() * 50000) + 100

  const res = http.post(
    `${BASE_URL}/bids`,
    JSON.stringify({ auction_id: AUCTION_ID, lot_id: LOT_ID, amount }),
    { headers: cookieHeaders(cookie) },
  )

  // 202 = accepted, 409 = lot state conflict, 429 = rate limited — all expected
  const valid = [202, 409, 429].includes(res.status)
  check(res, { 'response received': (r) => r.status > 0 })

  errorRate.add(!valid ? 1 : 0)

  if (!valid) {
    unexpectedErrors.add(1)
    if (unexpectedErrors.count <= 10) {
      // Log first 10 unexpected errors only (avoid log flood)
      console.error(`[bid-storm] Unexpected ${res.status}: ${res.body}`)
    }
  }
}
