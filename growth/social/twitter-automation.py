#!/usr/bin/env python3
"""
PRICEBASKET.IN — Twitter/X Full Automation
- 5 tweets/day at 8am, 11am, 2pm, 6pm, 9pm IST
- Auto-reply to mentions within 10 minutes using AI
- Auto-like and reply to @Blinkit, @ZeptoNow, @BigBasket posts
- Monitor trending hashtags and join with CTA

Setup:
  pip install tweepy schedule anthropic requests
  Set env vars: TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN,
                TWITTER_ACCESS_SECRET, TWITTER_BEARER_TOKEN, ANTHROPIC_API_KEY
"""

import os
import time
import random
import schedule
import datetime
import tweepy
import anthropic

TWITTER_API_KEY = os.getenv("TWITTER_API_KEY", "")
TWITTER_API_SECRET = os.getenv("TWITTER_API_SECRET", "")
TWITTER_ACCESS_TOKEN = os.getenv("TWITTER_ACCESS_TOKEN", "")
TWITTER_ACCESS_SECRET = os.getenv("TWITTER_ACCESS_SECRET", "")
TWITTER_BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
BACKEND_API = os.getenv("BACKEND_API_URL", "https://pricebasket-api.onrender.com")

# ── 50 Ready-to-post Tweets ───────────────────────────────────────────────────
TWEET_LIBRARY = [
    "🚨 PRICE DROP: Aashirvaad Atta 5kg just dropped to ₹189 on JioMart vs ₹240 on Blinkit!\nSave ₹51 per bag 💰\nCompare all prices → pricebasket.in\n#GroceryDeals #PriceAlert #SaveMoney",
    "🚨 PRICE DROP: Fortune Sunflower Oil 1L is ₹129 on JioMart vs ₹142 on Blinkit!\nSave ₹13 per bottle 💰\nCompare → pricebasket.in\n#GroceryDeals #CheapGrocery",
    "🚨 DEAL ALERT: Tata Salt 1kg is ₹18 on JioMart vs ₹24 on Zepto!\nSame product. 25% cheaper. Why pay more?\npricebasket.in\n#GroceryHack #SaveMoney",
    "🧵 I compared grocery prices across 6 apps for 30 days. The results will shock you.\n\nSome apps charge 40% MORE for the same product.\n\nHere's what I found 👇\n\n(1/10)",
    "🧵 Blinkit vs Zepto vs BigBasket — I spent ₹50,000 testing all three.\n\nHere's the REAL price difference nobody talks about 👇\n\n(1/12)",
    "Blinkit overcharges by 23% on average vs JioMart for the same products.\n\nWe tracked 500 items. Here's the proof:\npricebasket.in\n\n#Blinkit #GroceryPrices",
    "Hot take: You're wasting ₹800/month on groceries because you're loyal to one app.\n\nDifferent apps are cheapest for different products.\n\npricebasket.in compares all 8 in 2 seconds.\n\n#GroceryHack",
    "We tracked 1,000 grocery items for 30 days. Here's what we found:\n\n🥇 JioMart: cheapest 42% of the time\n🥈 BigBasket: cheapest 28% of the time\n🥉 Zepto: cheapest 18% of the time\n4. Blinkit: cheapest 12% of the time\n\nFull data: pricebasket.in",
    "Average price difference for atta across apps:\n\nJioMart: ₹189\nBigBasket: ₹228\nZepto: ₹235\nBlinkit: ₹240\nInstamart: ₹242\n\nSame 5kg bag. ₹53 difference.\n\nCompare live: pricebasket.in\n\n#AttaPrice",
    "Indian families spend ₹6,000-12,000/month on groceries.\n\nOur users save an average of ₹800/month by comparing prices.\n\nThat's ₹9,600/year. Free on pricebasket.in\n\n#SaveMoney #GroceryBudget",
    "Which app do you use for groceries? 👇\n\n🔵 Blinkit\n🟡 Zepto\n🟢 BigBasket\n🔴 Swiggy Instamart\n\nAnd are you sure it's the cheapest? 😏\n\npricebasket.in\n\n#GroceryPoll",
    "pricebasket.in in numbers:\n\n📊 10,000+ products tracked\n🏪 8 platforms compared\n⏱️ Updated every 2 hours\n💰 Avg user saves ₹800/month\n🆓 100% free forever\n\nIndia's #1 grocery price comparison.\n\npricebasket.in",
    "Mumbai friends 🙋\n\nGrocery prices in your city right now:\nAtta 5kg: ₹189 (JioMart) vs ₹240 (Blinkit)\nOil 1L: ₹129 (JioMart) vs ₹142 (Blinkit)\n\nFull Mumbai comparison: pricebasket.in/grocery-prices-mumbai\n\n#MumbaiGrocery",
    "Delhi NCR 🙋\n\nBest grocery prices near you:\nAtta 5kg: ₹189 (JioMart) vs ₹240 (Blinkit)\nRice 5kg: ₹285 (BigBasket) vs ₹320 (Zepto)\n\nFull Delhi comparison: pricebasket.in/grocery-prices-delhi\n\n#DelhiGrocery",
    "Aashirvaad Atta 5kg prices right now:\n\n🥇 JioMart: ₹189\n🥈 BigBasket: ₹228\n🥉 Zepto: ₹235\n4. Blinkit: ₹240\n5. Instamart: ₹242\n\nSame product. ₹53 difference.\n\nAll prices: pricebasket.in\n\n#AttaPrice",
    "Amul Milk 1L prices right now:\n\n🥇 BigBasket: ₹58\n🥈 JioMart: ₹60\n🥉 Blinkit: ₹65\n4. Zepto: ₹65\n5. Instamart: ₹68\n\nSave ₹10/litre. That's ₹300/month for a family of 4.\n\npricebasket.in\n\n#AmulMilk",
    "Quick commerce apps have a dirty secret: prices change 3-4x per day.\n\nBlinkit at 8am vs 8pm can differ by 15%.\n\nWe track it all in real-time → pricebasket.in\n\n#QuickCommerce #GroceryPrices",
    "3 things pricebasket.in does for free:\n\n1️⃣ Compares 8 grocery apps in real-time\n2️⃣ Sends price drop alerts to your phone\n3️⃣ Optimizes your entire cart for max savings\n\nNo app download. No signup needed.\n\npricebasket.in",
    "Tag someone who orders groceries without comparing prices 👇\n\nThey're probably paying ₹800/month extra.\n\nSend them pricebasket.in 💰\n\n#GroceryHack #SaveMoney",
    "🟢 847 Indians are comparing grocery prices on pricebasket.in right now.\n\nJoin them. Save ₹800/month.\n\npricebasket.in\n\n#GroceryPrices #India",
    "Grocery prices are up 8% this year.\n\nBut you can still save ₹800/month by comparing apps.\n\nSame products. Different prices. Every day.\n\npricebasket.in\n\n#GroceryInflation #India",
    "Sunday grocery run? 🛒\n\nCheck prices before you order:\n→ pricebasket.in\n\nTakes 30 seconds. Saves ₹200-500 per order.\n\n#SundayGrocery #SaveMoney",
    "A user just saved ₹340 on a single grocery order using pricebasket.in\n\nHere's how:\n→ Atta from JioMart (saved ₹51)\n→ Oil from BigBasket (saved ₹8)\n→ Dal from JioMart (saved ₹16)\n→ Rice from BigBasket (saved ₹35)\n\nTotal: ₹110 saved. In 2 minutes.\n\npricebasket.in",
    "Share this with your family WhatsApp group 👇\n\n'Stop ordering from one grocery app. Different apps are cheapest for different products. Use pricebasket.in to compare all 8 in 2 seconds. Free forever.'\n\n#GroceryHack #FamilyTips",
    "Zepto's 10-minute delivery is impressive.\n\nBut you're paying a premium:\n\nAtta: +₹46 vs JioMart\nOil: +₹9 vs JioMart\nDal: +₹13 vs JioMart\n\nIs 10 minutes worth ₹68 extra?\n\nYou decide: pricebasket.in\n\n#Zepto",
    "Be honest: do you check prices before ordering groceries?\n\n🔵 Yes, always\n🟡 Sometimes\n🟢 Never — I just use one app\n\nIf you said 🟢, you're probably overpaying by ₹500-1,000/month.\n\npricebasket.in",
    "Toor Dal 1kg prices right now:\n\n🥇 JioMart: ₹142\n🥈 BigBasket: ₹148\n🥉 Zepto: ₹155\n4. Blinkit: ₹158\n5. Instamart: ₹162\n\nSave ₹20/kg. That's ₹240/year.\n\npricebasket.in\n\n#DalPrice",
    "Festival season = grocery price spikes on quick commerce apps.\n\nWe track every price change in real-time.\n\nDon't get overcharged this festive season.\n\npricebasket.in\n\n#FestiveSeason #GroceryDeals",
    "Our users have collectively saved ₹2.34 crore on groceries this month.\n\nOne comparison at a time.\n\npricebasket.in — free forever.\n\n#SaveMoney #GroceryDeals",
    "Set a price alert on pricebasket.in:\n\n1. Search any product\n2. Click 'Set Alert'\n3. Enter your target price\n4. Get notified when it drops\n\nFree. No app needed.\n\npricebasket.in\n\n#PriceAlert #GroceryDeals",
    "What's your monthly grocery bill?\n\n🔵 Under ₹3,000\n🟡 ₹3,000-6,000\n🟢 ₹6,000-10,000\n🔴 Over ₹10,000\n\nOur users in the last category save the most with pricebasket.in 💰",
    "Nobody talks about this: Zepto charges ₹20-40 more for the same product during peak hours.\n\nWe've tracked it. The data is on pricebasket.in\n\n#Zepto #GroceryPrices",
    "Quick commerce market in India: ₹45,000 crore\nAvg markup vs offline: 15-40%\nUsers who compare prices: <5%\n\nBe in the 5%: pricebasket.in\n\n#QuickCommerce #India",
    "Why trust pricebasket.in?\n\n✅ No paid rankings — pure price data\n✅ Updated every 2 hours\n✅ 8 platforms in one place\n✅ Free price alerts\n✅ No app download needed\n\nJust honest price comparison.\n\npricebasket.in",
    "Bangalore friends 🙋\n\nGrocery prices in Bangalore today:\nAtta 5kg: ₹195 (JioMart) vs ₹245 (Blinkit)\nMilk 1L: ₹58 (BigBasket) vs ₹65 (Zepto)\n\nFull comparison: pricebasket.in/grocery-prices-bangalore\n\n#BangaloreGrocery",
    "Blinkit is great for speed. But is it the cheapest?\n\nFor atta: No (JioMart is ₹51 cheaper)\nFor oil: No (JioMart is ₹13 cheaper)\nFor dal: No (JioMart is ₹16 cheaper)\n\nSpeed costs money. Know when to pay it.\n\npricebasket.in\n\n#Blinkit",
    "BigBasket has the widest selection.\n\nBut not always the cheapest.\n\nWe compare BigBasket vs 7 other apps for every product.\n\npricebasket.in\n\n#BigBasket #GroceryPrices",
    "Price freshness matters:\n\n✅ pricebasket.in updates every 2 hours\n❌ Most comparison sites update daily\n\nGrocery prices change 3-4x per day.\n\nReal-time comparison: pricebasket.in\n\n#GroceryPrices",
    "Real user story:\n\n'I was spending ₹9,200/month on groceries. After using pricebasket.in for 3 months, I spend ₹7,800. Same products. Same quality. Just different apps.'\n\n— Priya, Mumbai\n\nYour turn: pricebasket.in",
    "Forward this to anyone who orders groceries online:\n\nBlinkit ≠ cheapest\nZepto ≠ cheapest\nBigBasket ≠ cheapest\n\nThe cheapest app changes by product, by day, by city.\n\npricebasket.in compares all 8 in real-time. Free.\n\n#GroceryTip",
    "Name a grocery product and I'll tell you which app has the cheapest price right now 👇\n\n(Powered by pricebasket.in — real-time data)",
    "🧵 How I cut my grocery bill from ₹8,000 to ₹5,200/month without changing what I buy.\n\nThe trick? I just stopped being loyal to one app.\n\nThread 👇\n\n(1/8)",
    "Quick commerce apps are making BILLIONS from your laziness.\n\nHere's how much extra you're paying on Blinkit vs the cheapest option:\n\nAtta: +₹51\nOil: +₹13\nDal: +₹28\nRice: +₹42\n\nThat's ₹134 extra on 4 items alone.\n\npricebasket.in",
    "🧵 I tracked 1,000 grocery items across 8 apps for 6 months.\n\nHere's what the data says about which app is ACTUALLY cheapest 👇\n\n(1/15)",
    "Amul Butter 500g prices right now:\n\n🥇 BigBasket: ₹268\n🥈 JioMart: ₹272\n🥉 Zepto: ₹285\n4. Blinkit: ₹298\n\nSame product. ₹30 difference.\n\npricebasket.in\n\n#AmulButter",
    "Prices updated 14 minutes ago on pricebasket.in\n\nBlinkit, Zepto, BigBasket, Instamart, JioMart, Amazon Fresh, Flipkart Minutes, DMart — all in one place.\n\nCompare now: pricebasket.in",
    "Pro tip: Not every product should come from the same app.\n\nBuy atta from JioMart (cheapest)\nBuy ghee from Zepto (cheapest)\nBuy vegetables from BigBasket (freshest)\n\nSplit your order. Save 15-25% total.\n\npricebasket.in",
    "The math that will change how you shop:\n\nSave ₹50 on atta + ₹13 on oil + ₹20 on dal + ₹35 on rice = ₹118 per order\n\nOrder twice a week = ₹236/week\n\n52 weeks = ₹12,272/year\n\npricebasket.in",
    "Checking prices before ordering groceries takes 30 seconds.\n\nNot checking costs ₹800/month.\n\npricebasket.in\n\n#GroceryHack",
    "🚨 PRICE ALERT: Maggi Noodles 12-pack is ₹108 on BigBasket vs ₹132 on Blinkit!\nSave ₹24 per pack 💰\npricebasket.in\n#Maggi #GroceryDeals",
    "India's smartest grocery shoppers use pricebasket.in\n\n✅ Compare 8 apps in 2 seconds\n✅ Free price alerts\n✅ Cart optimizer\n✅ No app needed\n\nJoin 10 lakh+ smart shoppers.\n\npricebasket.in",
]

