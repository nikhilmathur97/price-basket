# PriceBasket — Technical Architecture

> Last updated: May 2025  
> Stack: Next.js 14 · FastAPI · PostgreSQL · Redis · Celery · Playwright

---

## 1. High-Level System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                               │
│   Browser (Next.js SSR/CSR)   Flutter App (WebView)         │
└───────────────────┬─────────────────────────────────────────┘
                    │  HTTPS
┌───────────────────▼─────────────────────────────────────────┐
│                    VERCEL EDGE (Frontend)                     │
│   Next.js 14 App Router · ISR · Middleware · Static Assets   │
└───────────────────┬─────────────────────────────────────────┘
                    │  REST API (HTTPS / CORS)
┌───────────────────▼─────────────────────────────────────────┐
│              RENDER (Backend — FastAPI)                       │
│   /api/v1/auth  /products  /prices  /cart  /analytics        │
└────┬────────────────────────────────────────┬────────────────┘
     │                                        │
┌────▼──────────┐                   ┌─────────▼──────────────┐
│  PostgreSQL   │                   │        Redis           │
│  (Neon/Render)│                   │  (Cache + Celery Broker)│
│  Primary DB   │                   │  Price cache, sessions  │
└───────────────┘                   └────────────────────────┘
                                             │
                              ┌──────────────▼─────────────┐
                              │    Celery Workers           │
                              │  Price refresh (every 5min) │
                              │  Alert notifications        │
                              └──────────────┬─────────────┘
                                             │
                              ┌──────────────▼─────────────┐
                              │   Playwright Scrapers       │
                              │ Blinkit·Zepto·Instamart     │
                              │ BigBasket·Amazon·Flipkart   │
                              │ JioMart·Dunzo               │
                              └────────────────────────────┘
```

---

## 2. Frontend Architecture (Next.js 14)

### Framework & Routing
- **Next.js 14 App Router** — all pages in `frontend/src/app/`
- **Rendering strategy:**
  - Home page: ISR (Incremental Static Regeneration) — pre-fetched featured products, revalidated every 5 minutes
  - Product page (`/product/[id]`): Dynamic SSR — real-time prices on every request
  - Static pages (privacy, terms, blog, etc.): Fully static at build time

### State Management
| Store | Library | Persisted? | Purpose |
|-------|---------|-----------|---------|
| `authStore` | Zustand + persist | `user` in localStorage | JWT tokens, user profile |
| `cartStore` | Zustand | No | Cart items, synced with backend |

**Auth flow:**
```
Login → setAccessToken (memory) + setUser (localStorage) → router.replace("/")
Reload → Zustand persist rehydrates user from localStorage → markHydrated() sets isAuthenticated
Token refresh → axios interceptor catches 401 → POST /auth/refresh → new access token
```

### API Layer
- All backend calls go through `frontend/src/services/api.ts`
- **Axios client** with:
  - Auto JWT injection via request interceptor
  - Automatic token refresh on 401 via response interceptor
  - `withCredentials: true` for httpOnly refresh token cookie
  - Guest session via `X-Session-ID` header (localStorage)

### Key Libraries
```
next 14.2.3          — framework
react-query          — server state, caching (staleTime: 5min on homepage)
zustand              — client state
framer-motion        — animations
tailwindcss          — styling
react-hot-toast      — notifications
lucide-react         — icons
axios                — HTTP client
```

---

## 3. Backend Architecture (FastAPI)

### Entry Point
`backend/app/main.py` — creates the FastAPI app, registers routers, middleware, startup/shutdown hooks.

### API Routers (`/api/v1/`)
| Router | Prefix | Key Endpoints |
|--------|--------|--------------|
| `auth.py` | `/auth` | register, login, logout, refresh, me |
| `products.py` | `/products` | list, search, featured, `/{id}` |
| `prices.py` | `/prices` | `/{product_id}/refresh`, bulk refresh |
| `cart.py` | `/cart` | get, add, update, remove, clear |
| `users.py` | `/users` | `/me` PATCH, preferences |
| `analytics.py` | `/analytics` | event tracking, dashboard stats |
| `admin.py` | `/admin` | platform management, user admin, seeding |
| `websocket.py` | `/ws` | real-time price push (planned) |

### Middleware Stack
```
1. CORSMiddleware         — allows pricebasket.in, Vercel preview URLs, localhost:3000
2. AuthMiddleware         — attaches user to request context from JWT
3. RateLimiterMiddleware  — per-IP rate limiting (Redis-backed)
```

### Dependency Injection
```python
# Every route that needs DB:
async def route(db: AsyncSession = Depends(get_db))

