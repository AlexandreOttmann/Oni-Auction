# Oni — Build Status

Last updated: 2026-03-10

> **New agent?** Read this file first, then read the files listed under "Required context" for your task.
> Do NOT re-do completed work. Start from "Current focus" or "Up next".

---

## Overall Progress

```
Phase 1 — Foundation         ✅ DONE
Phase 2 — Core Bid Flow      🔄 IN PROGRESS (backend done, frontend starting)
Phase 3 — Admin Dashboard    🔄 IN PROGRESS (design done, implementation pending)
Phase 4 — Quality / Security ⬜ NOT STARTED
Phase 5 — Docker + Kubernetes ⬜ NOT STARTED
```

---

## Phase 1 — Foundation ✅

| Task | Branch | Status |
|------|--------|--------|
| Docker Compose (Kafka KRaft, Redis, Postgres) | `feat/infra-foundation` | ✅ done |
| Shared schemas (Pydantic) | `feat/infra-foundation` | ✅ done |
| Shared Kafka helpers (producer, consumer, topics) | `feat/infra-foundation` | ✅ done |
| Auction API skeleton (POST /bids, GET /auctions/{id}) | `feat/infra-foundation` | ✅ done |

**What exists:**
- `infra/docker/docker-compose.yml` — full stack, all health checks passing
- `infra/scripts/create-topics.sh` — idempotent Kafka topic init
- `infra/scripts/init-db.sql` — PostgreSQL schema + seed users
- `infra/scripts/seed-redis.sh` — seeds test auctions into Redis for local dev
- `shared/schemas/` — BidEvent, PlaceBidRequest, AuctionUpdateEvent, AuctionLifecycleEvent, DLQEvent
- `shared/kafka/` — topics constants, non-blocking producer (with background poll loop), manual-commit consumer

---

## Phase 2 — Core Bid Flow 🔄

| Task | Branch | Status |
|------|--------|--------|
| auction-api (POST /bids, GET /auctions/{id}, CORS) | `feat/infra-foundation` | ✅ done |
| bid-worker (English + Dutch logic, Redis, DB, DLQ) | `feat/bid-worker-ws-service` | ✅ done |
| websocket-service (WS endpoint + Kafka→Redis pub/sub) | `feat/bid-worker-ws-service` | ✅ done |
| auction-timer (lot lifecycle, Dutch rounds) | `feat/bid-worker-ws-service` | ✅ pushed |
| React auction page (Buyer view) | `feat/bid-worker-ws-service` | ✅ done |
| React Login page | `feat/bid-worker-ws-service` | ✅ done |
| React Homepage | `feat/bid-worker-ws-service` | ✅ done |
| React Admin Dashboard | `feat/bid-worker-ws-service` | ✅ done |

**What exists:**
- `services/auction-api/` — POST /bids (Kafka produce), GET /auctions (DB list with bid aggregation), GET /auctions/{id} (Redis read), POST/GET /auth/* (cookie auth), health check
- `services/bid-worker/` — English bid validation, Dutch win logic, Redis updates, PostgreSQL persistence, DLQ
- `services/websocket-service/` — /ws/lot/{lot_id}, state snapshot on connect, Kafka→Redis pub/sub broadcast, /stats
- `frontend/react-app/` — full React 18 app: 4 pages, 30+ components, Zustand stores, TanStack Query, motion.dev animations, D3 charts
  - `src/pages/` — HomePage, LoginPage, AdminDashboard, LiveAuction
  - `src/components/home/` — HomeNav, HeroSection, BidTickerBackground, FeatureStrip, LivePreviewPanel, HomeFooter
  - `src/components/login/` — LoginForm, LoginBrandPanel, ActivityHeatmap (D3), LiveBidFeed
  - `src/components/dashboard/` — AdminSidebar, KpiStrip, AuctionFilterTabs, AuctionListRow, AuctionList, HeatBar, NewAuctionModal
  - `src/components/auction/` — AuctionHeader, HeroPricePanel, CountdownTimer, BidderCount, UserStatusBadge, BidInputPanel, DutchStrikePanel, BidHistory, LotDetails, OutcomePanel
  - `src/stores/` — authStore, dashboardStore, auctionStore (Zustand)
  - `src/hooks/` — useAuth, useAuctionList, useAuctionWebSocket, useBootstrapAuth
  - Auth persists across refresh via HttpOnly `oni_token` cookie — no localStorage token
  - Mock data seeded in all components — UI fully functional without backend

**Verified working end-to-end:**
```
POST /bids → Kafka bids topic → bid-worker → Redis updated → auction_updates topic
→ websocket-service → Redis pub/sub → WS clients receive BID_ACCEPTED in real-time
GET /auctions/{id} → Redis state + bid history (full snapshot)
GET /auctions → PostgreSQL join (auctions + bids + users), returns bid count + leader
POST /auth/login → bcrypt verify → HttpOnly cookie (SameSite=strict, Secure in prod)
POST /auth/logout → clears cookie (204)
GET /auth/me → validates cookie JWT, returns user info
```

**Auth contract (cookie-based):**
- Cookie name: `oni_token`, HttpOnly, SameSite=strict, 24h TTL
- All fetch calls must use `credentials: 'include'` — no Bearer tokens
- On page refresh: call `GET /api/auth/me` to rehydrate user state

---

## Design Specs ✅

All specs in `.claude/design-specs/`:
- `design-tokens.ts` — "Obsidian Terminal" palette, typography, motion.dev variants
- `live-auction-buyer.md` — Buyer Live Auction page (English + Dutch variants, all WS event mappings)
- `admin-dashboard.md` — Admin Dashboard + Auction Monitor
- `homepage.md` — Homepage with live bid ticker
- `login.md` — Login page

---

## Up Next

1. **`/senior-backend`** → `auction-timer` service
   - Open lots (SCHEDULED → ACTIVE, seed Redis state)
   - English soft-close (extend `ends_at` on last-minute bids)
   - Dutch round advancement (decrement `current_price` by `price_step` every `round_duration` seconds)
   - Close lots (ACTIVE/CLOSING → CLOSED), publish `LOT_CLOSED` event
   - Context: `kafka-design.md`, `data-models.md`

---

## Key Decisions Made

- **Partition key = `lot_id`** (not auction_id) — bids ordered at lot level
- **Kafka KRaft mode** — no Zookeeper
- **Manual Kafka commit** — always, never auto-commit in workers
- **API does not validate bid amount** — only format + lot active check; worker does logic
- **Dead-letter queue** — `bids_dlq` topic for failed bids after 3 retries
- **Two realtime planes** — Kafka for bids (durable), Redis pub/sub for canvas/presence (ephemeral)
- **shared/ package** — copied into each service's WORKDIR as `./shared` (not pip installed)
- **Producer poll loop** — background asyncio task polls producer every 50ms in FastAPI context

---

## Active Branches

| Branch | State |
|--------|-------|
| `feat/infra-foundation` | ✅ pushed |
| `feat/bid-worker-ws-service` | ✅ pushed |

---

## Ports

| Service | Port |
|---------|------|
| auction-api | 8000 (REST + Swagger /docs) |
| websocket-service | 8001 (WS + /health + /stats) |
| Kafka UI | 8080 |
| Redis | 6379 |
| PostgreSQL | 5432 |
| Kafka (external) | 9094 |
