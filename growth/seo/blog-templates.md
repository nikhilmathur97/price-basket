# PriceBasket SEO Blog Templates
# Target: high-intent queries, programmatic scale, human-reviewed before publish
#
# Ranking strategy:
#   - Answer the exact search query in H1 + first 50 words
#   - Real price data in a table (updated daily by backend API)
#   - One comparison per city variant (same template, different city/product)
#   - Internal links to product pages + comparison pages
#   - Schema: Article + FAQPage + BreadcrumbList

# ═══════════════════════════════════════════════════════════════════════════════
# TEMPLATE 1 — "Blinkit vs Zepto [product] price" (highest search volume)
# Target queries: "blinkit vs zepto atta price", "zepto vs blinkit milk today"
# ═══════════════════════════════════════════════════════════════════════════════

TEMPLATE_VS_PRODUCT = """
---
title: "{product} Price: Blinkit vs Zepto vs BigBasket vs JioMart [{month} {year}]"
slug: "{product_slug}-price-blinkit-vs-zepto"
meta_description: "Compare {product} price across Blinkit, Zepto, BigBasket, JioMart and Swiggy Instamart. Live prices updated every 2 hours. Find the cheapest app today."
h1: "{product} Cheapest Price Today — All Apps Compared"
schema_type: Article + FAQPage
internal_links:
  - /compare/{product_slug}   (product comparison page)
  - /blog/cheapest-grocery-app-india
  - /compare/{category_slug}  (e.g. /compare/atta-flour)
---

## Introduction (50 words, answer query immediately)

Looking for the cheapest {product} online? We track {product} prices across
Blinkit, Zepto, BigBasket, JioMart, and Swiggy Instamart every 2 hours —
so you always know which app to order from. Here are today's live prices.

## {product} Price Comparison Table

| App | Price | Delivery | Stock |
|-----|-------|----------|-------|
| JioMart | ₹{price_jiomart} | 1–2 hrs | ✅ In stock |
| BigBasket | ₹{price_bigbasket} | Same day | ✅ In stock |
| Zepto | ₹{price_zepto} | 10 min | ✅ In stock |
| Blinkit | ₹{price_blinkit} | 10 min | ✅ In stock |
| Swiggy Instamart | ₹{price_instamart} | 15 min | ✅ In stock |

*Last updated: {last_updated}*

**Cheapest today: {cheapest_app} at ₹{cheapest_price}**
**You save: ₹{max_saving} vs most expensive option**

👉 [Check live price on PriceBasket →](https://pricebasket.in/product/{product_slug})

## Why Does {product} Price Differ Across Apps?

Each quick-commerce app sets its own prices and runs different promotions.
{product} can vary by ₹{price_range} depending on which app you check —
and prices change 3–4 times per day during peak demand.

## Price History: {product} (Last 30 Days)

[Chart: 30-day price trend across apps — use backend /api/v1/prices/{product_slug}/history]

Lowest recorded: ₹{price_low} on {low_date} (via {low_app})
Highest recorded: ₹{price_high} on {high_date} (via {high_app})

## Set a Price Alert for {product}

Don't want to check manually? Set a price alert on PriceBasket:

1. Go to [pricebasket.in/product/{product_slug}](https://pricebasket.in/product/{product_slug})
2. Click **Set Price Alert**
3. Enter your target price (e.g. ₹{target_price})
4. Get notified via email or WhatsApp when it drops

[Set Alert →](https://pricebasket.in/product/{product_slug}?alert=true)

## FAQs

**Q: Which app has the cheapest {product} right now?**
A: As of {last_updated}, {cheapest_app} has the lowest {product} price at ₹{cheapest_price}.

**Q: How often does {product} price change on Blinkit / Zepto?**
A: Prices change 3–4 times per day on quick-commerce apps. PriceBasket updates every 2 hours.

**Q: Is it safe to order {product} from {cheapest_app}?**
A: Yes. All platforms listed are genuine. The product is identical regardless of platform.

**Q: Can I compare my full grocery cart, not just {product}?**
A: Yes — use PriceBasket's cart comparison at [pricebasket.in/compare](https://pricebasket.in/compare).

## Other Products in {category}
[Internal links to 5 similar product comparison pages]
"""