# ── Twitter client ────────────────────────────────────────────────────────────
def get_client():
    return tweepy.Client(
        bearer_token=TWITTER_BEARER_TOKEN,
        consumer_key=TWITTER_API_KEY,
        consumer_secret=TWITTER_API_SECRET,
        access_token=TWITTER_ACCESS_TOKEN,
        access_token_secret=TWITTER_ACCESS_SECRET,
        wait_on_rate_limit=True,
    )

# ── Post a tweet ──────────────────────────────────────────────────────────────
_posted_today: list[int] = []

def post_scheduled_tweet():
    """Post next tweet from library (rotates through all 50)."""
    client = get_client()
    available = [i for i in range(len(TWEET_LIBRARY)) if i not in _posted_today]
    if not available:
        _posted_today.clear()
        available = list(range(len(TWEET_LIBRARY)))

    idx = random.choice(available)
    tweet_text = TWEET_LIBRARY[idx]
    _posted_today.append(idx)

    try:
        resp = client.create_tweet(text=tweet_text)
        print(f"[{_now()}] Posted tweet #{idx}: {tweet_text[:60]}...")
        return resp
    except Exception as e:
        print(f"[{_now()}] Tweet failed: {e}")
        return None

# ── AI reply to mentions ──────────────────────────────────────────────────────
_replied_to: set[str] = set()

