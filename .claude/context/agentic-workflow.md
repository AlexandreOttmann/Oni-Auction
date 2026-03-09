# Agentic Workflow — How to Build Oni with Agents

This document defines the recommended workflow for using Claude agents to build Oni. Each agent works in an isolated git worktree on its own branch.

---

## Agent Map

```
You (Orchestrator)
│
├── /ux-ui-designer       → designs screens, writes specs to .claude/design-specs/
│
├── /realtime-architect   → designs Kafka topology, WebSocket patterns (consult first)
│
├── /senior-frontend      → implements React UI from design specs
│
├── /senior-backend       → implements Python services (API, workers, WS)
│
├── /senior-security      → reviews before any PR merges
│
├── /senior-qa            → writes tests for all services
│
├── /load-tester          → simulates concurrent bidders, validates Kafka throughput
│
└── /performance-profiler → identifies bottlenecks under load
```

---

## Phase 1 — Foundation (Do These First)

**Goal:** Infrastructure running, hello-world for each service.

### Step 1: Architecture sign-off
Open a tab with `/realtime-architect`. Ask it to review the Kafka design in `.claude/context/kafka-design.md` and confirm the topology before a line of code is written.

### Step 2: Docker Compose skeleton
Open a tab with `/senior-backend`. Task:
```
Read .claude/context/project-overview.md and .claude/context/kafka-design.md.
Work in worktree: feat/infra-skeleton
Create docker-compose.yml with: kafka, zookeeper, redis, postgres.
Add health checks. No application code yet.
```

### Step 3: Shared schemas
Open a tab with `/senior-backend`. Task:
```
Work in worktree: feat/shared-schemas
Create shared/schemas/ with Pydantic models from .claude/context/data-models.md
Create shared/kafka/topics.py and shared/kafka/producer.py helpers
```

---

## Phase 2 — Core Bid Flow (The Main Learning Path)

Build in this exact order — each service depends on the previous.

### Step 4: Auction API (FastAPI)
```
/senior-backend
Read .claude/context/ (all files).
Work in worktree: feat/auction-api
Build services/auction-api/:
  - POST /bid endpoint
  - Pydantic validation
  - Kafka producer → topic "bids", key=auction_id
  - GET /auction/{id} → read from Redis
```

### Step 5: Bid Worker
```
/senior-backend
Read .claude/context/ (all files).
Work in worktree: feat/bid-worker
Build services/bid-worker/:
  - Kafka consumer group: bid-processors
  - Process bid events from "bids" topic
  - English auction logic: compare to Redis highest_bid
  - Dutch auction logic: compare to current_price, close on first bid
  - Publish to auction_updates or invalid_bids
```

### Step 6: WebSocket Service
```
/senior-backend
Read .claude/context/ (all files).
Work in worktree: feat/ws-service
Build services/websocket-service/:
  - /ws/auction/{auction_id} WebSocket endpoint
  - Consume auction_updates from Kafka
  - Broadcast to subscribed clients
  - Send full AUCTION_STATE snapshot on connect
```

### Step 7: React UI — Auction Page
```
/ux-ui-designer
Read .claude/context/domain-glossary.md and .claude/context/data-models.md
Design: Live Auction page for Buyer role.
Output spec to .claude/design-specs/live-auction-buyer.md
```
Then:
```
/senior-frontend
Read .claude/design-specs/live-auction-buyer.md and .claude/context/data-models.md
Work in worktree: feat/frontend-auction-page
Implement the Live Auction page.
```

---

## Phase 3 — Admin Dashboard

### Step 8: Admin Dashboard Design + Build
```
/ux-ui-designer
Design: Admin Dashboard (list of auctions, realtime stats, charts).
Design: Admin Auction Monitor (one auction, live bid feed, bidder count, timer).
Output to .claude/design-specs/admin-dashboard.md
```
```
/senior-frontend
Work in worktree: feat/admin-dashboard
Implement admin dashboard from spec.
Include dataviz for bid activity (recharts or lightweight-charts).
```

---

## Phase 4 — Quality, Security, Load

Run these in parallel after each feature phase:

### Security Review
```
/senior-security
Read .claude/context/ (all files).
Conduct threat model for the bid flow:
  - Kafka producer auth
  - WebSocket authentication
  - Bid manipulation vectors
  - Race condition analysis
Output findings and fix recommendations.
```

### Load Test
```
/load-tester
Read .claude/context/kafka-design.md
Simulate 500 concurrent bidders on one auction.
Simulate 10 concurrent auctions with 50 bidders each.
Validate: Kafka ordering guarantee holds, no duplicate winners.
```

### QA
```
/senior-qa
Write unit tests for bid-worker logic (English + Dutch).
Write integration tests for POST /bid API.
Write E2E Playwright test for full bid flow: place bid → WS update → UI refresh.
```

---

## Phase 5 — Docker + Kubernetes

```
/senior-backend
Work in worktree: feat/kubernetes
Write Kubernetes manifests for all services.
Add HPA for bid-worker (scale on Kafka consumer lag).
```

---

## Coordination Rules

1. **You are the tech lead.** Agents don't talk to each other — you pass outputs between them.
2. **Always pass context files.** Tell every agent to read `.claude/context/` before starting.
3. **Design before code.** Run `/ux-ui-designer` before `/senior-frontend` on any new screen.
4. **Architect before realtime code.** Run `/realtime-architect` before touching Kafka or WebSocket logic.
5. **Security before merge.** Always run `/senior-security` before a feature branch merges to main.
6. **One worktree per task.** Name branches clearly: `feat/auction-api`, `feat/bid-worker`, etc.

---

## Passing Context Between Agents (Example)

```
# After ux-ui-designer writes a spec:
# Copy its output path, then in a new frontend tab:

/senior-frontend

Read .claude/context/data-models.md and .claude/design-specs/live-auction-buyer.md
Work in worktree: feat/frontend-auction-page
Implement the component exactly as specified.
```
