"""Public contact/query submission endpoint."""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.contact import ContactQuery

router = APIRouter()

VALID_SUBJECTS = {
    "General Question",
    "Bug Report",
    "Feature Request",
    "Partnership / Business",
    "Press / Media",
    "Account / Billing",
    "Other",
}


class ContactQueryRequest(BaseModel):
    name: str
    email: Optional[str] = None
    mobile: Optional[str] = None
    subject: str
    message: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name is required")
        return v[:120]

    @field_validator("message")
    @classmethod
    def message_not_empty(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 10:
            raise ValueError("Message must be at least 10 characters")
        return v[:5000]

    @field_validator("subject")
    @classmethod
    def subject_valid(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Subject is required")
        return v[:120]


@router.post("/contact", status_code=204)
async def submit_contact_query(
    body: ContactQueryRequest,
    db: AsyncSession = Depends(get_db),
):
    """Save a customer query. Returns 204 on success."""
    if not body.email and not body.mobile:
        raise HTTPException(status_code=422, detail="Please provide either an email or mobile number so we can reply.")

    query = ContactQuery(
        id=uuid.uuid4(),
        name=body.name,
        email=body.email.strip().lower() if body.email else None,
        mobile=body.mobile.strip() if body.mobile else None,
        subject=body.subject,
        message=body.message,
        status="new",
    )
    db.add(query)
    await db.commit()