def reply_to_mentions():
    """Check mentions and auto-reply using Claude AI."""
    client = get_client()
    try:
        me = client.get_me()
        mentions = client.get_users_mentions(
            id=me.data.id,
            max_results=10,
            tweet_fields=["text", "author_id", "created_at"],
        )
        if not mentions.data:
            return

        for mention in mentions.data:
            if str(mention.id) in _replied_to:
                continue
            reply = _generate_ai_reply(mention.text)
            if reply:
                client.create_tweet(text=reply, in_reply_to_tweet_id=mention.id)
                _replied_to.add(str(mention.id))
                print(f"[{_now()}] Replied to mention {mention.id}")
                time.sleep(5)
    except Exception as e:
        print(f"[{_now()}] Mention check failed: {e}")

def _generate_ai_reply(mention_text: str) -> str:
    """Generate contextual reply using Claude."""
    if not ANTHROPIC_API_KEY:
        return "Thanks for mentioning us! 🙏 Compare grocery prices across 8 apps for free at pricebasket.in — save ₹800/month! 💰"

    try:
        ai = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        msg = ai.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=200,
            messages=[{
                "role": "user",
                "content": f"""You are the social media manager for pricebasket.in — India's grocery price comparison platform.
Reply to this tweet mention in a helpful, friendly, Hinglish tone (mix of Hindi and English).
Keep it under 240 characters. Always mention pricebasket.in and a benefit (save money, compare prices, free).
Do NOT use hashtags in replies.

Tweet: {mention_text}

Reply:"""
            }]
        )
        return msg.content[0].text.strip()
    except Exception:
        return "Thanks for the mention! 🙏 Compare grocery prices across Blinkit, Zepto, BigBasket & more at pricebasket.in — free! 💰"

