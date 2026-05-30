# PriceBasket — Complete SEO & Paid Marketing Plan
### Google, Instagram, Facebook, YouTube — Full Strategy

> Goal: 1,00,000 monthly users in 6 months across India
> Budget tiers: ₹0 (organic) → ₹20,000/month → ₹1,00,000/month

---

## PART 1 — SEO (Search Engine Optimization)

### Why SEO is Your #1 Channel

People searching "blinkit vs zepto price" are **ready to use your product right now**.
This is the highest-intent traffic possible. And it's FREE once you rank.

---

### 1.1 Technical SEO — Fix These First (1 Day)

#### A. Create `robots.txt` (Missing Right Now)

Create file: [`frontend/public/robots.txt`](../frontend/public/robots.txt)
```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /auth/
Sitemap: https://pricebasket.in/sitemap.xml
```

#### B. Verify Sitemap is Working
Your [`frontend/src/app/sitemap.ts`](../frontend/src/app/sitemap.ts) is already dynamic.
- Submit to Google Search Console: https://search.google.com/search-console
- Submit to Bing Webmaster: https://www.bing.com/webmasters
- Check: `https://pricebasket.in/sitemap.xml` — should list all products + blog posts

#### C. Page Speed (Core Web Vitals)
Run: https://pagespeed.web.dev/?url=https://pricebasket.in
Target scores: LCP < 2.5s, FID < 100ms, CLS < 0.1
These directly affect Google ranking.

#### D. Add Google Analytics 4
In [`frontend/src/app/layout.tsx`](../frontend/src/app/layout.tsx):
```tsx
import Script from 'next/script'

// Add inside <head>:
<Script src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX" strategy="afterInteractive" />
<Script id="ga4" strategy="afterInteractive">{`
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
`}</Script>
```

---

### 1.2 Keyword Strategy — The Exact Keywords to Target

#### Tier 1 — High Volume, Low Competition (Target NOW)

| Keyword | Monthly Searches | Difficulty | Your Page |
|---------|-----------------|------------|-----------|
| blinkit vs zepto | 90,000 | Low | `/compare/blinkit-vs-zepto` |
| zepto vs swiggy instamart | 40,000 | Low | `/compare/zepto-vs-instamart` |
| blinkit price comparison | 35,000 | Low | `/compare/` |
| cheapest grocery delivery india | 25,000 | Medium | Homepage |
| grocery price comparison app india | 20,000 | Low | Homepage |
| bigbasket vs blinkit | 18,000 | Low | `/compare/bigbasket-vs-blinkit` |
| zepto vs bigbasket | 15,000 | Low | `/compare/zepto-vs-bigbasket` |
| swiggy instamart vs blinkit | 12,000 | Low | `/compare/instamart-vs-blinkit` |

#### Tier 2 — Product-Specific (Long Tail, High Intent)

| Keyword | Monthly Searches | Intent |
|---------|-----------------|--------|
| amul milk price blinkit | 8,000 | Buy |
| tata salt price zepto | 5,000 | Buy |
| fortune oil price comparison | 4,000 | Buy |
| maggi price blinkit vs zepto | 6,000 | Buy |
| dettol price comparison | 3,000 | Buy |
| [any product] price blinkit | varies | Very High |

#### Tier 3 — City-Specific (Geo-targeted)

| Keyword | Monthly Searches |
|---------|-----------------|
| blinkit vs zepto mumbai | 12,000 |
| cheapest grocery delivery mumbai | 8,000 |
| blinkit vs zepto delhi | 10,000 |
| zepto bangalore price | 7,000 |
| grocery deals hyderabad | 5,000 |

---

### 1.3 Content SEO — Blog Posts to Write

Write these articles (1,500-2,500 words each). Your auto-content engine handles
daily deal posts. These are the strategic long-form articles:

