"""
Content engine
==============
Auto-generates a daily SEO blog post from the biggest live price drops and
stores it in Redis (no DB migration needed). The frontend reads these via
GET /content/blog and renders them through the same BlogPost shape as the
curated static posts.

Each post matches the frontend `BlogPost` interface in src/lib/blog.ts:
  { slug, category, date, isoDate, title, excerpt, readTime, emoji,
    content: [{ heading?, paragraphs?, bullets? }], generated }
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import List, Optional

import structlog

from app.cache.redis_client import cache_get, cache_set
from app.services.deals import Deal, get_top_deals

log = structlog.get_logger(__name__)

INDEX_KEY = "content:blog:index"
POST_KEY = "content:blog:post:{slug}"
POST_TTL = 60 * 60 * 24 * 120  # keep generated posts ~120 days
INDEX_CAP = 90  # max generated posts retained


def _money(v: float) -> str:
    return f"₹{int(v) if float(v).is_integer() else round(v, 2)}"


def _build_post(deals: List[Deal], today: datetime) -> dict:
    iso = today.strftime("%Y-%m-%d")
    human = today.strftime("%B %d, %Y")
    top = deals[0]

    title = (
        f"Biggest Grocery Price Drops Today ({human}) — Save up to "
        f"{top.savings_percent}%"
    )
    excerpt = (
        f"We tracked live prices across Blinkit, Zepto, BigBasket, Instamart & "
        f"more. Today's top saving: {top.name} is {top.savings_percent}% cheaper "
        f"on {top.cheapest_platform or 'the best platform'}. Here are the rest."
    )

    intro = (
        f"Quick-commerce prices move every day. Here are the products with the "
        f"biggest gaps between the cheapest and most expensive platform right "
        f"now — buy these on the right app and the savings are immediate. "
        f"Prices below are live as of {human}; compare before you check out, "
        f"because they change fast."
    )

    bullets = [
        (
            f"{d.name}{f' ({d.unit})' if d.unit else ''} — {_money(d.best_price)} "
            f"on {d.cheapest_platform or 'the cheapest platform'} "
            f"(save {_money(d.savings_amount)}, {d.savings_percent}% off vs the "
            f"priciest platform)"
        )
        for d in deals[:12]
    ]

    content = [
        {"paragraphs": [intro]},
        {
            "heading": f"Today's biggest savings ({len(bullets)} products)",
            "bullets": bullets,
        },
        {
            "heading": "How to lock in these prices",
            "paragraphs": [
                "Set a price alert on the staples you rebuy and let PriceBasket "
                "email you the moment any platform drops below your target. For "
                "everything else, compare your full cart before checkout — the "
                "cheapest platform changes by item and by day.",
            ],
        },
    ]

    return {
        "slug": f"grocery-price-drops-{iso}",
        "category": "Deals",
        "date": human,
        "isoDate": iso,
        "title": title,
        "excerpt": excerpt,
        "readTime": "3 min read",
        "emoji": "📉",
        "content": content,
        "generated": True,
    }


async def _read_index() -> List[str]:
    raw = await cache_get(INDEX_KEY)
    if not raw:
        return []
    try:
        data = json.loads(raw)
        return data if isinstance(data, list) else []
    except json.JSONDecodeError:
        return []


async def generate_daily_deals_post() -> Optional[dict]:
    """Build today's deal post from live prices and persist it. Idempotent per
    day (same slug overwrites). Returns the post dict, or None if there aren't
    enough deals to write a useful article."""
    deals = await get_top_deals(limit=15)
    if len(deals) < 3:
        log.info("content_skip_insufficient_deals", count=len(deals))
        return None

    post = _build_post(deals, datetime.now())
    slug = post["slug"]

    await cache_set(POST_KEY.format(slug=slug), json.dumps(post), POST_TTL)

    index = await _read_index()
    if slug in index:
        index.remove(slug)
    index.insert(0, slug)
    index = index[:INDEX_CAP]
    await cache_set(INDEX_KEY, json.dumps(index), POST_TTL)

    log.info("content_generated", slug=slug, deals=len(deals))
    return post


async def list_generated_posts() -> List[dict]:
    index = await _read_index()
    posts: List[dict] = []
    for slug in index:
        raw = await cache_get(POST_KEY.format(slug=slug))
        if raw:
            try:
                posts.append(json.loads(raw))
            except json.JSONDecodeError:
                continue
    return posts


async def get_generated_post(slug: str) -> Optional[dict]:
    raw = await cache_get(POST_KEY.format(slug=slug))
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None
