"""
Base scraper interface.
All platform-specific scrapers must implement `fetch_price`.
Built-in: retry with exponential back-off, proxy rotation, user-agent rotation.
"""
import asyncio
import random
import uuid
from abc import ABC, abstractmethod
from typing import Optional

import httpx
import structlog
from fake_useragent import UserAgent
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.config import settings
from app.services.price_engine import PriceData

log = structlog.get_logger(__name__)
_ua = UserAgent()


class ScraperError(Exception):
    """Raised when a scraper fails to retrieve data."""


class BaseScraper(ABC):
    """Abstract base class for all quick-commerce platform scrapers."""

    platform_slug: str = ""
    BASE_URL: str = ""

    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            headers = {
                "User-Agent": _ua.random if settings.SCRAPE_USER_AGENT_ROTATION else _ua.chrome,
                "Accept": "application/json, text/html, */*",
                "Accept-Language": "en-IN,en;q=0.9",
            }
            proxy = self._get_proxy()
            self._client = httpx.AsyncClient(
                headers=headers,
                timeout=httpx.Timeout(10.0, connect=5.0),
                follow_redirects=True,
                proxy=proxy,
            )
        return self._client

    def _get_proxy(self) -> Optional[str]:
        if not settings.PROXY_ROTATION_ENABLED or not settings.proxy_list:
            return None
        return random.choice(settings.proxy_list)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.HTTPError, ScraperError)),
        reraise=True,
    )
    async def _get(self, url: str, **kwargs) -> httpx.Response:
        client = await self._get_client()
        response = await client.get(url, **kwargs)
        response.raise_for_status()
        return response

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.HTTPError, ScraperError)),
        reraise=True,
    )
    async def _post(self, url: str, **kwargs) -> httpx.Response:
        client = await self._get_client()
        response = await client.post(url, **kwargs)
        response.raise_for_status()
        return response

    @abstractmethod
    async def fetch_price(
        self,
        product_id: uuid.UUID,
        product_name: str = "",
    ) -> Optional[PriceData]:
        """
        Fetch current price for `product_id` from this platform.
        `product_name` is passed for scrapers that query by name (e.g. Apify actors).
        Returns None if product is not found or unavailable.
        """

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()
