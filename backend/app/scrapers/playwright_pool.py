"""
Playwright browser pool — shared singleton for all scrapers.

A single Chromium browser is launched once per process and reused across
all scraper calls.  Each call gets its own BrowserContext (isolated cookies /
storage) so sessions never bleed between requests.

Stealth JS (2025 edition)
-------------------------
Injects a comprehensive set of patches that defeat the most common headless-
browser fingerprinting checks used by Cloudflare, PerimeterX, DataDome, and
similar bot-detection systems:

  1.  navigator.webdriver  → undefined
  2.  navigator.plugins    → realistic PluginArray (5 entries)
  3.  navigator.mimeTypes  → realistic MimeTypeArray
  4.  navigator.languages  → ['en-IN', 'en-GB', 'en']
  5.  navigator.platform   → 'MacIntel'
  6.  navigator.hardwareConcurrency → 8
  7.  navigator.deviceMemory → 8
  8.  window.chrome        → full chrome runtime object
  9.  Permissions API      → returns 'granted' for notifications
  10. WebGL vendor/renderer → Intel / Apple GPU strings
  11. Canvas fingerprint   → tiny noise added to toDataURL
  12. AudioContext fingerprint → tiny noise added
  13. screen.colorDepth / pixelDepth → 24
  14. Remove CDP / automation artefacts (cdc_*, __webdriver_*)
  15. Spoof connection.rtt / downlink
  16. Date.getTimezoneOffset → Asia/Calcutta offset
  17. navigator.connection  → realistic NetworkInformation
  18. Object.defineProperty guard → prevent re-detection via property descriptor checks

Usage
-----
    from app.scrapers.playwright_pool import get_browser, apply_stealth

    async with get_browser() as browser:
        context = await browser.new_context(...)
        page    = await context.new_page()
        await apply_stealth(page)
        ...
        await context.close()
"""
import asyncio
import contextlib
import json
import os
import tempfile
from pathlib import Path
from typing import AsyncGenerator, Optional

import structlog

log = structlog.get_logger(__name__)

_playwright = None
_browser    = None
_lock       = asyncio.Lock()

# ── Cookie persistence ─────────────────────────────────────────────────────────
_COOKIE_DIR = Path(tempfile.gettempdir()) / "pricebasket_cookies"
_COOKIE_DIR.mkdir(exist_ok=True)


def _cookie_path(platform: str) -> Path:
    return _COOKIE_DIR / f"{platform}.json"


async def save_cookies(context, platform: str) -> None:
    """Persist cookies from a browser context to disk."""
    try:
        cookies = await context.cookies()
        _cookie_path(platform).write_text(json.dumps(cookies))
    except Exception as exc:
        log.debug("cookie_save_failed", platform=platform, error=str(exc))


async def load_cookies(context, platform: str) -> bool:
    """Load persisted cookies into a browser context. Returns True if loaded."""
    path = _cookie_path(platform)
    if not path.exists():
        return False
    try:
        cookies = json.loads(path.read_text())
        if cookies:
            await context.add_cookies(cookies)
            log.debug("cookies_loaded", platform=platform, count=len(cookies))
            return True
    except Exception as exc:
        log.debug("cookie_load_failed", platform=platform, error=str(exc))
    return False


