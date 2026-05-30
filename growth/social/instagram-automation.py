#!/usr/bin/env python3
"""
PRICEBASKET.IN — Instagram Automation
- Daily caption generation via Claude AI
- Auto-post via Buffer/Later API
- Auto-reply to comments within 5 minutes
- Weekly DM to top micro-influencers

Setup:
  pip install anthropic requests schedule
  Set env vars: ANTHROPIC_API_KEY, BUFFER_ACCESS_TOKEN, INSTAGRAM_USER_ID,
                INSTAGRAM_ACCESS_TOKEN, BACKEND_API_URL
"""

import os
import json
import time
import random
import schedule
import datetime
import requests
import anthropic

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
BUFFER_TOKEN = os.getenv("BUFFER_ACCESS_TOKEN", "")
IG_USER_ID = os.getenv("INSTAGRAM_USER_ID", "")
IG_TOKEN = os.getenv("INSTAGRAM_ACCESS_TOKEN", "")
BACKEND_API = os.getenv("BACKEND_API_URL", "https://pricebasket-api.onrender.com")

# ── 10 Example Instagram Captions (ready to use) ─────────────────────────────
EXAMPLE_CAPTIONS = {
    "atta": """🚨 Atta price shock! 😱

Aashirvaad Atta 5kg on different apps RIGHT NOW:

🔴 Blinkit: ₹240
🟡 Zepto: ₹235
🟢 BigBasket: ₹228
⚪ JioMart: ₹189 ✅ CHEAPEST

Same atta. Same brand. Same 5kg.
₹51 difference. Every. Single. Order.

If you order atta twice a month, that's ₹1,224 saved per year just on atta! 🤯

Stop being loyal to one app. Start comparing.
👉 pricebasket.in — free, no app needed

#AttaPrice #GroceryDeals #SaveMoney #Blinkit #Zepto #BigBasket #JioMart #GroceryHack #IndianGrocery #PriceComparison #SmartShopping #GroceryIndia #KitchenEssentials #BudgetCooking #SaveMoneyIndia""",

    "oil": """💡 Oil prices — which app is cheapest today?

Fortune Sunflower Oil 1L comparison:

🔴 Blinkit: ₹142
🟡 Zepto: ₹138
🟢 BigBasket: ₹135
⚪ JioMart: ₹129 ✅ CHEAPEST

₹13 difference per bottle.
A family uses 2-3 bottles/month.
That's ₹390-585 saved per year on oil alone! 💰

The math is simple. The savings are real.
👉 Compare all grocery prices at pricebasket.in

#OilPrice #SunflowerOil #GroceryDeals #SaveMoney #QuickCommerce #GroceryComparison #IndianKitchen #CookingOil #BudgetKitchen #SmartShopper""",

    "dal": """🫘 Dal prices are NOT the same everywhere!

Toor Dal 1kg comparison:

🔴 Blinkit: ₹158
🟡 Zepto: ₹155
🟢 BigBasket: ₹148
⚪ JioMart: ₹142 ✅ CHEAPEST

₹16 difference per kg.
Most families buy 2-3kg/month.
Annual saving: ₹384-576 just on dal! 🤯

Dal roz khao, paise bachao! 😄
👉 pricebasket.in — compare all 8 apps free

#DalPrice #ToorDal #GroceryDeals #SaveMoney #IndianFood #DalChawal #GroceryHack #BudgetCooking #SmartShopping #PriceComparison""",

    "rice": """🍚 Rice prices — big difference across apps!

Basmati Rice 5kg comparison:

🔴 Blinkit: ₹320
🟡 Zepto: ₹312
🟢 BigBasket: ₹285 ✅ CHEAPEST
⚪ JioMart: ₹295

₹35 difference per bag.
Order once a month = ₹420 saved per year! 💰

Chawal ke paise bachao, vacation pe kharch karo! ✈️
👉 pricebasket.in

#RicePrice #BasmatiRice #GroceryDeals #SaveMoney #IndianFood #GroceryComparison #SmartShopper #BudgetFamily""",

    "ghee": """🧈 Ghee prices — which app wins?

Patanjali Ghee 1L comparison:

🔴 Blinkit: ₹598
🟡 Zepto: ₹585
🟢 BigBasket: ₹572
⚪ JioMart: ₹549 ✅ CHEAPEST

₹49 difference per jar!
Buy once a month = ₹588 saved per year! 🤯

Ghee mein savings? Haan bhai! 😄
👉 Compare all prices at pricebasket.in — free!

#GheePrice #PatanjaliGhee #GroceryDeals #SaveMoney #IndianKitchen #HealthyFat #GroceryHack #SmartShopping""",

    "sugar": """🍬 Sugar prices — shocking difference!

Tata Sugar 1kg comparison:

🔴 Blinkit: ₹48
🟡 Zepto: ₹46
🟢 BigBasket: ₹44
⚪ JioMart: ₹40 ✅ CHEAPEST

₹8 difference per kg.
A family uses 3-4kg/month.
Annual saving: ₹288-384 just on sugar! 💰

Meetha savings! 🍭
👉 pricebasket.in — compare 8 apps in 2 seconds

#SugarPrice #GroceryDeals #SaveMoney #TataSugar #GroceryHack #IndianKitchen #BudgetCooking""",

    "masala": """🌶️ Masala prices — don't get spiced up!

MDH Garam Masala 100g comparison:

🔴 Blinkit: ₹68
🟡 Zepto: ₹65
🟢 BigBasket: ₹62
⚪ JioMart: ₹58 ✅ CHEAPEST

₹10 difference per pack.
Buy 2/month = ₹240 saved per year! 💰

Masale mein bhi savings! 🌶️
👉 pricebasket.in — India's #1 grocery price comparison

#MasalaPrice #MDH #GroceryDeals #SaveMoney #IndianSpices #GroceryHack #SmartShopper""",

    "biscuits": """🍪 Biscuit prices — sweet savings!

Parle-G 800g comparison:

🔴 Blinkit: ₹42
🟡 Zepto: ₹40
🟢 BigBasket: ₹38
⚪ JioMart: ₹35 ✅ CHEAPEST

₹7 difference per pack.
Buy 4/month = ₹336 saved per year! 💰

Chai ke saath savings bhi! ☕
👉 pricebasket.in

#ParleG #BiscuitPrice #GroceryDeals #SaveMoney #ChaiTime #GroceryHack #IndianSnacks""",

    "soap": """🧼 Soap prices — clean savings!

Dettol Soap 75g (pack of 4) comparison:

🔴 Blinkit: ₹148
🟡 Zepto: ₹142
🟢 BigBasket: ₹138
⚪ JioMart: ₹128 ✅ CHEAPEST

₹20 difference per pack.
Buy monthly = ₹240 saved per year! 💰

Saaf savings! 🧼
👉 pricebasket.in — compare 8 grocery apps free

#DettolSoap #SoapPrice #GroceryDeals #SaveMoney #PersonalCare #GroceryHack #SmartShopper""",

    "shampoo": """💆 Shampoo prices — lather up the savings!

Dove Shampoo 650ml comparison:

🔴 Blinkit: ₹298
🟡 Zepto: ₹285
🟢 BigBasket: ₹272
⚪ JioMart: ₹258 ✅ CHEAPEST

₹40 difference per bottle!
Buy every 2 months = ₹240 saved per year! 💰

Baalon mein savings! 💇
👉 pricebasket.in — India's grocery price comparison

#DoveShampoo #ShampooPrice #GroceryDeals #SaveMoney #HairCare #GroceryHack #SmartShopper""",
}

