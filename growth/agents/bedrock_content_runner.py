#!/usr/bin/env python3
"""
PriceBasket — Bedrock Content Runner
Generates and posts content using Claude via Amazon Bedrock (AWS CLI credentials).
Run directly: python3 bedrock_content_runner.py
"""

import os, sys, json, random, datetime, boto3
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "../../backend/.env"))

AWS_REGION    = os.getenv("AWS_REGION", "us-east-1")
BEDROCK_MODEL = os.getenv("BEDROCK_MODEL_ID", "us.anthropic.claude-sonnet-4-6")
SITE_URL      = os.getenv("SITE_URL", "https://pricebasket.in")
DRY_RUN       = "--dry-run" in sys.argv


def _claude(prompt: str, system: str, max_tokens: int = 1200) -> str:
    client = boto3.client("bedrock-runtime", region_name=AWS_REGION)
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": max_tokens,
        "system": system,
        "messages": [{"role": "user", "content": prompt}],
    })
    resp = client.invoke_model(modelId=BEDROCK_MODEL, body=body)
    return json.loads(resp["body"].read())["content"][0]["text"].strip()


# ── Tweet generator ────────────────────────────────────────────────────────────

TWEET_SYSTEM = (
    "You write tweets for @PriceBasketIND — India's grocery price comparison app. "
    "Voice: punchy, desi, Hinglish where it lands, value-first, never spammy. "
    "Always end with pricebasket.in. Keep under 260 chars. No hashtag spam — max 2. "
    "Never use emojis more than 2 per tweet."
)

TWEET_ANGLES = [
    "Write a tweet about how Blinkit prices are higher than JioMart on atta/rice. Give a specific ₹ saving example.",
    "Write a tweet with a poll asking which grocery app people use — Blinkit, Zepto, BigBasket, or JioMart.",
    "Write a Hinglish tweet about the shock of seeing the same product at two very different prices on two apps.",
    "Write a tweet showing the monthly saving if someone always buys from the cheapest app. Use ₹ numbers.",
    "Write a tweet about milk prices being different on Zepto vs Blinkit vs BigBasket right now.",
    "Write a tweet calling out that grocery app 'loyalty' is costing Indian families money.",
    "Write a conversational tweet asking followers what they saved last month on groceries.",
    "Write a tweet about June 2026 cooking oil prices being at a 3-month low — good time to stock up.",
    "Write a tweet about how toor dal price differs by ₹20/kg across apps — with pricebasket.in CTA.",
    "Write a tweet targeting Mumbai households about how JioMart beats Blinkit on staples by 20%.",
]

def generate_tweet() -> str:
    angle = random.choice(TWEET_ANGLES)
    return _claude(angle, TWEET_SYSTEM, max_tokens=120)


def post_tweet(text: str) -> dict:
    if DRY_RUN:
        print(f"[DRY-RUN] Would tweet: {text}")
        return {"dry_run": True}
    import tweepy
    load_dotenv(os.path.join(os.path.dirname(__file__), "../../backend/.env"))
    client = tweepy.Client(
        consumer_key=os.getenv("TWITTER_API_KEY"),
        consumer_secret=os.getenv("TWITTER_API_SECRET"),
        access_token=os.getenv("TWITTER_ACCESS_TOKEN"),
        access_token_secret=os.getenv("TWITTER_ACCESS_SECRET"),
    )
    resp = client.create_tweet(text=text)
    return {"id": resp.data["id"], "text": text}


# ── Blog post generator ────────────────────────────────────────────────────────

BLOG_SYSTEM = (
    "You write SEO blog posts for pricebasket.in, an Indian grocery price comparison site. "
    "Rules: answer the target query in the first 50 words. Use real price data provided. "
    "Write in clear Indian English. Each H2 must contain a keyword variant. "
    "Include a price comparison table. Add 4 FAQs matching People Also Ask patterns. "
    "End with 3 internal links. Target 900–1100 words. No padding, no filler. "
    "Output raw Markdown only."
)

