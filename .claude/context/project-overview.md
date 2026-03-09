# Oni — Live Auction Platform

## What It Is

**Oni** is a real-time, event-driven auction platform for supply chain and procurement. It handles multiple concurrent auctions, multiple simultaneous bidders, and distributes bid processing via Kafka to prevent race conditions.

It is a **learning project** designed to grow into a production-scale app. Every architectural decision should be learnable and explainable, not just pragmatic.

## Primary Learning Objectives

| Technology | What We Learn |
|-----------|--------------|
| React | Real-time UI, WebSocket client, data visualization |
| Python / FastAPI | REST APIs, async, Pydantic validation |
| Kafka | Event-driven architecture, producers, consumers, partitioning, consumer groups |
| Redis | Fast state storage, pub/sub, data structures |
| Docker | Containerization, multi-service local dev |
| Kubernetes | Deployment, scaling, service discovery |

## High-Level Architecture

```
React UI
   │
   ▼
Auction API (FastAPI)       ← validates bid, produces Kafka event
   │
   ▼
Kafka Topic: bids           ← partition key = auction_id (ordering guarantee)
   │
   ▼
Bid Processor Workers       ← consumer group: bid-processors
   │
   ▼
Redis (Auction State)       ← source of truth for current bid, leader, history
   │
   ▼
Kafka Topic: auction_updates
   │
   ▼
WebSocket Service           ← fans out to connected React clients
   │
   ▼
React UI                    ← live update, no page refresh
```

## Services

| Service | Language | Responsibility |
|---------|----------|---------------|
| `frontend` | React + TypeScript | UI for all user roles |
| `auction-api` | Python / FastAPI | Accept bids, validate, produce to Kafka |
| `bid-worker` | Python | Consume bids, update Redis, publish updates |
| `websocket-service` | Python | Consume updates, broadcast to WS clients |
| `auction-timer` | Python | Manage auction lifecycle and closing events |

## Infrastructure

| Tool | Role |
|------|------|
| Kafka | Event bus — bids, updates, closures |
| Zookeeper | Kafka coordination |
| Redis | Auction state store |
| Docker Compose | Local development |
| Kubernetes | Production deployment and scaling |

## Folder Structure

```
oni/
├── frontend/
│   └── react-app/
├── services/
│   ├── auction-api/
│   ├── bid-worker/
│   ├── websocket-service/
│   └── auction-timer/
├── infra/
│   ├── docker/
│   │   └── docker-compose.yml
│   └── kubernetes/
│       ├── api-deployment.yaml
│       ├── worker-deployment.yaml
│       ├── websocket-deployment.yaml
│       ├── redis.yaml
│       └── kafka.yaml
└── shared/
    ├── schemas/        ← Pydantic models shared across Python services
    └── kafka/          ← Kafka topic constants, producer/consumer helpers
```

## Future Extensions

- React Native mobile app (same backend, shared schemas)
- Event replay to rebuild auction state from Kafka history
- Analytics service consuming all topics
- Multi-region Kafka replication