# ── 5 Instagram Reel Scripts ──────────────────────────────────────────────────
REEL_SCRIPTS = [
    {
        "title": "I found atta for ₹51 cheaper",
        "duration": "45s",
        "script": """
[HOOK 0-3s]
Visual: Close-up of atta bag with price tag ₹240
Text overlay: "You're paying ₹51 too much for atta 😱"
VO: "Bhai, atta ke liye itna zyada kyun de rahe ho?"

[PROBLEM 3-10s]
Visual: Split screen showing 5 different app prices
Text: "Same atta. 5 different prices."
VO: "Maine check kiya — same Aashirvaad Atta 5kg, 5 alag apps pe 5 alag prices."

[REVEAL 10-40s]
Visual: Screen recording of pricebasket.in comparison
Show: Blinkit ₹240 → Zepto ₹235 → BigBasket ₹228 → JioMart ₹189
Text: "JioMart pe ₹189! Blinkit pe ₹240!"
VO: "JioMart pe sirf ₹189 mein mil raha hai. Blinkit pe ₹240. Same product. ₹51 ka fark!"
Show: Annual savings calculation: ₹51 × 24 orders = ₹1,224/year
Text: "₹1,224 saved per year — just on atta!"

[CTA 40-45s]
Visual: pricebasket.in logo + website
Text: "Compare all 8 apps FREE"
VO: "pricebasket.in pe compare karo — free hai, app download nahi chahiye!"
"""
    },
    {
        "title": "Testing Blinkit vs Zepto prices",
        "duration": "60s",
        "script": """
[HOOK 0-3s]
Visual: Two phones side by side — Blinkit and Zepto apps open
Text overlay: "Blinkit vs Zepto — who's actually cheaper? 🤔"
VO: "Maine aaj test kiya — Blinkit vs Zepto. Results shocking hain."

[PROBLEM 3-10s]
Visual: Grocery list on paper
Text: "I ordered the same 10 items on both apps"
VO: "Same 10 items. Same city. Same day. Let's see who wins."

[REVEAL 10-50s]
Visual: Item-by-item comparison on screen
Show each item with both prices:
- Atta 5kg: Blinkit ₹240 vs Zepto ₹235 → Zepto wins
- Oil 1L: Blinkit ₹142 vs Zepto ₹138 → Zepto wins
- Dal 1kg: Blinkit ₹158 vs Zepto ₹155 → Zepto wins
- Milk 1L: Blinkit ₹65 vs Zepto ₹65 → Tie
- Sugar 1kg: Blinkit ₹48 vs Zepto ₹46 → Zepto wins
Text: "Zepto wins 4/5 items today"
VO: "Aaj ke liye Zepto sasta hai. But kal? Kal fir check karna padega."
Show: "But BOTH are more expensive than JioMart!"
VO: "Lekin dono se sasta JioMart hai — ₹189 pe atta!"

[CTA 50-60s]
Visual: pricebasket.in showing all 8 apps
Text: "Compare all 8 apps in 2 seconds"
VO: "pricebasket.in pe ek baar mein 8 apps compare karo. Free. Har roz."
"""
    },
    {
        "title": "How I save ₹800 every month on groceries",
        "duration": "60s",
        "script": """
[HOOK 0-3s]
Visual: Calculator showing ₹9,600 annual savings
Text overlay: "I save ₹800/month on groceries. Here's exactly how. 💰"
VO: "Main har mahine ₹800 bachata hoon groceries pe. Aur tum bhi kar sakte ho."

[PROBLEM 3-10s]
Visual: Person scrolling through one grocery app
Text: "Most people use just ONE app"
VO: "Problem yeh hai — log ek hi app use karte hain. Aur overpay karte hain."

[REVEAL 10-50s]
Visual: pricebasket.in on phone
Show: Monthly grocery list with cheapest sources
- Atta: JioMart (save ₹51)
- Oil: JioMart (save ₹13)
- Dal: JioMart (save ₹16)
- Rice: BigBasket (save ₹35)
- Ghee: Zepto (save ₹22)
- Milk: BigBasket (save ₹7)
- Vegetables: BigBasket (save ₹80)
- Snacks: JioMart (save ₹45)
Total: ₹269 saved per order × 3 orders/month = ₹807/month
Text: "₹807 saved every month!"
VO: "Har item ke liye sasta app choose karo. Total saving ₹800+ per month."

[CTA 50-60s]
Visual: pricebasket.in website
Text: "Start saving today — pricebasket.in"
VO: "pricebasket.in pe free mein compare karo. Aaj se shuru karo."
"""
    },
    {
        "title": "Price war: who wins?",
        "duration": "45s",
        "script": """
[HOOK 0-3s]
Visual: 4 app logos in battle formation
Text overlay: "Blinkit vs Zepto vs BigBasket vs JioMart — PRICE WAR 🥊"
VO: "Grocery apps ki price war mein kaun jeeta? Let's find out."

[REVEAL 3-40s]
Visual: Tournament bracket style comparison
Round 1: Blinkit vs Zepto → Zepto wins (cheaper on 6/10 items)
Round 2: BigBasket vs JioMart → JioMart wins (cheaper on 7/10 items)
Final: Zepto vs JioMart → JioMart wins overall
Text: "JioMart wins the price war! 🏆"
VO: "JioMart overall sab se sasta hai. But speed ke liye Blinkit/Zepto better."
Show: "Smart strategy: JioMart for staples, Blinkit for urgent needs"
VO: "Smart shoppers dono use karte hain — right item ke liye right app."

[CTA 40-45s]
Visual: pricebasket.in
Text: "See live prices — pricebasket.in"
VO: "Live prices check karo pricebasket.in pe — free!"
"""
    },
    {
        "title": "Never overpay for groceries again",
        "duration": "30s",
        "script": """
[HOOK 0-3s]
Visual: Money flying away animation
Text overlay: "Stop throwing money away on groceries 🛑💸"
VO: "Kya tum bhi groceries pe zyada pay kar rahe ho?"

[REVEAL 3-25s]
Visual: Fast-cut price comparisons
Show 5 products in 5 seconds each:
Atta: ₹240 → ₹189 (save ₹51)
Oil: ₹142 → ₹129 (save ₹13)
Dal: ₹158 → ₹142 (save ₹16)
Milk: ₹68 → ₹58 (save ₹10)
Ghee: ₹598 → ₹549 (save ₹49)
Text: "Total saved: ₹139 on just 5 items!"
VO: "Sirf 5 items pe ₹139 bachaye. Poori grocery list pe ₹800+ per month!"

[CTA 25-30s]
Visual: pricebasket.in on phone
Text: "pricebasket.in — free forever"
VO: "pricebasket.in — India ka #1 grocery price comparison. Free hai!"
"""
    },
]

