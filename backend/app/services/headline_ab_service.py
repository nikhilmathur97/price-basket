"""
Headline A/B Variant Generator
===============================
Generates 3 AI title variants for a newly published blog post. There is no
automated winner selection — blog pageviews aren't tracked in UserEvent
today, so there's no real click-through signal to decide from. An admin
picks the winner manually; picking one overwrites the live post's title via
content_engine's existing cache.
"""
from __future__ import annotations

import json

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.redis_client import cache_set
from app.marketing.ai_engine import ai_engine
from app.models.content_headline_test import HeadlineVariant
from app.services.content_engine import POST_KEY, POST_TTL, get_generated_post

log = structlog.get_logger(__name__)

VARIANT_SYSTEM_PROMPT = (
    "You are PriceBasket's headline optimizer. Given a blog post title and excerpt, "
    "write 2 alternative titles (different angle/hook, same facts, no clickbait). "
    "Reply with exactly 2 lines, one title per line, nothing else."
)


async def _generate_alt_titles(title: str, excerpt: str) -> list[str]:
    if not ai_engine.status()["ready"]:
        return [title, title]
    prompt = f"Original title: {title}\nExcerpt: {excerpt}"
    try:
        chunks = [
            c async for c in ai_engine.stream(prompt, system=VARIANT_SYSTEM_PROMPT, agent_id="headline_ab")
        ]
        lines = [ln.strip("- ").strip() for ln in "".join(chunks).splitlines() if ln.strip()]
        return (lines + [title, title])[:2]
    except Exception as exc:
        log.warning("headline_variant_generation_failed", error=str(exc))
        return [title, title]


async def generate_variants_for_slug(db: AsyncSession, slug: str) -> HeadlineVariant:
    existing = (
        await db.execute(select(HeadlineVariant).where(HeadlineVariant.post_slug == slug))
    ).scalar_one_or_none()
    if existing:
        raise ValueError(f"Headline variants already generated for slug={slug}")

    post = await get_generated_post(slug)
    if not post:
        raise ValueError(f"No generated post found for slug={slug}")

    alt_titles = await _generate_alt_titles(post["title"], post.get("excerpt", ""))
    variants = [post["title"]] + alt_titles

    variant = HeadlineVariant(post_slug=slug, variants=variants)
    db.add(variant)
    await db.flush()
    return variant


async def apply_chosen_variant(db: AsyncSession, test_id, chosen_variant: str) -> HeadlineVariant:
    from datetime import datetime, timezone

    test = await db.get(HeadlineVariant, test_id)
    if not test:
        raise ValueError("Headline test not found")
    if chosen_variant not in test.variants:
        raise ValueError("chosen_variant must be one of the generated variants")

    post = await get_generated_post(test.post_slug)
    if post:
        post["title"] = chosen_variant
        await cache_set(POST_KEY.format(slug=test.post_slug), json.dumps(post), POST_TTL)

    test.chosen_variant = chosen_variant
    test.decided_at = datetime.now(timezone.utc)
    await db.flush()
    return test


async def list_pending_tests(db: AsyncSession) -> list[HeadlineVariant]:
    q = select(HeadlineVariant).where(HeadlineVariant.chosen_variant.is_(None)).order_by(
        HeadlineVariant.created_at.desc()
    )
    return (await db.execute(q)).scalars().all()
