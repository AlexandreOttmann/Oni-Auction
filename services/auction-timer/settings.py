from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    KAFKA_BOOTSTRAP_SERVERS: str = "kafka:9092"
    REDIS_URL: str = "redis://redis:6379"
    ENVIRONMENT: str = "development"

    # How often the scheduler checks lot states (seconds)
    TICK_INTERVAL: float = 1.0

    # English soft-close: if a bid arrives within this many seconds of ends_at,
    # extend ends_at by SOFT_CLOSE_EXTENSION seconds
    SOFT_CLOSE_WINDOW: int = 300    # 5 minutes
    SOFT_CLOSE_EXTENSION: int = 300  # extend by 5 minutes

    # English: publish LOT_CLOSING warning this many seconds before ends_at
    CLOSING_WARN_SECONDS: int = 300  # 5 minutes


settings = Settings()
