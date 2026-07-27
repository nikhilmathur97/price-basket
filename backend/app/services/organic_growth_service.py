"""
Organic Growth Agent — daily social tip generator.

Generates a short savings-tip/comparison-fact caption, independent of the
"biggest deal" framing already used by the existing 10:00/18:00 posts
(app/workers/marketing_worker.py::post_daily_deal_social). Purely additive —
does not touch or replace those.
"""
from __future__ import annotations

import random

import structlog

from app.marketing.ai_engine import MASTER_SYSTEM, ai_engine

log = structlog.get_logger(__name__)

_TIP_TOPICS = [
    "how prices differ for the same grocery item across apps",
    "why comparing before ordering saves more than any single app's discount",
    "a simple habit to cut your monthly grocery bill",
    "how delivery fees quietly add up across apps",
]

_FALLBACK_TIPS = [
    "💡 Tip: the same grocery item can cost 20-30% more on one app vs another, "
    "same day. Always compare before you order — pricebasket.in does it free, "
    "across Blinkit, Zepto, BigBasket, Instamart, JioMart & Amazon Fresh.",
    "💡 Tip: delivery fees + surge pricing quietly add up. Comparing your full "
    "cart across apps (not just one item) is where the real savings are. "
    "Try it free at pricebasket.in.",
]


async def generate_daily_tip() -> str:
    topic = random.choice(_TIP_TOPICS)
    if not ai_engine.status()["ready"]:
        return random.choice(_FALLBACK_TIPS)

    prompt = (
        f"Write one short, punchy social caption (under 220 characters) about "
        f"{topic}. Mention pricebasket.in naturally as the free way to compare. "
        f"Include 2-3 relevant hashtags. No sales-y tone."
    )
    try:
        chunks = [c async for c in ai_engine.stream(prompt, system=MASTER_SYSTEM, agent_id="daily_tip")]
        text = "".join(chunks).strip()
        return text or random.choice(_FALLBACK_TIPS)
    except Exception as exc:
        log.warning("daily_tip_generation_failed", error=str(exc))
        return random.choice(_FALLBACK_TIPS)
