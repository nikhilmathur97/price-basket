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

# JavaScript injected into every page to mask headless/bot signals
_STEALTH_JS = """
() => {
    // 1. Remove webdriver flag
    Object.defineProperty(navigator, 'webdriver', {get: () => undefined});

    // 2. Spoof plugins (headless has 0 plugins)
    Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
    });

    // 3. Spoof languages
    Object.defineProperty(navigator, 'languages', {
        get: () => ['en-IN', 'en-GB', 'en'],
    });

    // 4. Spoof platform
    Object.defineProperty(navigator, 'platform', {get: () => 'MacIntel'});

    // 5. Fix chrome object (headless_shell lacks window.chrome)
    if (!window.chrome) {
        window.chrome = {
            runtime: {},
            loadTimes: function(){},
            csi: function(){},
            app: {},
        };
    }

    // 6. Permissions API — return 'granted' for notifications to look real
    const origQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications'
            ? Promise.resolve({state: Notification.permission})
            : origQuery(parameters)
    );

    // 7. Remove automation-related properties
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
}
"""


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
                    "--disable-extensions",
                    "--disable-blink-features=AutomationControlled",
                    "--disable-features=IsolateOrigins,site-per-process",
                    "--window-size=1280,800",
                    # NOTE: --single-process and --no-zygote removed —
                    # they cause browser crashes when multiple contexts run sequentially
                ],
            )
            log.info("playwright_browser_started")
        except Exception as exc:
            log.error("playwright_start_failed", error=str(exc))
            raise


async def apply_stealth(page) -> None:
    """Inject stealth JS into a page to bypass bot-detection."""
    await page.add_init_script(_STEALTH_JS)


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
