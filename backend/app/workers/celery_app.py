"""Celery application — shared across all workers."""
from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery_app = Celery(
    "pricebasket",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.workers.price_update_worker",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "app.workers.price_update_worker.refresh_all_prices": {"queue": "prices"},
        "app.workers.price_update_worker.refresh_product_price": {"queue": "prices"},
        "app.workers.price_update_worker.send_price_alerts": {"queue": "notifications"},
    },
    beat_schedule={
        # Refresh prices every 5 minutes
        "refresh-all-prices": {
            "task": "app.workers.price_update_worker.refresh_all_prices",
            "schedule": settings.PRICE_REFRESH_INTERVAL,
        },
        # Check price alerts every 10 minutes
        "check-price-alerts": {
            "task": "app.workers.price_update_worker.send_price_alerts",
            "schedule": 600,
        },
    },
)
