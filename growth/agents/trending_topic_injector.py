#!/usr/bin/env python3
"""
PRICEBASKET.IN — Trending Topic Injector Agent
===============================================
Monitors Twitter/X trending topics and Google Trends for grocery/inflation
related trends, then auto-generates and posts relevant content when a
trend matches PriceBasket's domain.

Triggers:
  • #GroceryInflation, #FoodPrices, #Blinkit, #Zepto trending → post comparison tweet
  • "atta price" trending on Google Trends → publish blog post + tweet thread
  • Festival season (Diwali, Holi, etc.) → pre-emptive price comparison content

GA4 event: viral session spikes from trending content

Setup:
  pip install tweepy anthropic requests pytrends schedule
  Set env vars:
    TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN,
    TWITTER_ACCESS_SECRET, TWITTER_BEARER_TOKEN
    ANTHROPIC_API_KEY
    BACKEND_API_URL
"""

import os
import json
import time
import datetime
import schedule
import requests

try:
    import tweepy
    TWEEPY_AVAILABLE = True
except ImportError:
    TWEEPY_AVAILABLE = False

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

try:
    from pytrends.request import TrendReq
    PYTRENDS_AVAILABLE = True
except ImportError:
    PYTRENDS_AVAILABLE = False

# ── Config ────────────────────────────────────────────────────────────────────
TWITTER_API_KEY      = os.getenv("TWITTER_API_KEY", "")
TWITTER_API_SECRET   = os.getenv("TWITTER_API_SECRET", "")
TWITTER_ACCESS_TOKEN = os.getenv("TWITTER_ACCESS_TOKEN", "")
TWITTER_ACCESS_SECRET= os.getenv("TWITTER_ACCESS_SECRET", "")
TWITTER_BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN", "")
ANTHROPIC_API_KEY    = os.getenv("ANTHROPIC_API_KEY", "")
BACKEND_API          = os.getenv("BACKEND_API_URL", "https://pricebasket-api.onrender.com")

# Dedup: topics already acted on today
_acted_on_today: set[str] = set()

# ── Trigger keywords ──────────────────────────────────────────────────────────
GROCERY_TREND_KEYWORDS = [
    "GroceryInflation", "FoodPrices", "GroceryPrices", "AtaPrice",
    "Blinkit", "ZeptoNow", "BigBasket", "JioMart", "SwiggyInstamart",
    "GroceryDeals", "QuickCommerce", "FoodInflation", "KitchenBudget",
    "GroceryHack", "SaveMoney", "CheapGrocery", "GroceryApp",
]

GOOGLE_TREND_KEYWORDS = [
    "atta price", "dal price", "oil price", "grocery price",
    "blinkit price", "zepto price", "bigbasket price",
    "grocery inflation india", "cheapest grocery app",
]

# ── Festival calendar (pre-planned content) ───────────────────────────────────
FESTIVAL_CALENDAR = [
    {"name": "Diwali",      "month": 10, "days_before": 14, "products": ["ghee", "dry fruits", "sweets", "oil"]},
    {"name": "Holi",        "month": 3,  "days_before": 7,  "products": ["colours", "milk", "thandai", "sweets"]},
    {"name": "Navratri",    "month": 10, "days_before": 5,  "products": ["fruits", "milk", "sabudana", "kuttu atta"]},
    {"name": "Eid",         "month": 4,  "days_before": 7,  "products": ["meat", "rice", "dry fruits", "sweets"]},
    {"name": "Christmas",   "month": 12, "days_before": 7,  "products": ["cake", "chocolate", "wine", "cheese"]},
    {"name": "Onam",        "month": 9,  "days_before": 5,  "products": ["rice", "coconut oil", "vegetables", "payasam"]},
    {"name": "Pongal",      "month": 1,  "days_before": 5,  "products": ["rice", "jaggery", "milk", "sugarcane"]},
    {"name": "Ganesh Chaturthi", "month": 9, "days_before": 7, "products": ["modak", "coconut", "flowers", "sweets"]},
]


# ── Twitter client ────────────────────────────────────────────────────────────

def get_twitter_client():
    if not TWEEPY_AVAILABLE:
        raise ImportError("tweepy not installed")
    return tweepy.Client(
        bearer_token=TWITTER_BEARER_TOKEN,
        consumer_key=TWITTER_API_KEY,
        consumer_secret=TWITTER_API_SECRET,
        access_token=TWITTER_ACCESS_TOKEN,
        access_token_secret=TWITTER_ACCESS_SECRET,
        wait_on_rate_limit=True,
    )


