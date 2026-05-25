# Price Basket — Master Checklist
> Step-by-step roadmap to production. Work one item at a time. Check off as you go.

---

## BUSINESS MODULE — What We're Building

| Layer | Description |
|---|---|
| **Product** | Price comparison + cart optimizer for Indian quick-commerce (Blinkit, Zepto, Instamart, BigBasket, Amazon, Flipkart, JioMart, Myntra, Nykaa, Dunzo) |
| **Users** | Indian urban shoppers who buy groceries/essentials online |
| **Core Value** | Save money by seeing all prices in one place + auto-split cart across cheapest platforms |
| **Monetization (future)** | Affiliate commissions per platform redirect, premium price alerts, B2B API |
| **Go-Live Goal** | Working app that real users can search, compare, and share — today |

---

## PHASE 1 — Fix Blockers Before Deployment
> These must be done before any real user can use the app.

### 1.1 Backend Critical Fixes
- [ ] **ENV secrets for production** — Add `SECRET_KEY`, `DATABASE_URL`, `REDIS_URL` to Render env vars (currently only in local `.env`)
- [ ] **CORS production origins** — `ALLOWED_ORIGINS` in backend config must include the live Vercel URL (not just `localhost:3000`)
- [ ] **Alembic migrations** — Run `alembic revision --autogenerate` to generate initial migration, commit it. Render runs `alembic upgrade head` on boot.
- [ ] **Seed platforms on first deploy** — `scripts/seed_platforms.py` must run after migration so platform data exists
- [ ] **Admin bootstrap** — `/api/v1/admin/bootstrap` endpoint exists; run it once to create first admin user in production
- [ ] **Health check passes** — `GET /health` must return 200; Render uses this for service readiness

### 1.2 Frontend Critical Fixes
- [ ] **Production API URL** — Vercel env var `NEXT_PUBLIC_API_URL` must point to Render backend URL (not localhost)
- [ ] **WebSocket URL** — `NEXT_PUBLIC_WS_URL` must use `wss://` (not `ws://`) in production
- [ ] **Remove mock data dependency** — `HomeProductSections` and search pages must fall back gracefully when backend is unreachable, not crash
- [ ] **Orders page missing** — `frontend/src/app/orders/` has `loading.tsx` but no `page.tsx` — add stub or remove nav link
- [ ] **`.save` file cleanup** — `Header/index.tsx.save` is a leftover; delete it
- [ ] **`mockData.tsy` typo** — `frontend/src/lib/mockData.tsy` is a broken file; delete or rename to `.ts`

### 1.3 Scraper Reality Check
- [ ] **Test each scraper locally** — Run each of the 10 scrapers against live sites; mark which ones return real data vs. dummy/mock
- [ ] **Fallback for blocked scrapers** — Blinkit/Zepto block bots; ensure Apify actors are configured or graceful fallback to "price unavailable"
- [ ] **Rate limiting in place** — Scrapers must not hammer platforms; confirm delays + tenacity retry config

---

## PHASE 2 — Core Feature Polish (Today's Focus)
> Pick ONE feature from this list to complete fully today.

### 2.1 Search → Compare Flow (HIGHEST PRIORITY — ship this today)
- [ ] User types a product name in search bar
- [ ] Backend `/api/v1/products/search` returns results with prices from all available platforms
- [ ] Frontend `SearchPage` renders `PriceCompareModal` or `PriceComparison` component with real data
- [ ] Each result shows platform logo, price, delivery time, "Add to cart" CTA
- [ ] Handles empty state (no results), loading state, and error state gracefully
- [ ] Works without login (guest session via `X-Session-ID` header)

### 2.2 Cart Optimizer
- [ ] User adds items to cart from multiple search results
- [ ] `CartOptimizer` component calls backend `/api/v1/cart/optimize`
- [ ] Backend `cart_optimizer.py` returns split: "buy from Platform A to save ₹X"
- [ ] UI shows savings summary clearly — total before vs. total after optimization
- [ ] "Go to Platform" links redirect to actual product URLs on each platform

### 2.3 Price Alerts
- [ ] User can set a target price for any product (from product detail page)
- [ ] Alert stored in DB via `/api/v1/prices/alerts` or similar
- [ ] Celery worker checks prices periodically and fires notification
- [ ] In-app alert shown via WebSocket + `useWebSocket` hook
- [ ] Email notification (basic SMTP or SendGrid)