#### Priority 1 — Write This Week
```
1. "Blinkit vs Zepto: Complete Price Comparison Guide 2026"
   URL: /blog/blinkit-vs-zepto-price-comparison
   Target: 90,000 searches/month

2. "Which Grocery App is Cheapest in India? (We Compared 8 Apps)"
   URL: /blog/cheapest-grocery-app-india
   Target: 25,000 searches/month

3. "How to Save ₹500/Month on Groceries Using Price Comparison"
   URL: /blog/save-money-groceries-india
   Target: 15,000 searches/month
```

#### Priority 2 — Write in Month 1
```
4. "Zepto vs Swiggy Instamart: Which is Better in 2026?"
5. "BigBasket vs Blinkit: Price, Speed, and Quality Compared"
6. "Top 50 Products Where Zepto is Cheaper Than Blinkit"
7. "Blinkit vs Zepto vs Instamart: Mumbai Price War"
8. "Best Grocery Deals This Week: Blinkit, Zepto, BigBasket"
9. "How Quick Commerce Price Comparison Works"
10. "Price Alert Guide: Never Miss a Grocery Deal Again"
```

#### City-Specific Articles (Month 2)
```
"Best Grocery Deals in Mumbai Today — Blinkit vs Zepto vs Instamart"
"Cheapest Grocery Delivery in Delhi: Complete Guide"
"Bangalore Grocery Price Comparison: Which App Wins?"
"Hyderabad Quick Commerce: Blinkit vs Zepto Prices"
```

---

### 1.4 On-Page SEO for Product Pages

Every product page at `/product/[id]` needs:

```html
<!-- Title format -->
<title>Amul Gold Milk 1L Price: Blinkit ₹68 vs Zepto ₹59 | PriceBasket</title>

<!-- Meta description -->
<meta name="description" content="Compare Amul Gold Milk 1L prices across 
Blinkit (₹68), Zepto (₹59), BigBasket (₹65). Save ₹9 by buying on Zepto. 
Set price alert at PriceBasket.in">

<!-- JSON-LD already implemented in your codebase ✅ -->
```

Your [`frontend/src/app/product/[id]/page.tsx`](../frontend/src/app/product/[id]/page.tsx)
already has JSON-LD structured data — this makes Google show price comparison
cards directly in search results (huge CTR boost).

---

### 1.5 Backlink Strategy (Free)

Backlinks = other websites linking to you = Google trusts you more = higher ranking.

**Get backlinks from:**

1. **Product Hunt** — Launch here, get 50-200 backlinks from tech sites that cover PH launches
2. **YourStory** — One article = DA 70+ backlink
3. **Inc42** — DA 60+ backlink
4. **Reddit India** — Post in r/india, r/IndiaInvestments, r/bangalore, r/mumbai
5. **Quora** — Answer "Which grocery app is cheapest?" questions with link
6. **GitHub** — If you open-source any part, GitHub = DA 95 backlink
7. **IndiaMART / JustDial** — List your business (free, DA 60+)
8. **Google My Business** — Create listing for "PriceBasket" (free, boosts local SEO)

---

## PART 2 — GOOGLE ADS

### 2.1 Google Search Ads Strategy

**Why Google Search Ads work for PriceBasket:**
People searching "blinkit vs zepto" are ALREADY looking for what you offer.
You just need to be at the top.

#### Campaign Structure

```
Campaign 1: Competitor Comparison (Highest Priority)
├── Ad Group 1: Blinkit vs Zepto
│   Keywords: "blinkit vs zepto", "blinkit zepto price comparison"
│   Bid: ₹8-15 per click
│   
├── Ad Group 2: Platform Comparisons  
│   Keywords: "zepto vs instamart", "bigbasket vs blinkit"
│   Bid: ₹6-12 per click
│
└── Ad Group 3: Cheapest Grocery
    Keywords: "cheapest grocery app india", "grocery price comparison"
    Bid: ₹5-10 per click

Campaign 2: Product-Specific (Long Tail)
├── Ad Group 1: Branded Products
│   Keywords: "amul milk price comparison", "maggi price blinkit"
│   Bid: ₹3-6 per click (lower competition)

Campaign 3: City-Specific
├── Ad Group 1: Mumbai
│   Keywords: "grocery deals mumbai", "blinkit zepto mumbai"
│   Location targeting: Mumbai only
│   Bid: ₹5-10 per click
```

