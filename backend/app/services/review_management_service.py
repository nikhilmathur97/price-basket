"""
Review Management AI
=====================
Monitors Google Business Profile reviews, Google Play Store reviews, and
on-site feedback (existing ContactQuery rows), classifies sentiment, and
drafts AI replies for admin approval.

Posting a reply is NEVER automatic from scan_reviews() — it only ingests +
drafts. app/api/v1/reviews.py's approve-and-post endpoint is the only path
that calls a platform's write API, and only after an admin approves.

Google Business Profile + Play Developer both offer first-party reply APIs
(unlike Reddit/Quora, which ban automated posting) — once the one-time
service-account setup in GOOGLE_REVIEWS_SERVICE_ACCOUNT_JSON is done, this
stays fully within each platform's ToS. Until then, every fetch function
below degrades to a no-op (returns 0 / empty) — never blocks the pipeline.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional

import httpx
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.marketing.ai_engine import ai_engine
from app.models.contact import ContactQuery
from app.models.review import Review
from app.services.notification_service import NotificationService

log = structlog.get_logger(__name__)

REPLY_SYSTEM_PROMPT = (
    "You are PriceBasket's Review Management AI. Given a customer review, "
    "write a short, warm, on-brand reply (max 60 words). Thank them, address "
    "their specific point, and if the review is negative, apologize and "
    "invite them to contact support@pricebasket.in for a resolution. Never "
    "sound defensive or generic."
)

_MYBUSINESS_SCOPES = ["https://www.googleapis.com/auth/business.manage"]
_PLAY_SCOPES = ["https://www.googleapis.com/auth/androidpublisher"]

try:
    from google.auth.transport.requests import Request as _GoogleAuthRequest  # type: ignore
    from google.oauth2 import service_account as _google_service_account  # type: ignore

    _GOOGLE_AUTH_AVAILABLE = True
except ImportError:
    _GOOGLE_AUTH_AVAILABLE = False


def _google_credentials(scopes: List[str]):
    """Best-effort service-account credential loader — returns None if the
    google-auth package isn't installed or the credential setting is empty."""
    raw = settings.GOOGLE_REVIEWS_SERVICE_ACCOUNT_JSON
    if not _GOOGLE_AUTH_AVAILABLE or not raw:
        return None
    try:
        info = json.loads(raw) if raw.strip().startswith("{") else json.loads(open(raw).read())
        creds = _google_service_account.Credentials.from_service_account_info(info, scopes=scopes)
        creds.refresh(_GoogleAuthRequest())
        return creds
    except Exception as exc:
        log.warning("google_credentials_unavailable", error=str(exc))
        return None


async def fetch_onsite_feedback(db: AsyncSession) -> int:
    """Pull ContactQuery rows not yet mirrored into Review."""
    existing = set(
        (await db.execute(select(Review.external_id).where(Review.source == "onsite"))).scalars().all()
    )
    rows = (await db.execute(select(ContactQuery).where(ContactQuery.status == "new"))).scalars().all()

    created = 0
    for cq in rows:
        ext_id = str(cq.id)
        if ext_id in existing:
            continue
        db.add(
            Review(
                source="onsite",
                external_id=ext_id,
                author_name=cq.name,
                rating=None,
                review_text=f"{cq.subject}: {cq.message}",
                review_date=cq.created_at,
                status="new",
            )
        )
        created += 1
    return created


async def fetch_google_reviews(db: AsyncSession) -> int:
    """Fetch new reviews via the Google Business Profile API. No-ops if
    GOOGLE_BUSINESS_ACCOUNT_ID / credentials aren't configured yet."""
    creds = _google_credentials(_MYBUSINESS_SCOPES)
    if not creds or not settings.GOOGLE_BUSINESS_ACCOUNT_ID:
        return 0

    url = f"https://mybusiness.googleapis.com/v4/accounts/{settings.GOOGLE_BUSINESS_ACCOUNT_ID}/locations/-/reviews"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url, headers={"Authorization": f"Bearer {creds.token}"})
            if resp.status_code != 200:
                log.warning("google_reviews_fetch_failed", status=resp.status_code, body=resp.text[:200])
                return 0
            data = resp.json()
    except Exception as exc:
        log.warning("google_reviews_fetch_error", error=str(exc))
        return 0

    existing = set(
        (await db.execute(select(Review.external_id).where(Review.source == "google"))).scalars().all()
    )
    rating_map = {"ONE": 1, "TWO": 2, "THREE": 3, "FOUR": 4, "FIVE": 5}
    created = 0
    for r in data.get("reviews", []):
        ext_id = r.get("reviewId", "")
        if not ext_id or ext_id in existing:
            continue
        create_time = r.get("createTime")
        db.add(
            Review(
                source="google",
                external_id=ext_id,
                author_name=(r.get("reviewer") or {}).get("displayName"),
                rating=rating_map.get(r.get("starRating", "")),
                review_text=r.get("comment", ""),
                review_date=datetime.fromisoformat(create_time.replace("Z", "+00:00"))
                if create_time else datetime.now(timezone.utc),
                status="new",
            )
        )
        created += 1
    return created


