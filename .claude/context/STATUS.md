# Oni — Build Status

Last updated: 2026-03-09

> **New agent?** Read this file first, then read the files listed under "Required context" for your task.
> Do NOT re-do completed work. Start from "Current focus" or "Up next".

---

## Overall Progress

```
Phase 1 — Foundation         ✅ DONE
Phase 2 — Core Bid Flow      🔄 IN PROGRESS
Phase 3 — Admin Dashboard    ⬜ NOT STARTED
Phase 4 — Quality / Security ⬜ NOT STARTED
Phase 5 — Docker + Kubernetes ⬜ NOT STARTED
```

---

## Phase 1 — Foundation ✅

| Task | Branch | Status |
|------|--------|--------|
| Docker Compose (kafka KRaft, redis, postgres) | `feat/infra-skeleton` | ✅ merged |
| Shared schemas (Pydantic) | `feat/shared-schemas` | ✅ merged |
| Shared Kafka helpers (producer, consumer, topics) | `feat/shared-schemas` | ✅ merged |

**What exists now:**
- `infra/docker/docker-compose.yml` — Kafka (KRaft), Redis, PostgreSQL, all with health checks
- `shared/schemas/` — BidEvent, PlaceBidRequest, AuctionUpdateEvent (Pydantic v2)
- `shared/kafka/topics.py` — topic name constants
- `shared/kafka/producer.py` — non-blocking async producer
- `shared/kafka/consumer.py` — manual-commit consumer helper

---

## Phase 2 — Core Bid Flow 🔄

| Task | Branch | Status |
|------|--------|--------|
| auction-api (POST /bid) | — | ⬜ not started |
| bid-worker (English + Dutch logic) | — | ⬜ not started |
| websocket-service | — | ⬜ not started |
| React auction page (Buyer view) | `feat/bid-worker-ws-service` | 🎨 design done |

**Current focus:** auction-api (backend) + React auction page implementation (frontend — design ready)

**What exists now (design):**
- `.claude/design-specs/design-tokens.ts` — full token system (colors, spacing, typography, animation)
- `.claude/design-specs/live-auction-buyer.md` — complete Buyer "Live Auction" page spec (English + Dutch variants, all component states, WS event mapping, Zustand store shape, component file map, Tailwind class reference)

---

## Up Next

1. `/senior-backend` → build `services/auction-api/`
   - POST /bid endpoint
   - Validates auction is ACTIVE in Redis
   - Produces to Kafka `bids` topic, key = `lot_id`
   - Context: `kafka-design.md`, `data-models.md`

2. `/senior-backend` → build `services/bid-worker/`
   - Consumer group: `bid-processors`
   - English + Dutch logic
   - Updates Redis, publishes to `auction_updates`

3. `/senior-backend` → build `services/websocket-service/`
   - `/ws/auction/{auction_id}` endpoint
   - Consumes `auction_updates` + `auction_events`
   - Sends `AUCTION_STATE` snapshot on connect

4. `/senior-frontend` → implement Buyer auction page
   - Design spec ready: `.claude/design-specs/live-auction-buyer.md`
   - Tokens ready: `.claude/design-specs/design-tokens.ts`

---

## Key Decisions Made

- **Partition key = `lot_id`** (not auction_id) — bids ordered at lot level, not auction level
- **Kafka KRaft mode** — no Zookeeper (deprecated in Kafka 4.x)
- **Manual Kafka commit** — always, never auto-commit in workers
- **API does not validate bid amount** — only format + auction active check; worker does logic
- **Dead-letter queue** — `bids_dlq` topic for failed bids after 3 retries
- **Two realtime planes** — Kafka for bids (durable), Redis pub/sub for canvas/presence (ephemeral)
- **Hosting** — Railway (services) + Redpanda Cloud (Kafka) when deploying

---

## Active Branches

| Branch | Owner | State |
|--------|-------|-------|
| `feat/infra-skeleton` | — | ✅ merged to main |
| `feat/shared-schemas` | — | ✅ merged to main |

---

## How to Update This File

After each task completes and merges:
1. Mark the task ✅ in the phase table
2. Add a line under "What exists now" describing what was built
3. Remove it from "Up next"
4. Update "Current focus"