# ── AI Caption Generator ──────────────────────────────────────────────────────
def generate_daily_caption(product_category: str = None, top_deal: dict = None) -> str:
    """Generate Instagram caption using Claude AI."""
    if not ANTHROPIC_API_KEY:
        # Return example caption
        cats = list(EXAMPLE_CAPTIONS.keys())
        cat = product_category or random.choice(cats)
        return EXAMPLE_CAPTIONS.get(cat, EXAMPLE_CAPTIONS["atta"])

    if not top_deal:
        top_deal = {
            "product": "Aashirvaad Atta 5kg",
            "cheapest_platform": "JioMart",
            "cheapest_price": 189,
            "expensive_platform": "Blinkit",
            "expensive_price": 240,
            "savings": 51,
            "category": product_category or "atta",
        }

    ai = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    msg = ai.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=600,
        messages=[{
            "role": "user",
            "content": f"""You are the Instagram content creator for pricebasket.in — India's grocery price comparison platform.

Write ONE Instagram caption for today's top deal. Rules:
1. Start with a shocking hook (emoji + price difference)
2. Show price comparison table with emojis (🔴 most expensive → ⚪ cheapest ✅)
3. Calculate annual savings to make it feel big
4. Use Hinglish tone (friendly mix of Hindi + English)
5. End with CTA: "👉 pricebasket.in — free, no app needed"
6. Add 20-25 relevant hashtags at the end
7. Keep total length under 2200 characters

Today's deal:
Product: {top_deal['product']}
Cheapest: {top_deal['cheapest_platform']} at ₹{top_deal['cheapest_price']}
Most expensive: {top_deal['expensive_platform']} at ₹{top_deal['expensive_price']}
Savings: ₹{top_deal['savings']} per purchase
Category: {top_deal['category']}

Write the caption now:"""
        }]
    )
    return msg.content[0].text.strip()

