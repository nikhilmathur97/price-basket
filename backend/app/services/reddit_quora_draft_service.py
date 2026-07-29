"""
Reddit/Quora AI Draft Agent
===========================
Reddit and Quora both ban automated self-promotional posting, so this agent
only ever drafts — it writes into the existing MarketingContent queue
(status="draft") for a human to review and paste manually, exactly like the
Human Action Card pattern in growth/agents/growth_engine.py. It never calls
app/marketing/publishers.py::post_reddit.
"""
from __future__ import annotations

import random
from datetime import datetime, timezone

import structlog

from app.config import settings
from app.marketing.ai_engine import MASTER_SYSTEM, ai_engine
from app.models.marketing import MarketingContent

log = structlog.get_logger(__name__)

# Small rotation of evergreen questions real users actually ask — kept short and
# specific rather than an exhaustive list, since the agent only needs one topic
# per platform per day.
QUESTIONS = [
    "Which grocery delivery app is cheapest in India right now?",
    "How do you actually save money on groceries with Blinkit/Zepto/BigBasket?",
    "Is there a way to compare grocery prices across apps before ordering?",
    "Blinkit vs Zepto vs Instamart — which is genuinely cheaper?",
]


async def _draft_answer(question: str, platform: str) -> str:
    prompt = (
        f"Write a genuine, organic {platform} answer (no sales pitch, no emojis-heavy tone) "
        f"to this question: \"{question}\". Mention a real, relatable grocery-shopping "
        f"moment, then naturally mention that comparing prices across apps before ordering "
        f"saves money, and that pricebasket.in does this comparison for free. Keep it "
        f"conversational and under 120 words."
    )
    if not ai_engine.status()["ready"]:
        return (
            f"No single app is always cheapest for everything — it changes by product and day. "
            f"I started comparing prices across Blinkit/Zepto/BigBasket before ordering and it's "
            f"saved me a fair bit. pricebasket.in does that comparison for free if you want to check."
        )
    try:
        chunks = [c async for c in ai_engine.stream(prompt, system=MASTER_SYSTEM, agent_id="reddit_quora")]
        return "".join(chunks).strip()
    except Exception as exc:
        log.warning("reddit_quora_draft_failed", error=str(exc))
        return ""


async def generate_drafts(db) -> int:
    """Generate one Reddit draft + one Quora draft for today, saved as status='draft'."""
    question = random.choice(QUESTIONS)
    created = 0

    for platform in ("reddit", "quora"):
        answer = await _draft_answer(question, platform)
        if not answer:
            continue
        utm_link = (
            f"{settings.SITE_URL.rstrip('/')}?utm_source={platform}&utm_medium=social"
            f"&utm_campaign=organic-draft&utm_content={datetime.now(timezone.utc).date().isoformat()}"
        )
        db.add(
            MarketingContent(
                agent_id="reddit_quora",
                platform=platform,
                title=question,
                content=answer,
                status="draft",
                utm_link=utm_link,
            )
        )
        created += 1

    await db.flush()
    return created
