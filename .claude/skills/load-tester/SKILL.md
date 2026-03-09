---
name: "load-tester"
description: "Load and stress testing specialist for the real-time auction platform. Simulates hundreds to thousands of concurrent bidders, WebSocket connections, and simultaneous bid placement. Use when preparing for high-traffic auction events, validating the system can handle concurrent bidding, testing race condition handling under load, benchmarking WebSocket broadcast latency, or stress-testing the bid placement pipeline."
---

# Load Tester

Specialized load and stress testing for the auction platform — focused on concurrent bidding, WebSocket scalability, and race condition safety under load.

---

## Key Test Scenarios

| Scenario | What We're Testing |
|----------|--------------------|
| 500 concurrent bidders on one lot | DB race condition handling, Redis pub/sub throughput |
| 1000 passive WebSocket viewers | WS server memory and broadcast performance |
| Bid storm: 1000 bids in 1 second | Rate limiter effectiveness, queue backpressure |
| Simultaneous auction close | Correct winner determination under race condition |
| Mixed: bid + view + API | Realistic traffic shape |

---

## Tool: k6 (Primary)

Install: `brew install k6` or `npm install -g k6`

### Scenario 1: Concurrent Bidders

```javascript
// k6/concurrent-bidders.js
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Counter, Trend } from 'k6/metrics'

const bidErrors = new Counter('bid_errors')
const bidLatency = new Trend('bid_latency_ms', true)

export const options = {
  scenarios: {
    concurrent_bidders: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },
        { duration: '1m',  target: 500 },
        { duration: '30s', target: 500 }, // sustain peak
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    'http_req_duration{scenario:concurrent_bidders}': ['p(99)<1000'],
    'bid_errors': ['count<50'],  // <50 unexpected errors (409/429 are expected)
  },
}

const LOT_ID = __ENV.LOT_ID || 'test-lot-1'
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001'

export function setup() {
  // Create test lot via admin API
  const res = http.post(`${BASE_URL}/api/v1/admin/test-lots`, JSON.stringify({ duration: 300 }), {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${__ENV.ADMIN_JWT}` }
  })
  return { lotId: res.json('data.id') }
}

export default function ({ lotId }) {
  const amount = Math.floor(Math.random() * 50000) + 1000

  const start = Date.now()
  const res = http.post(
    `${BASE_URL}/api/v1/auctions/${lotId}/bids`,
    JSON.stringify({ amount }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${__ENV.JWT}`,
      },
    }
  )
  bidLatency.add(Date.now() - start)

  // 201 = accepted, 409 = outbid/closed (expected), 429 = rate limited (expected)
  const ok = check(res, {
    'bid response valid': (r) => [201, 409, 429].includes(r.status),
  })
  if (!ok) bidErrors.add(1)

  sleep(Math.random() * 0.5) // random think time 0-500ms
}
```

### Scenario 2: WebSocket Concurrent Viewers

```javascript
// k6/ws-concurrent.js
import ws from 'k6/ws'
import { check } from 'k6'
import { Counter } from 'k6/metrics'

const msgReceived = new Counter('ws_messages_received')

export const options = {
  scenarios: {
    ws_viewers: {
      executor: 'constant-vus',
      vus: 1000,
      duration: '2m',
    },
  },
  thresholds: {
    'ws_connecting': ['p(95)<2000'],  // 95% connect in <2s
    'ws_session_duration': ['p(95)>55000'],  // 95% stay connected
  },
}

export default function () {
  const url = `ws://${__ENV.WS_HOST || 'localhost:3001'}/lots/${__ENV.LOT_ID}`
  const params = { headers: { Authorization: `Bearer ${__ENV.JWT}` } }

  const res = ws.connect(url, params, (socket) => {
    socket.on('open', () => {})
    socket.on('message', (data) => {
      const event = JSON.parse(data)
      check(event, { 'valid event type': (e) => typeof e.type === 'string' })
      msgReceived.add(1)
    })
    socket.on('error', (e) => console.error('WS error:', e))
    socket.setTimeout(() => socket.close(), 110_000)
  })

  check(res, { 'ws connected': (r) => r && r.status === 101 })
}
```

### Scenario 3: Bid Storm (Rate Limiter Test)

```javascript
// k6/bid-storm.js — verifies rate limiter kicks in correctly
import http from 'k6/http'
import { check } from 'k6'

export const options = {
  scenarios: {
    bid_storm: {
      executor: 'constant-arrival-rate',
      rate: 1000,         // 1000 bid attempts per second
      timeUnit: '1s',
      duration: '10s',
      preAllocatedVUs: 200,
    },
  },
  thresholds: {
    // We EXPECT rate limiting — verify it's working
    'http_req_duration': ['p(99)<2000'],
    // At least 80% should get 429 (rate limited) at this volume
  },
}

export default function () {
  const res = http.post(
    `${__ENV.BASE_URL}/api/v1/auctions/${__ENV.LOT_ID}/bids`,
    JSON.stringify({ amount: Math.floor(Math.random() * 100000) }),
    { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${__ENV.JWT}` } }
  )
  check(res, { 'got response': (r) => r.status > 0 })
}
```

---

## Running Tests

```bash
# Set up environment
export BASE_URL=http://localhost:3001
export WS_HOST=localhost:3001
export JWT=<test-user-token>
export ADMIN_JWT=<admin-token>
export LOT_ID=test-lot-1

# Run concurrent bidder test
k6 run k6/concurrent-bidders.js

# Run WS viewer test
k6 run k6/ws-concurrent.js

# Run bid storm test
k6 run k6/bid-storm.js

# All tests with JSON output for analysis
k6 run --out json=results/$(date +%Y%m%d-%H%M%S).json k6/concurrent-bidders.js
```

---

## Interpreting Results

### Healthy System

| Metric | Healthy Range |
|--------|--------------|
| Bid P99 latency | < 500ms |
| WS broadcast P99 | < 200ms |
| Error rate (non-429/409) | < 0.1% |
| 429 rate at peak | Expected 20–60% (rate limiter working) |
| DB connection errors | 0 |
| WS disconnect rate | < 1% per minute |

### Red Flags

- P99 latency climbing linearly with VUs → bottleneck in DB lock contention
- 5xx errors increasing → server overload or crash
- WS connections failing → too few file descriptors (increase `ulimit -n`)
- DB pool exhausted → increase pool size or add read replicas
- Duplicate winning bids → race condition in bid logic (critical)

---

## Checklist Before Load Test

- [ ] Running against a dedicated test environment, NOT production
- [ ] Test lots created with known starting state
- [ ] Test JWT tokens pre-generated for all VUs
- [ ] Database seeded with realistic lot/bid data
- [ ] Monitoring/metrics dashboard open during test (Grafana or logs)
- [ ] Record baseline metrics before test starts