async def fetch_playstore_reviews(db: AsyncSession) -> int:
    """Fetch new reviews via the Google Play Developer API. No-ops if
    GOOGLE_PLAY_PACKAGE_NAME / credentials aren't configured yet."""
    creds = _google_credentials(_PLAY_SCOPES)
    if not creds or not settings.GOOGLE_PLAY_PACKAGE_NAME:
        return 0

    url = (
        f"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/"
        f"{settings.GOOGLE_PLAY_PACKAGE_NAME}/reviews"
    )
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url, headers={"Authorization": f"Bearer {creds.token}"})
            if resp.status_code != 200:
                log.warning("playstore_reviews_fetch_failed", status=resp.status_code, body=resp.text[:200])
                return 0
            data = resp.json()
    except Exception as exc:
        log.warning("playstore_reviews_fetch_error", error=str(exc))
        return 0

    existing = set(
        (await db.execute(select(Review.external_id).where(Review.source == "playstore"))).scalars().all()
    )
    created = 0
    for r in data.get("reviews", []):
        ext_id = str(r.get("reviewId", ""))
        if not ext_id or ext_id in existing:
            continue
        comments = r.get("comments", [])
        user_comment = next((c["userComment"] for c in comments if "userComment" in c), {})
        db.add(
            Review(
                source="playstore",
                external_id=ext_id,
                author_name=r.get("authorName"),
                rating=user_comment.get("starRating"),
                review_text=user_comment.get("text", ""),
                review_date=datetime.now(timezone.utc),  # Play API doesn't expose a review timestamp
                status="new",
            )
        )
        created += 1
    return created


def classify_sentiment(rating: Optional[int], text: str) -> str:
    if rating is not None:
        if rating <= 2:
            return "negative"
        if rating == 3:
            return "neutral"
        return "positive"
    negative_words = ("bad", "worst", "scam", "fraud", "never", "disappointed", "refund", "broken")
    lowered = text.lower()
    return "negative" if any(w in lowered for w in negative_words) else "neutral"


_FALLBACK_REPLY = (
    "Thank you for your feedback! We're looking into this and will follow up "
    "shortly. For urgent issues, reach us at support@pricebasket.in."
)


async def draft_reply(review: Review) -> str:
    if not ai_engine.status()["ready"]:
        return _FALLBACK_REPLY
    prompt = f"Review (rating={review.rating}, sentiment={review.sentiment}): {review.review_text}"
    try:
        chunks = [
            c async for c in ai_engine.stream(prompt, system=REPLY_SYSTEM_PROMPT, agent_id="review_reply")
        ]
        return "".join(chunks).strip() or _FALLBACK_REPLY
    except Exception as exc:
        log.warning("review_reply_draft_failed", error=str(exc))
        return _FALLBACK_REPLY


async def escalate_if_needed(review: Review) -> bool:
    """Flag rating<=2 or negative-sentiment reviews and alert the admin inbox."""
    if review.status in ("posted", "escalated"):
        return False
    if review.sentiment == "negative" or (review.rating is not None and review.rating <= 2):
        review.status = "escalated"
        notifier = NotificationService()
        await notifier.send_admin_alert(
            subject=f"Negative review needs attention ({review.source})",
            body_html=(
                f"<p><strong>{review.author_name or 'A customer'}</strong> left a "
                f"{review.rating or 'text'} review on {review.source}:</p>"
                f"<blockquote>{review.review_text}</blockquote>"
                f"<p>Draft reply: {review.ai_reply_draft or '(not generated)'}</p>"
            ),
        )
        return True
    return False


async def scan_reviews(db: AsyncSession) -> dict:
    """Ingest new reviews from all sources, classify + draft replies, escalate as needed."""
    onsite_count = await fetch_onsite_feedback(db)
    google_count = await fetch_google_reviews(db)
    playstore_count = await fetch_playstore_reviews(db)
    await db.flush()

    new_reviews = (await db.execute(select(Review).where(Review.status == "new"))).scalars().all()

    escalated = 0
    for review in new_reviews:
        review.sentiment = classify_sentiment(review.rating, review.review_text)
        review.ai_reply_draft = await draft_reply(review)
        review.status = "draft_ready"
        if await escalate_if_needed(review):
            escalated += 1

    return {
        "onsite_ingested": onsite_count,
        "google_ingested": google_count,
        "playstore_ingested": playstore_count,
        "drafted": len(new_reviews),
        "escalated": escalated,
    }


async def post_reply(db: AsyncSession, review: Review, reply_text: str) -> None:
    """Post the approved reply via the source platform's write API. On-site
    reviews just mark the underlying ContactQuery as replied (no external API)."""
    if review.source == "google":
        creds = _google_credentials(_MYBUSINESS_SCOPES)
        if creds:
            url = (
                f"https://mybusiness.googleapis.com/v4/accounts/{settings.GOOGLE_BUSINESS_ACCOUNT_ID}"
                f"/locations/-/reviews/{review.external_id}/reply"
            )
            async with httpx.AsyncClient(timeout=30) as client:
                await client.put(url, headers={"Authorization": f"Bearer {creds.token}"}, json={"comment": reply_text})
    elif review.source == "playstore":
        creds = _google_credentials(_PLAY_SCOPES)
        if creds:
            url = (
                f"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/"
                f"{settings.GOOGLE_PLAY_PACKAGE_NAME}/reviews/{review.external_id}:reply"
            )
            async with httpx.AsyncClient(timeout=30) as client:
                await client.post(url, headers={"Authorization": f"Bearer {creds.token}"}, json={"replyText": reply_text})
    elif review.source == "onsite":
        cq = await db.get(ContactQuery, uuid.UUID(review.external_id))
        if cq:
            cq.status = "replied"

    review.posted_reply = reply_text
    review.status = "posted"
    review.replied_at = datetime.now(timezone.utc)
