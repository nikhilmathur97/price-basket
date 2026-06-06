"""
Application configuration — loaded from environment / .env file.
All settings are validated by Pydantic at startup.
"""
from functools import lru_cache
from typing import List, Literal, Union

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
    def _parse_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",")]
        return v

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20

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
    # From address shown in the email (e.g. "PriceBasket <noreply@pricebasket.in>").
    # For Gmail leave empty — SMTP_USER doubles as the From address.
    # For AWS SES set this because SMTP_USER is an IAM key ID, not an email.
    SMTP_FROM: str = ""
    FCM_SERVER_KEY: str = ""  # legacy HTTP API — deprecated by Google (June 2024)
    # Firebase Admin SDK credentials for FCM HTTP v1. Either an absolute path to
    # a service-account JSON file OR the raw JSON string. Generate in Firebase
    # Console → Project Settings → Service Accounts → "Generate new private key".
    # Empty = push notifications disabled (service runs in stub mode).
    FIREBASE_CREDENTIALS_JSON: str = ""

    # ── Marketing / SEO automation ────────────────────────────────────────────
    # Public site URL (used to build canonical links for content + social posts).
    SITE_URL: str = "https://pricebasket.in"

    # Master switches — automation no-ops unless explicitly enabled.
    CONTENT_AUTOMATION_ENABLED: bool = False
    SOCIAL_AUTOMATION_ENABLED: bool = False

    # IndexNow (Bing/Yandex instant indexing) — generate any GUID as the key.
    INDEXNOW_KEY: str = ""

    # Telegram (easiest to fully automate): @BotFather token + channel id/handle.
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHANNEL_ID: str = ""  # e.g. "@pricebasketindia" or "-1001234567890"

    # Meta Graph API (Facebook Page + linked Instagram Business account).
    META_PAGE_ACCESS_TOKEN: str = ""
    FACEBOOK_PAGE_ID: str = ""
    INSTAGRAM_ACCOUNT_ID: str = ""

    # X / Twitter API v2 (OAuth 1.0a user context for posting).
    TWITTER_API_KEY: str = ""
    TWITTER_API_SECRET: str = ""
    TWITTER_ACCESS_TOKEN: str = ""
    TWITTER_ACCESS_SECRET: str = ""

    # WhatsApp Business Cloud API (broadcast deals to opt-in subscribers).
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_ACCESS_TOKEN: str = ""

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