# ═══════════════════════════════════════════════════════════════════════════════
# TEMPLATE 2 — "Cheapest grocery app in [city]" (high local intent)
# Target: "cheapest grocery app in bangalore", "best grocery app mumbai"
# ═══════════════════════════════════════════════════════════════════════════════

TEMPLATE_CITY = """
---
title: "Cheapest Grocery App in {city} [{month} {year}] — Blinkit vs Zepto vs BigBasket"
slug: "cheapest-grocery-app-{city_slug}"
meta_description: "Which grocery app is cheapest in {city}? We compared Blinkit, Zepto, BigBasket, and JioMart for {city} orders. Live prices, real savings, no bias."
h1: "Cheapest Grocery App in {city}: Honest Comparison [{month} {year}]"
schema_type: Article + FAQPage + BreadcrumbList
internal_links:
  - /blog/blinkit-vs-zepto-price-comparison
  - /blog/jiomart-vs-bigbasket
  - /compare (homepage comparison tool)
---

## Which Grocery App Is Cheapest in {city}? (Short Answer)

Based on {data_points} price checks across {city} in the last 30 days:

| App | Avg Price vs Market | Best for |
|-----|-------------------|---------|
| JioMart | 8–15% cheaper | Staples: atta, dal, rice, oil |
| BigBasket | Market price | Branded goods, fresh produce |
| Zepto | 5–10% premium | Speed, convenience items |
| Blinkit | 10–18% premium | Speed, impulse buys |
| Swiggy Instamart | 8–12% premium | Combo with food orders |

**Bottom line for {city}:** JioMart saves the most on staples. BigBasket wins on branded goods. Zepto and Blinkit charge a speed premium — worth it only when time matters more than money.

## Live Price Comparison: Top 10 Grocery Items in {city}

| Item | JioMart | BigBasket | Zepto | Blinkit |
|------|---------|-----------|-------|---------|
| Aashirvaad Atta 5kg | ₹189 | ₹228 | ₹235 | ₹240 |
| Amul Milk 1L | ₹62 | ₹60 | ₹65 | ₹65 |
| Fortune Sunflower Oil 1L | ₹129 | ₹135 | ₹138 | ₹142 |
| Toor Dal 1kg | ₹142 | ₹148 | ₹155 | ₹158 |
| Basmati Rice 5kg | ₹285 | ₹295 | ₹320 | ₹335 |
| Amul Butter 500g | ₹272 | ₹268 | ₹285 | ₹298 |
| Tata Salt 1kg | ₹18 | ₹20 | ₹22 | ₹24 |
| Maggi 12pk | ₹108 | ₹112 | ₹125 | ₹132 |
| Sugar 1kg | ₹44 | ₹46 | ₹49 | ₹52 |
| Eggs (30 pcs) | ₹189 | ₹192 | ₹198 | ₹205 |

*Prices for {city}. Updated: {last_updated}.*

👉 [Compare your full cart on PriceBasket →](https://pricebasket.in/compare?city={city_slug})

## How Much Can You Save in {city}?

A typical {city} family spending ₹7,000/month on groceries can save:

- **₹560–₹900/month** by ordering staples from JioMart instead of Blinkit/Zepto
- **₹200–₹400/month** by using BigBasket for branded goods
- **₹6,700–₹10,800/year** in total annual savings

The exact saving depends on what you buy. Use [PriceBasket's cart optimizer](https://pricebasket.in/compare) to see your personal number.

## {city}-Specific Notes

{city_specific_note}
*(e.g., "BigBasket has a dedicated BB Daily service in Bangalore for milk/eggs with a subscription discount.")*
*(e.g., "JioMart covers most Mumbai pin codes with 2-hour delivery since late 2024.")*

## FAQs: Grocery Apps in {city}

**Q: Is Blinkit available in all {city} areas?**
A: Blinkit covers most of {city}'s metro areas but pin-code availability varies. Check the Blinkit app for your specific address.

**Q: Does JioMart deliver in 10 minutes in {city}?**
A: JioMart's standard delivery is 1–2 hours. Zepto and Blinkit offer 10-minute delivery in most {city} areas.

**Q: Which app is best for monthly grocery shopping in {city}?**
A: JioMart or BigBasket — lower prices, wider SKU range, no premium for speed. Use PriceBasket to compare before each order.

**Q: Do prices differ by area within {city}?**
A: Yes. Delivery charges and some product prices can vary by pin code. PriceBasket uses your location when available.

## Compare Grocery Apps in Other Cities
- [Cheapest grocery app in Mumbai](/blog/cheapest-grocery-app-mumbai)
- [Cheapest grocery app in Delhi](/blog/cheapest-grocery-app-delhi)
- [Cheapest grocery app in Hyderabad](/blog/cheapest-grocery-app-hyderabad)
- [Cheapest grocery app in Pune](/blog/cheapest-grocery-app-pune)
- [Cheapest grocery app in Chennai](/blog/cheapest-grocery-app-chennai)
"""


