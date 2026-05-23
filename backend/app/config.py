"""
Application configuration — loaded from environment / .env file.
All settings are validated by Pydantic at startup.
"""
from functools import lru_cache
from typing import List, Literal

from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        enable_decoding=False,
    )

    # ── Application ───────────────────────────────────────────────────────────
    APP_ENV: Literal["development", "staging", "production"] = "development"
    APP_NAME: str = "PriceBasket"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def _parse_origins(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",")]
        return v

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 0

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def _fix_db_scheme(cls, v: str) -> str:
        # Render (and some cloud providers) inject postgresql:// but asyncpg needs postgresql+asyncpg://
        if v.startswith("postgresql://") or v.startswith("postgres://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1).replace("postgres://", "postgresql+asyncpg://", 1)
        return v

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 300
    REDIS_PRICE_TTL: int = 180

    # ── Celery ────────────────────────────────────────────────────────────────
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    PRICE_REFRESH_INTERVAL: int = 300

    # ── JWT ───────────────────────────────────────────────────────────────────
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── OAuth ─────────────────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # ── AWS ───────────────────────────────────────────────────────────────────
    AWS_REGION: str = "ap-south-1"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    S3_BUCKET_NAME: str = "pricebasket-assets"

    # ── Scraping ──────────────────────────────────────────────────────────────
    SCRAPER_CONCURRENCY: int = 5
    PROXY_ROTATION_ENABLED: bool = False
    PROXY_LIST: str = ""
    SCRAPE_USER_AGENT_ROTATION: bool = True

    # ── Apify ─────────────────────────────────────────────────────────────────
    APIFY_API_TOKEN: str = ""
    # Default delivery location for Blinkit (Delhi NCR). Override per deployment.
    BLINKIT_LAT: str = "28.4511202"
    BLINKIT_LON: str = "77.0965147"

    # ── Admin bootstrap ───────────────────────────────────────────────────────
    # Set this in Render env vars to allow one-time admin creation via POST /admin/bootstrap
    ADMIN_SETUP_KEY: str = ""
    SEED_SECRET: str = ""

    # ── Monitoring ────────────────────────────────────────────────────────────
    SENTRY_DSN: str = ""
    PROMETHEUS_ENABLED: bool = True

    # ── Notifications ─────────────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    FCM_SERVER_KEY: str = ""

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    @property
    def proxy_list(self) -> List[str]:
        if not self.PROXY_LIST:
            return []
        return [p.strip() for p in self.PROXY_LIST.split(",") if p.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
