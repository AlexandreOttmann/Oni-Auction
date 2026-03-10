from typing import AsyncGenerator

import redis.asyncio as aioredis
from confluent_kafka import Producer
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from shared.kafka.producer import get_producer


async def get_redis(request: Request) -> aioredis.Redis:
    return request.app.state.redis


def get_kafka_producer(request: Request) -> Producer:
    return request.app.state.kafka_producer


async def get_db(request: Request) -> AsyncGenerator[AsyncSession, None]:
    async with request.app.state.db_session_factory() as session:
        yield session