# ── Fetch Twitter trends ──────────────────────────────────────────────────────

def get_twitter_trending_topics(woeid: int = 23424848) -> list[dict]:
    """
    Fetch trending topics for India (WOEID 23424848).
    Returns list of {name, tweet_volume, url}
    """
    if not TWEEPY_AVAILABLE or not TWITTER_API_KEY:
        # Return simulated trends for testing
        return [
            {"name": "#GroceryInflation", "tweet_volume": 15420},
            {"name": "#Blinkit",          "tweet_volume": 8930},
            {"name": "#FoodPrices",       "tweet_volume": 6210},
        ]

    try:
        # Twitter API v1.1 for trends (v2 doesn't support trends yet)
        auth = tweepy.OAuthHandler(TWITTER_API_KEY, TWITTER_API_SECRET)
        auth.set_access_token(TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET)
        api_v1 = tweepy.API(auth)
        trends = api_v1.get_place_trends(woeid)
        return [
            {
                "name":         t["name"],
                "tweet_volume": t.get("tweet_volume") or 0,
                "url":          t.get("url", ""),
            }
            for t in trends[0]["trends"]
            if t.get("tweet_volume") and t["tweet_volume"] > 1000
        ]
    except Exception as exc:
        print(f"Twitter trends error: {exc}")
        return []


def find_matching_trends(trends: list[dict]) -> list[dict]:
    """Filter trends that match grocery/price comparison keywords."""
    matching = []
    for trend in trends:
        name_lower = trend["name"].lower().replace("#", "")
        for keyword in GROCERY_TREND_KEYWORDS:
            if keyword.lower() in name_lower or name_lower in keyword.lower():
                matching.append({**trend, "matched_keyword": keyword})
                break
    return matching


# ── Google Trends monitor ─────────────────────────────────────────────────────

def get_google_trending_searches() -> list[str]:
    """Fetch today's trending searches from Google Trends for India."""
    if not PYTRENDS_AVAILABLE:
        return ["atta price today", "blinkit vs zepto", "grocery inflation india"]

    try:
        pytrends = TrendReq(hl="en-IN", tz=330)  # IST
        trending = pytrends.trending_searches(pn="india")
        return trending[0].tolist()[:20]
    except Exception as exc:
        print(f"Google Trends error: {exc}")
        return []


def check_keyword_spike(keyword: str) -> bool:
    """Check if a keyword has a significant search spike (>50% above baseline)."""
    if not PYTRENDS_AVAILABLE:
        return False

    try:
        pytrends = TrendReq(hl="en-IN", tz=330)
        pytrends.build_payload([keyword], timeframe="now 7-d", geo="IN")
        data = pytrends.interest_over_time()
        if data.empty:
            return False
        recent = data[keyword].tail(1).values[0]
        baseline = data[keyword].mean()
        return recent > baseline * 1.5  # 50% above average = spike
    except Exception:
        return False


# ── Content generator ─────────────────────────────────────────────────────────

def generate_trending_tweet(trend_name: str, price_data: dict = None) -> str:
    """Generate a tweet that rides a trending topic."""
    if not ANTHROPIC_AVAILABLE or not ANTHROPIC_API_KEY:
        return _fallback_trending_tweet(trend_name)

    price_context = ""
    if price_data:
        price_context = (
            f"Live price data: {price_data.get('product','Atta')} is "
            f"₹{price_data.get('best_price',189)} on {price_data.get('cheapest_platform','JioMart')} "
            f"vs ₹{price_data.get('max_price',240)} on {price_data.get('priciest_platform','Blinkit')}."
        )

    try:
        ai = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        msg = ai.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=300,
            messages=[{
                "role": "user",
                "content": f"""Write a viral tweet for pricebasket.in that rides the trending topic "{trend_name}".

{price_context}

Rules:
1. Start with the trending hashtag or topic
2. Add a shocking price comparison fact
3. Include pricebasket.in link
4. Add 2-3 relevant hashtags including the trending one
5. Under 280 characters total
6. Sound authentic, not like an ad

Write the tweet:""",
            }],
        )
        return msg.content[0].text.strip()
    except Exception:
        return _fallback_trending_tweet(trend_name)


