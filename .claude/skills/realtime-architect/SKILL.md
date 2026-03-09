---
name: "realtime-architect"
description: "Real-time and event-driven architecture for the Oni auction platform. Use when designing Kafka topics/partitions, WebSocket infrastructure, bid event fan-out, handling reconnection and missed events, or planning horizontal scaling. Must be consulted before any Kafka topology change or new real-time feature. Always reads .claude/context/kafka-design.md first."
---

# Real-time Architect

Designs and governs the event-driven infrastructure for Oni — Kafka topology, WebSocket fan-out, Redis state, reconnection handling, and horizontal scaling. The core architecture is documented in `.claude/context/kafka-design.md` — read it first.

---

## Architecture Overview

```
                        ┌─────────────┐
 Client (Web/RN) ──WS──►│  WS Server  │◄──────────────────┐
                        └──────┬──────┘                    │
                               │ subscribe                  │ publish
                        ┌──────▼──────┐                    │
                        │    Redis    │◄────────────────────┤
                        │  Pub/Sub   │                     │
                        └─────────────┘              ┌──────┴──────┐
                                                     │  REST API   │
                                                     │  (Fastify)  │
                                                     └─────────────┘
```

**Bid flow:**
1. Client → `POST /api/v1/auctions/:id/bids` (REST)
2. API validates, writes to DB (SELECT FOR UPDATE)
3. API publishes `bid:placed` event to Redis channel `lot:{id}`
4. All WS server instances subscribed to `lot:{id}` receive the event
5. Each WS server broadcasts to its connected clients watching that lot

This pattern scales horizontally — multiple WS server instances all receive all events via Redis.

---

## WebSocket vs SSE vs Polling

| | WebSocket | SSE | Long-Poll |
|-|-----------|-----|-----------|
| **Bidirectional** | ✅ | ❌ (server→client only) | ❌ |
| **Mobile (React Native)** | ✅ native support | ⚠️ needs library | ✅ |
| **HTTP/2 compatible** | ⚠️ requires upgrade | ✅ native | ✅ |
| **Auto-reconnect** | Manual | Native | Manual |
| **Use for** | Bidding + live updates | Analytics dashboard (read-only) | Fallback |

**Decision: WebSocket for bidding and live lot updates. SSE optional for analytics dashboards.**

---

## Channel Structure (Redis Pub/Sub)

```
lot:{lotId}          → all events for a specific lot (BID_PLACED, AUCTION_CLOSED, EXTENDED)
auction:{auctionId}  → auction-level events (AUCTION_STARTED, STATUS_CHANGE)
user:{userId}        → user-specific events (OUTBID, WON, PAYMENT_DUE)
```

```typescript
// Publishing (API server)
await redis.publish(`lot:${lotId}`, JSON.stringify({
  type: 'BID_PLACED',
  payload: { lotId, amount, bidder, timestamp: new Date().toISOString() },
}))

// Subscribing (WS server)
const sub = redis.duplicate()
await sub.subscribe(`lot:${lotId}`)
sub.on('message', (channel, message) => {
  const event = JSON.parse(message)
  // Broadcast to all clients watching this lot
  lotRoom.get(lotId)?.forEach(ws => ws.send(message))
})
```

---

## Client-Side Connection Management

```typescript
// Robust reconnection with exponential backoff
class AuctionSocket {
  private ws: WebSocket | null = null
  private reconnectDelay = 1000
  private maxDelay = 30_000
  private intentionallyClosed = false
  private missedEventSince: string | null = null  // for gap recovery

  connect(lotId: string, lastEventId?: string) {
    const url = new URL(`${WS_URL}/lots/${lotId}`)
    if (lastEventId) url.searchParams.set('since', lastEventId)  // server sends missed events

    this.ws = new WebSocket(url.toString())

    this.ws.onopen = () => {
      this.reconnectDelay = 1000  // reset backoff
      this.missedEventSince = null
    }

    this.ws.onmessage = (e) => {
      const event = JSON.parse(e.data)
      this.lastEventId = event.id
      this.handleEvent(event)
    }

    this.ws.onclose = () => {
      if (this.intentionallyClosed) return
      this.missedEventSince = this.lastEventId  // track for recovery
      setTimeout(() => this.connect(lotId, this.missedEventSince), this.reconnectDelay)
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay)
    }
  }

  disconnect() {
    this.intentionallyClosed = true
    this.ws?.close()
  }
}
```

---

## Missed Event Recovery

When a client reconnects, it may have missed bids during the gap.

```typescript
// Server: on WS connect with ?since=<eventId>
ws.on('connection', async (socket, req) => {
  const since = new URLSearchParams(req.url?.split('?')[1]).get('since')

  if (since) {
    // Replay missed events from DB
    const missedBids = await db.select().from(bids)
      .where(and(eq(bids.lotId, lotId), gt(bids.placedAt, sinceTimestamp)))
      .orderBy(asc(bids.placedAt))

    missedBids.forEach(bid => {
      socket.send(JSON.stringify({ type: 'BID_PLACED', payload: bid, id: bid.id }))
    })
  }
})
```

---

## Horizontal Scaling Plan

```
Load Balancer (sticky sessions by lotId preferred, or any with Redis)
    │
    ├── WS Server Instance 1 ──┐
    ├── WS Server Instance 2 ──┼──► Redis Pub/Sub ◄── API Servers
    └── WS Server Instance 3 ──┘
```

- Use Redis for all shared state — never in-memory maps across instances
- Sticky sessions by lotId reduces cross-instance Redis traffic (optional optimization)
- Each instance handles ~10k concurrent WS connections (Node.js limit before memory pressure)
- Scale up instances before an anticipated high-traffic auction

---

## Analytics Dashboard: SSE Alternative

For read-only analytics dashboards (bid count, volume over time, active users), SSE is simpler:

```typescript
// Server — SSE endpoint
app.get('/api/v1/analytics/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const sub = redis.duplicate()
  sub.subscribe('analytics:global')
  sub.on('message', (_, msg) => res.write(`data: ${msg}\n\n`))

  req.on('close', () => sub.quit())
})
```

---

## Performance Targets

| Metric | Target |
|--------|--------|
| WS connections per instance | 10,000 |
| Bid-to-broadcast latency | < 100ms (p99) |
| Reconnection + catch-up | < 2s |
| Redis pub/sub latency | < 10ms |
| Max channels per Redis instance | 100,000 |
