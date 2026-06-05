"""App metadata endpoints for the mobile app.

Public — no auth required — so the Flutter app can check before login.
Mounted at /api/v1/app.
"""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class AppVersionOut(BaseModel):
    min_version: str
    latest_version: str
    force_update: bool
    update_message: str
    store_url_android: str
    store_url_ios: str


@router.get("/version", response_model=AppVersionOut)
async def get_app_version() -> AppVersionOut:
    """Version gate for the mobile app.

    The app compares its own version against ``min_version`` (hard/force
    update) and ``latest_version`` (soft update prompt). Bump these when you
    ship a new build that older clients must upgrade past.
    """
    return AppVersionOut(
        min_version="1.0.0",
        latest_version="1.0.0",
        force_update=False,
        update_message=(
            "A new version of PriceBasket is available with improvements "
            "and bug fixes."
        ),
        store_url_android=(
            "https://play.google.com/store/apps/details?id=in.pricebasket.app"
        ),
        store_url_ios="https://apps.apple.com/app/pricebasket/id000000000",
    )
