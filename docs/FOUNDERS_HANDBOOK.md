# PriceBasket — Founder's Handbook
### Everything You Might Have Forgotten

> This document covers the critical operational, legal, product, and growth topics  
> that are easy to overlook when you're deep in building.  
> Contact: founder@pricebasket.in | +91 80058 28390

---

## 1. Legal & Compliance

### Terms of Service & Privacy Policy
- ✅ Live at `/terms` and `/privacy`
- **Review annually** — especially data retention clauses and platform references
- If you start monetising with ads or affiliate links, add a **disclosure statement** to the Terms

### Data Protection (DPDP Act 2023 — India)
India's Digital Personal Data Protection Act 2023 became law. Key obligations:
- **Consent**: Users must consent to data collection — your signup form collects email, name. Ensure the privacy policy link is visible at signup.
- **Data Principal rights**: Users can request deletion of their data. Your Contact page mentions this — ensure the backend actually deletes on request (check `DELETE /users/me` endpoint exists or create it).
- **Data localisation**: Sensitive personal data of Indian users should be stored in India. If your DB is on a US data centre, consider moving to a Mumbai region (Neon, Render, or AWS ap-south-1).
- **Breach notification**: Within 72 hours of a breach, notify the Data Protection Board and affected users.

### Scraping Legality
- **Grey area**: Web scraping is not illegal in India per se, but ToS violations can lead to IP bans or legal notices.
- **Best practice**: Respect `robots.txt`, don't overload servers (use delays), rotate IPs.
- **Safer alternatives**: Pursue official API partnerships with platforms — this also gives you better data quality and legal cover.

### Affiliate Disclosure
Once affiliate links are active, add this to your footer and relevant pages:
> *"PriceBasket earns a small commission from purchases made via our platform links at no extra cost to you."*

---

## 2. Operations Runbook

### What to Check Every Morning (5 min)
```
1. https://pricebasket-api.onrender.com/health  — should return {"status":"ok"}
2. Vercel dashboard — check for build failures
3. Redis memory usage — if > 80%, flush old cache keys
4. DB connections — check pool isn't saturated (pool_size=20)
5. Celery beat — check last price refresh ran (check logs or analytics endpoint)
```

### When the Backend Is Down (Render cold start)
Render's free tier spins down after 15 min of inactivity. Cold start = 30–60 seconds.
- The frontend shows "Waking up servers…" banner after 15s (already implemented)
- **Fix**: Upgrade to Render Starter ($7/month) for always-on — cold starts kill user trust

### When Scrapers Break
Platforms regularly change their HTML/JS. Signs: prices all show `~Est.` badge.
```
1. Run: python backend/scripts/debug_live_scrapers.py
2. Check which platform is returning errors
3. Update the relevant scraper (selectors, API endpoints)
4. Re-deploy backend
```

### Database Backup
- **Render PostgreSQL**: Automatic daily backups (7-day retention on free tier, 30-day on paid)
- **Manual backup**: `pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql`
- **Restore**: `psql $DATABASE_URL < backup_YYYYMMDD.sql`
- **Recommendation**: Set up weekly automated backup export to S3 (bucket: `pricebasket-assets`, region: `ap-south-1`)

---

## 3. Monitoring & Alerting (Not Yet Set Up — Do This)

### What You Should Add
| Tool | What it monitors | Cost |
|------|-----------------|------|
| Sentry | Backend errors, frontend JS errors | Free tier |
| UptimeRobot | API uptime, 1-min checks, SMS alert | Free |
| Grafana Cloud | Celery worker health, DB query times | Free tier |
| Vercel Analytics | Core Web Vitals, page load, INP | Built-in |

### Sentry Setup (15 minutes)
The `SENTRY_DSN` config variable is already in `backend/app/config.py` — just set the env var:
```
SENTRY_DSN=https://your-key@sentry.io/your-project
```
Also add to frontend:
```
npm install @sentry/nextjs
NEXT_PUBLIC_SENTRY_DSN=...
```

### UptimeRobot
Create a free monitor at uptimerobot.com → monitor `https://pricebasket-api.onrender.com/health` every 1 minute. Set SMS alert to your phone.

---

## 4. SEO Checklist (Do Before Scaling)