def _fallback_trending_tweet(trend_name: str) -> str:
    templates = [
        f"Since {trend_name} is trending — did you know Blinkit charges ₹51 MORE for atta than JioMart? Same product. Same brand. Compare all 8 apps free → pricebasket.in #{trend_name.replace('#','')} #GroceryPrices",
        f"With {trend_name} trending, here's the truth: grocery apps charge 15-40% more for the same products. Compare before you order → pricebasket.in #{trend_name.replace('#','')} #SaveMoney",
        f"{trend_name} 📈 While prices rise, you can still save ₹800/month by comparing apps. Blinkit vs Zepto vs BigBasket vs JioMart — all in 2 seconds. pricebasket.in #{trend_name.replace('#','')}",
    ]
    import random
    return random.choice(templates)


def generate_festival_content(festival: dict, price_data: list) -> dict:
    """Generate pre-festival price comparison content."""
    festival_name = festival["name"]
    products      = festival["products"]

    if not ANTHROPIC_AVAILABLE or not ANTHROPIC_API_KEY:
        return {
            "tweet": (
                f"🎉 {festival_name} is coming! Check prices before stocking up.\n"
                f"Festival season = price spikes on quick commerce apps.\n"
                f"Compare {', '.join(products[:3])} prices across 8 apps → pricebasket.in\n"
                f"#{festival_name.replace(' ','')} #GroceryDeals #SaveMoney"
            ),
            "blog_title": f"Best Grocery Prices for {festival_name} {datetime.date.today().year} — Compare 8 Apps",
        }

    try:
        ai = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        msg = ai.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=400,
            messages=[{
                "role": "user",
                "content": f"""Generate festival content for pricebasket.in for {festival_name}.
Key products: {', '.join(products)}

Output JSON:
{{
  "tweet": "viral tweet under 280 chars with #{festival_name.replace(' ','')} hashtag",
  "blog_title": "SEO blog title under 65 chars",
  "instagram_hook": "first line of Instagram caption (shocking price fact)"
}}

Output only valid JSON:""",
            }],
        )
        import re
        text = msg.content[0].text.strip()
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            return json.loads(m.group())
    except Exception:
        pass

    return {
        "tweet": (
            f"🎉 {festival_name} shopping? Compare {', '.join(products[:2])} prices "
            f"across 8 apps before buying. Save ₹500+ → pricebasket.in "
            f"#{festival_name.replace(' ','')} #GroceryDeals"
        ),
        "blog_title": f"Cheapest {festival_name} Grocery Prices {datetime.date.today().year}",
        "instagram_hook": f"🚨 {festival_name} price alert! Apps are charging 30% more this week.",
    }


# ── Post to Twitter ───────────────────────────────────────────────────────────

def post_tweet(text: str) -> bool:
    """Post a tweet. Returns True on success."""
    if not TWEEPY_AVAILABLE or not TWITTER_API_KEY:
        print(f"[DRY RUN] Would tweet:\n{text}\n")
        return True

    try:
        client = get_twitter_client()
        resp = client.create_tweet(text=text)
        print(f"[{_now()}] ✅ Tweeted: {text[:60]}...")
        return True
    except Exception as exc:
        print(f"[{_now()}] Tweet failed: {exc}")
        return False


# ── Notify backend to generate blog post ─────────────────────────────────────

def trigger_blog_post(title: str, topic: str, keywords: list) -> bool:
    """Ask the backend content engine to generate a blog post on this topic."""
    try:
        resp = requests.post(
            f"{BACKEND_API}/api/v1/content/generate",
            json={
                "title":    title,
                "topic":    topic,
                "keywords": keywords,
                "source":   "trending_topic_injector",
            },
            timeout=30,
        )
        if resp.ok:
            slug = resp.json().get("slug", "")
            print(f"[{_now()}] ✅ Blog post triggered: {slug}")
            return True
        print(f"[{_now()}] Blog trigger failed: {resp.status_code}")
        return False
    except Exception as exc:
        print(f"[{_now()}] Blog trigger error: {exc}")
        return False


# ── Festival checker ──────────────────────────────────────────────────────────

def check_upcoming_festivals() -> list[dict]:
    """Return festivals coming up in the next 14 days."""
    today    = datetime.date.today()
    upcoming = []
    for festival in FESTIVAL_CALENDAR:
        # Approximate festival date (month + middle of month)
        try:
            festival_date = datetime.date(today.year, festival["month"], 15)
            days_until    = (festival_date - today).days
            if 0 <= days_until <= festival["days_before"]:
                upcoming.append({**festival, "days_until": days_until})
        except ValueError:
            pass
    return upcoming


# ── Main runner ───────────────────────────────────────────────────────────────