#### Ad Copy Templates

**Ad 1 (Comparison angle):**
```
Headline 1: Blinkit vs Zepto Price Comparison
Headline 2: Save Up to 40% on Groceries
Headline 3: Free | Compare 8 Apps Instantly
Description: Same product, different prices. PriceBasket compares Blinkit, 
Zepto, Instamart, BigBasket in 2 seconds. Set price alerts. Free forever.
URL: pricebasket.in/compare/blinkit-vs-zepto
```

**Ad 2 (Savings angle):**
```
Headline 1: Save ₹500/Month on Groceries
Headline 2: Compare Blinkit Zepto BigBasket
Headline 3: Price Alerts | Cart Optimizer
Description: India's #1 grocery price comparison. Track 10,000+ products 
across 8 quick-commerce apps. Get notified when prices drop. 100% Free.
URL: pricebasket.in
```

**Ad 3 (Urgency angle):**
```
Headline 1: You're Paying Too Much for Groceries
Headline 2: Blinkit Charges 40% More Than Zepto
Headline 3: Check Now — It's Free
Description: Real-time price comparison across Blinkit, Zepto, Instamart, 
BigBasket. Find cheapest instantly. Set alerts. Save every order.
URL: pricebasket.in
```

#### Google Ads Budget Plan

| Phase | Monthly Budget | Expected Clicks | Expected Signups | CPA |
|-------|---------------|----------------|-----------------|-----|
| Test (Month 1) | ₹5,000 | 500-800 | 50-100 | ₹50-100 |
| Growth (Month 2-3) | ₹15,000 | 1,500-2,500 | 150-300 | ₹50-100 |
| Scale (Month 4-6) | ₹30,000 | 3,000-5,000 | 300-600 | ₹50-100 |

**Setup steps:**
1. Go to ads.google.com
2. Create account → New Campaign → Search
3. Goal: Website traffic / Leads
4. Add keywords with match types:
   - `[blinkit vs zepto]` — Exact match (highest intent)
   - `"grocery price comparison india"` — Phrase match
   - `cheapest grocery app` — Broad match modified

---

### 2.2 Google Display Ads (Retargeting)

Show ads to people who visited pricebasket.in but didn't sign up.

**Setup:**
1. Install Google Analytics 4 (step 1.1D above)
2. Create remarketing audience: "Visited site, didn't register"
3. Show banner ads on other websites they visit

**Banner ad message:**
```
"Still comparing grocery prices manually? 
PriceBasket does it in 2 seconds. Free."
[Try Now Button]
```

**Budget**: ₹2,000-₹5,000/month
**Expected**: 20-40% of visitors who see retargeting ads come back and sign up

---

### 2.3 Google Shopping / Performance Max