# Every route that needs current user:
async def route(user: User = Depends(get_current_user))
```

---

## 4. Database Architecture (PostgreSQL)

### Connection
- **Driver:** `asyncpg` via SQLAlchemy 2.0 async engine
- **Connection pool:** `pool_size=20`, `max_overflow=0`, `pool_pre_ping=True`
- **Sessions:** `AsyncSessionLocal` — one session per request, auto-commit on success, rollback on exception

### Schema — Entity Relationship

```
users
├── id (UUID PK)
├── email (unique, indexed)
├── hashed_password (bcrypt, nullable for OAuth users)
├── full_name, phone, avatar_url
├── city, pincode, latitude, longitude
├── is_active, is_verified, is_admin
├── oauth_provider (google/facebook), oauth_id
├── notification_email, notification_push
├── preferred_platforms (JSON)
└── created_at, updated_at, last_login_at
    │
    ├──▶ carts (1:many)
    ├──▶ price_alerts (1:many)
    └──▶ refresh_tokens (1:many)

categories
├── id (UUID PK)
├── slug (unique, indexed)  ← e.g. "dairy-breakfast"
├── name, icon (emoji), image_url
├── display_order, is_active
└── parent_id (self-referential FK for sub-categories)
    │
    └──▶ products (1:many)

products
├── id (UUID PK)
├── slug (unique, indexed)  ← e.g. "amul-gold-milk-1l"
├── name (indexed), brand, description
├── image_url, thumbnail_url
├── category_id (FK → categories)
├── unit, weight_grams, barcode
├── tags (PostgreSQL ARRAY)
├── is_active, is_featured
└── created_at, updated_at
    │
    ├──▶ platform_prices (1:many) ← CURRENT prices
    ├──▶ price_history (1:many)   ← ALL historical prices
    ├──▶ cart_items (1:many)
    └──▶ price_alerts (1:many)

platforms
├── id (UUID PK)
├── slug (unique)  ← "blinkit", "zepto", "instamart"
├── name, logo_url, color_hex
├── avg_delivery_minutes
├── min_order_amount, delivery_fee, free_delivery_threshold
└── is_active

platform_prices  ← THE CORE TABLE (current price per product per platform)
├── id (UUID PK)
├── product_id (FK, indexed)
├── platform_id (FK, indexed)
├── price (Numeric 10,2)
├── original_price (MRP)
├── discount_percent, discount_label
├── is_available, stock_count
├── platform_product_id, platform_product_url
├── delivery_time_minutes
├── last_updated (indexed)
└── source ("scrape" | "api" | "estimated")

price_history  ← TIME-SERIES (every scrape appended, never updated)
├── id (UUID PK)
├── product_id (FK, indexed)
├── platform_id (FK)
├── price, is_available
└── recorded_at (indexed)

price_alerts
├── id (UUID PK)
├── user_id (FK, indexed)
├── product_id (FK, indexed)
├── target_price
├── is_active, triggered_at
└── created_at

carts / cart_items
├── cart: id, user_id, session_id, created_at
└── cart_item: cart_id, product_id, platform_id, quantity

refresh_tokens
├── token (hashed), user_id, expires_at, revoked
```

### How Data is Saved
1. **Products** are seeded via `POST /admin/seed` or Alembic migration scripts — name, category, barcode, unit.
2. **PlatformPrice** rows are created/updated by the price engine after every scrape — `INSERT ... ON CONFLICT (product_id, platform_id) DO UPDATE SET price=...`
3. **PriceHistory** rows are appended (never updated) every time a new price is scraped — creates the time-series for charts.
4. **Cart changes** write to `cart_items` immediately via API call from the frontend.
5. **Price alerts** are created by users via `POST /prices/alerts` and checked by the Celery worker every 5 minutes.

---

## 5. Redis Architecture

### Connection
```python
# backend/app/cache/redis_client.py
client = redis_from_url(
    settings.REDIS_URL,      # redis://localhost:6379/0 (dev) or cloud URL (prod)
    encoding="utf-8",
    decode_responses=True,
    max_connections=50,
)
```

Redis is **optional with graceful fallback** — if unavailable, the app runs without caching (prices fetched live every request).

### Redis Databases Used
| DB | Use | Key Pattern |
|----|-----|-------------|
| `db/0` | Price cache (API cache) | `price:<product_id>` |
| `db/1` | Celery task broker (message queue) | Celery internal keys |
| `db/2` | Celery result backend (task results) | Celery internal keys |

### Price Cache Flow

```
User requests product prices
         │
         ▼
