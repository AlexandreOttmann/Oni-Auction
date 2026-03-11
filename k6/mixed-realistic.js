/**
 * Scenario 4 — Realistic Mixed Traffic
 *
 * Simulates a live auction event with three concurrent user cohorts:
 *   - 200 active bidders placing bids on the English hot lot
 *   - 500 passive WS viewers watching the same lot
 *   - 100 dashboard users polling GET /auctions (admin overview)
 *
 * This is the most realistic load shape — models an actual auction event.
 * Use this as the primary pre-launch validation test.
 *
 * Usage:
 *   BASE_URL=http://localhost:8000 \
 *   WS_HOST=localhost:8001 \
 *   LOT_ID=eeee0001-0000-0000-0000-000000000000 \
 *   AUCTION_ID=aaaa0001-0000-0000-0000-000000000000 \
 *   k6 run k6/mixed-realistic.js
 */
import http from 'k6/http'
import ws from 'k6/ws'
import { check, sleep } from 'k6'
import { Counter, Trend } from 'k6/metrics'
import { loginAndGetCookie, cookieHeaders } from './helpers/auth.js'

const bidErrors       = new Counter('bid_errors')
const bidLatency      = new Trend('bid_latency_ms', true)
const dashboardLatency = new Trend('dashboard_latency_ms', true)

export const options = {
  scenarios: {
    // Cohort A: active bidders
    bidders: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 50 },
        { duration: '40s', target: 200 },
        { duration: '30s', target: 200 },
        { duration: '10s', target: 0 },
      ],
      exec: 'bidderFn',
    },
    // Cohort B: passive WS viewers
    viewers: {
      executor: 'constant-vus',
      vus: 500,
      duration: '2m',
      exec: 'viewerFn',
    },
    // Cohort C: dashboard pollers (admin users checking auction list)
    dashboard: {
      executor: 'constant-arrival-rate',
      rate: 20,          // 20 req/s simulates ~100 admins polling every 5s
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 30,
      exec: 'dashboardFn',
    },
  },
  thresholds: {
    'bid_latency_ms':       ['p(99)<1000'],
    'dashboard_latency_ms': ['p(99)<500'],
    'bid_errors':           ['count<50'],
    'ws_session_duration':  ['p(95)>100000'],
  },
}

const BASE_URL   = __ENV.BASE_URL   || 'http://localhost:8000'
const WS_HOST    = __ENV.WS_HOST    || 'localhost:8001'
const LOT_ID     = __ENV.LOT_ID     || 'eeee0001-0000-0000-0000-000000000000'
const AUCTION_ID = __ENV.AUCTION_ID || 'aaaa0001-0000-0000-0000-000000000000'

const BUYER_USERS = [
  { email: 'buyer@oni.local',  password: 'oni-dev-password' },
  { email: 'buyer2@oni.local', password: 'oni-dev-password' },
  { email: 'buyer3@oni.local', password: 'oni-dev-password' },
]
const ADMIN_USER = { email: 'admin@oni.local', password: 'oni-dev-password' }

export function setup() {
  const buyerCookies = BUYER_USERS.map((u) => loginAndGetCookie(u.email, u.password))
  const adminCookie  = loginAndGetCookie(ADMIN_USER.email, ADMIN_USER.password)
  return { buyerCookies, adminCookie }
}

// ── Cohort A: bidders ──────────────────────────────────────────────────────────
export function bidderFn({ buyerCookies }) {
  const cookie = buyerCookies[__VU % buyerCookies.length]
  const amount = Math.floor(Math.random() * 9500) + 501

  const start = Date.now()
  const res = http.post(
    `${BASE_URL}/bids`,
    JSON.stringify({ auction_id: AUCTION_ID, lot_id: LOT_ID, amount }),
    { headers: cookieHeaders(cookie) },
  )
  bidLatency.add(Date.now() - start)

  const ok = check(res, { 'bid valid': (r) => [202, 409].includes(r.status) })
  if (!ok) bidErrors.add(1)

  sleep(Math.random() * 1 + 0.5)  // 500ms–1.5s think time
}

// ── Cohort B: passive viewers ──────────────────────────────────────────────────
export function viewerFn({ buyerCookies }) {
  const cookie = buyerCookies[__VU % buyerCookies.length]
  const url    = `ws://${WS_HOST}/ws/lot/${LOT_ID}?auction_id=${AUCTION_ID}`

  const res = ws.connect(
    url,
    { headers: { Cookie: `oni_token=${cookie}` } },
    (socket) => {
      socket.on('message', () => {})
      socket.on('error', (e) => console.error('viewer WS error:', e))
      socket.setTimeout(() => socket.close(), 115_000)
    },
  )
  check(res, { 'viewer connected': (r) => r && r.status === 101 })
}

// ── Cohort C: dashboard pollers ────────────────────────────────────────────────
export function dashboardFn({ adminCookie }) {
  const start = Date.now()
  const res = http.get(
    `${BASE_URL}/auctions`,
    { headers: { Cookie: `oni_token=${adminCookie}` } },
  )
  dashboardLatency.add(Date.now() - start)

  check(res, { 'auctions list 200': (r) => r.status === 200 })
}
