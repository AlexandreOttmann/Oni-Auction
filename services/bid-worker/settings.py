from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    KAFKA_BOOTSTRAP_SERVERS: str = "kafka:9092"
    REDIS_URL: str = "redis://redis:6379"
    DATABASE_URL: str = "postgresql+asyncpg://oni:onidev@postgres:5432/oni"
    ENVIRONMENT: str = "development"


settings = Settings()