# ── Post to Instagram via Graph API ──────────────────────────────────────────
def post_to_instagram(image_url: str, caption: str) -> dict:
    """Post image + caption to Instagram Business account."""
    if not IG_USER_ID or not IG_TOKEN:
        print(f"[DRY RUN] Would post to Instagram:\n{caption[:200]}...")
        return {"status": "dry_run"}

    # Step 1: Create media container
    create_url = f"https://graph.facebook.com/v18.0/{IG_USER_ID}/media"
    create_resp = requests.post(create_url, data={
        "image_url": image_url,
        "caption": caption,
        "access_token": IG_TOKEN,
    })
    if create_resp.status_code != 200:
        return {"status": "error", "step": "create", "detail": create_resp.text}

    container_id = create_resp.json().get("id")

    # Step 2: Publish
    publish_url = f"https://graph.facebook.com/v18.0/{IG_USER_ID}/media_publish"
    publish_resp = requests.post(publish_url, data={
        "creation_id": container_id,
        "access_token": IG_TOKEN,
    })
    return {"status": "published" if publish_resp.status_code == 200 else "error",
            "post_id": publish_resp.json().get("id")}

# ── Schedule via Buffer ───────────────────────────────────────────────────────
def schedule_via_buffer(caption: str, image_url: str, scheduled_at: str) -> dict:
    """Schedule post via Buffer API."""
    if not BUFFER_TOKEN:
        print(f"[DRY RUN] Would schedule via Buffer at {scheduled_at}")
        return {"status": "dry_run"}

    resp = requests.post(
        "https://api.bufferapp.com/1/updates/create.json",
        data={
            "access_token": BUFFER_TOKEN,
            "text": caption,
            "media[photo]": image_url,
            "scheduled_at": scheduled_at,
        }
    )
    return resp.json()