price_engine.py: cache_get("price:<product_id>")
         │
    ┌────┴──────────────┐
    │                   │
  HIT ✓              MISS ✗
    │                   │
Return cached JSON    Fan-out to all scrapers concurrently
(< 5ms response)      (Playwright + HTTP requests, ~2–8 sec)
                       │
                       ▼
                  Persist to PostgreSQL
                  (platform_prices table — upsert)
                  Append to price_history
                       │
                       ▼
                  cache_set("price:<product_id>", json_data, ttl=180)
                  (stored for 3 minutes)
                       │
                       ▼
                  Return fresh prices
```

### Cache Key Schema
```
price:<product_uuid>          → JSON blob of all platform prices for that product
                                TTL: 180 seconds (REDIS_PRICE_TTL)

General cache keys:           → Various API responses
                                TTL: 300 seconds (REDIS_CACHE_TTL)
```

### What is Stored in Redis Cache
```json
{
  "product_id": "uuid",
  "prices": [
    {
      "platform_id": "uuid",
      "platform_slug": "blinkit",
      "price": 89.0,
      "original_price": 110.0,
      "discount_percent": 19.0,
      "is_available": true,
      "delivery_time_minutes": 10,
      "platform_product_url": "https://blinkit.com/...",
      "source": "scrape"
    }
  ],
  "cheapest_platform_id": "uuid",
  "fastest_platform_id": "uuid",
  "best_value_platform_id": "uuid",
  "fetched_at": "2025-05-29T10:00:00Z"
}
```

### Cache Invalidation
- **TTL-based:** Auto-expires after 180s (price cache) or 300s (general cache)
- **Manual invalidation:** `cache_delete_pattern("price:*")` — called after bulk price refresh
- **Per-product:** `cache_delete("price:<product_id>")` — called after single product refresh

---

## 6. Scraper Architecture

### How Scrapers Work
Each platform has a dedicated scraper in `backend/app/scrapers/`:

```
base_scraper.py          ← Abstract base class, common utilities
blinkit_scraper.py       ← Playwright (headless Chromium)
zepto_scraper.py         ← Playwright
instamart_scraper.py     ← Playwright
bigbasket_scraper.py     ← Playwright / HTTP
flipkart_scraper.py      ← HTTP requests + JSON parsing
amazon_scraper.py        ← HTTP requests + HTML parsing
jiomart_scraper.py       ← HTTP requests
dunzo_scraper.py         ← HTTP requests
fallback_pricer.py       ← Estimated prices when scrapers fail
```

### Playwright Pool
`playwright_pool.py` maintains a shared browser pool to avoid spawning a new Chromium instance per request:
- Pool of persistent browser contexts
- Reuses pages for speed
- Auto-rotation of user agents
- Headless mode (no visible browser)

### Scrape Flow
```
price_engine.fetch_prices(product_id)
    │
    ├── Get product + all platform scrapers from DB
    │
    ├── asyncio.gather(*[scraper.fetch(product) for scraper in enabled_scrapers])
    │   (all scrapers run CONCURRENTLY — max SCRAPER_CONCURRENCY=5 at once)
    │
    ├── For each result:
    │   ├── INSERT INTO platform_prices (upsert on product_id + platform_id)
    │   └── INSERT INTO price_history (append)
    │
    ├── Compute cheapest / fastest / best_value highlights
    │
    └── Store full bundle in Redis cache (TTL: 180s)
