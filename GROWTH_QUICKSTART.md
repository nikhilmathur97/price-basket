# 🚀 PriceBasket — Growth Quickstart Guide
### Get traffic, go viral, activate all automation in one day

> Live site: **https://pricebasket.in**
> All automation is already coded — you just need to set env vars and execute.

---

## ⚡ STEP 1 — Enable Backend Automation (15 min)

Set these env vars on your backend server (Render dashboard → Environment):

```
CONTENT_AUTOMATION_ENABLED=true
SOCIAL_AUTOMATION_ENABLED=true
SITE_URL=https://pricebasket.in
INDEXNOW_KEY=<run: python -c "import uuid; print(uuid.uuid4().hex)">
```

**What this activates immediately:**
- ✅ Daily SEO blog post auto-generated at **06:30 IST** from live price data
- ✅ Deal card auto-posted to all configured social channels at **10:00 & 18:00 IST**
- ✅ Google + Bing IndexNow ping on every new article (instant indexing)

---

## ⚡ STEP 2 — Google Search Console (15 min — FREE, highest ROI)

1. Go to https://search.google.com/search-console
2. Add property → Domain → `pricebasket.in`
3. Verify via DNS TXT record (Cloudflare → add TXT record)
4. Submit sitemap: `https://pricebasket.in/sitemap.xml`
5. Copy the HTML verification code → set `NEXT_PUBLIC_GSC_VERIFICATION=<value>` in Vercel

**Why:** Your `/compare/blinkit-vs-zepto` page targets **90,000 searches/month**.
Without GSC, Google may take weeks to find it. With GSC + IndexNow it's indexed in hours.

---

## ⚡ STEP 3 — Google Analytics 4 (10 min — FREE)

1. Go to https://analytics.google.com → Create property → `pricebasket.in`
2. Copy Measurement ID (format: `G-XXXXXXXXXX`)
3. Set in Vercel: `NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX`
4. Redeploy frontend

**GA4 events already tracked** (via `src/lib/analytics.ts`):
- `search` — every search query
- `price_compare` — every price comparison view
- `alert_set` — every price alert created
- `buy_click` — every "Buy on Blinkit/Zepto" click
- `add_to_cart` — every cart add
- `cart_optimize` — every cart optimization run
- `sign_up` / `login` — auth events
- `join_community` — Telegram/WhatsApp popup clicks
- `blog_view`, `compare_view` — content engagement

---

## ⚡ STEP 4 — Telegram Channel (30 min — FREE, fully automated)

1. Open Telegram → search `@BotFather` → `/newbot`
2. Name: `PriceBasket Deals Bot` | Username: `pricebasketdealsbot`
3. Copy the token (format: `123456:ABC-DEF...`)
4. Create a public channel: `@PriceBasketDeals`
5. Add the bot as **Admin** to the channel
6. Set on backend server:
   ```
   TELEGRAM_BOT_TOKEN=<your-token>
   TELEGRAM_CHANNEL_ID=@PriceBasketDeals
   ```
7. Set on Vercel frontend:
   ```
   NEXT_PUBLIC_TELEGRAM_URL=https://t.me/PriceBasketDeals
   ```

**Result:** Bot auto-posts the day's biggest deal twice daily. The community popup
on the website (shown after 30s) drives visitors to join the channel.

**Growth hack:** Share `https://t.me/PriceBasketDeals` in every WhatsApp group,
society group, and family group you're in. Target: **1,000 subscribers in 30 days**.

---

## ⚡ STEP 5 — Instagram + Facebook Auto-posting (1 hour)

1. Go to https://developers.facebook.com → My Apps → Create App → Business
2. Add products: **Instagram Graph API** + **Pages API**
3. Go to Graph API Explorer → get a **Page Access Token** (set to never expire)
4. Find your:
   - `FACEBOOK_PAGE_ID` — FB Page → Settings → About → Page ID
   - `INSTAGRAM_ACCOUNT_ID` — IG Business account numeric ID
5. Set on backend server:
   ```
   META_PAGE_ACCESS_TOKEN=<token>
   FACEBOOK_PAGE_ID=<id>
   INSTAGRAM_ACCOUNT_ID=<id>
   ```

**Result:** Deal cards auto-posted to Facebook Page + Instagram Business at 10:00 & 18:00 IST.

---

## ⚡ STEP 6 — Twitter/X Auto-posting (30 min)

1. Go to https://developer.twitter.com → Projects & Apps → Create App
2. Enable **OAuth 1.0a** with **Read + Write** permissions
3. Generate Access Token & Secret under "Keys and Tokens"
4. Set on backend server:
   ```
   TWITTER_API_KEY=
   TWITTER_API_SECRET=
   TWITTER_ACCESS_TOKEN=
   TWITTER_ACCESS_SECRET=
   ```

---

## 📱 STEP 7 — Viral Social Content (Do This Week — Zero Budget)

### Reddit (Highest organic reach in India)

Post in these subreddits:
- `r/india` — 2M+ members
- `r/bangalore`, `r/mumbai`, `r/delhi` — city communities
- `r/IndiaInvestments` — money-saving audience
- `r/frugalIndia` — perfect audience