### 2.4 Auth Flow
- [ ] Sign up with email + password — form validation, error messages, redirect to home
- [ ] Login — JWT stored in memory (Zustand), refresh token in httpOnly cookie
- [ ] Token refresh working — `apiClient` interceptor handles 401 → refresh → retry
- [ ] Logout clears store + cookie
- [ ] Protected routes redirect to `/auth/login` when unauthenticated

---

## PHASE 3 — Production Deployment Checklist
> Do this after Phase 1 + at least one Phase 2 feature is working.

### 3.1 Render (Backend)
- [ ] Create Render account + new Web Service pointing to this repo
- [ ] Set all env vars in Render dashboard (see `.env.production.example`)
- [ ] Create Render PostgreSQL DB (free tier) — copy `DATABASE_URL`
- [ ] Create Render Redis (free tier) — copy `REDIS_URL`
- [ ] Deploy backend — confirm `/health` returns 200
- [ ] Run DB seed: `python scripts/seed_platforms.py` via Render shell
- [ ] Create admin: `python scripts/create_admin.py` via Render shell
- [ ] Note the live backend URL: `https://pricebasket-api.onrender.com`

### 3.2 Vercel (Frontend)
- [ ] Link project to Vercel via `vercel link` (already has `.vercel/project.json`)
- [ ] Set `NEXT_PUBLIC_API_URL` = `https://pricebasket-api.onrender.com` in Vercel dashboard
- [ ] Set `NEXT_PUBLIC_WS_URL` = `wss://pricebasket-api.onrender.com` in Vercel dashboard
- [ ] Deploy: `vercel --prod`
- [ ] Test live URL — search for "milk", "onions", confirm prices load
- [ ] Check browser console for CORS errors — fix if any

### 3.3 Post-Deploy Smoke Tests
- [ ] `GET /health` → 200
- [ ] `POST /api/v1/auth/signup` → creates user
- [ ] `POST /api/v1/auth/login` → returns tokens
- [ ] `GET /api/v1/products/search?q=milk` → returns products with prices
- [ ] `POST /api/v1/cart/optimize` → returns split recommendation
- [ ] WebSocket connection on `/ws/prices` stays connected

---

## PHASE 4 — Business & Growth (After Go-Live)

### 4.1 Trust & Retention
- [ ] Add "Last updated X mins ago" timestamp on every price — users need to trust data freshness
- [ ] Add platform rating / delivery time estimates
- [ ] Share cart comparison link (generate a short URL users can send)
- [ ] PWA manifest + `manifest.json` → "Add to Home Screen" on mobile

### 4.2 Monitoring
- [ ] Sentry DSN set in production backend + frontend
- [ ] Prometheus `/metrics` endpoint enabled for Render
- [ ] Set up uptime alert (UptimeRobot free tier on `/health`)
- [ ] Log scraper success/failure rate in admin analytics page

### 4.3 SEO & Discoverability
- [ ] Add `<title>` and `<meta description>` per page in Next.js `layout.tsx`
- [ ] Add OG image for sharing (`/og.png`)
- [ ] Add `sitemap.xml` and `robots.txt` in `/public`
- [ ] Google Search Console — verify domain, submit sitemap

### 4.4 Legal Minimum (India)
- [ ] Privacy Policy page (`/privacy`)
- [ ] Terms of Service page (`/terms`)
- [ ] Cookie notice for EU/GDPR compliance (if targeting outside India)

---

## TODAY'S SPRINT — Suggested Single Focus

**Feature to complete today: Search → Compare (Section 2.1)**

This is the entire product in one user action — if search works end-to-end with real prices, you have something you can show real users.

**Bug to fix today: Orders page missing `page.tsx` + `mockData.tsy` cleanup (Section 1.2)**

These are quick wins that prevent broken pages in production.

---

## TECH DEBT LOG (Fix as you go)

| File | Issue |
|---|---|
| `frontend/src/components/Header/index.tsx.save` | Delete — leftover vim/editor temp file |
| `frontend/src/lib/mockData.tsy` | Rename to `.ts` or delete |
| `frontend/src/app/orders/` | Missing `page.tsx` — stub needed |
| `backend/app/scrapers/dunzo_scraper.py` | Dunzo shut down in India 2023 — remove or replace with Zepto Dark Stores |
| `frontend/src/lib/mockData.ts` | Remove mock data usage from production UI paths |
| `=4.1.0` file in root | Accidental file — delete it |

