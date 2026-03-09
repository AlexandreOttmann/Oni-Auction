import logging
from contextlib import asynccontextmanager

import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auctions, bids
from settings import settings
from shared.kafka.producer import flush_on_shutdown, get_producer

logging.basicConfig(
    level=logging.DEBUG if settings.ENVIRONMENT == "development" else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting auction-api | env=%s", settings.ENVIRONMENT)
    app.state.redis = aioredis.from_url(settings.REDIS_URL, decode_responses=False)
    app.state.kafka_producer = get_producer()
    logger.info("Redis and Kafka producer ready")

    yield

    # Shutdown
    logger.info("Shutting down auction-api...")
    await flush_on_shutdown()
    await app.state.redis.aclose()
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
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(bids.router)
app.include_router(auctions.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "auction-api"}