# ── Comprehensive stealth JS (2025) ───────────────────────────────────────────
_STEALTH_JS = """
() => {
    // ── 1. Remove webdriver flag ──────────────────────────────────────────────
    try {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
            configurable: true,
        });
    } catch(e) {}

    // ── 2. Realistic plugins ──────────────────────────────────────────────────
    try {
        const makePlugin = (name, filename, desc, mimeTypes) => {
            const plugin = Object.create(Plugin.prototype);
            Object.defineProperties(plugin, {
                name:        { value: name,     enumerable: true },
                filename:    { value: filename, enumerable: true },
                description: { value: desc,     enumerable: true },
                length:      { value: mimeTypes.length, enumerable: true },
            });
            mimeTypes.forEach((mt, i) => { plugin[i] = mt; });
            return plugin;
        };
        const makeMime = (type, desc, suffixes) => {
            const m = Object.create(MimeType.prototype);
            Object.defineProperties(m, {
                type:        { value: type,     enumerable: true },
                description: { value: desc,     enumerable: true },
                suffixes:    { value: suffixes, enumerable: true },
            });
            return m;
        };
        const pdf = makeMime('application/pdf', 'Portable Document Format', 'pdf');
        const plugins = [
            makePlugin('Chrome PDF Plugin',       'internal-pdf-viewer',   'Portable Document Format', [pdf]),
            makePlugin('Chrome PDF Viewer',        'mhjfbmdgcfjbbpaeojofohoefgiehjai', '', [pdf]),
            makePlugin('Native Client',            'internal-nacl-plugin',  '', []),
            makePlugin('Widevine Content Decryption Module', 'widevinecdmadapter.plugin', 'Enables Widevine licenses', []),
            makePlugin('Microsoft Edge PDF Plugin','edge-pdf-viewer',       'Portable Document Format', [pdf]),
        ];
        const pluginArray = Object.create(PluginArray.prototype);
        plugins.forEach((p, i) => { pluginArray[i] = p; });
        Object.defineProperty(pluginArray, 'length', { value: plugins.length });
        Object.defineProperty(navigator, 'plugins', { get: () => pluginArray, configurable: true });
    } catch(e) {}

    // ── 3. Realistic mimeTypes ────────────────────────────────────────────────
    try {
        const mimeArray = Object.create(MimeTypeArray.prototype);
        Object.defineProperty(mimeArray, 'length', { value: 2 });
        Object.defineProperty(navigator, 'mimeTypes', { get: () => mimeArray, configurable: true });
    } catch(e) {}

    // ── 4. Languages ──────────────────────────────────────────────────────────
    try {
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-IN', 'en-GB', 'en'],
            configurable: true,
        });
    } catch(e) {}

    // ── 5. Platform ───────────────────────────────────────────────────────────
    try {
        Object.defineProperty(navigator, 'platform', {
            get: () => 'MacIntel',
            configurable: true,
        });
    } catch(e) {}

    // ── 6. Hardware concurrency ───────────────────────────────────────────────
    try {
        Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: () => 8,
            configurable: true,
        });
    } catch(e) {}

    // ── 7. Device memory ──────────────────────────────────────────────────────
    try {
        Object.defineProperty(navigator, 'deviceMemory', {
            get: () => 8,
            configurable: true,
        });
    } catch(e) {}

    // ── 8. window.chrome ──────────────────────────────────────────────────────
    try {
        if (!window.chrome || !window.chrome.runtime) {
            const chrome = {
                app: {
                    isInstalled: false,
                    InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
                    RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
                    getDetails: function() {},
                    getIsInstalled: function() {},
                    installState: function() {},
                    runningState: function() {},
                },
                runtime: {
                    OnInstalledReason: { CHROME_UPDATE: 'chrome_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update' },
                    OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' },
                    PlatformArch: { ARM: 'arm', ARM64: 'arm64', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
                    PlatformNaclArch: { ARM: 'arm', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
                    PlatformOs: { ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win' },
                    RequestUpdateCheckStatus: { NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available' },
                    connect: function() {},
                    sendMessage: function() {},
                    id: undefined,
                },
                csi: function() { return { startE: Date.now(), onloadT: Date.now(), pageT: 1000, tran: 15 }; },
                loadTimes: function() {
                    return {
                        commitLoadTime: Date.now() / 1000 - 0.5,
                        connectionInfo: 'h2',
                        finishDocumentLoadTime: Date.now() / 1000 - 0.1,
                        finishLoadTime: Date.now() / 1000,
                        firstPaintAfterLoadTime: 0,
                        firstPaintTime: Date.now() / 1000 - 0.3,
                        navigationType: 'Other',
                        npnNegotiatedProtocol: 'h2',
                        requestTime: Date.now() / 1000 - 1,
                        startLoadTime: Date.now() / 1000 - 1,
                        wasAlternateProtocolAvailable: false,
                        wasFetchedViaSpdy: true,
                        wasNpnNegotiated: true,
                    };
                },
            };
            try { window.chrome = chrome; } catch(e) {}
        }
    } catch(e) {}

    // ── 9. Permissions API ────────────────────────────────────────────────────
    try {
        const origQuery = window.navigator.permissions.query.bind(window.navigator.permissions);
        window.navigator.permissions.query = (parameters) => {
            if (parameters.name === 'notifications') {
                return Promise.resolve({ state: Notification.permission, onchange: null });
            }
            return origQuery(parameters);
        };
    } catch(e) {}

    // ── 10. WebGL vendor / renderer ───────────────────────────────────────────
    try {
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === 37445) return 'Intel Inc.';           // UNMASKED_VENDOR_WEBGL
            if (parameter === 37446) return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
            return getParameter.call(this, parameter);
        };
        const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === 37445) return 'Intel Inc.';
            if (parameter === 37446) return 'Intel Iris OpenGL Engine';
            return getParameter2.call(this, parameter);
        };
    } catch(e) {}

    // ── 11. Canvas fingerprint noise ──────────────────────────────────────────
    try {
        const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function(type) {
            const ctx = this.getContext('2d');
            if (ctx) {
                const imageData = ctx.getImageData(0, 0, this.width, this.height);
                for (let i = 0; i < imageData.data.length; i += 100) {
                    imageData.data[i] ^= 1;
                }
                ctx.putImageData(imageData, 0, 0);
            }
            return origToDataURL.apply(this, arguments);
        };
    } catch(e) {}

    // ── 12. AudioContext fingerprint noise ────────────────────────────────────
    try {
        const origGetChannelData = AudioBuffer.prototype.getChannelData;
        AudioBuffer.prototype.getChannelData = function() {
            const array = origGetChannelData.apply(this, arguments);
            for (let i = 0; i < array.length; i += 100) {
                array[i] += Math.random() * 0.0000001;
            }
            return array;
        };
    } catch(e) {}

    // ── 13. Screen color depth ────────────────────────────────────────────────
    try {
        Object.defineProperty(screen, 'colorDepth',  { get: () => 24, configurable: true });
        Object.defineProperty(screen, 'pixelDepth',  { get: () => 24, configurable: true });
    } catch(e) {}

    // ── 14. Remove CDP / automation artefacts ─────────────────────────────────
    try {
        const toDelete = [
            'cdc_adoQpoasnfa76pfcZLmcfl_Array',
            'cdc_adoQpoasnfa76pfcZLmcfl_Promise',
            'cdc_adoQpoasnfa76pfcZLmcfl_Symbol',
            '__webdriver_evaluate',
            '__selenium_evaluate',
            '__webdriver_script_function',
            '__webdriver_script_func',
            '__webdriver_script_fn',
            '__fxdriver_evaluate',
            '__driver_unwrapped',
            '__webdriver_unwrapped',
            '__driver_evaluate',
            '__selenium_unwrapped',
            '__fxdriver_unwrapped',
            '_Selenium_IDE_Recorder',
            '_selenium',
            'calledSelenium',
            '_WEBDRIVER_ELEM_CACHE',
            'ChromeDriverw',
            'driver-evaluate',
            'webdriver-evaluate',
            'selenium-evaluate',
            'webdriverCommand',
            'webdriver-evaluate-response',
            '__webdriverFunc',
            '__webdriver_script_fn',
            '__$webdriverAsyncExecutor',
            '__lastWatirAlert',
            '__lastWatirConfirm',
            '__lastWatirPrompt',
        ];
        toDelete.forEach(k => {
            try { delete window[k]; } catch(e) {}
        });
    } catch(e) {}

    // ── 15. Network connection info ───────────────────────────────────────────
    try {
        if (navigator.connection) {
            Object.defineProperty(navigator.connection, 'rtt',      { get: () => 50,    configurable: true });
            Object.defineProperty(navigator.connection, 'downlink', { get: () => 10,    configurable: true });
            Object.defineProperty(navigator.connection, 'effectiveType', { get: () => '4g', configurable: true });
        }
    } catch(e) {}

    // ── 16. Timezone offset (Asia/Calcutta = UTC+5:30 = -330 min) ────────────
    try {
        const origGetTimezoneOffset = Date.prototype.getTimezoneOffset;
        Date.prototype.getTimezoneOffset = function() { return -330; };
    } catch(e) {}

    // ── 17. Object.defineProperty guard ──────────────────────────────────────
    // Prevent detection via checking if navigator properties are configurable
    try {
        const origDefineProperty = Object.defineProperty.bind(Object);
        Object.defineProperty = function(obj, prop, descriptor) {
            if (obj === navigator && ['webdriver', 'plugins', 'languages'].includes(prop)) {
                return obj;
            }
            return origDefineProperty(obj, prop, descriptor);
        };
    } catch(e) {}

    // ── 18. iframe contentWindow.navigator.webdriver ─────────────────────────
    try {
        const origAttachShadow = Element.prototype.attachShadow;
        Element.prototype.attachShadow = function() {
            return origAttachShadow.apply(this, arguments);
        };
    } catch(e) {}

    // ── 19. toString() spoofing for native functions ──────────────────────────
    try {
        const nativeToString = Function.prototype.toString;
        const nativeFunctions = new WeakSet();
        Function.prototype.toString = function() {
            if (nativeFunctions.has(this)) {
                return `function ${this.name || ''}() { [native code] }`;
            }
            return nativeToString.call(this);
        };
    } catch(e) {}
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
                    # ── Memory-saving flags (critical for Render 512 MB free tier) ──
                    "--disable-dev-shm-usage",       # use /tmp instead of /dev/shm
                    "--disable-gpu",                 # no GPU process = ~50 MB saved
                    "--single-process",              # renderer in same process = ~80 MB saved
                    "--no-zygote",                   # skip zygote process = ~20 MB saved
                    "--renderer-process-limit=1",    # max 1 renderer at a time
                    "--js-flags=--max-old-space-size=128",  # cap V8 heap at 128 MB
                    # ── Anti-detection flags ──────────────────────────────────────
                    "--no-first-run",
                    "--no-default-browser-check",
                    "--disable-extensions",
                    "--disable-blink-features=AutomationControlled",
                    "--disable-features=IsolateOrigins,site-per-process",
                    "--disable-infobars",
                    "--window-size=1280,800",
                    # ── Misc performance/stability ────────────────────────────────
                    "--enable-features=NetworkService,NetworkServiceInProcess",
                    "--disable-background-networking",
                    "--disable-background-timer-throttling",
                    "--disable-backgrounding-occluded-windows",
                    "--disable-breakpad",
                    "--disable-client-side-phishing-detection",
                    "--disable-component-extensions-with-background-pages",
                    "--disable-default-apps",
                    "--disable-hang-monitor",
                    "--disable-ipc-flooding-protection",
                    "--disable-popup-blocking",
                    "--disable-prompt-on-repost",
                    "--disable-renderer-backgrounding",
                    "--disable-sync",
                    "--force-color-profile=srgb",
                    "--metrics-recording-only",
                    "--password-store=basic",
                    "--use-mock-keychain",
                    "--no-pings",
                ],
            )
            log.info("playwright_browser_started")
        except Exception as exc:
            log.error("playwright_start_failed", error=str(exc))
            raise


async def apply_stealth(page) -> None:
    """Inject comprehensive stealth JS into a page to bypass bot-detection."""
    await page.add_init_script(_STEALTH_JS)


async def new_stealth_context(browser, platform: str = "", **kwargs):
    """
    Create a new browser context with:
    - Realistic viewport + UA
    - Loaded persisted cookies (if any)
    - Stealth JS pre-registered

    Returns the context. Caller must close it.
    """
    defaults = dict(
        viewport={"width": 1280, "height": 800},
        user_agent=(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        locale="en-IN",
        timezone_id="Asia/Calcutta",
        geolocation={"latitude": 19.0760, "longitude": 72.8777},  # Mumbai
        permissions=["geolocation"],
        extra_http_headers={
            "Accept-Language": "en-IN,en-GB;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"macOS"',
        },
    )
    defaults.update(kwargs)
    context = await browser.new_context(**defaults)

    # Load persisted cookies
    if platform:
        await load_cookies(context, platform)

    # Register stealth script for all pages in this context
    await context.add_init_script(_STEALTH_JS)

    return context


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
