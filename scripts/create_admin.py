"""
scripts/create_admin.py
=======================
Creates (or updates) the admin user in the database.

Credentials are read from environment variables so nothing is hardcoded.
Override them by exporting before running or by setting in backend/.env.

Default values (change via env if needed):
  ADMIN_EMAIL    = admin@pricebasket.in
  ADMIN_PASSWORD = Admin@PB2024          ← change this after first login
  ADMIN_NAME     = Nikhil Admin

Usage:
  cd <repo-root>
  bash scripts/run_create_admin.sh
  
  — OR manually —
  cd <repo-root>
  export DATABASE_URL="postgresql+asyncpg://pricebasket:secret@127.0.0.1:5432/pricebasket_db"
  export SECRET_KEY="replace-with-your-secret-key"
  backend/.venv/bin/python scripts/create_admin.py
"""

import asyncio
import os
import sys
import uuid
from datetime import datetime, UTC

# ── Path: allow imports from backend/app ──────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models.user import User
from app.services.auth_service import hash_password
from app.config import settings

# ── Admin credentials (override via environment) ──────────────────────────────
ADMIN_EMAIL    = os.getenv("ADMIN_EMAIL",    "admin@pricebasket.in")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin@PB2024")
ADMIN_NAME     = os.getenv("ADMIN_NAME",     "Nikhil Admin")

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def create_or_update_admin() -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == ADMIN_EMAIL))
        user: User | None = result.scalar_one_or_none()

        if user:
            print(f"[~] Admin user already exists: {ADMIN_EMAIL}")
            print("    Updating password and ensuring is_admin=True …")
            user.hashed_password = hash_password(ADMIN_PASSWORD)
            user.is_admin = True
            user.is_active = True
            user.full_name = ADMIN_NAME
            action = "updated"
        else:
            print(f"[+] Creating admin user: {ADMIN_EMAIL}")
            user = User(
                id=uuid.uuid4(),
                email=ADMIN_EMAIL,
                hashed_password=hash_password(ADMIN_PASSWORD),
                full_name=ADMIN_NAME,
                is_admin=True,
                is_active=True,
                is_verified=True,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
            session.add(user)
            action = "created"

        await session.commit()
        print(f"\n✅ Admin user {action} successfully!")
        print(f"   Email    : {ADMIN_EMAIL}")
        print(f"   Password : {ADMIN_PASSWORD}")
        print(f"   Name     : {ADMIN_NAME}")
        print(f"   Admin    : True")
        print("\n⚠️  Change the password after first login at /profile")


if __name__ == "__main__":
    asyncio.run(create_or_update_admin())
