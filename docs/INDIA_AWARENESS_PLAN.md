# PriceBasket — India-Wide Public Awareness Plan
### Spread PriceBasket Across Every City in India

> Founder: Nikhil Mathur | pricebasket.in | @pricebasketindia
> Goal: Make every Indian grocery shopper know "PriceBasket = save money on groceries"

---

## 🎯 The One Message to Spread

> **"Blinkit pe ₹89, Zepto pe ₹72 — PriceBasket batata hai kahan sasta hai"**
> (Blinkit charges ₹89, Zepto charges ₹72 — PriceBasket tells you where it's cheaper)

Every post, reel, story, WhatsApp message must carry this core idea:
**Same product. Different prices. PriceBasket finds the cheapest.**

---

## 📅 PHASE 1 — Week 1 to 4: Foundation (Zero Budget)

### ✅ Step 1: Enable What's Already Built (Day 1 — 2 hours)

Your codebase already has automation ready. Just turn it on:

**Backend env vars to set on Render:**
```
CONTENT_AUTOMATION_ENABLED=true
SOCIAL_AUTOMATION_ENABLED=true
SITE_URL=https://pricebasket.in
INDEXNOW_KEY=<generate with: python -c "import uuid;print(uuid.uuid4().hex)">
```

This immediately activates:
- ✅ Daily SEO blog article auto-published at 06:30 IST
- ✅ Deal card auto-posted to social at 10:00 & 18:00 IST
- ✅ Google/Bing indexing ping on every new article

---

### ✅ Step 2: Set Up Telegram Channel (Day 1 — 30 minutes)

Telegram is India's fastest-growing deal community platform.

1. Create channel: **@PriceBasketIndia** (or @PriceBasketDeals)
2. Message @BotFather → `/newbot` → copy token
3. Add bot as admin to channel
4. Set env vars:
   ```
   TELEGRAM_BOT_TOKEN=<token>
   TELEGRAM_CHANNEL_ID=@PriceBasketIndia
   ```
5. **Your bot will now auto-post the day's biggest deal twice daily — automatically**

**Growth hack**: Share channel link in every WhatsApp group you're in.
Target: 1,000 Telegram subscribers in 30 days.

---

### ✅ Step 3: Google Search Console (Day 1 — 15 minutes)

1. Go to https://search.google.com/search-console
2. Add & verify `pricebasket.in`
3. Submit `https://pricebasket.in/sitemap.xml`
4. Done — Google now crawls all your product + blog + compare pages

**Why this matters**: Your compare pages (`/compare/blinkit-vs-zepto`, etc.) target
high-intent searches like "blinkit vs zepto price comparison" — these rank fast.

---

### ✅ Step 4: Add Analytics (Day 1 — 20 minutes)

You cannot grow what you cannot measure. Add to [`frontend/src/app/layout.tsx`](../frontend/src/app/layout.tsx):

```tsx
// Free, privacy-friendly, no cookie banner needed
<Script defer data-domain="pricebasket.in" src="https://plausible.io/js/script.js" />
```

Or Google Analytics 4 (free):
```
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

---

### ✅ Step 5: WhatsApp Community (Day 2 — 1 hour)

You already have +91 80058 28390 listed. Now structure it:

1. Create **WhatsApp Community** (not just group) named "PriceBasket Deals India"
2. Sub-groups by city: Mumbai Deals, Delhi Deals, Bangalore Deals, etc.
3. Daily message template (auto-copy from Telegram):
   ```
   🛒 आज का सबसे बड़ा बचत!
   [Product Name]
   ❌ Blinkit: ₹XX
   ✅ Zepto: ₹XX  ← सबसे सस्ता
   💰 बचत: ₹XX (XX% off)
   🔗 pricebasket.in पर देखें
   ```
4. Pin the website link in every group

---

## 📅 PHASE 2 — Month 1 to 3: Content & SEO Domination

### 🔍 SEO Strategy — Target These Exact Keywords

Your compare pages already exist. These are the keywords to dominate:

| Keyword | Monthly Searches | Competition | Your Page |
|---------|-----------------|-------------|-----------|
| blinkit vs zepto price | 40,000+ | Low | `/compare/blinkit-vs-zepto` |
| zepto vs swiggy instamart | 25,000+ | Low | `/compare/zepto-vs-instamart` |
| cheapest grocery app india | 60,000+ | Medium | Homepage |
| blinkit price comparison | 30,000+ | Low | `/compare/` pages |
| grocery price comparison india | 20,000+ | Low | Homepage |
| amul milk price blinkit | 15,000+ | Very Low | Product pages |

**Action**: Write 2 blog posts per week targeting these. Your content engine
auto-generates 1/day — supplement with manual posts about:
- "Blinkit vs Zepto: Which is cheaper in Mumbai?"
- "Top 10 products where Zepto beats Blinkit on price"
- "How to save ₹500/month on groceries using PriceBasket"

---

### 📱 Instagram Strategy (City-by-City Rollout)

**Account**: @pricebasketindia (already exists per your docs)

**Content Calendar (post daily):**

| Day | Content Type | Example |
|-----|-------------|---------|
| Monday | Price Shock Reel | "You're paying ₹30 extra for this!" |
| Tuesday | City Spotlight | "Mumbai: Today's top 5 deals" |
| Wednesday | Tutorial | "How to use PriceBasket in 30 seconds" |
| Thursday | Price Drop Alert | "Amul Butter just dropped 15% on Zepto" |
| Friday | Weekly Savings | "This family saved ₹1,200 this week" |
| Saturday | Comparison | "Blinkit vs Zepto: This week's winner" |
| Sunday | Tip | "Pro tip: Set price alerts for your weekly basket" |

**Reel Script Template (30 seconds):**
```
Hook (0-3s):  "Aap grocery pe ₹500 zyada de rahe ho!" 
              (You're paying ₹500 extra on groceries!)
Problem (3-10s): Show same product, different prices on different apps
Solution (10-20s): Screen recording of PriceBasket finding cheapest
CTA (20-30s): "pricebasket.in — free hai, try karo!"
```

**City hashtag strategy:**
```
Mumbai:    #MumbaiDeals #MumbaiGrocery #BlinkitMumbai
Delhi:     #DelhiDeals #DelhiGrocery #ZeptoDelhiDeals  
Bangalore: #BangaloreDeals #BlinkitBangalore
Hyderabad: #HyderabadDeals #ZeptoHyderabad
Chennai:   #ChennaiDeals #BlinkitChennai
Pune:      #PuneDeals #ZeptoPune
```

---

### 🎬 YouTube Shorts Strategy

Create 60-second videos showing REAL savings:

**Video ideas:**
1. "I compared 20 products on Blinkit vs Zepto — results shocked me"
2. "How I save ₹800/month on groceries (free tool)"
3. "Blinkit vs Zepto vs BigBasket — who wins in [City]?"
4. "Set a price alert in 10 seconds — never miss a deal"
5. "Cart optimizer: I saved ₹340 on one order"

**Upload frequency**: 3 Shorts/week minimum
**Channel name**: PriceBasket India

---

## 📅 PHASE 3 — Month 2 to 6: City-by-City Viral Strategy

### 🏙️ City Rollout Plan

Target cities in order of quick-commerce penetration:

**Tier 1 (Month 2):** Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Pune
**Tier 2 (Month 3-4):** Kolkata, Ahmedabad, Jaipur, Lucknow, Surat, Kochi
**Tier 3 (Month 5-6):** All other cities with Blinkit/Zepto presence

**For each city, do:**
1. Create city-specific blog post: "Best grocery deals in [City] today"
2. Post in city-specific Facebook groups (see below)
3. Partner with 1 local food/lifestyle influencer
4. Submit to local news sites (free PR)

---

### 👥 Facebook Groups — Free Massive Reach

Post in these types of groups (search on Facebook):

| Group Type | Example Names | Members |
|-----------|--------------|---------|
| City deals | "Mumbai Deals & Offers", "Delhi Savings" | 50K-500K |
| Housewives | "Mumbai Housewives Network", "Delhi Ghar Wali" | 100K+ |
| Grocery | "Grocery Deals India", "Blinkit Zepto Deals" | 20K-100K |
| Apartments | "[Society Name] Residents" | 500-5000 |
| Students | "IIT/IIM/College groups" | 10K-50K |

**Post template for Facebook groups:**
```
💡 Kya aap jaante hain same product alag-alag apps pe alag price mein milta hai?

Aaj maine check kiya:
🛒 Amul Gold Milk 1L:
❌ Blinkit: ₹68
✅ Zepto: ₹59  ← ₹9 sasta!

PriceBasket.in pe FREE mein compare karo — 
Blinkit, Zepto, Instamart, BigBasket sab ek jagah!

Link: pricebasket.in
```

---

### 🤝 Influencer Strategy (Low Cost)

**Micro-influencers (10K-100K followers) — most effective:**

Target these niches:
- 🏠 Home & lifestyle (housewives, home decor)
- 💰 Personal finance / savings tips
- 🍳 Food & cooking
- 📱 Tech & apps reviews
- 🛒 Shopping deals & hauls

**Outreach template:**
```
Hi [Name],

I'm Nikhil, founder of PriceBasket.in — India's first quick-commerce 
price comparison tool. We help people save ₹500-₹2000/month on groceries 
by comparing Blinkit, Zepto, Instamart prices instantly.

I'd love to send you a collaboration proposal. We offer:
- Free PriceBasket Pro account
- ₹500-₹2000 per post (based on reach)
- Affiliate commission on signups from your link

Would you be interested in a quick call?

Nikhil | founder@pricebasket.in
```

**Budget**: ₹5,000-₹15,000/month for 5-10 micro-influencer posts

---

### 📰 Free PR — Get Media Coverage

**Submit to these free platforms:**

1. **YourStory.com** — India's #1 startup media
   - Submit: yourstory.com/submit-story
   - Angle: "Mumbai startup helping Indians save ₹500/month on groceries"

2. **Inc42.com** — Startup news
   - Email: editorial@inc42.com

3. **Entrackr.com** — Quick-commerce focused
   - Perfect fit for PriceBasket story

4. **Local newspapers** — Times of India, Hindustan Times city editions
   - Email city desk with "local startup" angle

5. **Product Hunt** — Global tech community
   - Launch at producthunt.com — can get 500-2000 users in one day

**PR Pitch Template:**
```
Subject: Mumbai startup PriceBasket saves Indians ₹500/month on groceries

Hi [Editor],

Quick-commerce is a ₹50,000 crore industry in India — but most consumers 
don't know the same product costs 15-40% more on one platform vs another.

PriceBasket.in (launched [date]) is India's first real-time price comparison 
tool for Blinkit, Zepto, Swiggy Instamart, BigBasket, and 5 other platforms.

Key stats:
- Tracks 10,000+ products across 8 platforms
- Average user saves ₹340 per order
- Free to use, no app download needed

Happy to provide data, screenshots, or a demo call.

Nikhil Mathur | founder@pricebasket.in | +91 80058 28390
```

---

## 📅 PHASE 4 — Month 3+: Viral Growth Loops

### 🔄 Referral Program (Build This)

"Share PriceBasket with a friend → both get ₹50 off their next order"
(Use affiliate commission revenue to fund this)

**Implementation needed in codebase:**
- Referral code generation on signup
- Track referred signups
- Credit system

---

### 📲 WhatsApp Share Button on Every Product

Add to [`frontend/src/app/product/[id]/ProductDetailClient.tsx`](../frontend/src/app/product/[id]/ProductDetailClient.tsx):

```tsx
const shareText = `🛒 ${product.name}
💰 Cheapest on ${cheapestPlatform}: ₹${cheapestPrice}
vs ₹${expensivePlatform}: ₹${expensivePrice}
Save ₹${savings}!

Check on PriceBasket: https://pricebasket.in/product/${product.id}`;

const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
```

**Every user who shares = free marketing to their contacts.**

---

### 🏆 "Savings Leaderboard" Feature

Show users how much they've saved using PriceBasket.
- "You've saved ₹2,340 this month using PriceBasket!"
- Shareable card: "I saved ₹2,340 on groceries this month 🎉"
- People share savings = viral word-of-mouth

---

### 🏘️ Apartment Society Strategy

India has 50,000+ gated communities. Each has a WhatsApp group.

**Tactic:**
1. Create "PriceBasket Society Ambassador" program
2. One person per society gets a referral link
3. They share deals in their society group
4. They earn ₹10 per signup from their link

**Cost**: ₹10/signup × 10,000 signups = ₹1,00,000 (very efficient CAC)

---

## 📊 30-Day Quick Wins Checklist

### Week 1 (Technical — 4 hours total)
- [ ] Enable `CONTENT_AUTOMATION_ENABLED=true` on Render
- [ ] Enable `SOCIAL_AUTOMATION_ENABLED=true` on Render
- [ ] Set up Telegram bot + channel
- [ ] Submit sitemap to Google Search Console
- [ ] Add Plausible/GA4 analytics
- [ ] Create `public/robots.txt` in frontend
- [ ] Set `INDEXNOW_KEY` for instant indexing

### Week 2 (Social — 2 hours/day)
- [ ] Post 3 Instagram Reels showing real price comparisons
- [ ] Join 20 Facebook groups (Mumbai, Delhi, Bangalore focus)
- [ ] Post in each Facebook group (1 post per group)
- [ ] Create WhatsApp Community with city sub-groups
- [ ] DM 10 micro-influencers for collaboration

### Week 3 (Content — 3 hours)
- [ ] Write "Blinkit vs Zepto: Complete Price Comparison 2026" blog post
- [ ] Write "Top 10 products where Zepto is cheaper than Blinkit"
- [ ] Submit to YourStory, Inc42, Entrackr
- [ ] Launch on Product Hunt
- [ ] Add WhatsApp share button to product pages

### Week 4 (Partnerships — 2 hours)
- [ ] Email 5 micro-influencers with paid collaboration offer
- [ ] Reach out to 3 apartment society WhatsApp admins
- [ ] Post in 10 more city-specific Facebook groups
- [ ] Set up Meta (Facebook/Instagram) social posting via API

---

## 💰 Budget Plan

### Zero Budget (Month 1)
| Activity | Cost | Expected Result |
|----------|------|----------------|
| Telegram bot setup | ₹0 | 500-1000 subscribers |
| Facebook group posts | ₹0 | 200-500 website visits |
| SEO content (auto) | ₹0 | 1000-5000 organic visits/month |
| WhatsApp community | ₹0 | 300-800 engaged users |
| Product Hunt launch | ₹0 | 500-2000 visits in one day |
| **Total** | **₹0** | **2,500-9,000 new users** |

### Small Budget (Month 2-3: ₹10,000-₹20,000/month)
| Activity | Cost | Expected Result |
|----------|------|----------------|
| 5 micro-influencer posts | ₹5,000-₹10,000 | 2,000-10,000 new users |
| Instagram/Facebook ads | ₹3,000-₹5,000 | 1,000-3,000 new users |
| Referral program credits | ₹2,000-₹5,000 | 200-500 referred users |
| **Total** | **₹10,000-₹20,000** | **3,200-13,500 new users** |

### Growth Budget (Month 4-6: ₹50,000-₹1,00,000/month)
| Activity | Cost | Expected Result |
|----------|------|----------------|
| 20 influencer posts | ₹20,000-₹40,000 | 20,000-50,000 new users |
| Performance ads | ₹15,000-₹30,000 | 5,000-15,000 new users |
| Society ambassador program | ₹10,000-₹20,000 | 1,000-5,000 new users |
| PR agency (part-time) | ₹5,000-₹10,000 | Media coverage |
| **Total** | **₹50,000-₹1,00,000** | **26,000-70,000 new users** |

---

## 🎯 KPIs to Track Weekly

| Metric | Week 1 Target | Month 1 Target | Month 3 Target |
|--------|--------------|----------------|----------------|
| Website visits/day | 100 | 500 | 5,000 |
| Registered users | 50 | 500 | 10,000 |
| Telegram subscribers | 100 | 1,000 | 10,000 |
| WhatsApp community | 50 | 500 | 5,000 |
| Instagram followers | 200 | 1,000 | 10,000 |
| Google Search impressions | 500 | 10,000 | 1,00,000 |
| Price alerts set | 10 | 100 | 2,000 |

---

## 🚀 The Single Most Important Action Right Now

**If you do only ONE thing today:**

Enable the automation that's already built and set up the Telegram channel.
Your codebase will then automatically post deals twice daily to Telegram,
generate SEO articles daily, and ping search engines — all with zero manual work.

```bash
# On Render backend env vars — add these 3 lines:
CONTENT_AUTOMATION_ENABLED=true
SOCIAL_AUTOMATION_ENABLED=true
TELEGRAM_BOT_TOKEN=<from @BotFather>
TELEGRAM_CHANNEL_ID=@PriceBasketDeals
```

**This single action = free marketing running 24/7 automatically.**

---

## 📋 Hindi Content Templates

Use these for WhatsApp, Instagram captions, Facebook posts:

### Price Comparison Post
```
😱 एक ही प्रोडक्ट, अलग-अलग दाम!

[Product Name]:
❌ Blinkit: ₹XX
❌ Swiggy Instamart: ₹XX  
✅ Zepto: ₹XX ← सबसे सस्ता!

💰 बचत: ₹XX

PriceBasket.in पर FREE में compare करो
सभी apps का price एक जगह! 🛒

#PriceBasket #GroceryDeals #SaveMoney
```

### App Introduction Post
```
🛒 क्या आप grocery पर ज़्यादा पैसे खर्च कर रहे हैं?

PriceBasket.in एक FREE tool है जो:
✅ Blinkit, Zepto, Instamart, BigBasket के prices compare करता है
✅ बताता है कहाँ सबसे सस्ता मिलेगा
✅ Price alert set करो — जब price गिरे, notification मिलेगी
✅ Cart optimizer — एक order में maximum बचत

हर महीने ₹500-₹2000 बचाओ! 💰

👉 pricebasket.in — बिल्कुल FREE!
```

### Savings Story Post
```
🎉 आज की बचत की कहानी!

[User/Generic] ने आज PriceBasket use किया:
- 10 items compare किए
- Zepto vs Blinkit vs BigBasket
- Total बचत: ₹340! 

एक महीने में: ₹340 × 4 orders = ₹1,360 की बचत 💰

आप भी try करो: pricebasket.in
```

---

*Plan created: May 2026 | Review monthly and update based on analytics data*
*Contact: founder@pricebasket.in | +91 80058 28390*
