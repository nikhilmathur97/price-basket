# PriceBasket — Business Model & Revenue Strategy

> Last updated: May 2025  
> Founder: Nikhil Mathur | Contact: founder@pricebasket.in

---

## 1. What PriceBasket Does

PriceBasket is India's quick-commerce price comparison platform. We track real-time grocery prices across **8+ platforms** — Blinkit, Zepto, Swiggy Instamart, BigBasket, Flipkart Minutes, Amazon Now, JioMart, and DMart — and show users where to buy the same product cheapest, fastest, or best value.

**Core value proposition:**
- Same 500ml Dettol can costs ₹89 on Blinkit and ₹72 on JioMart. PriceBasket finds that in 2 seconds.
- Users set price alerts. When any platform drops below their target price, they get an email.
- Cart optimizer: add 10 products, we tell you which single platform or split order saves the most.

---

## 2. Target Market

| Segment | Size | Why They Pay |
|---------|------|-------------|
| Urban grocery shoppers (Tier 1 cities) | 120M+ active quick-commerce users in India | Save 15–40% per order |
| Deal-seekers (25–45 age group) | 40M+ | Price alerts, best deal notifications |
| MSME / small restaurants | 5M+ | Bulk price comparison, vendor shortlisting |
| Platform advertisers | 8 platforms + FMCG brands | Reach high-intent buyers |

---

## 3. Revenue Streams

### 3.1 Affiliate / Referral Commission (Primary — Short Term)
**How it works:**  
When a user clicks "Buy on Blinkit" from PriceBasket, we pass a referral/affiliate parameter in the URL. The platform pays a commission (0.5%–3%) for every completed order that originated from our link.

**Revenue formula:**
```
Revenue = Orders via PriceBasket × Avg Order Value × Commission Rate
Example: 10,000 orders/month × ₹400 AOV × 1.5% = ₹60,000/month
```

**Current status:** Affiliate programs exist for Amazon (Amazon Associates), Flipkart (FlipkartAffiliates). Blinkit/Zepto/Instamart are approached via direct partner deals.

---

### 3.2 Sponsored / Featured Listings (Primary — Medium Term)
**How it works:**  
Platforms or FMCG brands pay to appear at the top of search results for specific queries.

- **Sponsored Platform Listing**: Platform X pays ₹50,000/month to always appear first in the price comparison widget for their available products.
- **Sponsored Product Listing**: Brand (e.g., Amul, Nestlé) pays to pin their SKU at the top of category searches.
- **Category Sponsorship**: "Dairy & Breakfast" section sponsored by BigBasket for ₹80,000/month.

**Pricing model:** CPM (Cost Per Thousand Impressions) + CPC (Cost Per Click)
```
CPM: ₹150–₹400 per 1,000 impressions
CPC: ₹3–₹8 per click-through
```

---

### 3.3 Display Advertising
**How it works:**  
Banner ads on homepage, search results, and product pages. Sold via Google AdSense initially, then direct deals as traffic scales.

**Estimated revenue:**
```
50,000 MAU × 3 page views avg × ₹0.5 RPM = ₹75,000/month at 50K MAU
Scales linearly with traffic growth
```

---

### 3.4 Newsletter & Email Sponsorship
**How it works:**  
Weekly "Best Deals" email sent to registered users. Brands pay for a sponsored slot.

- Subscriber base → monetised at ₹5–₹15 per subscriber per month
- One sponsored slot per email = ₹20,000–₹80,000/send for 50K subscribers

---

### 3.5 B2B Data API (Medium–Long Term)
**How it works:**  
Sell access to PriceBasket's price history and real-time data via a paid REST API.

**Customers:**
- FMCG brands (track competitor pricing)
- Market research firms
- Retail analytics companies
- Individual developers building price-tracking tools

**Pricing:**
```
Starter:    ₹2,999/month  → 10,000 API calls, 30-day history
Growth:     ₹9,999/month  → 100,000 calls, 1-year history
Enterprise: Custom        → Unlimited, real-time webhooks, SLA
```

---

### 3.6 PriceBasket Pro (Subscription — Long Term)
**How it works:**  
Free users get 3 price alerts. Pro users get unlimited alerts + advanced features.