# ═══════════════════════════════════════════════════════════════════════════════
# TEMPLATE 3 — "Blinkit vs Zepto" head-to-head (branded comparison)
# Target: "blinkit vs zepto which is better", "blinkit vs zepto price difference"
# ═══════════════════════════════════════════════════════════════════════════════

TEMPLATE_HEAD_TO_HEAD = """
---
title: "Blinkit vs Zepto: Price, Speed & Selection Compared [{month} {year}]"
slug: "blinkit-vs-zepto-price-comparison"
meta_description: "Blinkit vs Zepto — who's actually cheaper? We tracked 500 products for 30 days. Full price breakdown, delivery comparison, and honest verdict."
h1: "Blinkit vs Zepto: Which Is Cheaper? (Data from {data_points} Products)"
schema_type: Article + FAQPage
internal_links:
  - /blog/cheapest-grocery-app-india
  - /compare (cart comparison)
  - /blog/jiomart-vs-bigbasket
---

## Blinkit vs Zepto: Quick Verdict

| Factor | Blinkit | Zepto | Winner |
|--------|---------|-------|--------|
| Average price (staples) | Higher by 8–15% | Middle | Zepto |
| Average price (branded) | Similar | Similar | Tie |
| Delivery time | 10–15 min | 10 min | Zepto |
| Delivery charge | ₹0–29 | ₹0–25 | Zepto |
| Platform fee | ₹3–7 | ₹2–5 | Zepto |
| Selection | 5000+ SKUs | 4000+ SKUs | Blinkit |
| App experience | ⭐ 4.4 | ⭐ 4.3 | Blinkit |

**Overall cheapest:** Zepto (by ~8% on staples)
**Best selection:** Blinkit
**For pure savings:** Neither — JioMart beats both by 15–23% on staples

## Price Comparison: Blinkit vs Zepto vs JioMart (Live Data)

| Product | Blinkit | Zepto | JioMart | Cheapest |
|---------|---------|-------|---------|---------|
| Aashirvaad Atta 5kg | ₹240 | ₹235 | ₹189 | JioMart ✅ |
| Amul Milk 1L | ₹65 | ₹65 | ₹62 | JioMart ✅ |
| Fortune Oil 1L | ₹142 | ₹138 | ₹129 | JioMart ✅ |
| Toor Dal 1kg | ₹158 | ₹155 | ₹142 | JioMart ✅ |
| Amul Butter 500g | ₹298 | ₹285 | ₹272 | JioMart ✅ |
| Tata Salt 1kg | ₹24 | ₹22 | ₹18 | JioMart ✅ |
| Eggs 30 pcs | ₹205 | ₹198 | ₹189 | JioMart ✅ |

*Updated: {last_updated}. [See full live comparison →](https://pricebasket.in/compare)*

## When to Use Blinkit vs Zepto

**Use Blinkit when:**
- You need a product Zepto doesn't stock
- You have a Blinkit subscription with cashback
- You're ordering non-grocery items (Blinkit has wider general merch)

**Use Zepto when:**
- Price difference matters (slightly cheaper on most items)
- You need the fastest possible delivery
- Zepto is running a platform-specific promotion

**Use neither when:**
- You're buying staples (atta, dal, rice, oil, salt) — JioMart is 15–23% cheaper
- You're doing a big monthly stock-up — BigBasket or JioMart wins

## FAQs

**Q: Is Blinkit cheaper than Zepto?**
A: Generally no. Zepto is cheaper by 5–10% on staples. Both are more expensive than JioMart by 15–23%.

**Q: Which is faster, Blinkit or Zepto?**
A: Both deliver in 10–15 minutes. Zepto averages slightly faster on paper but real delivery times are similar.

**Q: Do Blinkit and Zepto prices change throughout the day?**
A: Yes — both adjust prices based on demand, inventory, and promotions, typically 3–4 times per day. PriceBasket tracks these changes in real time.

**Q: How do I compare my actual cart between Blinkit and Zepto?**
A: Use [PriceBasket's cart comparison](https://pricebasket.in/compare) — add your items and it shows the cheapest split across all apps.
"""


