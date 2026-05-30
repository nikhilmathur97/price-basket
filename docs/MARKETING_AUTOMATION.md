# PriceBasket — SEO & Social Automation

This document covers the automated growth system: **3 engines** that put
PriceBasket in Google search and across social media with **no daily manual
work**. Everything is built to **degrade gracefully** — it deploys safely with
zero credentials and each capability "turns on" the moment you add its env vars.

---

## TL;DR — what's automated

| Engine | What it does | Runs |
|--------|--------------|------|
| **1. Technical SEO** | Per-product server metadata + Product/Offer JSON-LD, dynamic sitemap (every product + post), branded OG/Twitter images, programmatic `blinkit-vs-zepto` comparison pages | On every request/build — already live, no keys needed |
| **2. Content engine** | Auto-writes a daily "biggest price drops" SEO article from live data; pings IndexNow so search engines index it in minutes | Celery beat — daily 06:30 IST |
| **3. Social distribution** | Renders a branded deal card and auto-posts the day's biggest saving to Telegram, Facebook, Instagram & X | Celery beat — daily 10:00 & 18:00 IST |

---

## Engine 1 — Technical SEO (live now, no setup)

Already working after deploy, nothing to configure:

- **OG / Twitter images** — auto-generated at `/opengraph-image` & `/twitter-image`
  (fixes the previously broken `/og-image.png` so WhatsApp/Twitter/FB share
  cards render). Per-product pages get their own title/description/image.
- **Product structured data** — every `/product/[id]` is now server-rendered with
  `<title>`, meta description, canonical, and **Product + AggregateOffer JSON-LD**
  → eligible for Google price rich results.
- **Dynamic sitemap** — `/sitemap.xml` enumerates every active product and blog
  post (backed by the new `GET /api/v1/products/sitemap` endpoint), revalidated
  every 6h.
- **Programmatic comparison pages** — `/compare/blinkit-vs-zepto`,
  `/compare/bigbasket-vs-jiomart`, etc. (10 pre-rendered, any valid pair renders
  on demand) with FAQ JSON-LD targeting high-intent "X vs Y" searches.

### One manual step (recommended): Google Search Console
1. Add & verify `pricebasket.in` at https://search.google.com/search-console
2. Submit `https://pricebasket.in/sitemap.xml`
3. Done — Google now crawls all product/blog/compare URLs.

---

## Engine 2 — Content engine

Auto-generates one SEO article per day from the biggest live price drops,
stores it in Redis, and exposes it at `GET /api/v1/content/blog`. The frontend
merges these into `/blog` and renders each at `/blog/grocery-price-drops-YYYY-MM-DD`.

### Enable it
Set on the **backend** (Render → pricebasket-worker + API):

```
CONTENT_AUTOMATION_ENABLED=true
SITE_URL=https://pricebasket.in
```

### Instant indexing (IndexNow) — optional but powerful
Notifies Bing, Yandex & others (Google also consumes the signal) within minutes
of publishing.

1. Generate a GUID (any random hex string), e.g. `python -c "import uuid;print(uuid.uuid4().hex)"`
2. Set the **same** value on backend **and** frontend:
   - Backend (Render): `INDEXNOW_KEY=<guid>`
   - Frontend (Vercel): `INDEXNOW_KEY=<guid>`
3. The frontend automatically serves it at `https://pricebasket.in/indexnow`
   (no file upload needed). That's it.

---

## Engine 3 — Social distribution

Renders a branded 1080×1080 deal card and posts the day's biggest saving to
every configured channel. Each channel is independent — configure only the ones
you want.

### Enable it
Backend env:
```
SOCIAL_AUTOMATION_ENABLED=true
```

### Telegram (easiest — start here)
1. Message **@BotFather** → `/newbot` → copy the token.
2. Create a public channel, add the bot as an admin.
3. Backend env:
   ```
   TELEGRAM_BOT_TOKEN=<token>
   TELEGRAM_CHANNEL_ID=@yourchannelhandle
   ```

### Facebook Page + Instagram (Meta Graph API)
1. Create a Facebook Page and an Instagram **Business** account; link them.
2. At https://developers.facebook.com create an app, get a long-lived **Page
   Access Token** with `pages_manage_posts`, `instagram_basic`,
   `instagram_content_publish`.
3. Backend env:
   ```
   META_PAGE_ACCESS_TOKEN=<long-lived-token>
   FACEBOOK_PAGE_ID=<page-id>
   INSTAGRAM_ACCOUNT_ID=<ig-business-account-id>
   ```
   (Instagram requires a public image URL — the product image is used.)

### X / Twitter
1. Create a developer app at https://developer.twitter.com with **read+write**.
2. Backend env:
   ```
   TWITTER_API_KEY=...
   TWITTER_API_SECRET=...
   TWITTER_ACCESS_TOKEN=...
   TWITTER_ACCESS_SECRET=...
   ```
   (`tweepy` is in requirements.txt.)

### WhatsApp (primitive only)
The send primitive is wired (`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`)
but **broadcasting is intentionally a no-op** until an opt-in subscriber list +
approved message templates exist (WhatsApp policy). Build the subscriber store
first, then enable.

---

## Schedule (Asia/Kolkata)

| Task | When | Beat key |
|------|------|----------|
| Generate daily deal article + IndexNow ping | 06:30 | `generate-daily-content` |
| Post biggest deal to social | 10:00 & 18:00 | `post-deal-social-*` |

Defined in `backend/app/workers/celery_app.py`. Tasks run on the existing
`pricebasket-worker` (Celery beat) — no new infrastructure.

---

## Safety / cost notes

- **Zero incremental cost** to start: Vercel + existing Render worker + free
  Telegram/Meta/IndexNow APIs.
- Every integration **no-ops with a log line** when its credentials are missing,
  so partial configuration never breaks a deploy.
- Master switches (`CONTENT_AUTOMATION_ENABLED`, `SOCIAL_AUTOMATION_ENABLED`)
  default to **false** — automation only runs when you opt in.

---

## Files added/changed

**Frontend**
- `src/app/opengraph-image.tsx`, `src/app/twitter-image.tsx` — social images
- `src/app/product/[id]/page.tsx` (server wrapper) + `ProductDetailClient.tsx`
- `src/app/sitemap.ts` — now dynamic
- `src/app/compare/[matchup]/page.tsx` — programmatic comparison pages
- `src/app/blog/[slug]/page.tsx` + `src/app/blog/page.tsx` (linked) + `src/lib/blog.ts`
- `src/app/indexnow/route.ts` — IndexNow key endpoint
- `src/lib/server-api.ts`, `src/lib/platforms.ts`

**Backend**
- `app/services/deals.py` — top-deals finder (shared)
- `app/services/content_engine.py` — daily article generator (Redis-backed)
- `app/services/seo_ping.py` — IndexNow submission
- `app/services/social_card.py` — Pillow deal-card renderer
- `app/services/social_poster.py` — Telegram/FB/IG/X/WhatsApp posting
- `app/workers/marketing_worker.py` — Celery tasks
- `app/api/v1/content.py` — `/content/blog` API
- `app/api/v1/products.py` — `/products/sitemap` endpoint
- `app/config.py`, `app/workers/celery_app.py`, `app/main.py` — wiring
