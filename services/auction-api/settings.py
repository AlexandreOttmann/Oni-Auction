from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    KAFKA_BOOTSTRAP_SERVERS: str = "kafka:9092"
    REDIS_URL: str = "redis://redis:6379"
    DATABASE_URL: str = "postgresql+asyncpg://oni:onidev@postgres:5432/oni"
    SECRET_KEY: str = "dev-secret-change-in-prod"
    ENVIRONMENT: str = "development"

    # Comma-separated list of allowed CORS origins
    # Includes: React Vite dev server, CRA, Expo web
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173,exp://localhost:8081"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
