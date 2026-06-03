# PRICEBASKET.IN — AI Agent Traffic System
# Complete Activation Guide
# ============================================================

## WHAT WAS BUILT

### New Agents (7 new files in growth/agents/)

| File | Agent | Status |
|------|-------|--------|
| `whatsapp_agent.py` | WhatsApp price drop alerts via Business API | ✅ Ready |
| `reddit_quora_agent.py` | Reddit/Quora seeder with AI answers | ✅ Ready |
| `page_generator_agent.py` | 50 city + 27 product + 5 deal + 10 compare pages | ✅ Ready |
| `headline_ab_tester.py` | 3-variant title A/B testing via GA4 CTR | ✅ Ready |
| `push_notification_agent.py` | Browser push for price drops (no app needed) | ✅ Ready |
| `trending_topic_injector.py` | Rides trending topics on Twitter + Google Trends | ✅ Ready |
| `internal_link_agent.py` | Auto-adds internal links to new blog posts | ✅ Ready |
| `orchestrator.py` | Master scheduler — runs all agents from one process | ✅ Ready |

### Backend API Endpoints Added (growth.py)

```
GET  /api/v1/growth/whatsapp-alerts       — triggered alerts for WA delivery
GET  /api/v1/growth/whatsapp-subscribers  — opted-in WA subscribers
GET  /api/v1/growth/push-alerts           — triggered alerts for push delivery
GET  /api/v1/growth/push-subscriptions    — all push subscribers
POST /api/v1/growth/push-subscriptions    — register new push subscription
POST /api/v1/growth/ab-tests              — create A/B test
GET  /api/v1/growth/ab-tests/{slug}       — get test status
POST /api/v1/growth/email/price-alerts    — trigger email alerts
POST /api/v1/growth/email/weekly-newsletter — send newsletter
POST /api/v1/growth/social/instagram      — trigger Instagram post
POST /api/v1/growth/social/tweet          — post a tweet
POST /api/v1/growth/content/generate      — generate blog post on topic
GET  /api/v1/growth/agent-status          — all agent status + API key check
```

---

## WEEK 1 ACTIVATION (Priority Order)

### Day 1 — Instagram + Twitter (30 minutes)

**Step 1: Get Twitter API keys**
1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create app → Apply for Elevated access (needed for posting)
3. Generate: API Key, API Secret, Access Token, Access Secret, Bearer Token
4. Add to `.env`:
   ```
   TWITTER_API_KEY=...
   TWITTER_API_SECRET=...
   TWITTER_ACCESS_TOKEN=...
   TWITTER_ACCESS_SECRET=...
   TWITTER_BEARER_TOKEN=...
   ```

**Step 2: Test Twitter agent**
```bash
cd growth/agents
pip install -r requirements-agents.txt
python ../../growth/social/twitter-automation.py  # posts one tweet
```

**Step 3: Get Instagram Graph API token**
1. Go to https://developers.facebook.com/apps/
2. Create app → Add Instagram Basic Display + Instagram Graph API
3. Link your Instagram Business account
4. Generate long-lived access token (60-day, auto-refresh)
5. Add to `.env`:
   ```
   INSTAGRAM_ACCESS_TOKEN=...
   INSTAGRAM_USER_ID=...
   ```

**Step 4: Test Instagram agent**
```bash
python ../../growth/social/instagram-automation.py caption atta
```

---

### Day 1 — Google Indexing API (1 hour)

**Step 1: Create service account**
1. Go to https://console.cloud.google.com/iam-admin/serviceaccounts
2. Create service account → Download JSON key
3. Save as `growth/credentials/google-service-account.json`
4. Enable APIs: Search Console API, Indexing API, Analytics Data API

**Step 2: Add to Search Console**
1. Go to https://search.google.com/search-console/
2. Settings → Users and permissions → Add user
3. Add your service account email with "Full" permission

**Step 3: Generate IndexNow key**
```bash
python -c "import uuid; print(uuid.uuid4().hex)"
# Copy the output
```
4. Add to `.env`: `INDEXNOW_KEY=<your-guid>`
5. Add to frontend `.env.local`: `NEXT_PUBLIC_INDEXNOW_KEY=<your-guid>`

**Step 4: Test indexing**
```bash
python ../../growth/seo/gsc-automation.py index https://pricebasket.in/blog/test
```

---

### Day 1 — Deal Pages (18K+/mo keywords)

