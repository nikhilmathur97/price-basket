"""
Playwright browser pool — shared singleton for all scrapers.

A single Chromium browser is launched once per process and reused across
all scraper calls.  Each call gets its own BrowserContext (isolated cookies /
storage) so sessions never bleed between requests.

Usage
-----
    from app.scrapers.playwright_pool import get_browser

    async with get_browser() as browser:
        context = await browser.new_context(...)
        page    = await context.new_page()
        ...
        await context.close()

The pool is initialised lazily on first use and torn down when the FastAPI
lifespan exits (call `shutdown_playwright()` from the lifespan handler).
"""
import asyncio
import contextlib
from typing import AsyncGenerator, Optional

import structlog

log = structlog.get_logger(__name__)

_playwright = None
_browser    = None
_lock       = asyncio.Lock()


async def _ensure_browser():
    """Lazily start Playwright + Chromium (called once per process)."""
    global _playwright, _browser
    async with _lock:
        if _browser is not None and _browser.is_connected():
            return
        try:
            from playwright.async_api import async_playwright
            _playwright = await async_playwright().start()
            _browser = await _playwright.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--no-first-run",
                    "--no-zygote",
                    "--single-process",          # safer inside Docker
                    "--disable-extensions",
                ],
            )
            log.info("playwright_browser_started")
        except Exception as exc:
            log.error("playwright_start_failed", error=str(exc))
            raise


@contextlib.asynccontextmanager
async def get_browser():
    """Yield the shared Chromium browser instance."""
    await _ensure_browser()
    yield _browser


async def shutdown_playwright():
    """Gracefully close the browser + Playwright runtime."""
    global _playwright, _browser
    try:
        if _browser:
            await _browser.close()
        if _playwright:
            await _playwright.stop()
        log.info("playwright_shutdown")
    except Exception as exc:
        log.warning("playwright_shutdown_error", error=str(exc))
    finally:
        _browser = None
        _playwright = None