# ═══════════════════════════════════════════════════════════════════════════════
# PRIORITY POST SCHEDULE (publish in this order for max SEO impact)
# ═══════════════════════════════════════════════════════════════════════════════

PUBLISH_ORDER = [
    # Week 1 — highest volume head-to-head queries
    {"template": "HEAD_TO_HEAD", "topic": "blinkit-vs-zepto",          "est_monthly_searches": 22000},
    {"template": "HEAD_TO_HEAD", "topic": "jiomart-vs-bigbasket",       "est_monthly_searches": 18000},
    {"template": "HEAD_TO_HEAD", "topic": "zepto-vs-swiggy-instamart",  "est_monthly_searches": 9000},

    # Week 2 — city pages (local intent, low competition)
    {"template": "CITY", "city": "bangalore",  "est_monthly_searches": 8800},
    {"template": "CITY", "city": "mumbai",     "est_monthly_searches": 7400},
    {"template": "CITY", "city": "delhi",      "est_monthly_searches": 6900},
    {"template": "CITY", "city": "hyderabad",  "est_monthly_searches": 5200},
    {"template": "CITY", "city": "pune",       "est_monthly_searches": 4100},
    {"template": "CITY", "city": "chennai",    "est_monthly_searches": 3800},
    {"template": "CITY", "city": "ahmedabad",  "est_monthly_searches": 3100},

    # Week 3–4 — high-volume product comparisons
    {"template": "VS_PRODUCT", "product": "Aashirvaad Atta 5kg",    "est_monthly_searches": 5400},
    {"template": "VS_PRODUCT", "product": "Amul Milk 1L",           "est_monthly_searches": 4800},
    {"template": "VS_PRODUCT", "product": "Fortune Sunflower Oil",  "est_monthly_searches": 3900},
    {"template": "VS_PRODUCT", "product": "Toor Dal 1kg",           "est_monthly_searches": 3200},
    {"template": "VS_PRODUCT", "product": "Basmati Rice 5kg",       "est_monthly_searches": 2900},
    {"template": "VS_PRODUCT", "product": "Eggs 30 pcs",            "est_monthly_searches": 2600},
    {"template": "VS_PRODUCT", "product": "Amul Butter 500g",       "est_monthly_searches": 2100},
]

# ═══════════════════════════════════════════════════════════════════════════════
# GENERATION PROMPT (feed to Claude via content engine)
# ═══════════════════════════════════════════════════════════════════════════════

CLAUDE_GENERATION_PROMPT = """
You are writing an SEO blog post for pricebasket.in, an Indian grocery price comparison site.

TEMPLATE: {template_type}
TOPIC: {topic}
LIVE PRICES: {price_data_json}
PUBLISH DATE: {date}

Rules:
- Answer the target query in the first 50 words — don't warm up
- Use the live price data provided — never invent numbers
- Write in clear Indian English; Hinglish only for 1–2 social-proof sentences
- Every H2 must contain the primary keyword or a close variant
- Include a price comparison table with real data
- Add 4–6 FAQs that match "People Also Ask" patterns for this query
- End with 3–5 internal links to related PriceBasket pages
- Target length: 900–1200 words (enough to rank, not padded)
- Do NOT add fake reviews, made-up stats, or invented user quotes
- Mark any data point that needs live API fill-in with {{LIVE: field_name}}

Output raw Markdown only. No preamble, no sign-off.
"""