Not directly applicable (you don't sell products), but you can use
**Performance Max campaigns** targeting grocery shoppers:

- Audience: "Grocery shoppers", "Deal seekers", "Price comparison"
- Creative: Show the savings (₹340 saved per order)
- Budget: ₹5,000-₹10,000/month to test

---

## PART 3 — INSTAGRAM ADS

### 3.1 Instagram Ad Strategy

Instagram is where you build **brand awareness** and **viral reach** in India.
Target: Urban 22-45 year olds who order groceries online.

#### Audience Targeting

```
Primary Audience:
- Age: 22-45
- Location: Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Pune, Kolkata
- Interests: Online shopping, Grocery delivery, Blinkit, Zepto, BigBasket
- Behaviors: Online shoppers, Mobile app users

Secondary Audience (Lookalike):
- Create from your existing user email list
- 1% lookalike of website visitors
- 2% lookalike of people who set price alerts
```

#### Ad Formats & Content

**Format 1: Reels Ads (Best Performance)**

Script for 15-30 second Reel ad:
```
[0-3s] Hook: Show phone with Blinkit open, price ₹89
[3-8s] Problem: "Aap ₹17 zyada de rahe ho!" (You're paying ₹17 extra!)
[8-15s] Solution: Screen recording of PriceBasket comparing prices
[15-20s] Result: "Zepto pe sirf ₹72!" (Only ₹72 on Zepto!)
[20-25s] CTA: "pricebasket.in — FREE mein compare karo"
```

**Format 2: Carousel Ads**
```
Card 1: "Same product. 8 different prices."
Card 2: Blinkit price ₹89 (red background)
Card 3: Zepto price ₹72 (green background — cheapest)
Card 4: "You saved ₹17 on just ONE product"
Card 5: "Imagine saving on your entire cart → pricebasket.in"
```

**Format 3: Story Ads**
```
[Swipe up / Link button]
Background: Split screen — expensive vs cheap
Text: "Kya aap jaante hain? Same doodh, ₹17 ka fark!"
CTA Button: "Compare Now — Free"
```

#### Instagram Ad Budget Plan

| Phase | Monthly Budget | Reach | Expected Signups |
|-------|---------------|-------|-----------------|
| Test (Month 1) | ₹3,000 | 50,000-1,00,000 | 30-80 |
| Growth (Month 2-3) | ₹10,000 | 2,00,000-5,00,000 | 100-300 |
| Scale (Month 4-6) | ₹25,000 | 10,00,000+ | 300-800 |

**Setup:**
1. Go to business.facebook.com (Meta Ads Manager)
2. Create campaign → Awareness or Traffic or Conversions
3. Ad set → Audience (as above) → Placements: Instagram only
4. Ad → Upload Reel video + copy

---

### 3.2 Instagram Organic Strategy

**Posting Schedule (Daily):**

| Time | Content | Format |
|------|---------|--------|
| 8:00 AM | Morning deal alert | Story |
| 12:00 PM | Price comparison post | Reel or Carousel |
| 6:00 PM | Evening deal | Story + Post |
| 9:00 PM | Engagement post (poll, quiz) | Story |

**Reel Ideas (Film these — no budget needed):**
1. Screen recording: "Watch me save ₹340 on my grocery order"
2. "I checked 5 apps for the same product — results shocked me"
3. "Blinkit vs Zepto price war: Who wins in [City]?"
4. "How to set a price alert in 10 seconds"
5. "My monthly grocery bill before vs after PriceBasket"
6. "Top 5 products where Zepto is way cheaper than Blinkit"
7. "Cart optimizer demo: ₹500 saved on one order"

**Hashtag Strategy:**
```
Primary (use every post):
#PriceBasket #GroceryDeals #SaveMoney #BlinkitDeals #ZeptoDeals

Secondary (rotate):
#IndiaDeals #GroceryShopping #QuickCommerce #OnlineShopping
#MumbaiDeals #DelhiDeals #BangaloreDeals #HyderabadDeals

Trending (check weekly):
#BlinkitVsZepto #GroceryHaul #MoneyTips #SavingTips
```

---

## PART 4 — FACEBOOK ADS

### 4.1 Facebook Ad Strategy

Facebook reaches older demographics (30-55) who are the primary grocery buyers.

#### Campaign Types

**Campaign 1: Traffic (Send to website)**
- Objective: Link clicks to pricebasket.in
- Audience: 28-55, grocery shoppers, deal seekers
- Budget: ₹3,000-₹5,000/month
- Expected: 500-1,000 website visits/month

**Campaign 2: Lead Generation**
- Objective: Collect emails directly in Facebook
- Offer: "Get daily grocery deals on WhatsApp — Free"
- Form: Name + Phone/Email
- Budget: ₹5,000-₹10,000/month
- Expected: 200-500 leads/month at ₹10-25 per lead

**Campaign 3: Video Views (Brand Awareness)**
- Objective: Get maximum people to watch your comparison video
- Budget: ₹2,000-₹3,000/month
- Expected: 50,000-2,00,000 video views at ₹0.01-0.05 per view

#### Facebook Ad Copy

**Lead Gen Ad:**
```
Headline: Get Daily Grocery Deals on WhatsApp — Free!

Body: 
🛒 Tired of paying more for groceries?

PriceBasket compares prices across:
✅ Blinkit
✅ Zepto  
✅ Swiggy Instamart
✅ BigBasket
✅ JioMart
...and 3 more!

Average savings: ₹340 per order
Monthly savings: ₹1,000-₹2,000

👇 Enter your details to get FREE daily deals on WhatsApp
```

---

## PART 5 — YOUTUBE ADS

### 5.1 YouTube Ad Strategy

YouTube is India's #1 video platform. 500M+ users.

#### Ad Types

**Pre-roll Ads (Skippable after 5 seconds)**

Script (30 seconds, must hook in first 5s):
```
[0-5s — CANNOT SKIP] 
"Aap grocery pe ₹500 zyada de rahe ho har mahine!" 
(You're paying ₹500 extra on groceries every month!)
[Show shocking price comparison]

[5-15s]
"Same Amul milk — Blinkit pe ₹89, Zepto pe ₹72.
₹17 ka fark! Aur aapko pata bhi nahi tha."

[15-25s]
"PriceBasket.in — India ka pehla grocery price comparison tool.
8 apps, ek jagah. 2 second mein cheapest dhundho."

[25-30s]
"Free hai. Try karo abhi. pricebasket.in"
```

**Target on YouTube:**
- Channels: Cooking channels, Finance channels, Shopping haul channels
- Keywords: "grocery haul", "blinkit order", "zepto delivery"
- Demographics: 22-45, urban India

**Budget**: ₹5,000-₹10,000/month
**Expected**: 50,000-2,00,000 impressions, 500-2,000 website visits

---

### 5.2 YouTube Organic (Shorts + Long Form)

**YouTube Shorts (60 seconds max):**
Post 3-5 Shorts per week. These get massive organic reach.

Top performing Shorts ideas:
```
1. "Blinkit vs Zepto: ₹17 ka fark ek product mein" (17 rupee difference)
2. "Maine 1 mahine mein ₹2,340 bachaye — yeh kaise?" (I saved ₹2,340)
3. "Grocery price comparison in 30 seconds"
4. "Price alert set karo, deal miss mat karo"
5. "Cart optimizer: ₹500 saved on one order"
```

**Long-form Videos (10-20 minutes):**
Post 1-2 per month:
```
1. "Complete Guide: How to Save Maximum on Groceries in India 2026"
2. "Blinkit vs Zepto vs BigBasket: Full Honest Comparison"
3. "I Tracked Grocery Prices for 30 Days — Here's What I Found"
4. "How PriceBasket Works: Full Demo + Tips"
```

---

## PART 6 — WHATSAPP MARKETING

### 6.1 WhatsApp Business Strategy

WhatsApp has 500M+ users in India. Highest open rate of any channel (98%).

#### Setup WhatsApp Business API

1. Apply at: business.whatsapp.com
2. Get verified business account
3. Create message templates (pre-approved by WhatsApp):

**Template 1: Daily Deal Alert**
```
🛒 *PriceBasket Daily Deal*

Today's biggest saving:
*{{product_name}}*
❌ {{expensive_platform}}: ₹{{expensive_price}}
✅ {{cheap_platform}}: ₹{{cheap_price}} ← Cheapest!
💰 Save: ₹{{savings}}

👉 See all deals: pricebasket.in

_Reply STOP to unsubscribe_
```

**Template 2: Price Alert Triggered**
```
🔔 *Price Alert: {{product_name}}*

Good news! Price dropped to your target!

Current price: ₹{{current_price}} on {{platform}}
Your alert was: ₹{{alert_price}}

👉 Buy now: {{product_url}}

_PriceBasket.in — Never miss a deal_
```

#### WhatsApp Community Growth

1. Create community: "PriceBasket Deals India"
2. Sub-groups by city (Mumbai, Delhi, Bangalore, etc.)
3. Daily deal message at 9 AM
4. Weekly "Top 10 deals" roundup on Sunday
5. Target: 10,000 subscribers in 3 months

**Growth tactics:**
- Add WhatsApp join link to every page on website
- "Join our WhatsApp for daily deals" popup after 30 seconds
- Add to email signature, Instagram bio, Facebook page

---

## PART 7 — CONTENT MARKETING CALENDAR

### Month 1 Content Plan

| Week | Blog Posts | Instagram Reels | YouTube Shorts | Facebook Posts |
|------|-----------|----------------|----------------|----------------|
| Week 1 | Blinkit vs Zepto guide | 3 price comparison reels | 3 shorts | 5 group posts |
| Week 2 | Cheapest grocery app | 3 savings story reels | 3 shorts | 5 group posts |
| Week 3 | How to save ₹500/month | 3 tutorial reels | 3 shorts | 5 group posts |
| Week 4 | City-specific guide | 3 city spotlight reels | 3 shorts | 5 group posts |

### Automated Content (Already Built — Just Enable)
- Daily blog post at 06:30 IST (content engine)
- Deal card posted to Telegram at 10:00 & 18:00 IST
- IndexNow ping on every new article

---

## PART 8 — INFLUENCER MARKETING

### 8.1 Influencer Tiers

**Nano (1K-10K followers) — ₹500-₹2,000 per post**
- Most authentic, highest engagement rate (8-15%)
- Best for: Housewife communities, apartment societies
- Find on: Instagram search, Facebook groups

**Micro (10K-1L followers) — ₹2,000-₹10,000 per post**
- Good reach + engagement (3-8%)
- Best for: Finance, lifestyle, food niches
- Find on: Instagram, YouTube

**Mid-tier (1L-10L followers) — ₹10,000-₹50,000 per post**
- Large reach, lower engagement (1-3%)
- Best for: Brand awareness campaigns
- Find on: Instagram, YouTube

### 8.2 Best Influencer Niches for PriceBasket

| Niche | Why They Work | Example Content |
|-------|--------------|----------------|
| Personal Finance | Audience loves saving money | "5 apps to save money on groceries" |
| Housewife/Mom | Primary grocery buyers | "How I save ₹1,000/month on groceries" |
| Food/Cooking | Order groceries regularly | "Best deals on ingredients this week" |
| Tech/Apps | Review apps, trusted voice | "Best price comparison apps India 2026" |
| Student Life | Budget-conscious | "How to eat well on ₹3,000/month" |

### 8.3 Influencer Brief Template

Send this to every influencer:

```
COLLABORATION BRIEF — PriceBasket.in

ABOUT US:
PriceBasket.in is India's first quick-commerce price comparison tool.
We compare prices across Blinkit, Zepto, Instamart, BigBasket, JioMart 
and 3 more platforms in real-time.

WHAT WE WANT:
1 Instagram Reel (30-60 seconds) showing:
- The problem: Same product costs different prices on different apps
- The solution: PriceBasket finds cheapest instantly
- Your personal experience using it (authentic)
- CTA: "Try free at pricebasket.in"

KEY MESSAGES:
- Free to use, no download needed
- Compares 8 apps instantly
- Average saving: ₹340 per order
- Price alerts feature

DELIVERABLES:
- 1 Instagram Reel
- 1 Instagram Story (24 hours)
- Caption with link in bio for 7 days
- Unique referral link for tracking

COMPENSATION:
₹[X] flat fee + ₹50 per signup from your link (affiliate)

TIMELINE:
Post within 7 days of approval

APPROVAL PROCESS:
Send us script/concept for approval before filming.
```

---

## PART 9 — PAID AD BUDGET ALLOCATION

### Starter Budget: ₹10,000/month

| Channel | Budget | Expected Result |
|---------|--------|----------------|
| Google Search Ads | ₹4,000 | 400-600 clicks, 40-80 signups |
| Instagram Ads | ₹3,000 | 60,000 reach, 30-60 signups |
| Facebook Ads | ₹2,000 | 40,000 reach, 20-40 signups |
| YouTube Ads | ₹1,000 | 20,000 views, 10-20 signups |
| **Total** | **₹10,000** | **100-200 new signups** |

### Growth Budget: ₹30,000/month

| Channel | Budget | Expected Result |
|---------|--------|----------------|
| Google Search Ads | ₹12,000 | 1,200-2,000 clicks, 150-250 signups |
| Instagram Ads | ₹8,000 | 2,00,000 reach, 100-200 signups |
| Facebook Ads | ₹5,000 | 1,00,000 reach, 50-100 signups |
| YouTube Ads | ₹3,000 | 60,000 views, 30-60 signups |
| Influencer (2-3 micro) | ₹2,000 | 50,000 reach, 50-150 signups |
| **Total** | **₹30,000** | **380-760 new signups** |

### Scale Budget: ₹1,00,000/month

| Channel | Budget | Expected Result |
|---------|--------|----------------|
| Google Search Ads | ₹35,000 | 4,000-6,000 clicks, 500-800 signups |
| Instagram Ads | ₹25,000 | 10,00,000 reach, 400-700 signups |
| Facebook Ads | ₹15,000 | 5,00,000 reach, 200-400 signups |
| YouTube Ads | ₹10,000 | 2,00,000 views, 100-200 signups |
| Influencer (10 micro) | ₹10,000 | 5,00,000 reach, 500-1,500 signups |
| Retargeting | ₹5,000 | 20-40% conversion of past visitors |
| **Total** | **₹1,00,000** | **1,700-3,600 new signups** |

---

## PART 10 — TRACKING & ANALYTICS SETUP

### What to Track

**Google Analytics 4 Events to Set Up:**
```javascript
// Track these user actions:
gtag('event', 'search', { search_term: query });
gtag('event', 'price_compare', { product_id: id, platform: platform });
gtag('event', 'alert_set', { product_id: id, target_price: price });
gtag('event', 'signup', { method: 'email' });
gtag('event', 'buy_click', { platform: platform, product_id: id });
```

**UTM Parameters for All Ads:**
```
Google Ads:    ?utm_source=google&utm_medium=cpc&utm_campaign=blinkit-vs-zepto
Instagram Ads: ?utm_source=instagram&utm_medium=paid&utm_campaign=reel-comparison
Facebook Ads:  ?utm_source=facebook&utm_medium=paid&utm_campaign=lead-gen
Influencer:    ?utm_source=influencer&utm_medium=social&utm_campaign=[name]
WhatsApp:      ?utm_source=whatsapp&utm_medium=organic&utm_campaign=daily-deal
```

**Weekly Metrics Dashboard:**
| Metric | Tool | Target |
|--------|------|--------|
| Organic traffic | Google Analytics | +20%/week |
| Google ranking | Search Console | Top 10 for target keywords |
| Ad CTR | Google/Meta Ads | >2% |
| Cost per signup | Ads Manager | <₹100 |
| Instagram reach | Instagram Insights | +30%/week |
| WhatsApp subscribers | Manual count | +100/week |

---

## PART 11 — QUICK START CHECKLIST

### Day 1 (2 hours — Zero Budget)
- [ ] Enable automation in Render env vars
- [ ] Set up