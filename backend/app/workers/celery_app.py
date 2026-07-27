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
        "app.workers.marketing_worker",
        "app.workers.executive_worker",
        "app.workers.competitor_intel_worker",
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
        # Marketing tasks intentionally use the default queue (no custom route)
        # so the single beat worker — started without -Q — actually consumes them.
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
        # Generate the daily SEO deal article at 06:30 IST + ping IndexNow.
        "generate-daily-content": {
            "task": "app.workers.marketing_worker.generate_daily_content",
            "schedule": crontab(hour=6, minute=30),
        },
        # Post the day's biggest deal to social at 10:00 and 18:00 IST.
        "post-deal-social-morning": {
            "task": "app.workers.marketing_worker.post_daily_deal_social",
            "schedule": crontab(hour=10, minute=0),
        },
        "post-deal-social-evening": {
            "task": "app.workers.marketing_worker.post_daily_deal_social",
            "schedule": crontab(hour=18, minute=0),
        },
        # Executive/CEO Reports AI — after the daily content job so it can see
        # today's published-content count.
        "generate-executive-report-daily": {
            "task": "app.workers.executive_worker.generate_executive_report",
            "schedule": crontab(hour=7, minute=0),
            "kwargs": {"period": "daily"},
        },
        "generate-executive-report-weekly": {
            "task": "app.workers.executive_worker.generate_executive_report",
            "schedule": crontab(hour=7, minute=30, day_of_week=1),
            "kwargs": {"period": "weekly"},
        },
        "generate-executive-report-monthly": {
            "task": "app.workers.executive_worker.generate_executive_report",
            "schedule": crontab(hour=8, minute=0, day_of_month=1),
            "kwargs": {"period": "monthly"},
        },
        # Competitor Intelligence AI — daily, analyzes the rolling PriceHistory window.
        "analyze-competitor-trends": {
            "task": "app.workers.competitor_intel_worker.analyze_competitor_trends",
            "schedule": crontab(hour=5, minute=30),
        },
    },
)
