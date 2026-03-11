/**
 * Scenario 1 — Concurrent English Bidders
 *
 * Ramps to 500 VUs all hammering POST /bids on the same active English lot.
 * Validates:
 *   - Bid P99 latency stays < 1000ms at peak load
 *   - Unexpected errors (anything other than 202/409) < 50 total
 *   - Kafka + Redis pipeline doesn't back up under sustained load
 *
 * Seeded test lot (from seed-redis.sh):
 *   lot_id    = eeee0001-0000-0000-0000-000000000000  (English ACTIVE, ends in 2h)
 *   auction_id = aaaa0001-0000-0000-0000-000000000000
 *
 * Usage:
 *   BASE_URL=http://localhost:8000 \
 *   LOT_ID=eeee0001-0000-0000-0000-000000000000 \
 *   AUCTION_ID=aaaa0001-0000-0000-0000-000000000000 \
 *   k6 run k6/concurrent-bidders.js
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Counter, Trend } from 'k6/metrics'
import { loginAndGetCookie, cookieHeaders } from './helpers/auth.js'

const bidErrors   = new Counter('bid_errors')
const bidLatency  = new Trend('bid_latency_ms', true)

export const options = {
  scenarios: {
    concurrent_bidders: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },   // warm-up
        { duration: '60s', target: 500 },   // ramp to peak
        { duration: '30s', target: 500 },   // sustain peak
        { duration: '30s', target: 0 },     // cool-down
      ],
    },
  },
  thresholds: {
    // P99 bid latency under 1s at peak (Kafka produce + Redis read = fast path)
    'http_req_duration{scenario:concurrent_bidders}': ['p(99)<1000'],
    // Fewer than 50 truly unexpected errors (409 = outbid, 202 = accepted — both valid)
    'bid_errors': ['count<50'],
  },
}

const BASE_URL   = __ENV.BASE_URL   || 'http://localhost:8000'
const LOT_ID     = __ENV.LOT_ID     || 'eeee0001-0000-0000-0000-000000000000'
const AUCTION_ID = __ENV.AUCTION_ID || 'aaaa0001-0000-0000-0000-000000000000'

// Three seeded buyers with known password
const TEST_USERS = [
  { email: 'buyer@oni.local',  password: 'oni-dev-password' },
  { email: 'buyer2@oni.local', password: 'oni-dev-password' },
  { email: 'buyer3@oni.local', password: 'oni-dev-password' },
]

export function setup() {
  // Log in all test users and return their cookies
  const cookies = TEST_USERS.map((u) => loginAndGetCookie(u.email, u.password))
  console.log(`setup: obtained ${cookies.length} session cookies`)
  return { cookies }
}

export default function ({ cookies }) {
  // Each VU picks a user cookie by index to spread load across buyers
  const cookie = cookies[__VU % cookies.length]

  // Random bid — higher than the seeded highest (500) to exercise "outbid" logic
  const amount = Math.floor(Math.random() * 9500) + 501  // 501–10000

  const start = Date.now()
  const res = http.post(
    `${BASE_URL}/bids`,
    JSON.stringify({ auction_id: AUCTION_ID, lot_id: LOT_ID, amount }),
    { headers: cookieHeaders(cookie) },
  )
  bidLatency.add(Date.now() - start)

  // 202 = bid accepted (queued), 409 = lot closed or not active (race, not an error)
  const ok = check(res, {
    'bid response valid': (r) => [202, 409].includes(r.status),
  })
  if (!ok) {
    bidErrors.add(1)
    console.error(`Unexpected bid response: ${res.status} ${res.body}`)
  }

  sleep(Math.random() * 0.5)  // 0–500ms think time
}
