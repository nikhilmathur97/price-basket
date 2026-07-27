"""
Internal Linking Agent
======================
Scans the daily generated blog posts (stored in Redis by content_engine.py)
for keyword matches against the site's real, live static SEO pages, and
injects a markdown-style link the first time a keyword appears. Only links
to pages that actually exist and render today — not the orphaned JSON that
growth/agents/page_generator_agent.py produces.
"""
from __future__ import annotations

import re

import structlog

from app.cache.redis_client import cache_set
from app.services.content_engine import POST_KEY, POST_TTL, list_generated_posts

log = structlog.get_logger(__name__)

_CITIES = ["mumbai", "delhi", "bangalore", "hyderabad", "chennai", "pune", "ahmedabad", "kolkata"]
_PRODUCTS = ["atta", "dal", "eggs", "ghee", "milk", "oil", "rice", "sugar"]
_TOP_MATCHUPS = [
    ("blinkit", "zepto"), ("zepto", "instamart"), ("blinkit", "instamart"),
    ("blinkit", "bigbasket"), ("zepto", "bigbasket"),
]

# keyword -> relative URL. Longer/more specific keywords first so they match
# before a shorter substring would.
KNOWN_URLS: dict[str, str] = {}
for _city in _CITIES:
    KNOWN_URLS[f"grocery prices in {_city}"] = f"/grocery-prices-{_city}"
    KNOWN_URLS[_city.capitalize()] = f"/grocery-prices-{_city}"
for _product in _PRODUCTS:
    KNOWN_URLS[f"cheapest {_product}"] = f"/cheapest-{_product}-online"
for _a, _b in _TOP_MATCHUPS:
    KNOWN_URLS[f"{_a.capitalize()} vs {_b.capitalize()}"] = f"/compare/{_a}-vs-{_b}"


def _link_paragraph(text: str, linked_already: set) -> str:
    for keyword, url in KNOWN_URLS.items():
        if keyword in linked_already:
            continue
        pattern = re.compile(re.escape(keyword), re.IGNORECASE)
        match = pattern.search(text)
        if match and f"]({url})" not in text:
            text = pattern.sub(f"[{match.group(0)}]({url})", text, count=1)
            linked_already.add(keyword)
    return text


def inject_links(post: dict) -> tuple[dict, int]:
    """Returns (possibly-modified post, number of links added). Idempotent —
    re-running on an already-linked post adds nothing new for the same keyword."""
    linked_already: set = set()
    added_before = 0
    added_after = 0

    for block in post.get("content", []):
        for para_key in ("paragraphs", "bullets"):
            items = block.get(para_key)
            if not items:
                continue
            added_before += sum(item.count("](") for item in items)
            block[para_key] = [_link_paragraph(item, linked_already) for item in items]
            added_after += sum(item.count("](") for item in items)

    return post, added_after - added_before


async def scan_and_link_new_posts(limit: int = 10) -> int:
    """Scan the most recent generated posts and add internal links where missing."""
    posts = await list_generated_posts()
    total_added = 0

    for post in posts[:limit]:
        updated_post, added = inject_links(post)
        if added > 0:
            slug = updated_post["slug"]
            await cache_set(POST_KEY.format(slug=slug), _to_json(updated_post), POST_TTL)
            total_added += added
            log.info("internal_links_added", slug=slug, added=added)

    return total_added


def _to_json(post: dict) -> str:
    import json

    return json.dumps(post)
