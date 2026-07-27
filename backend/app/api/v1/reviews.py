"""
Review Management AI — FastAPI router.

Endpoints:
  GET   /reviews                     → list reviews (filter by status/source)
  PATCH /reviews/{review_id}         → edit the AI draft before approving
  POST  /reviews/{review_id}/approve-and-post → post the (possibly edited) reply live
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import require_admin
from app.models.review import Review
from app.services.review_management_service import post_reply

router = APIRouter()


def _parse_uuid(review_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(review_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid review ID")


class ReviewUpdate(BaseModel):
    ai_reply_draft: str


class ApproveAndPost(BaseModel):
    reply_text: Optional[str] = None  # defaults to the current ai_reply_draft


def _review_to_dict(r: Review) -> dict:
    return {
        "id": str(r.id),
        "source": r.source,
        "external_id": r.external_id,
        "author_name": r.author_name,
        "rating": r.rating,
        "review_text": r.review_text,
        "review_date": r.review_date.isoformat() if r.review_date else None,
        "sentiment": r.sentiment,
        "status": r.status,
        "ai_reply_draft": r.ai_reply_draft,
        "posted_reply": r.posted_reply,
        "replied_at": r.replied_at.isoformat() if r.replied_at else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@router.get("")
async def list_reviews(
    status_filter: Optional[str] = Query(None, alias="status"),
    source: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_admin),
):
    q = select(Review)
    if status_filter:
        q = q.where(Review.status == status_filter)
    if source:
        q = q.where(Review.source == source)
    q = q.order_by(Review.review_date.desc()).limit(limit)
    result = await db.execute(q)
    items = result.scalars().all()
    return {"items": [_review_to_dict(r) for r in items]}


@router.patch("/{review_id}")
async def update_draft(
    review_id: str,
    payload: ReviewUpdate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_admin),
):
    review = await db.get(Review, _parse_uuid(review_id))
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    review.ai_reply_draft = payload.ai_reply_draft
    review.status = "approved"
    await db.flush()
    return _review_to_dict(review)


@router.post("/{review_id}/approve-and-post")
async def approve_and_post(
    review_id: str,
    payload: ApproveAndPost,
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_admin),
):
    review = await db.get(Review, _parse_uuid(review_id))
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    reply_text = payload.reply_text or review.ai_reply_draft
    if not reply_text:
        raise HTTPException(status_code=400, detail="No reply text to post")
    await post_reply(db, review, reply_text)
    await db.commit()
    return _review_to_dict(review)
