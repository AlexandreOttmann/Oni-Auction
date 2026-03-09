---
name: "performance-profiler"
description: "Systematic performance profiling for Node.js backend and React frontend. Identifies CPU, memory, and I/O bottlenecks; generates flamegraphs; analyzes bundle sizes; optimizes database queries; detects memory leaks; and runs load tests with k6 or Artillery. Use when the app is slow, P99 latency exceeds SLA, memory grows over time, bundle size increased, or preparing for a traffic spike. Always measures before and after."
---

# Performance Profiler

Systematic performance analysis for the auction platform — both backend (Node.js/Fastify) and frontend (React).

## Golden Rule: Measure First

```
Profile → Confirm bottleneck → Fix → Measure again → Verify improvement
```

Never optimize without a baseline. Record: P50, P95, P99 latency | RPS | error rate | memory.

---

## Backend Profiling (Node.js)

### CPU Flamegraph

```bash
# Capture CPU profile during load
node --prof src/server.js &
# Run load for 30s
kill -USR2 $!
node --prof-process isolate-*.log > flamegraph.txt
```

### Memory Leak Detection

```bash
# Take heap snapshot before and after load
node --inspect src/server.js
# In Chrome DevTools: Memory → Heap Snapshot → compare before/after
```

### Slow Query Detection (PostgreSQL)

```sql
-- Find queries taking >100ms
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Check if indexes are being used
EXPLAIN ANALYZE
SELECT * FROM bids WHERE lot_id = 'xxx' ORDER BY placed_at DESC LIMIT 50;
```

---

## Frontend Bundle Analysis

```bash
# Check bundle sizes
npx vite-bundle-visualizer        # for Vite
npx next-bundle-analyzer          # for Next.js

# Common heavy packages to replace
moment (290KB)      → dayjs (7KB) or date-fns
lodash (71KB)       → lodash-es with tree-shaking or native
chart.js (500KB)    → lightweight-charts or recharts
```

---

## Load Testing with k6

### Auction Concurrency Scenario

```javascript
// k6/auction-load.js
import http from 'k6/http'
import ws from 'k6/ws'
import { check, sleep } from 'k6'

export const options = {
  scenarios: {
    // Ramp up to 500 concurrent bidders
    auction_bidding: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },   // warm up
        { duration: '2m',  target: 500 },   // peak
        { duration: '30s', target: 0 },     // wind down
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    'http_req_duration{endpoint:bid}': ['p(99)<500'],  // 99% of bids < 500ms
    'http_req_failed': ['rate<0.01'],                   // <1% error rate
    'ws_connecting': ['p(95)<1000'],                    // WS connects in <1s
  },
}

export default function () {
  // Place a bid
  const bidRes = http.post(
    `${__ENV.BASE_URL}/api/v1/auctions/lot-1/bids`,
    JSON.stringify({ amount: Math.floor(Math.random() * 10000) + 1000 }),
    { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${__ENV.JWT}` } }
  )

  check(bidRes, {
    'bid accepted or expected error': (r) => [201, 409, 429].includes(r.status),
  })

  sleep(0.1)
}
```

```bash
# Run load test
k6 run --env BASE_URL=http://localhost:3001 --env JWT=xxx k6/auction-load.js

# Run with HTML report
k6 run --out json=results.json k6/auction-load.js
```

### WebSocket Concurrency Test

```javascript
// k6/ws-concurrent.js — test 1000 simultaneous WS connections
export default function () {
  const url = `ws://${__ENV.WS_HOST}/lots/lot-1`
  const res = ws.connect(url, { headers: { Authorization: `Bearer ${__ENV.JWT}` } }, (socket) => {
    socket.on('open', () => {
      socket.setInterval(() => {
        // Just stay connected — simulate passive viewer
      }, 1000)
    })
    socket.on('message', (data) => {
      check(data, { 'valid event received': (d) => JSON.parse(d).type !== undefined })
    })
    socket.setTimeout(() => socket.close(), 60_000)
  })
  check(res, { 'ws connected': (r) => r && r.status === 101 })
}
```

---

## Performance Benchmarks (Targets)

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Bid placement P99 | <500ms | >1000ms |
| WS broadcast latency | <100ms | >500ms |
| WebSocket connections | 5,000 concurrent | - |
| DB query P95 | <50ms | >200ms |
| React bundle (initial) | <250KB gzip | >500KB |
| React Native startup | <2s cold | >4s |

---

## Quick Wins Checklist

**Backend:**
- [ ] Missing index on `bids(lot_id)` — add it
- [ ] N+1 in bid history query — batch with `IN` clause
- [ ] No connection pooling → add PgBouncer or Drizzle pool config
- [ ] WebSocket broadcast per-connection → use Redis pub/sub fan-out

**Frontend:**
- [ ] Re-rendering entire bid list on each WS message → use virtualization
- [ ] No `React.memo` on BidCard in a 1000-item list → add it
- [ ] Importing all of lucide-react → import icons individually