| Item | Status | Notes |
|------|--------|-------|
| sitemap.xml | ✅ Live at `/sitemap.xml` | |
| robots.txt | ❓ Check it exists | Create `public/robots.txt` |
| OG / Twitter meta tags | ❓ Check product pages | Add `og:image`, `og:description` per product |
| Canonical URLs | ❓ | Prevent duplicate content on filtered pages |
| Page speed (Core Web Vitals) | ✅ GPU-composited cards | Check via PageSpeed Insights |
| Structured data (JSON-LD) | ❌ Not added | Add `Product` + `Offer` schema to product pages — shows prices in Google Search |
| Google Search Console | ❓ | Submit sitemap, monitor coverage |
| Google Analytics / Plausible | ❓ | No analytics currently — add ASAP for decision-making |

**Highest impact missing item: JSON-LD structured data on product pages.**  
Google can show price comparison cards directly in search results. Add to `/product/[id]/page.tsx`:
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Amul Gold Milk 1L",
  "offers": [
    { "@type": "Offer", "seller": "Blinkit", "price": "89", "priceCurrency": "INR" }
  ]
}
```

---

## 5. Product Roadmap (Things to Build Next)

### Near Term (1–3 months)
- [ ] **Google/Facebook OAuth login** — config is ready in backend (`GOOGLE_CLIENT_ID`), just wire up the frontend
- [ ] **Push notifications** (FCM) — FCM_SERVER_KEY config exists, build the web push service worker
- [ ] **Barcode scanner** (mobile) — scan a product barcode to instantly compare prices
- [ ] **Price history chart** — show 30/90-day price trend on product page (data already in `price_history` table)
- [ ] **Split cart optimizer** — "Buy these 3 from Zepto + these 2 from BigBasket to save ₹47"

### Medium Term (3–6 months)
- [ ] **Saved shopping lists** — "My weekly basket" with one-click price refresh
- [ ] **Location-aware pricing** — prices vary by delivery pincode (especially Blinkit)
- [ ] **Category deal alerts** — "Alert me when anything in Dairy drops > 20%"
- [ ] **Affiliate link integration** — UTM parameters on all "Buy" click-throughs
- [ ] **B2B API** — public API with rate limits + billing

### Long Term (6–12 months)
- [ ] **ML price predictions** — "Amul Milk will likely drop in price next Tuesday"
- [ ] **Group buying** — share a basket with family, everyone adds items, one optimised order
- [ ] **Browser extension** — highlight cheapest platform while shopping on any quick-commerce app

---

## 6. Platform Partnership Outreach Template

Use this email template when approaching Blinkit, Zepto, etc. for official partnerships:

```
Subject: Partnership Opportunity — PriceBasket × [Platform Name]

Hi [Name],

I'm Nikhil, founder of PriceBasket (pricebasket.in) — India's quick-commerce 
price comparison platform. We currently drive [X] click-throughs per month to 
[Platform], and we'd love to formalise the relationship.

We're proposing:
1. Official API access for real-time pricing (better data quality for us, 
   better attribution for you)
2. Co-marketing: featured placement on our homepage for [Platform]
3. Affiliate/referral tracking: proper revenue share on orders we originate

We have [X]K registered users, [Y]K MAU, and an average session of 4+ minutes — 
highly engaged price-conscious shoppers who are already buying on your platform.

Happy to share traffic data. Can we schedule a 20-minute call this week?

