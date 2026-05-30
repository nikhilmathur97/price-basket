"""
SEO ping service
================
Notifies search engines about new/updated URLs for near-instant indexing.

Primary channel: IndexNow (https://www.indexnow.org) — a single POST notifies
Bing, Yandex, Seznam, Naver and others; Google also consumes IndexNow signals.

Setup (one-time): generate a GUID and set INDEXNOW_KEY on BOTH the backend and
the frontend. The frontend serves the key at /indexnow (see
frontend/src/app/indexnow/route.ts), which we pass as keyLocation — so no
manual file upload is needed. See docs/MARKETING_AUTOMATION.md.

Everything no-ops (with a log line) when INDEXNOW_KEY is unset, so it is safe
to deploy before the key is configured.
"""
from __future__ import annotations

from typing import List
from urllib.parse import urlparse

import httpx
import structlog

from app.config import settings

log = structlog.get_logger(__name__)

INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow"


async def submit_indexnow(urls: List[str]) -> bool:
    """Submit one or more URLs to IndexNow. Returns True on accepted submission."""
    if not settings.INDEXNOW_KEY:
        log.info("indexnow_skip_no_key", urls=len(urls))
        return False
    if not urls:
        return False

    host = urlparse(settings.SITE_URL).netloc
    payload = {
        "host": host,
        "key": settings.INDEXNOW_KEY,
        # Served by the frontend route handler at /indexnow (returns the key).
        "keyLocation": f"{settings.SITE_URL.rstrip('/')}/indexnow",
        "urlList": urls,
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(INDEXNOW_ENDPOINT, json=payload)
        # IndexNow returns 200/202 on success.
        if resp.status_code in (200, 202):
            log.info("indexnow_submitted", count=len(urls), status=resp.status_code)
            return True
        log.warning(
            "indexnow_rejected", status=resp.status_code, body=resp.text[:200]
        )
        return False
    except Exception as exc:  # noqa: BLE001
        log.warning("indexnow_failed", error=str(exc))
        return False
