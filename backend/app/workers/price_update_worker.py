"""
Celery tasks for price refresh and alert notifications.
"""
import asyncio
import uuid
from typing import List

import structlog

from app.workers.celery_app import celery_app

log = structlog.get_logger(__name__)


def _run_async(coro):
    """Helper to run async code inside a Celery (sync) task."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="app.workers.price_update_worker.refresh_all_prices", bind=True, max_retries=3)
def refresh_all_prices(self):
    """Fan-out: queue one refresh_product_price task per active product."""
    try:
        _run_async(_refresh_all())
    except Exception as exc:
        log.error("refresh_all_prices_failed", error=str(exc))
        raise self.retry(exc=exc, countdown=60)


@celery_app.task(name="app.workers.price_update_worker.refresh_product_price", bind=True, max_retries=3)
def refresh_product_price(self, product_id: str):
    try:
        _run_async(_refresh_product(uuid.UUID(product_id)))
    except Exception as exc:
        log.warning("refresh_product_price_failed", product_id=product_id, error=str(exc))
        raise self.retry(exc=exc, countdown=30)


@celery_app.task(name="app.workers.price_update_worker.send_price_alerts")
def send_price_alerts():
    _run_async(_check_and_send_alerts())


# ── Async implementations ─────────────────────────────────────────────────────

async def _refresh_all():
    from sqlalchemy import select
    from app.database import AsyncSessionLocal
    from app.models.product import Product

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Product.id).where(Product.is_active == True))  # noqa
        product_ids: List[uuid.UUID] = [row[0] for row in result]

    log.info("queuing_price_refreshes", count=len(product_ids))
    for pid in product_ids:
        refresh_product_price.apply_async(args=[str(pid)], queue="prices")


async def _refresh_product(product_id: uuid.UUID):
    from app.database import AsyncSessionLocal
    from app.services.price_engine import PriceEngine
    from app.api.v1.websocket import push_price_update

    async with AsyncSessionLocal() as db:
        engine = PriceEngine(db)
        bundle = await engine.force_refresh(product_id)
        if bundle:
            prices_payload = [
                {
                    "platform_id": p.platform_id,
                    "platform_slug": p.platform_slug,
                    "price": p.price,
                    "is_available": p.is_available,
                    "delivery_time_minutes": p.delivery_time_minutes,
                }
                for p in bundle.prices
            ]
            await push_price_update(str(product_id), prices_payload)
    log.info("price_refreshed", product_id=str(product_id))


async def _check_and_send_alerts():
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from datetime import UTC, datetime
    from app.database import AsyncSessionLocal
    from app.models.price import PriceAlert, PlatformPrice
    from app.services.notification_service import NotificationService

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(PriceAlert)
            .where(PriceAlert.is_active == True, PriceAlert.triggered_at == None)  # noqa
            .options(selectinload(PriceAlert.user), selectinload(PriceAlert.product))
        )
        alerts: List[PriceAlert] = result.scalars().all()

        notifier = NotificationService()
        for alert in alerts:
            price_result = await db.execute(
                select(PlatformPrice)
                .where(
                    PlatformPrice.product_id == alert.product_id,
                    PlatformPrice.is_available == True,  # noqa
                )
                .order_by(PlatformPrice.price)
                .limit(1)
            )
            cheapest = price_result.scalar_one_or_none()
            if cheapest and float(cheapest.price) <= float(alert.target_price):
                await notifier.send_price_drop_alert(alert, float(cheapest.price))
                alert.triggered_at = datetime.now(UTC)
        await db.commit()