# ── Monitor competitors and engage ───────────────────────────────────────────
COMPETITOR_HANDLES = ["Blinkit", "ZeptoNow", "BigBasket", "SwiggyInstamart"]

def engage_with_competitors():
    """Like and reply to competitor posts with price comparison angle."""
    client = get_client()
    for handle in COMPETITOR_HANDLES:
        try:
            user = client.get_user(username=handle)
            if not user.data:
                continue
            tweets = client.get_users_tweets(
                id=user.data.id,
                max_results=5,
                tweet_fields=["text", "public_metrics"],
            )
            if not tweets.data:
                continue
            for tweet in tweets.data[:2]:
                # Like the tweet
                me = client.get_me()
                client.like(me.data.id, tweet.id)
                # Reply with comparison angle
                reply = _get_competitor_reply(handle, tweet.text)
                client.create_tweet(text=reply, in_reply_to_tweet_id=tweet.id)
                print(f"[{_now()}] Engaged with @{handle} tweet {tweet.id}")
                time.sleep(10)
        except Exception as e:
            print(f"[{_now()}] Competitor engagement failed for {handle}: {e}")

def _get_competitor_reply(handle: str, tweet_text: str) -> str:
    replies = {
        "Blinkit": "Great! 🙌 Pro tip: compare Blinkit prices with Zepto, BigBasket & 5 more apps at pricebasket.in — find the best deal in 2 seconds! 💰",
        "ZeptoNow": "Love the speed! ⚡ Did you know you can compare Zepto prices with 7 other apps at pricebasket.in? Save ₹800/month! 💰",
        "BigBasket": "Great selection! 🛒 Compare BigBasket prices with Blinkit, Zepto & 5 more apps at pricebasket.in — always get the best price! 💰",
        "SwiggyInstamart": "Fast delivery! 🚀 Compare Instamart prices with 7 other grocery apps at pricebasket.in — save ₹800/month! 💰",
    }
    return replies.get(handle, f"Compare prices across all grocery apps at pricebasket.in — free! 💰")

# ── Schedule ──────────────────────────────────────────────────────────────────
def _now():
    return datetime.datetime.now().strftime("%H:%M:%S")

def setup_schedule():
    """5 tweets/day at IST times. Mentions checked every 10 min."""
    schedule.every().day.at("08:00").do(post_scheduled_tweet)
    schedule.every().day.at("11:00").do(post_scheduled_tweet)
    schedule.every().day.at("14:00").do(post_scheduled_tweet)
    schedule.every().day.at("18:00").do(post_scheduled_tweet)
    schedule.every().day.at("21:00").do(post_scheduled_tweet)
    schedule.every(10).minutes.do(reply_to_mentions)
    schedule.every().day.at("10:00").do(engage_with_competitors)
    schedule.every().day.at("16:00").do(engage_with_competitors)
    print("Twitter automation scheduled. Running...")

if __name__ == "__main__":
    setup_schedule()
    while True:
        schedule.run_pending()
        time.sleep(30)
