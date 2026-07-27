"""
Trending Topic Injector
========================
Checks Google Trends for grocery/quick-commerce-relevant spikes and, if one
is found, generates one extra blog post + social caption riffing on it.
Google Trends' unofficial API (pytrends) is rate-limited/unreachable in
practice, so this degrades to a small static seasonal-topic fallback list on
any failure — same graceful-degradation ethos as ai_engine.py's provider
fallbacks. Never blocks the pipeline.
"""
from __future__ import annotations

import random
from datetime import datetime, timezone

import structlog

from app.marketing.ai_engine import MASTER_SYSTEM, ai_engine
from app.models.marketing import MarketingContent

log = structlog.get_logger(__name__)

_SEED_KEYWORDS = ["grocery price", "blinkit", "zepto", "instamart", "bigbasket", "cheapest grocery app"]

# Static fallback so the agent always has something relevant to say even when
# pytrends is blocked/rate-limited or unavailable.
_FALLBACK_TOPICS = [
    "festival grocery shopping deals",
    "monthly grocery budget planning",
    "monsoon grocery stocking tips",
    "back to school grocery essentials",
]


def _fetch_trending_topic() -> str:
    try:
        from pytrends.request import TrendReq  # type: ignore

        pytrends = TrendReq(hl="en-IN", tz=330)
        pytrends.build_payload(_SEED_KEYWORDS, timeframe="now 4-H", geo="IN")
        related = pytrends.related_queries()
        for keyword in _SEED_KEYWORDS:
            rising = (related.get(keyword) or {}).get("rising")
            if rising is not None and not rising.empty:
                return str(rising.iloc[0]["query"])
    except Exception as exc:
        log.info("pytrends_unavailable", error=str(exc))
    return random.choice(_FALLBACK_TOPICS)


async def _generate_trend_post(topic: str) -> str:
    prompt = (
        f"Write a short, timely blog-style post (250-350 words) connecting the trending "
        f"topic \"{topic}\" to grocery price comparison and saving money across Blinkit, "
        f"Zepto, BigBasket, Instamart, JioMart, and Amazon Fresh. Include a natural mention "
        f"of pricebasket.in as the free comparison tool. End with one practical tip."
    )
    if not ai_engine.status()["ready"]:
        return (
            f"{topic.capitalize()} is trending right now — a good reminder to compare prices "
            f"across grocery apps before you stock up. pricebasket.in checks Blinkit, Zepto, "
            f"BigBasket, Instamart, JioMart, and Amazon Fresh in one place, free."
        )
    try:
        chunks = [c async for c in ai_engine.stream(prompt, system=MASTER_SYSTEM, agent_id="trending")]
        return "".join(chunks).strip()
    except Exception as exc:
        log.warning("trending_post_generation_failed", error=str(exc))
        return ""


async def check_trends_and_inject(db) -> bool:
    topic = _fetch_trending_topic()
    content = await _generate_trend_post(topic)
    if not content:
        return False

    db.add(
        MarketingContent(
            agent_id="trending",
            platform="blog",
            title=f"Trending: {topic}",
            content=content,
            status="draft",
            inputs={"topic": topic, "detected_at": datetime.now(timezone.utc).isoformat()},
        )
    )
    await db.flush()
    log.info("trending_content_generated", topic=topic)
    return True