**Generate /deals/blinkit and /deals/zepto pages:**
```bash
cd growth/agents
python page_generator_agent.py deals
```

This creates `frontend/src/data/generated/deal_platform_pages.json`.

**Add frontend routes** — create `frontend/src/app/deals/[platform]/page.tsx`:
```typescript
import dealPages from '@/data/generated/deal_platform_pages.json';

export async function generateStaticParams() {
  return dealPages.map(p => ({ platform: p.slug.replace('deals/', '') }));
}

export default function DealPage({ params }) {
  const page = dealPages.find(p => p.slug === `deals/${params.platform}`);
  if (!page) notFound();
  // render page.title, page.deals, page.schema
}
```

---

### Day 2 — WhatsApp Alerts

**Step 1: Set up WhatsApp Business API**
1. Go to https://developers.facebook.com/apps/ → Add WhatsApp product
2. Get Phone Number ID and Access Token
3. Create message templates in Meta Business Manager:
   - `price_drop_alert` — body: "🚨 Price Drop! {{1}} is now ₹{{3}} on {{2}} (was ₹{{4}}). Save ₹{{5}}! 👉 {{6}}"
   - `weekly_deals_digest` — body: "🛒 This week's top deals:\n{{1}}\n\nSee all: {{2}}"
   - `whatsapp_optin_confirm` — body: "Hi {{1}}! You're now subscribed to PriceBasket price alerts. Manage alerts: {{2}}"
4. Wait for template approval (24-48 hours)

**Step 2: Add opt-in to frontend**
Add a "Get WhatsApp Alerts" button on the product page that collects phone number and calls:
```
POST /api/v1/users/whatsapp-optin
{ "phone": "+919876543210" }
```

**Step 3: Test**
```bash
python growth/agents/whatsapp_agent.py test +919876543210
```

---

### Day 3 — Browser Push Notifications

**Step 1: Generate VAPID keys**
```bash
pip install py-vapid
python -c "
from py_vapid import Vapid
v = Vapid()
v.generate_keys()
print('VAPID_PRIVATE_KEY=' + v.private_key.decode())
print('VAPID_PUBLIC_KEY=' + v.public_key.decode())
"
```

**Step 2: Add to .env files**
- Backend `.env`: `VAPID_PRIVATE_KEY=...` and `VAPID_PUBLIC_KEY=...`
- Frontend `.env.local`: `NEXT_PUBLIC_VAPID_PUBLIC_KEY=...`

**Step 3: Add service worker to frontend**
```bash
python growth/agents/push_notification_agent.py sw
# Copy the service worker snippet to public/sw.js
# Copy the subscribe snippet to your React component
```

**Step 4: Test**
```bash
python growth/agents/push_notification_agent.py test
```

---

### Day 4 — City Pages (50 cities, organic SEO)

```bash
python growth/agents/page_generator_agent.py cities 10  # start with 10
# Review output in frontend/src/data/generated/city_pages.json
python growth/agents/page_generator_agent.py cities     # all 50
```

Add frontend route `frontend/src/app/grocery-prices-[city]/page.tsx` (similar to deal pages).

---

### Day 5 — Reddit Seeder

**Step 1: Create Reddit app**
1. Go to https://www.reddit.com/prefs/apps → Create App
2. Type: script
3. Name: PriceBasket Helper Bot
4. Add to `.env`: `REDDIT_CLIENT_ID=...`, `REDDIT_CLIENT_SECRET=...`

**Step 2: Test (dry run)**
```bash
REDDIT_CLIENT_ID="" python growth/agents/reddit_quora_agent.py reddit
# Runs in dry-run mode — shows what it would post
```

**Step 3: Go live**
```bash
python growth/agents/reddit_quora_agent.py reddit
```

---

## RUNNING THE FULL ORCHESTRATOR

### Start all agents (daemon mode):
```bash
cd growth/agents
cp .env.agents.example ../../.env  # fill in your keys first
pip install -r requirements-agents.txt
python orchestrator.py run
```

### Check status:
```bash
python orchestrator.py status
```

### Run specific agents only:
```bash
python orchestrator.py run --agents instagram,twitter,whatsapp,push
```

### Test a single agent:
```bash
python orchestrator.py test blog
python orchestrator.py test twitter
python orchestrator.py test whatsapp
```

### Run all agents once (no daemon):
```bash
python orchestrator.py once
```

