"""
Headline A/B testing — FastAPI router.

Endpoints:
  GET  /headline-tests/pending           → variants awaiting an admin decision
  POST /headline-tests/{test_id}/choose  → apply the chosen variant to the live post
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import require_admin
from app.models.content_headline_test import HeadlineVariant
from app.services.headline_ab_service import apply_chosen_variant, list_pending_tests

router = APIRouter()


class ChooseVariant(BaseModel):
    chosen_variant: str


def _test_to_dict(t: HeadlineVariant) -> dict:
    return {
        "id": str(t.id),
        "post_slug": t.post_slug,
        "variants": t.variants,
        "chosen_variant": t.chosen_variant,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


@router.get("/pending")
async def pending(
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_admin),
):
    tests = await list_pending_tests(db)
    return {"items": [_test_to_dict(t) for t in tests]}


@router.post("/{test_id}/choose")
async def choose(
    test_id: str,
    payload: ChooseVariant,
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_admin),
):
    try:
        test_uuid = uuid.UUID(test_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid test ID")
    try:
        test = await apply_chosen_variant(db, test_uuid, payload.chosen_variant)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    await db.commit()
    return _test_to_dict(test)