| Feature | Free | Pro (₹99/month) |
|---------|------|-----------------|
| Price alerts | 3 | Unlimited |
| Alert frequency | Daily | Every 15 minutes |
| Price history | 7 days | 1 year |
| Cart optimizer | Basic | Advanced (split cart) |
| Export to CSV | No | Yes |
| Ad-free | No | Yes |

---

### 3.7 Platform Partnership Fees (Long Term)
**How it works:**  
Platforms pay a listing fee to be "officially verified" on PriceBasket with a priority integration (faster price refresh, richer product data).

```
Basic listing:  Free (scrape-based)
Verified badge: ₹15,000–₹50,000/month (API integration, co-marketing)
```

---

## 4. Revenue Projection

| Stage | MAU | Primary Revenue | Monthly Revenue |
|-------|-----|----------------|-----------------|
| Seed (now) | 10K–50K | Affiliate + Ads | ₹50K–₹2L |
| Growth (6–12 months) | 100K–500K | Sponsored listings + Affiliate | ₹5L–₹25L |
| Scale (12–24 months) | 1M+ | All streams | ₹50L–₹2Cr |

---

## 5. Cost Structure

| Cost Item | Current (Render free tier) | At Scale |
|-----------|---------------------------|----------|
| Backend hosting (Render) | ₹0 (free tier) | ₹15,000–₹60,000/month |
| Frontend hosting (Vercel) | ₹0–₹1,700/month | ₹5,000–₹20,000/month |
| PostgreSQL (Neon/Render) | ₹0–₹3,000/month | ₹10,000–₹40,000/month |
| Redis (Upstash/Render) | ₹0–₹2,000/month | ₹5,000–₹15,000/month |
| Playwright/scraper infra | ₹0–₹5,000/month | ₹20,000–₹80,000/month |
| Email (SMTP/SendGrid) | ₹0–₹2,000/month | ₹5,000–₹20,000/month |
| Domain & SSL | ₹1,000/year | ₹1,000/year |
| **Total** | **~₹5,000–₹15,000/month** | **₹60,000–₹2,35,000/month** |

---

## 6. Profit Model

```
Gross Profit = Revenue - Variable Costs (hosting, infra, email)
Net Profit   = Gross Profit - Fixed Costs (founder salary, legal, marketing)

Break-even (est.): ~50,000 MAU with affiliate + sponsored listings active
Positive unit economics from day 1 — no physical goods, no inventory, no COD
```

**Key margins:**
- Affiliate commission: ~100% gross margin (no cost per referral)
- Sponsored listings: ~85% gross margin (small ops overhead)
- Data API: ~90% gross margin (infrastructure already paid)

---

## 7. Competitive Moat

1. **Data network effect**: More scrapers → more accurate prices → more users → platforms want to partner
2. **Price history database**: Unique asset that grows over time — competitors cannot replicate years of historical data overnight
3. **User alerts/engagement loop**: Users with active price alerts return 4–6x per week (high retention)
4. **India-first focus**: Deep integration with Indian quick-commerce (Blinkit locations, Zepto pincodes, etc.)

---

## 8. Key Metrics to Track

| Metric | Target |
|--------|--------|
| MAU (Monthly Active Users) | 50K → 500K → 1M |
| Avg session duration | > 3 minutes |
| Price alert activations | > 20% of registered users |
| Click-through to platform (CTR) | > 8% of product views |
| Affiliate conversion rate | > 2% of click-throughs |
| Returning user rate (D7) | > 35% |

---

## 9. Go-To-Market Strategy

1. **SEO**: Target "cheapest [product] India", "[product] price blinkit vs zepto" — high commercial intent keywords with low competition
2. **Social media**: Instagram Reels / YouTube Shorts showing real savings (already active @pricebasketindia)
3. **WhatsApp community**: Weekly best deals shared to opt-in subscribers (+91 80058 28390)
4. **Referral program**: "Invite a friend, get ₹50 shopping credit" (future)
5. **B2B outreach**: Direct pitch to platform partner teams for sponsored listing deals