BLOG_TOPICS = [
    {
        "slug": "atta-price-today-all-apps-2026",
        "title": "Atta Price Today: Cheapest App for Wheat Flour in India [June 2026]",
        "prompt": (
            "Write a blog post comparing atta (wheat flour) prices today across Blinkit, Zepto, "
            "BigBasket, JioMart and Swiggy Instamart in India for June 2026. "
            "Use these real price data points: Aashirvaad 5kg: JioMart ₹189, BigBasket ₹228, "
            "Zepto ₹235, Blinkit ₹240, Instamart ₹242. BB Royal 5kg: BigBasket ₹155. "
            "Cover: which app is cheapest, why JioMart wins on branded staples, "
            "when to choose private label, 10kg vs 5kg pack value. "
            "Include internal links to /cheapest-atta-online, /compare/blinkit-vs-zepto, /compare/bigbasket-vs-jiomart."
        ),
    },
    {
        "slug": "milk-price-comparison-apps-june-2026",
        "title": "Milk Price Comparison: Blinkit vs Zepto vs BigBasket [June 2026]",
        "prompt": (
            "Write a blog post comparing milk prices across Blinkit, Zepto, BigBasket, "
            "JioMart and Swiggy Instamart in India for June 2026. "
            "Real data: Amul Taaza 1L — Blinkit ₹65, Zepto ₹65, BigBasket ₹62, JioMart ₹62, Instamart ₹68. "
            "Amul Gold 1L — Blinkit ₹72, BigBasket ₹69. "
            "Cover: which app has cheapest milk, regional brands (Nandini in Bangalore, Aavin in Chennai, "
            "Vijaya in Hyderabad, Mother Dairy in Delhi), subscription milk services, "
            "full cream vs toned vs skimmed price difference. "
            "Include internal links to /cheapest-milk-online, /grocery-prices-bangalore, /price/bangalore/milk."
        ),
    },
    {
        "slug": "grocery-price-comparison-india-june-2026",
        "title": "Grocery Price Comparison India June 2026 — Which App is Cheapest?",
        "prompt": (
            "Write a blog post that is a monthly grocery price roundup for June 2026 in India. "
            "Cover the biggest movers: cooking oil prices at 3-month low (Fortune 1L: ₹129 JioMart vs ₹142 Blinkit), "
            "atta stable (Aashirvaad 5kg: ₹189 JioMart vs ₹240 Blinkit), "
            "tomatoes at seasonal low (₹25–₹35/kg), dal stable (toor dal ₹142–₹162/kg across apps). "
            "Conclude with which products to stock up on this month and which to wait on. "
            "Include internal links to /compare/blinkit-vs-zepto, /blog/june-2026-grocery-price-watch, /cheapest-oil-online."
        ),
    },
]

def generate_blog_post() -> dict:
    topic = random.choice(BLOG_TOPICS)
    content = _claude(topic["prompt"], BLOG_SYSTEM, max_tokens=1400)
    return {
        "slug":    topic["slug"],
        "title":   topic["title"],
        "content": content,
        "date":    datetime.datetime.now().strftime("%B %d, %Y"),
    }


def publish_blog(post: dict) -> dict:
    """
    Save blog post draft locally (always) + attempt to POST to backend.
    Human reviews growth/drafts/*.md before publishing to blog.ts.
    """
    if DRY_RUN:
        print(f"[DRY-RUN] Would publish: {post['slug']}")
        print(post["content"][:300] + "...")
        return {"dry_run": True}

    # Always save locally first — never lose generated content
    drafts_dir = os.path.join(os.path.dirname(__file__), "..", "drafts")
    os.makedirs(drafts_dir, exist_ok=True)
    draft_path = os.path.join(drafts_dir, f"{post['slug']}.md")
    with open(draft_path, "w") as f:
        f.write(
            f"---\ntitle: {post['title']}\nslug: {post['slug']}\n"
            f"date: {post['date']}\nwords: {len(post['content'].split())}\n"
            f"status: draft\n---\n\n{post['content']}"
        )
    print(f"Draft saved: {draft_path}")

    # Try backend API — OK if it fails, draft is already on disk
    try:
        import requests
        backend = os.getenv("BACKEND_API_URL", "http://localhost:8001")
        resp = requests.post(
            f"{backend}/api/v1/content/blog",
            json={"slug": post["slug"], "title": post["title"],
                  "content": post["content"], "date": post["date"],
                  "source": "bedrock_content_runner", "status": "draft"},
            timeout=20,
        )
        return resp.json() if resp.ok else {"saved_locally": True, "api_error": resp.status_code}
    except Exception as e:
        return {"saved_locally": True, "api_error": str(e)}


# ── Main ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"Using model: {BEDROCK_MODEL} | region: {AWS_REGION}")
    print(f"Dry-run: {DRY_RUN}\n")

    # 1. Generate and post tweet
    print("─── TWEET ───────────────────────────────")
    tweet_text = generate_tweet()
    print(f"Generated:\n{tweet_text}\n")
    try:
        tweet_result = post_tweet(tweet_text)
        print(f"Result: {tweet_result}\n")
    except Exception as e:
        print(f"Tweet failed (fix Twitter app permissions): {e}\n")

    # 2. Generate blog post
    print("─── BLOG POST ───────────────────────────")
    post = generate_blog_post()
    print(f"Title: {post['title']}")
    print(f"Slug:  {post['slug']}")
    print(f"Length: {len(post['content'].split())} words")
    print(f"\nFirst 400 chars:\n{post['content'][:400]}...\n")
    blog_result = publish_blog(post)
    print(f"Publish result: {blog_result}")