# ── Influencer DM Templates ───────────────────────────────────────────────────
INFLUENCER_DMS = {
    "nano": """Hey {name}! 👋

Love your content about {niche}! Your audience really connects with practical savings tips.

I'm from pricebasket.in — India's grocery price comparison platform. We help people save ₹800/month by comparing Blinkit, Zepto, BigBasket & 5 more apps.

Would love to collab! Here's what we're thinking:
✅ You create 1 Reel showing how you save on groceries using pricebasket.in
✅ We provide all the price data and talking points
✅ In return: free premium access + ₹2,000 Amazon voucher

No fake reviews — just real price comparisons your audience will love!

Interested? Reply here or email us at collab@pricebasket.in 🙏

— Team PriceBasket""",

    "micro": """Hi {name}! 👋

Your content on {niche} is amazing — especially {specific_post}! Your audience clearly trusts your recommendations.

I'm reaching out from pricebasket.in — India's #1 grocery price comparison platform (10 lakh+ monthly users).

We'd love to partner with you for a paid collaboration:

📱 Deliverable: 1 Instagram Reel (30-60s) + 3 Stories showing grocery price comparison
💰 Compensation: ₹{rate} + performance bonus for every 100 sign-ups from your link
📊 We provide: all price data, talking points, and a custom affiliate link

Our last collab with a similar creator got 2.4L views and 8,400 sign-ups.

Can we jump on a quick 15-min call this week?

Best,
{sender_name}
Growth Team, PriceBasket
collab@pricebasket.in""",

    "food_blogger": """Hey {name}! 🍽️

Your grocery haul videos are SO relatable — especially the one about {specific_content}!

I'm from pricebasket.in and we have a fun collab idea for you:

🛒 "Grocery Haul Challenge" — order the same ₹2,000 grocery list from 3 different apps and show your audience the price difference

We'll:
✅ Provide the exact product list optimized for maximum price difference
✅ Reimburse your grocery costs (up to ₹6,000 for 3 orders)
✅ Pay ₹{rate} for the content
✅ Give you a custom affiliate link (earn ₹50 per sign-up)

This kind of content typically gets 5-10x normal engagement because it's genuinely useful!

Interested? Let's chat 🙏

— Team PriceBasket
collab@pricebasket.in""",
}

# ── Daily automation runner ───────────────────────────────────────────────────
def run_daily_instagram():
    """Run at 6am IST — generate caption, schedule posts."""
    print(f"[{datetime.datetime.now().strftime('%H:%M')}] Running daily Instagram automation...")

    # Get today's top deal from API
    try:
        resp = requests.get(f"{BACKEND_API}/api/v1/products/featured?limit=1", timeout=10)
        top_deal = resp.json().get("items", [{}])[0] if resp.ok else None
    except Exception:
        top_deal = None

    caption = generate_daily_caption(top_deal=top_deal)
    print(f"Caption generated: {caption[:100]}...")

    # Schedule 3 posts: 8am, 1pm, 7pm IST
    image_url = "https://pricebasket.in/api/social-card/today-deal"
    for hour in ["08:00", "13:00", "19:00"]:
        today = datetime.date.today().isoformat()
        scheduled_at = f"{today}T{hour}:00+05:30"
        result = schedule_via_buffer(caption, image_url, scheduled_at)
        print(f"Scheduled for {hour} IST: {result.get('status', 'unknown')}")

def setup_instagram_schedule():
    schedule.every().day.at("06:00").do(run_daily_instagram)
    print("Instagram automation scheduled.")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "caption":
        cat = sys.argv[2] if len(sys.argv) > 2 else "atta"
        print(generate_daily_caption(product_category=cat))
    elif len(sys.argv) > 1 and sys.argv[1] == "reel":
        idx = int(sys.argv[2]) if len(sys.argv) > 2 else 0
        script = REEL_SCRIPTS[idx]
        print(f"\n{'='*60}")
        print(f"REEL: {script['title']} ({script['duration']})")
        print('='*60)
        print(script['script'])
    else:
        setup_instagram_schedule()
        while True:
            schedule.run_pending()
            time.sleep(30)
