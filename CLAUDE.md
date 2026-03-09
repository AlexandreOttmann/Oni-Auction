# Oni — Real-time Auction Platform

Event-driven auction platform for supply chain / procurement. React web app + Python microservices + Kafka.

**Before any task:** Read `.claude/context/STATUS.md` first — it tells you exactly what's done and what to build next. Then read the specific context files listed for your task.

---

## Agent Roster & Responsibilities

| Skill | Invoke | Responsibility |
|-------|--------|---------------|
| `ux-ui-designer` | `/ux-ui-designer` | UX flows, UI specs, design system → outputs to `.claude/design-specs/` |
| `senior-frontend` | `/senior-frontend` | React web app — implements specs from ux-ui-designer |
| `senior-backend` | `/senior-backend` | Python services: auction-api, bid-worker, websocket-service, auction-timer |
| `realtime-architect` | `/realtime-architect` | Kafka topology, WebSocket architecture — consult BEFORE any real-time work |
| `senior-security` | `/senior-security` | Threat modeling, secure code review — run BEFORE any PR merges |
| `senior-qa` | `/senior-qa` | Unit, integration, E2E tests |
| `load-tester` | `/load-tester` | k6 concurrent bidder simulation, Kafka throughput validation |
| `playwright-pro` | `/playwright-pro` | E2E test generation and CI integration |
| `performance-profiler` | `/performance-profiler` | Profiling, bundle analysis, bottleneck detection |

See `.claude/context/agentic-workflow.md` for the full phase-by-phase build plan.

---

## Tech Stack

**Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Zustand + TanStack Query
**Backend:** Python 3.12 + FastAPI + Pydantic v2 + SQLAlchemy 2.0
**Event Bus:** Kafka (confluent-kafka) — partition key = `auction_id`
**State Store:** Redis — live auction state, bid history
**Database:** PostgreSQL — permanent records
**Testing:** pytest + Playwright + k6
**Infra:** Docker Compose (local) → Kubernetes (production)

---

## Project Structure

```
oni/
├── frontend/
│   └── react-app/
├── services/
│   ├── auction-api/        FastAPI — accept bids, produce to Kafka
│   ├── bid-worker/         Kafka consumer — validate bids, update Redis
│   ├── websocket-service/  Kafka consumer — broadcast to WS clients
│   └── auction-timer/      Auction lifecycle, Dutch round advancement
├── shared/
│   ├── schemas/            Pydantic models shared across all Python services
│   └── kafka/              Topic constants, producer/consumer helpers
└── infra/
    ├── docker/
    │   └── docker-compose.yml
    └── kubernetes/
```

---

## Key Conventions

- **Kafka partition key = auction_id** — always, no exceptions (ordering guarantee)
- **Manual Kafka commit** — only after successful processing, never auto-commit in workers
- **API does NOT validate bid amount** — only format + auction existence; worker does the logic
- **Redis = live state** — source of truth for current bid, leader, history during auction
- **PostgreSQL = permanent record** — all bids written to DB (by worker, not API)
- **Pydantic everywhere** — no unvalidated data crosses a service boundary
- **Secrets via env vars** — never hardcoded, never committed
- **Design tokens** for UI — no hardcoded hex colors in components

---

## User Roles

- **Admin** — realtime dashboard, auction monitor with charts and live state
- **Buyer** — live auction page, bidding interface (English: bid up / Dutch: wait and strike)
- **Seller** — read-only auction overview, watches demand

## Auction Types

- **English** — ascending price, highest bid at close wins
- **Dutch** — descending price per round, first to bid wins at current price

Full domain vocabulary in `.claude/context/domain-glossary.md`.

---

## Git Workflow

- `main` — stable
- Feature branches per agent/slice, worked in isolated worktrees
- Name branches clearly: `feat/auction-api`, `feat/bid-worker`, `feat/live-auction-ui`
- Security review required before any branch merges to main