Best,
Nikhil
founder@pricebasket.in | +91 80058 28390
```

---

## 7. Infrastructure Upgrade Path

### Current State (Free Tier — ~₹0/month)
```
Frontend: Vercel Hobby (free)
Backend:  Render Free (sleeps after 15min, 512MB RAM)
DB:       Render PostgreSQL Free (1GB, shared)
Redis:    Render Redis Free (25MB)
```

### When to Upgrade
| Trigger | Upgrade |
|---------|---------|
| Users complain about slow load (cold start) | Render Starter ($7/month) — always-on |
| DB > 800MB | Render Starter DB ($7/month) or Neon Pro |
| Redis cache evictions frequent | Upstash Redis ($0–$10/month) |
| > 100K MAU | Move to Render Standard + CDN for images |
| Scraper IP bans frequent | Add proxy rotation service (Bright Data, Oxylabs) |

### Cost at 100K MAU (~₹8,000–₹20,000/month)
```
Render Standard backend:  $25/month  (₹2,000)
Render DB Starter:        $7/month   (₹580)
Upstash Redis:            $10/month  (₹830)
Vercel Pro:               $20/month  (₹1,660)
Proxies (scraping):       $20/month  (₹1,660)
Email (SendGrid):         $15/month  (₹1,240)
Monitoring (Sentry Pro):  $26/month  (₹2,150)
Total:                    ~$103/month (₹8,500)
```

---

## 8. Security Checklist

- [x] Passwords hashed with bcrypt (cost=12)
- [x] JWT access tokens (30 min TTL, memory-only)
- [x] Refresh tokens in httpOnly cookies (7 days)
- [x] CORS restricted to known origins
- [x] Rate limiting on login endpoint
- [x] Input validation via Pydantic
- [ ] **HTTPS-only redirect** — add to Vercel config
- [ ] **Content Security Policy header** — add via Next.js middleware
- [ ] **Dependency audit** — run `npm audit` + `pip-audit` monthly
- [ ] **SQL injection** — using SQLAlchemy ORM (safe), but verify all raw queries
- [ ] **Admin bootstrap key** — ADMIN_SETUP_KEY must be unset in production after setup
- [ ] **Secret rotation** — rotate SECRET_KEY and SMTP_PASSWORD quarterly
- [ ] **Responsible disclosure page** — ✅ Live at `/security`

---

## 9. Things Commonly Forgotten at Launch

### ☑ Analytics
No Google Analytics or Plausible is installed. You cannot make data-driven decisions without knowing which pages users visit, where they drop off, or which searches yield zero results.

**Quick fix:** Add Plausible Analytics (privacy-friendly, ₹800/month):
```tsx
// frontend/src/app/layout.tsx
<Script defer data-domain="pricebasket.in" src="https://plausible.io/js/script.js" />
```

### ☑ Error Monitoring
No Sentry is connected. You won't know when users hit a 500 error or a JS crash. `SENTRY_DSN` is in config — just set the env var.

### ☑ robots.txt
`frontend/public/robots.txt` may not exist. Without it, search engines guess what to crawl. Create it:
```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Sitemap: https://pricebasket.in/sitemap.xml
```

### ☑ Favicon & App Icons
Basic favicon is set. Ensure you also have:
- `apple-touch-icon.png` (180×180) for iOS home screen
- `manifest.json` for PWA / Android home screen install

### ☑ Email Verification
Users can sign up with any email. No verification is sent. Without this, you accumulate fake accounts and your price alert emails go to non-existent addresses. Implement `POST /auth/verify-email` with a 24-hour token.

### ☑ Rate Limiting on All Endpoints
Rate limiting is implemented but check it covers:
- `/auth/register` — prevent spam accounts
- `/prices/*/refresh` — prevent scraper abuse
- `/products` search — prevent data harvesting

### ☑ Price Alert Email HTML
Ensure the price alert email is not plain text. A well-designed email with the product image, price comparison table, and a "Buy Now" button significantly increases click-through rates.

### ☑ GDPR / DPDP Cookie Consent Banner
If you have Google Analytics or any tracking, you need a cookie consent banner. Even without it, add one to future-proof for any analytics tools you add.

### ☑ Whitelabel / Remove "Built with Next.js" Header
Vercel adds `x-powered-by: Next.js` to responses. Remove it in `next.config.js`:
```js
module.exports = { poweredByHeader: false }
```

### ☑ Image Optimisation
Product images come from external CDNs (Pexels, platform URLs). Add proper `next/image` domains to `next.config.js` to avoid "hostname not configured" errors in production.

### ☑ Celery Beat Scheduler
The `refresh_all_prices` Celery task must be scheduled via `celery beat`. Ensure the Render background worker starts both `celery worker` AND `celery beat`, or run them as separate services.

### ☑ Database Migrations
Alembic is likely set up (`backend/alembic/`). Run `alembic upgrade head` after every deploy that changes the schema. Missed migrations in production = downtime.

### ☑ Multi-language / Hindi Support
India has 500M+ Hindi speakers. Even basic Hindi UI ("सबसे सस्ता", "तुलना करें") could dramatically improve engagement in Tier 2/3 cities — a massive untapped market.

---

## 10. Key Contacts & Links

| Resource | Link |
|----------|------|
| Frontend (Vercel) | vercel.com/nikhilmathur428-3892s-projects/frontend |
| Backend (Render) | render.com → pricebasket-api |
| GitHub Repo | github.com/nikhilmathur97/price-basket |
| Live Site | pricebasket.in |
| Instagram | @pricebasketindia |
| WhatsApp | +91 80058 28390 |
| Founder Email | founder@pricebasket.in |