def run_trending_monitor():
    """
    Main monitoring loop — runs every 2 hours.
    1. Check Twitter trends
    2. Check Google Trends
    3. Check upcoming festivals
    4. Act on matches
    """
    today = datetime.date.today().isoformat()
    print(f"[{_now()}] Running trending topic monitor...")

    # ── Twitter trends ────────────────────────────────────────────────────────
    trends   = get_twitter_trending_topics()
    matching = find_matching_trends(trends)

    for trend in matching[:2]:  # max 2 trend-riding tweets per cycle
        trend_name = trend["name"]
        dedup_key  = f"twitter::{trend_name}::{today}"

        if dedup_key in _acted_on_today:
            continue

        # Fetch live price data for context
        try:
            resp = requests.get(f"{BACKEND_API}/api/v1/products/featured?limit=1", timeout=10)
            price_data = resp.json().get("items", [{}])[0] if resp.ok else {}
        except Exception:
            price_data = {}

        tweet = generate_trending_tweet(trend_name, price_data)
        success = post_tweet(tweet)

        if success:
            _acted_on_today.add(dedup_key)
            print(f"[{_now()}] Acted on trend: {trend_name} (volume: {trend.get('tweet_volume',0):,})")

        time.sleep(5)

    # ── Google Trends ─────────────────────────────────────────────────────────
    google_trends = get_google_trending_searches()
    for keyword in GOOGLE_TREND_KEYWORDS:
        for trending in google_trends:
            if keyword.lower() in trending.lower():
                dedup_key = f"google::{keyword}::{today}"
                if dedup_key in _acted_on_today:
                    continue

                # Trigger a blog post
                blog_title = f"'{keyword.title()}' Is Trending — Here Are Today's Best Prices"
                triggered  = trigger_blog_post(
                    title=blog_title,
                    topic=keyword,
                    keywords=[keyword, "grocery price comparison india", "cheapest grocery app"],
                )
                if triggered:
                    _acted_on_today.add(dedup_key)
                    # Also tweet about it
                    tweet = generate_trending_tweet(f"#{keyword.replace(' ','')}", {})
                    post_tweet(tweet)
                break

    # ── Festival content ──────────────────────────────────────────────────────
    upcoming_festivals = check_upcoming_festivals()
    for festival in upcoming_festivals:
        dedup_key = f"festival::{festival['name']}::{today}"
        if dedup_key in _acted_on_today:
            continue

        content = generate_festival_content(festival, [])
        post_tweet(content["tweet"])
        trigger_blog_post(
            title=content["blog_title"],
            topic=f"{festival['name']} grocery prices",
            keywords=[festival["name"].lower(), "grocery deals", "festival shopping india"],
        )
        _acted_on_today.add(dedup_key)
        print(f"[{_now()}] Festival content posted: {festival['name']} ({festival['days_until']} days away)")

    # Clean old dedup keys
    for key in list(_acted_on_today):
        if not key.endswith(today):
            _acted_on_today.discard(key)

    print(f"[{_now()}] Trending monitor done. Active trends acted on: {len([k for k in _acted_on_today if today in k])}")


def _now() -> str:
    return datetime.datetime.now().strftime("%H:%M:%S")


def setup_schedule():
    schedule.every(2).hours.do(run_trending_monitor)
    print("Trending topic injector scheduled: every 2 hours")


if __name__ == "__main__":
    import sys
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"

    if cmd == "run":
        setup_schedule()
        while True:
            schedule.run_pending()
            time.sleep(60)
    elif cmd == "check":
        trends   = get_twitter_trending_topics()
        matching = find_matching_trends(trends)
        print(f"Twitter trends: {len(trends)} total, {len(matching)} matching")
        for t in matching:
            print(f"  {t['name']} — {t.get('tweet_volume',0):,} tweets")
        festivals = check_upcoming_festivals()
        print(f"\nUpcoming festivals: {[f['name'] for f in festivals]}")
    elif cmd == "tweet" and len(sys.argv) > 2:
        trend = sys.argv[2]
        tweet = generate_trending_tweet(f"#{trend}")
        print(f"\nGenerated tweet:\n{tweet}")
    elif cmd == "festival" and len(sys.argv) > 2:
        name = sys.argv[2]
        festival = next((f for f in FESTIVAL_CALENDAR if f["name"].lower() == name.lower()), None)
        if festival:
            content = generate_festival_content(festival, [])
            print(json.dumps(content, indent=2))
        else:
            print(f"Festival '{name}' not found. Available: {[f['name'] for f in FESTIVAL_CALENDAR]}")
    elif cmd == "now":
        run_trending_monitor()
    else:
        print("Usage: python trending_topic_injector.py [run|check|tweet <topic>|festival <name>|now]")
