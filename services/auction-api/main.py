import asyncio
import logging
from contextlib import asynccontextmanager

import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from routers import auctions, auth, bids
from settings import settings
from shared.kafka.producer import flush_on_shutdown, get_producer

logging.basicConfig(
    level=logging.DEBUG if settings.ENVIRONMENT == "development" else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


async def _kafka_poll_loop():
    """
    Background task that calls producer.poll() every 50ms.
    confluent-kafka's Producer is not async — poll() must be called regularly
    to trigger delivery callbacks and actually flush the internal send queue.
    Without this, messages produced in async handlers may never be sent.
    """
    producer = get_producer()
    while True:
        producer.poll(0)
        await asyncio.sleep(0.05)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting auction-api | env=%s", settings.ENVIRONMENT)
    app.state.redis = aioredis.from_url(settings.REDIS_URL, decode_responses=False)
    app.state.kafka_producer = get_producer()
    poll_task = asyncio.create_task(_kafka_poll_loop())
    engine = create_async_engine(settings.DATABASE_URL, pool_size=5, max_overflow=10)
    app.state.db_session_factory = async_sessionmaker(engine, expire_on_commit=False)
    app.state.db_engine = engine
    logger.info("Redis, Kafka producer, and DB ready")

    yield

    # Shutdown
    logger.info("Shutting down auction-api...")
    poll_task.cancel()
    await flush_on_shutdown()
    await app.state.redis.aclose()
    await app.state.db_engine.dispose()
    logger.info("Shutdown complete")


app = FastAPI(
    title="Oni Auction API",
    version="0.1.0",
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)

app.include_router(auth.router)
app.include_router(bids.router)
app.include_router(auctions.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "auction-api"}