**Post title that goes viral:**
> *"I compared the same grocery cart on Blinkit, Zepto, BigBasket and Instamart — the price difference shocked me [OC]"*

Take a real screenshot from pricebasket.in showing price differences. Post image first,
link in comments. **Do NOT post the link in the title** — Reddit downvotes self-promotion.

### Instagram Reels (Film on phone — no budget needed)

**30-second script:**
```
[0-3s]  Open Blinkit, show Amul milk ₹89
[3-8s]  "Aap ₹17 zyada de rahe ho!" (You're paying ₹17 extra!)
[8-15s] Screen record pricebasket.in comparing prices in real-time
[15-20s] "Zepto pe sirf ₹72!" (Only ₹72 on Zepto!)
[20-25s] "pricebasket.in — FREE mein compare karo"
```

**Hashtags (copy-paste):**
```
#BlinkitVsZepto #GroceryDeals #PriceBasket #SaveMoney #ZeptoDeals
#IndiaDeals #GroceryShopping #QuickCommerce #BlinkitDeals #BigBasket
#MumbaiDeals #DelhiDeals #BangaloreDeals #MoneyTips #SavingTips
```

### WhatsApp Groups

Share in every society, family, friends group:
```
Bhai/Didi, same doodh — Blinkit pe ₹89, Zepto pe ₹72.
Yeh site free mein batati hai kahan sasta hai 👉 pricebasket.in
```

---

## 💰 STEP 8 — Google Ads (₹5,000/month starter)

1. Go to https://ads.google.com → New Campaign → Search → Website Traffic
2. Add these keywords:
   ```
   [blinkit vs zepto]              — Exact match, ₹8-15/click
   "grocery price comparison india" — Phrase match, ₹5-10/click
   cheapest grocery app india       — Broad match, ₹4-8/click
   [bigbasket vs blinkit]          — Exact match, ₹6-12/click
   ```
3. Ad copy:
   ```
   Headline 1: Blinkit vs Zepto Price Comparison
   Headline 2: Save Up to 40% on Groceries
   Headline 3: Free | Compare 8 Apps Instantly
   Description: Same product, different prices. PriceBasket compares Blinkit,
   Zepto, Instamart, BigBasket in 2 seconds. Set price alerts. Free forever.
   Final URL: https://pricebasket.in/compare/blinkit-vs-zepto
   ```

---

## 🏆 STEP 9 — Product Hunt Launch (2 hours — FREE, 500-2,000 backlinks)

1. Go to https://www.producthunt.com/posts/new
2. Name: **PriceBasket**
3. Tagline: *"Compare Blinkit, Zepto & BigBasket prices in real-time"*
4. Description: Focus on the ₹340 average saving per order
5. Launch on a **Tuesday or Wednesday** (highest traffic days)
6. Ask friends/colleagues to upvote on launch day

**Why:** A PH launch generates 50-200 backlinks from tech sites that cover launches.
This is a DA 90+ backlink that boosts all your SEO pages.

---

## 📊 STEP 10 — Track Everything

### Weekly metrics to check:

| Metric | Where | Target |
|--------|-------|--------|
| Organic traffic | Google Analytics | +20%/week |
| Google ranking | Search Console | Top 10 for "blinkit vs zepto" |
| Telegram subscribers | Telegram channel stats | +100/week |
| Signups | GA4 → sign_up event | +50/week |
| Buy clicks | GA4 → buy_click event | +200/week |

### UTM parameters for all links you share:

```
Reddit:    ?utm_source=reddit&utm_medium=organic&utm_campaign=viral-post
Instagram: ?utm_source=instagram&utm_medium=organic&utm_campaign=reel
WhatsApp:  ?utm_source=whatsapp&utm_medium=organic&utm_campaign=group-share
Telegram:  ?utm_source=telegram&utm_medium=organic&utm_campaign=channel
Google Ads:?utm_source=google&utm_medium=cpc&utm_campaign=blinkit-vs-zepto
```

---

## ✅ Day 1 Checklist (2 hours, zero budget)

- [ ] Set `CONTENT_AUTOMATION_ENABLED=true` + `SOCIAL_AUTOMATION_ENABLED=true` on backend
- [ ] Generate `INDEXNOW_KEY` and set it on backend
- [ ] Submit sitemap to Google Search Console
- [ ] Set `NEXT_PUBLIC_GA_ID` in Vercel
- [ ] Create Telegram channel `@PriceBasketDeals` + set bot token
- [ ] Set `NEXT_PUBLIC_TELEGRAM_URL` in Vercel → community popup goes live
- [ ] Post one Reddit thread with real price comparison screenshot
- [ ] Film one Instagram Reel (screen recording of pricebasket.in)
- [ ] Share in 5 WhatsApp groups

---

## 🎯 The One Message That Makes It Viral

> **"Blinkit pe ₹89, Zepto pe ₹72 — PriceBasket batata hai kahan sasta hai"**
> *(Blinkit charges ₹89, Zepto charges ₹72 — PriceBasket tells you where it's cheaper)*

Every post, reel, story, WhatsApp message = this core idea.
**Same product. Different prices. PriceBasket finds the cheapest. FREE.**