---

## GA4 DASHBOARD SETUP

### 5 Custom Reports to Create

**Report 1: AI Content Traffic**
- Metric: Sessions
- Dimension: Page path
- Filter: Page path contains `/blog/`
- Goal: 500 sessions/post

**Report 2: Social Agent Traffic**
- Metric: Sessions
- Dimension: Session source/medium
- Filter: Source = instagram OR twitter
- Goal: 200 sessions/day

**Report 3: Email Agent Traffic**
- Metric: Sessions, Engagement rate
- Dimension: Session source/medium
- Filter: Medium = email
- Goal: 30% open rate (tracked via UTM)

**Report 4: Alert Click-through**
- Metric: Event count, Sessions
- Dimension: Event name
- Filter: Event = notification_click OR email_click
- Goal: 15% CTR

**Report 5: Organic Growth**
- Metric: Organic search sessions
- Dimension: Week
- Goal: +10% week-over-week

### Custom Events to Add to Frontend

Add to your Next.js layout or `_app.tsx`:
```javascript
// A/B test tracking
gtag('event', 'blog_title_view', {
  variant: titleVariant,  // 'A', 'B', or 'C'
  test_id: testId,
  slug: blogSlug,
});

// Push notification tracking
gtag('event', 'push_subscribe', { method: 'browser_push' });
gtag('event', 'notification_click', { campaign: 'price_drop' });

// WhatsApp opt-in tracking
gtag('event', 'whatsapp_optin', { method: 'product_page' });
```

---

## UTM PARAMETER REFERENCE

All AI-generated links use this UTM structure:

| Source | Medium | Campaign | Content |
|--------|--------|----------|---------|
| instagram | social | daily-deal | {product}-{date} |
| twitter | social | price-alert | {product}-{date} |
| whatsapp | messaging | price-drop | {product}-{date} |
| push | notification | price-drop | {product}-{date} |
| email | email | weekly-deals | {date} |
| reddit | social | community | {subreddit} |

Example:
```
https://pricebasket.in/product/atta
  ?utm_source=instagram
  &utm_medium=social
  &utm_campaign=daily-deal
  &utm_content=atta-20260531
```

---

## SAFE TRAFFIC PRACTICES

### Rate Limits (all respected by agents)
| Platform | Limit | Our Usage |
|----------|-------|-----------|
| Twitter | 300 tweets/day | 5/day ✅ |
| Instagram | 25 posts/day | 3/day ✅ |
| WhatsApp | 1,000 msgs/min | ~80/min ✅ |
| Reddit | 1 post/10 min | 1 post/2-4 hrs ✅ |
| Claude API | Rate varies | max_tokens=600 for social ✅ |

### Google Policy Compliance
- ✅ Programmatic pages have unique content (real price data per city/product)
- ✅ No cloaking — same content for users and bots
- ✅ No keyword stuffing — natural language generation
- ✅ Canonical tags on all generated pages
- ✅ IndexNow submission after generation
- ✅ Schema markup on all pages

### API Key Security
- ✅ All keys in `.env` — never hardcoded
- ✅ `.env` in `.gitignore`
- ✅ Vercel environment variables for production
- ✅ Rotate keys every 90 days

---

## TROUBLESHOOTING

**Agent not posting (dry-run mode)**
→ Check that API keys are set in `.env`
→ Run `python orchestrator.py status` to see which keys are missing

**WhatsApp template rejected**
→ Templates must be pre-approved by Meta (24-48h)
→ Use exact variable format: `{{1}}`, `{{2}}`, etc.
→ No promotional language in template header

**Reddit account flagged**
→ Ensure account is >30 days old with karma
→ Keep self-promotion < 10% of posts
→ Always add genuine value before mentioning pricebasket.in

**Push notifications not showing**
→ Check VAPID keys match between backend and frontend
→ Ensure service worker is registered at `/sw.js`
→ Test with: `python push_notification_agent.py test`

**IndexNow not working**
→ Verify key file is served at `https://pricebasket.in/indexnow`
→ Frontend route: `src/app/indexnow/route.ts` should return the key as plain text

**Page generator output not showing on site**
→ Ensure `frontend/src/data/generated/` is in `.gitignore` exclusions
→ Or use ISR: `revalidate: 3600` in Next.js page
→ Run generator weekly via orchestrator (Sunday 2am)