```

### Fallback Pricer
When a scraper fails or times out, `fallback_pricer.py` returns an estimated price (based on last known price from `platform_prices`) with `source="estimated"`. The frontend shows a `~Est.` badge for these.

---

## 7. Background Workers (Celery)

### Setup
```
Broker:  Redis db/1  (task queue)
Backend: Redis db/2  (task results)
```

### Scheduled Tasks
| Task | Schedule | What it does |
|------|----------|-------------|
| `refresh_all_prices` | Every 5 minutes | Queues one `refresh_product_price` task per active product |
| `refresh_product_price` | Triggered by above | Runs all scrapers for one product, saves to DB + Redis |
| `send_price_alerts` | Every 5 minutes | Checks all active PriceAlerts, sends email if target price met |

### Alert Notification Flow
```
Celery beat triggers send_price_alerts every 5min
    │
    ▼
SELECT * FROM price_alerts WHERE is_active=true
    │
    ▼
For each alert: check current price in platform_prices
    │
    ├── price <= target_price?
    │   ├── YES → Send email via SMTP (Gmail/SendGrid)
    │   │         Update triggered_at, set is_active=false
    │   └── NO  → Skip
```

---

## 8. Authentication & Security

### JWT Flow
```
POST /auth/login → returns { access_token }  (30 min TTL, memory only)
                          + sets httpOnly cookie: refresh_token  (7 days)

Authenticated request → Authorization: Bearer <access_token>
Token expired (401) → axios interceptor → POST /auth/refresh → new access_token
Logout → POST /auth/logout → revoke refresh_token in DB → clear cookie
```

### Password Security
- Passwords hashed with **bcrypt** (cost factor 12)
- Never stored in plain text, never logged
- OAuth users (Google/Facebook) have `hashed_password = null`

### Rate Limiting
- Per-IP rate limiting via `RateLimiterMiddleware` (Redis-backed sliding window)
- Login endpoint: 5 attempts per minute per IP

---

## 9. Data Flow: End-to-End Example

**User searches "Amul Milk" on mobile:**

```
1. User types "amul milk" in SearchBar
2. Frontend: GET /api/v1/products?q=amul+milk&limit=20
3. Backend: Full-text search in products table (name + brand + tags)
4. Returns list of matching products with LATEST prices from platform_prices
5. Frontend renders ProductCard list with prices from DB (fast, no scraping)

User clicks "Amul Gold 1L":
6. Frontend navigates to /product/<uuid>
7. GET /api/v1/products/<uuid>  (returns product + all platform_prices from DB)
8. Frontend renders product page with cached prices
9. Simultaneously: GET /api/v1/prices/<uuid>/refresh  (triggers live scrape)
10. price_engine.py:
    a. Checks Redis: cache_get("price:<uuid>")
    b. Cache miss → fan-out to all scrapers concurrently
    c. Scrapers hit Blinkit, Zepto, Instamart, etc.
    d. Results saved to platform_prices (upsert) + price_history (append)
    e. Saved to Redis: cache_set("price:<uuid>", data, ttl=180)
    f. Returns fresh prices
11. Frontend updates UI with live prices
12. User sees: Blinkit ₹89 · Zepto ₹94 · BigBasket ₹82 ← cheapest ✓
```

---

## 10. Deployment Architecture

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | pricebasket.in |
| Backend API | Render | pricebasket-api.onrender.com |
| Database | Render PostgreSQL / Neon | Internal connection string |
| Redis | Render Redis / Upstash | Internal connection string |
| Celery Worker | Render Background Worker | Same Docker image as API |

### CI/CD
- GitHub branch `dev` → Vercel preview deployment (auto on push)
- GitHub branch `main` → Vercel production deployment
- Backend: Render auto-deploys on push to `main`
- GitHub Actions workflow runs health-check after deploy

### Environment Variables (Key ones)
```
DATABASE_URL          PostgreSQL connection string
REDIS_URL             Redis connection (db/0)
CELERY_BROKER_URL     Redis (db/1)
CELERY_RESULT_BACKEND Redis (db/2)
SECRET_KEY            JWT signing secret
SMTP_USER/PASSWORD    Email for price alerts
APIFY_API_TOKEN       Apify cloud scraping (Blinkit)
NEXT_PUBLIC_API_URL   Backend URL injected at build time
```
