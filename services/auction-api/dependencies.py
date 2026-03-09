from typing import AsyncGenerator

import redis.asyncio as aioredis
from confluent_kafka import Producer
from fastapi import Request

from shared.kafka.producer import get_producer


async def get_redis(request: Request) -> aioredis.Redis:
    return request.app.state.redis


def get_kafka_producer(request: Request) -> Producer:
    return request.app.state.kafka_producer
