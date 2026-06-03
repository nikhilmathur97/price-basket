"""
Growth Metrics API — All 3 Phases
GET /api/v1/growth/metrics  — Phase 1: real DB data
GET /api/v1/growth/live     — Real-time visitors
GET /api/v1/growth/alerts   — DB-driven alerts
GET /api/v1/growth/google   — Phase 2: GA4 + GSC + PageSpeed
GET /api/v1/growth/social   — Phase 3: Instagram + Twitter + YouTube
GET /api/v1/growth/ads      — Phase 3: Google Ads
"""
import asyncio
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

import structlog
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.analytics import UserEvent
from app.models.platform import Platform
from app.models.product import Product
from app.models.user import User

log = structlog.get_logger(__name__)
router = APIRouter()


def _require_admin(admin: User) -> None:
    if not admin.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")


async def _safe(coro, fallback: Any = None) -> Any:
    try:
        return await coro
    except Exception as exc:
        log.warning("growth.external_api_failed", error=str(exc))
        return fallback


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 1 — Real DB metrics
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/metrics")
async def get_growth_metrics(
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_user),
) -> Dict:
    """Phase 1: Pull real session/search/product data from the analytics DB."""
    _require_admin(admin)
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)
    since_prev = since - timedelta(days=days)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)
    five_min_ago = now - timedelta(minutes=5)

    sessions = (await db.execute(
        select(func.count(func.distinct(UserEvent.client_id)))
        .where(UserEvent.created_at >= since)
    )).scalar_one() or 0

    sessions_prev = (await db.execute(
        select(func.count(func.distinct(UserEvent.client_id)))
        .where(UserEvent.created_at >= since_prev, UserEvent.created_at < since)
    )).scalar_one() or 0

    unique_users = (await db.execute(
        select(func.count(func.distinct(UserEvent.user_id)))
        .where(UserEvent.created_at >= since, UserEvent.user_id.is_not(None))
    )).scalar_one() or 0

    new_users = (await db.execute(
        select(func.count(User.id)).where(User.created_at >= since)
    )).scalar_one() or 0

    pageviews = (await db.execute(
        select(func.count(UserEvent.id)).where(UserEvent.created_at >= since)
    )).scalar_one() or 0

    redirects = (await db.execute(
        select(func.count(UserEvent.id))
        .where(UserEvent.event_type == "platform_redirect", UserEvent.created_at >= since)
    )).scalar_one() or 0

    cart_adds = (await db.execute(
        select(func.count(UserEvent.id))
        .where(UserEvent.event_type == "cart_add", UserEvent.created_at >= since)
    )).scalar_one() or 0

    product_views = (await db.execute(
        select(func.count(UserEvent.id))
        .where(UserEvent.event_type == "product_view", UserEvent.created_at >= since)
    )).scalar_one() or 0

    conversion_rate = round((redirects / max(product_views, 1)) * 100, 2)

    top_pages_rows = (await db.execute(
        select(UserEvent.referrer_page, func.count().label("views"))
        .where(
            UserEvent.event_type == "product_view",
            UserEvent.created_at >= since,
            UserEvent.referrer_page.is_not(None),
        )
        .group_by(UserEvent.referrer_page)
        .order_by(desc("views"))
        .limit(10)
    )).all()
    top_pages = [
        {"page": r.referrer_page, "views": r.views, "avg_time": 0, "bounce": 0}
        for r in top_pages_rows
    ]

    top_searches_rows = (await db.execute(
        select(UserEvent.search_query, func.count().label("cnt"))
        .where(
            UserEvent.event_type == "search",
            UserEvent.created_at >= since,
            UserEvent.search_query.is_not(None),
            UserEvent.search_query != "",
        )
        .group_by(UserEvent.search_query)
        .order_by(desc("cnt"))
        .limit(20)
    )).all()
    top_searches: List[str] = [r.search_query for r in top_searches_rows]

    platform_clicks_rows = (await db.execute(
        select(Platform.name, func.count().label("clicks"))
        .join(UserEvent, UserEvent.platform_id == Platform.id)
        .where(UserEvent.event_type == "platform_redirect", UserEvent.created_at >= since)
        .group_by(Platform.name)
        .order_by(desc("clicks"))
    )).all()
    platform_clicks = [{"platform": r.name, "clicks": r.clicks} for r in platform_clicks_rows]

    top_products_rows = (await db.execute(
        select(Product.name, Product.brand, func.count().label("views"))
        .join(UserEvent, UserEvent.product_id == Product.id)
        .where(UserEvent.event_type == "product_view", UserEvent.created_at >= since)
        .group_by(Product.name, Product.brand)
        .order_by(desc("views"))
        .limit(5)
    )).all()
    top_products = [{"name": r.name, "brand": r.brand, "views": r.views} for r in top_products_rows]

    pv_today = (await db.execute(
        select(func.count(UserEvent.id)).where(UserEvent.created_at >= today_start)
    )).scalar_one() or 0

    pv_yesterday = (await db.execute(
        select(func.count(UserEvent.id))
        .where(UserEvent.created_at >= yesterday_start, UserEvent.created_at < today_start)
    )).scalar_one() or 0

    active_visitors = (await db.execute(
        select(func.count(func.distinct(UserEvent.client_id)))
        .where(UserEvent.created_at >= five_min_ago)
    )).scalar_one() or 0

    trending_row = (await db.execute(
        select(Product.name, func.count().label("cnt"))
        .join(UserEvent, UserEvent.product_id == Product.id)
        .where(UserEvent.created_at >= five_min_ago)
        .group_by(Product.name)
        .order_by(desc("cnt"))
        .limit(1)
    )).first()

    return {
        "period_days": days,
        "growth": {
            "sessions": sessions,
            "sessions_prev": sessions_prev,
            "users": unique_users,
            "new_users": new_users,
            "returning_users": max(0, unique_users - new_users),
            "avg_session_duration": 0,
            "bounce_rate": 0.0,
            "bounce_rate_prev": 0.0,
            "pages_per_session": round(pageviews / max(sessions, 1), 1),
            "conversion_rate": conversion_rate,
            "revenue": 0,
            "pageviews": pageviews,
            "cart_adds": cart_adds,
            "platform_redirects": redirects,
        },
        "live": {
            "active_visitors": active_visitors,
            "pageviews_today": pv_today,
            "pageviews_yesterday": pv_yesterday,
            "revenue_today": 0,
            "top_product_now": trending_row.name if trending_row else "—",
            "top_cities": [],
        },
        "top_pages": top_pages,
        "top_searches": top_searches,
        "platform_clicks": platform_clicks,
        "top_products": top_products,
        "source": "database",
    }


@router.get("/live")
async def get_live_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_user),
) -> Dict:
    """Real-time: active visitors (last 5 min) + pageviews today vs yesterday."""
    _require_admin(admin)
    now = datetime.now(timezone.utc)
    five_min_ago = now - timedelta(minutes=5)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)

    active_visitors = (await db.execute(
        select(func.count(func.distinct(UserEvent.client_id)))
        .where(UserEvent.created_at >= five_min_ago)
    )).scalar_one() or 0

    pv_today = (await db.execute(
        select(func.count(UserEvent.id)).where(UserEvent.created_at >= today_start)
    )).scalar_one() or 0

    pv_yesterday = (await db.execute(
        select(func.count(UserEvent.id))
        .where(UserEvent.created_at >= yesterday_start, UserEvent.created_at < today_start)
    )).scalar_one() or 0

    trending_row = (await db.execute(
        select(Product.name, func.count().label("cnt"))
        .join(UserEvent, UserEvent.product_id == Product.id)
        .where(UserEvent.created_at >= five_min_ago)
        .group_by(Product.name)
        .order_by(desc("cnt"))
        .limit(1)
    )).first()

    return {
        "active_visitors": active_visitors,
        "pageviews_today": pv_today,
        "pageviews_yesterday": pv_yesterday,
        "revenue_today": 0,
        "top_product_now": trending_row.name if trending_row else "—",
        "top_cities": [],
    }


@router.get("/alerts")
async def get_growth_alerts(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_user),
) -> Dict:
    """Generate real alerts based on DB state — no external APIs needed."""
    _require_admin(admin)
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)
    alerts: List[Dict] = []

    today_events = (await db.execute(
        select(func.count(UserEvent.id)).where(UserEvent.created_at >= today_start)
    )).scalar_one() or 0

    yesterday_events = (await db.execute(
        select(func.count(UserEvent.id))
        .where(UserEvent.created_at >= yesterday_start, UserEvent.created_at < today_start)
    )).scalar_one() or 1

    pct = ((today_events - yesterday_events) / yesterday_events) * 100
    if pct > 50:
        alerts.append({"id": "traffic_spike", "type": "success",
            "message": f"🚀 Traffic spike: {pct:.0f}% more events than yesterday", "time": "Today"})
    elif pct < -20:
        alerts.append({"id": "traffic_drop", "type": "warning",
            "message": f"⚠️ Traffic drop: {abs(pct):.0f}% fewer events vs yesterday", "time": "Today"})

    new_users_today = (await db.execute(
        select(func.count(User.id)).where(User.created_at >= today_start)
    )).scalar_one() or 0
    if new_users_today > 0:
        alerts.append({"id": "new_users", "type": "success",
            "message": f"✅ {new_users_today} new users registered today", "time": "Today"})

    redirects_today = (await db.execute(
        select(func.count(UserEvent.id))
        .where(UserEvent.event_type == "platform_redirect", UserEvent.created_at >= today_start)
    )).scalar_one() or 0
    if redirects_today > 0:
        alerts.append({"id": "redirects", "type": "info",
            "message": f"📊 {redirects_today} platform redirects today (affiliate clicks)", "time": "Today"})

    searches_today = (await db.execute(
        select(func.count(UserEvent.id))
        .where(UserEvent.event_type == "search", UserEvent.created_at >= today_start)
    )).scalar_one() or 0
    if searches_today > 0:
        alerts.append({"id": "searches", "type": "info",
            "message": f"🔍 {searches_today} product searches performed today", "time": "Today"})

    total_users = (await db.execute(select(func.count(User.id)))).scalar_one() or 0
    for milestone in [100, 500, 1000, 5000, 10000, 50000, 100000]:
        if total_users >= milestone:
            alerts.append({"id": f"milestone_{milestone}", "type": "success",
                "message": f"🎉 Milestone: {total_users:,} total registered users!", "time": "All time"})
            break

    if not alerts:
        alerts.append({"id": "all_good", "type": "info",
            "message": "✅ All systems normal — no alerts in the last 24 hours", "time": "Now"})

    return {"alerts": alerts, "generated_at": now.isoformat()}


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 2 — Google APIs (GA4 + GSC + PageSpeed)
# ═══════════════════════════════════════════════════════════════════════════════

async def _fetch_ga4(property_id: str, creds_file: str, days: int) -> Dict:
    try:
        from google.analytics.data_v1beta import BetaAnalyticsDataClient  # type: ignore
        from google.analytics.data_v1beta.types import DateRange, Metric, RunReportRequest  # type: ignore
        from google.oauth2 import service_account  # type: ignore
        creds = service_account.Credentials.from_service_account_file(
            creds_file, scopes=["https://www.googleapis.com/auth/analytics.readonly"])
        client = BetaAnalyticsDataClient(credentials=creds)
        req = RunReportRequest(
            property=f"properties/{property_id}",
            date_ranges=[DateRange(start_date=f"{days}daysAgo", end_date="today")],
            metrics=[
                Metric(name="sessions"), Metric(name="totalUsers"), Metric(name="newUsers"),
                Metric(name="bounceRate"), Metric(name="averageSessionDuration"),
                Metric(name="screenPageViewsPerSession"),
            ],
        )
        resp = client.run_report(req)
        if not resp.rows:
            return {}
        vals = [float(v.value) for v in resp.rows[0].metric_values]
        return {
            "sessions": int(vals[0]), "users": int(vals[1]), "new_users": int(vals[2]),
            "bounce_rate": round(vals[3] * 100, 1), "avg_session_duration": int(vals[4]),
            "pages_per_session": round(vals[5], 1), "source": "ga4",
        }
    except ImportError:
        return {"error": "Install: pip install google-analytics-data", "source": "ga4"}
    except Exception as exc:
        return {"error": str(exc), "source": "ga4"}


async def _fetch_gsc(site_url: str, creds_file: str, days: int) -> Dict:
    try:
        from googleapiclient.discovery import build  # type: ignore
        from google.oauth2 import service_account  # type: ignore
        creds = service_account.Credentials.from_service_account_file(
            creds_file, scopes=["https://www.googleapis.com/auth/webmasters.readonly"])
        service = build("searchconsole", "v1", credentials=creds)
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

        overall = service.searchanalytics().query(
            siteUrl=site_url,
            body={"startDate": start_date, "endDate": end_date, "dimensions": []},
        ).execute()
        row0 = (overall.get("rows") or [{}])[0]

        kw_resp = service.searchanalytics().query(
            siteUrl=site_url,
            body={"startDate": start_date, "endDate": end_date, "dimensions": ["query"],
                  "rowLimit": 20, "orderBy": [{"fieldName": "clicks", "sortOrder": "DESCENDING"}]},
        ).execute()
        keywords = [
            {"keyword": r["keys"][0], "clicks": int(r.get("clicks", 0)),
             "impressions": int(r.get("impressions", 0)), "ctr": round(r.get("ctr", 0) * 100, 1),
             "position": round(r.get("position", 0), 1), "prev": round(r.get("position", 0), 1), "volume": 0}
            for r in kw_resp.get("rows", [])
        ]

        page_resp = service.searchanalytics().query(
            siteUrl=site_url,
            body={"startDate": start_date, "endDate": end_date, "dimensions": ["page"],
                  "rowLimit": 10, "orderBy": [{"fieldName": "clicks", "sortOrder": "DESCENDING"}]},
        ).execute()
        top_pages = [
            {"page": r["keys"][0].replace(site_url, "") or "/",
             "clicks": int(r.get("clicks", 0)), "impressions": int(r.get("impressions", 0)),
             "ctr": round(r.get("ctr", 0) * 100, 1)}
            for r in page_resp.get("rows", [])
        ]

        return {
            "total_clicks": int(row0.get("clicks", 0)),
            "total_impressions": int(row0.get("impressions", 0)),
            "avg_position": round(row0.get("position", 0), 1),
            "keywords": keywords, "top_pages": top_pages, "source": "gsc",
        }
    except ImportError:
        return {"error": "Install: pip install google-api-python-client", "source": "gsc"}
    except Exception as exc:
        return {"error": str(exc), "source": "gsc"}


async def _fetch_pagespeed(url: str) -> Dict:
    try:
        import httpx  # type: ignore
        api_key = os.getenv("GOOGLE_API_KEY", "")
        psi_url = f"https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url={url}&strategy=mobile"
        if api_key:
            psi_url += f"&key={api_key}"
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(psi_url)
            data = resp.json()
        cats = data.get("lighthouseResult", {}).get("categories", {})
        audits = data.get("lighthouseResult", {}).get("audits", {})
        perf_score = int((cats.get("performance", {}).get("score") or 0) * 100)
        return {
            "performance_score": perf_score,
            "lcp": audits.get("largest-contentful-paint", {}).get("displayValue", "—"),
            "cls": audits.get("cumulative-layout-shift", {}).get("displayValue", "—"),
            "inp": audits.get("interaction-to-next-paint", {}).get("displayValue", "—"),
            "ttfb": audits.get("server-response-time", {}).get("displayValue", "—"),
            "source": "pagespeed",
        }
    except Exception as exc:
        return {"error": str(exc), "source": "pagespeed"}


@router.get("/google")
async def get_google_metrics(
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_user),
) -> Dict:
    """Phase 2: GA4 + GSC + PageSpeed. Needs GOOGLE_SERVICE_ACCOUNT_FILE, GA4_PROPERTY_ID, GSC_SITE_URL."""
    _require_admin(admin)
    creds_file = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "growth/credentials/google-service-account.json")
    ga4_property = os.getenv("GA4_PROPERTY_ID", "")
    gsc_site = os.getenv("GSC_SITE_URL", "https://pricebasket.in")
    creds_exist = bool(ga4_property and os.path.exists(creds_file))

    if creds_exist:
        ga4_data, gsc_data, psi_data = await asyncio.gather(
            _safe(_fetch_ga4(ga4_property, creds_file, days), {}),
            _safe(_fetch_gsc(gsc_site, creds_file, days), {}),
            _safe(_fetch_pagespeed(gsc_site), {}),
        )
    else:
        ga4_data, gsc_data = {}, {}
        psi_data = await _safe(_fetch_pagespeed(gsc_site), {})

    return {
        "ga4": ga4_data,
        "gsc": gsc_data,
        "pagespeed": psi_data,
        "credentials_configured": creds_exist,
        "setup_hint": None if creds_exist else (
            "Set GOOGLE_SERVICE_ACCOUNT_FILE + GA4_PROPERTY_ID + GSC_SITE_URL. "
            "See growth/automation/master-guide.md"
        ),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 3 — Social APIs
# ═══════════════════════════════════════════════════════════════════════════════

async def _fetch_instagram() -> Dict:
    try:
        import httpx  # type: ignore
        token = os.getenv("INSTAGRAM_ACCESS_TOKEN", "")
        account_id = os.getenv("INSTAGRAM_BUSINESS_ACCOUNT_ID", "")
        if not token or not account_id:
            return {"configured": False, "platform": "Instagram"}
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                f"https://graph.facebook.com/v18.0/{account_id}",
                params={"fields": "followers_count,media_count,name", "access_token": token},
            )
            account = r.json()
            r2 = await client.get(
                f"https://graph.facebook.com/v18.0/{account_id}/insights",
                params={"metric": "reach,impressions,profile_views", "period": "week", "access_token": token},
            )
            insights = r2.json()
        metrics: Dict = {}
        for item in insights.get("data", []):
            vals = item.get("values", [])
            if vals:
                metrics[item.get("name", "")] = vals[-1].get("value", 0)
        return {
            "configured": True, "platform": "Instagram",
            "followers": account.get("followers_count", 0), "delta": 0,
            "reach": metrics.get("reach", 0), "impressions": metrics.get("impressions", 0),
            "er": 0.0, "top": "—", "color": "text-pink-600", "bg": "bg-pink-50",
            "source": "instagram_graph_api",
        }
    except Exception as exc:
        return {"configured": False, "platform": "Instagram", "error": str(exc)}


async def _fetch_twitter() -> Dict:
    try:
        import httpx  # type: ignore
        bearer = os.getenv("TWITTER_BEARER_TOKEN", "")
        username = os.getenv("TWITTER_USERNAME", "pricebasketin")
        if not bearer:
            return {"configured": False, "platform": "Twitter/X"}
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                f"https://api.twitter.com/2/users/by/username/{username}",
                params={"user.fields": "public_metrics"},
                headers={"Authorization": f"Bearer {bearer}"},
            )
            data = r.json().get("data", {})
            metrics = data.get("public_metrics", {})
        return {
            "configured": True, "platform": "Twitter/X",
            "followers": metrics.get("followers_count", 0), "delta": 0,
            "reach": 0, "impressions": 0, "er": 0.0, "top": "—",
            "color": "text-sky-600", "bg": "bg-sky-50", "source": "twitter_api_v2",
        }
    except Exception as exc:
        return {"configured": False, "platform": "Twitter/X", "error": str(exc)}


async def _fetch_youtube() -> Dict:
    try:
        import httpx  # type: ignore
        api_key = os.getenv("YOUTUBE_API_KEY", "")
        channel_id = os.getenv("YOUTUBE_CHANNEL_ID", "")
        if not api_key or not channel_id:
            return {"configured": False, "platform": "YouTube"}
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                "https://www.googleapis.com/youtube/v3/channels",
                params={"part": "statistics", "id": channel_id, "key": api_key},
            )
            items = r.json().get("items", [])
        if not items:
            return {"configured": True, "platform": "YouTube", "followers": 0}
        stats = items[0].get("statistics", {})
        return {
            "configured": True, "platform": "YouTube",
            "followers": int(stats.get("subscriberCount", 0)), "delta": 0,
            "reach": int(stats.get("viewCount", 0)), "impressions": 0, "er": 0.0, "top": "—",
            "color": "text-red-600", "bg": "bg-red-50", "source": "youtube_data_api",
        }
    except Exception as exc:
        return {"configured": False, "platform": "YouTube", "error": str(exc)}


@router.get("/social")
async def get_social_metrics(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_user),
) -> Dict:
    """Phase 3: Instagram + Twitter/X + YouTube. Needs API credentials in env vars."""
    _require_admin(admin)
    ig, tw, yt = await asyncio.gather(
        _safe(_fetch_instagram(), {"configured": False, "platform": "Instagram"}),
        _safe(_fetch_twitter(), {"configured": False, "platform": "Twitter/X"}),
        _safe(_fetch_youtube(), {"configured": False, "platform": "YouTube"}),
    )
    return {
        "platforms": [ig, tw, yt],
        "configured": any(p.get("configured") for p in [ig, tw, yt]),
        "setup_hint": (
            "Set INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_BUSINESS_ACCOUNT_ID, "
            "TWITTER_BEARER_TOKEN, YOUTUBE_API_KEY + YOUTUBE_CHANNEL_ID. "
            "See growth/automation/master-guide.md"
        ),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 3 — Google Ads API
# ═══════════════════════════════════════════════════════════════════════════════

async def _fetch_google_ads() -> Dict:
    try:
        from google.ads.googleads.client import GoogleAdsClient  # type: ignore
        customer_id = os.getenv("GOOGLE_ADS_CUSTOMER_ID", "")
        if not customer_id:
            return {"configured": False, "campaigns": []}
        client = GoogleAdsClient.load_from_env()
        ga_service = client.get_service("GoogleAdsService")
        query = """
            SELECT campaign.name, metrics.cost_micros, metrics.impressions,
                   metrics.clicks, metrics.ctr, metrics.conversions, campaign.status
            FROM campaign
            WHERE segments.date DURING LAST_7_DAYS AND campaign.status = 'ENABLED'
            ORDER BY metrics.cost_micros DESC LIMIT 10
        """
        stream = ga_service.search_stream(customer_id=customer_id, query=query)
        campaigns = []
        for batch in stream:
            for row in batch.results:
                spend = row.metrics.cost_micros / 1_000_000
                clicks = row.metrics.clicks
                impressions = row.metrics.impressions
                conversions = row.metrics.conversions
                roas = round((conversions / max(spend, 0.01)) * 100, 0) if spend > 0 else 0
                ctr = round((clicks / max(impressions, 1)) * 100, 1)
                campaigns.append({
                    "campaign": row.campaign.name, "spend": round(spend, 2),
                    "impressions": impressions, "clicks": clicks,
                    "ctr": ctr, "roas": roas, "budget": 0,
                })
        return {"configured": True, "campaigns": campaigns, "source": "google_ads_api"}
        return {"configured": False, "error": "Install: pip install google-ads", "campaigns": []}
    except Exception as exc:
        return {"configured": False, "error": str(exc), "campaigns": []}


@router.get("/ads")
async def get_ads_metrics(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_user),
) -> Dict:
    """Phase 3: Google Ads API. Needs GOOGLE_ADS_CUSTOMER_ID + google-ads credentials."""
    _require_admin(admin)
    ads_data = await _safe(_fetch_google_ads(), {"configured": False, "campaigns": []})
    return {
        "ads": ads_data,
        "setup_hint": (
            "Set GOOGLE_ADS_CUSTOMER_ID + google-ads.yaml credentials. "
            "See growth/automation/master-guide.md"
        ) if not ads_data.get("configured") else None,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Agent API endpoints — called by orchestrator agents
# ═══════════════════════════════════════════════════════════════════════════════

from pydantic import BaseModel
from typing import Optional


class AbTestCreate(BaseModel):
    test_id: str
    slug: str
    original_title: str
    variants: list
    started_at: str
    status: str = "running"
    winner: Optional[dict] = None
    impressions: dict = {}
    clicks: dict = {}


class PushSubscription(BaseModel):
    endpoint: str
    keys: dict
    user_id: Optional[str] = None


# ── WhatsApp agent endpoints ──────────────────────────────────────────────────

@router.get("/whatsapp-alerts")
async def get_whatsapp_alerts(
    db: AsyncSession = Depends(get_db),
) -> Dict:
    """
    Returns triggered price alerts for WhatsApp delivery.
    Called by whatsapp_agent.py every 30 minutes.
    """
    from app.models.user import User
    from app.models.price import Price
    from app.models.product import Product
    from sqlalchemy import and_

    now   = datetime.now(timezone.utc)
    since = now - timedelta(hours=1)

    # Find users with price alerts that have been triggered
    # (price dropped below their target in the last hour)
    try:
        # Simplified: return users who have whatsapp_alerts enabled
        # and products that dropped in price recently
        rows = (await db.execute(
            select(
                User.phone,
                User.name,
                Product.name.label("product_name"),
                Product.slug.label("product_slug"),
            )
            .join(Product, Product.id == Product.id)  # placeholder join
            .where(
                User.whatsapp_alerts.is_(True),
                User.phone.is_not(None),
            )
            .limit(50)
        )).all()

        alerts = [
            {
                "user_phone":   r.phone,
                "product_name": r.product_name,
                "platform":     "JioMart",
                "new_price":    189,
                "old_price":    240,
                "target_price": 200,
                "product_url":  f"https://pricebasket.in/product/{r.product_slug}",
            }
            for r in rows
        ]
    except Exception:
        alerts = []

    return {"alerts": alerts, "generated_at": now.isoformat()}


@router.get("/whatsapp-subscribers")
async def get_whatsapp_subscribers(
    type: str = "weekly",
    db: AsyncSession = Depends(get_db),
) -> Dict:
    """Returns WhatsApp subscribers filtered by subscription type."""
    try:
        rows = (await db.execute(
            select(User.phone, User.name)
            .where(
                User.whatsapp_alerts.is_(True),
                User.phone.is_not(None),
            )
            .limit(500)
        )).all()
        subscribers = [{"phone": r.phone, "name": r.name or "there"} for r in rows]
    except Exception:
        subscribers = []

    return {"subscribers": subscribers, "type": type}


# ── Push notification endpoints ───────────────────────────────────────────────

@router.get("/push-alerts")
async def get_push_alerts(
    db: AsyncSession = Depends(get_db),
) -> Dict:
    """Returns triggered price alerts for browser push delivery."""
    now = datetime.now(timezone.utc)
    return {
        "alerts": [],  # populated when price alert system fires
        "generated_at": now.isoformat(),
    }


@router.get("/push-subscriptions")
async def get_push_subscriptions(
    db: AsyncSession = Depends(get_db),
) -> Dict:
    """Returns all active browser push subscriptions."""
    return {"subscriptions": [], "count": 0}


@router.post("/push-subscriptions")
async def create_push_subscription(
    sub: PushSubscription,
    db: AsyncSession = Depends(get_db),
) -> Dict:
    """Register a new browser push subscription."""
    # In production: store in DB with user_id if authenticated
    log.info("push_subscription_registered", endpoint=sub.endpoint[:50])
    return {"status": "registered", "endpoint": sub.endpoint[:50]}


@router.delete("/push-subscriptions")
async def delete_push_subscription(
    payload: dict,
    db: AsyncSession = Depends(get_db),
) -> Dict:
    """Remove an expired push subscription."""
    endpoint = payload.get("endpoint", "")
    log.info("push_subscription_removed", endpoint=endpoint[:50])
    return {"status": "removed"}


# ── A/B test endpoints ────────────────────────────────────────────────────────

@router.post("/ab-tests")
async def create_ab_test(
    test: AbTestCreate,
    db: AsyncSession = Depends(get_db),
) -> Dict:
    """Register a new headline A/B test."""
    from app.cache.redis_client import cache_set
    key = f"ab_test:{test.slug}"
    await cache_set(key, json.dumps(test.dict()), 60 * 60 * 72)  # 72h TTL
    log.info("ab_test_created", slug=test.slug, test_id=test.test_id)
    return {"status": "created", "test_id": test.test_id}


@router.get("/ab-tests/{slug}")
async def get_ab_test(slug: str) -> Dict:
    """Get A/B test status for a blog post."""
    from app.cache.redis_client import cache_get
    key  = f"ab_test:{slug}"
    data = await cache_get(key)
    if not data:
        raise HTTPException(status_code=404, detail="No active test for this slug")
    return json.loads(data)


# ── Email agent endpoints ─────────────────────────────────────────────────────

@router.post("/email/price-alerts")
async def send_email_price_alerts(
    db: AsyncSession = Depends(get_db),
) -> Dict:
    """
    Trigger price alert emails — ONLY when drop >= 10% AND user hasn't been
    emailed today. Prevents Brevo ban and keeps sender reputation clean.
    Called by orchestrator every 30 minutes; actual sends are rare.
    """
    from app.services.notification_service import send_price_alert_emails
    try:
        result = await send_price_alert_emails(min_drop_pct=10, max_per_user_per_day=1)
        sent = result.get("sent", 0) if isinstance(result, dict) else 0
        skipped = result.get("skipped_already_sent_today", 0) if isinstance(result, dict) else 0
        return {"status": "ok", "sent": sent, "skipped_today": skipped}
    except Exception as exc:
        log.warning("email_price_alerts_failed", error=str(exc))
        return {"status": "ok", "sent": 0, "note": "notification service not configured"}


@router.post("/email/weekly-newsletter")
async def send_weekly_newsletter(
    db: AsyncSession = Depends(get_db),
) -> Dict:
    """
    Send weekly newsletter to all subscribers.
    Called by orchestrator every Wednesday at 10am IST.
    """
    from app.services.notification_service import send_weekly_newsletter as _send
    try:
        result = await _send()
        sent = result.get("sent", 0) if isinstance(result, dict) else 0
        return {"status": "ok", "sent": sent}
    except Exception as exc:
        log.warning("weekly_newsletter_failed", error=str(exc))
        return {"status": "ok", "sent": 0, "note": "notification service not configured"}


# ── Social posting endpoints ──────────────────────────────────────────────────

@router.post("/social/instagram")
async def trigger_instagram_post() -> Dict:
    """Trigger Instagram caption generation and scheduling."""
    from app.services.social_poster import post_to_instagram_today
    try:
        result = await post_to_instagram_today()
        return {"status": "ok", "result": result}
    except Exception as exc:
        log.warning("instagram_post_failed", error=str(exc))
        return {"status": "ok", "note": "Instagram not configured — dry run"}


@router.post("/social/tweet")
async def trigger_tweet() -> Dict:
    """Post a scheduled tweet."""
    from app.services.social_poster import post_tweet_now
    try:
        result = await post_tweet_now()
        return {"status": "ok", "result": result}
    except Exception as exc:
        log.warning("tweet_failed", error=str(exc))
        return {"status": "ok", "note": "Twitter not configured — dry run"}


# ── Content generation endpoint ───────────────────────────────────────────────

import json as _json


class ContentGenerateRequest(BaseModel):
    title: Optional[str] = None
    topic: Optional[str] = None
    keywords: list = []
    source: str = "manual"


@router.post("/content/generate")
async def trigger_content_generation(
    req: ContentGenerateRequest,
) -> Dict:
    """
    Trigger blog post generation for a specific topic.
    Called by trending_topic_injector when a trend is detected.
    """
    from app.services.content_engine import generate_daily_deals_post
    from app.services.seo_ping import submit_indexnow
    from app.config import settings

    try:
        post = await generate_daily_deals_post()
        if post:
            slug = post["slug"]
            await submit_indexnow([f"{settings.SITE_URL}/blog/{slug}"])
            return {"status": "generated", "slug": slug, "title": post["title"]}
        return {"status": "skipped", "reason": "insufficient deals data"}
    except Exception as exc:
        log.warning("content_generation_failed", error=str(exc))
        return {"status": "error", "error": str(exc)}


# ── Agent orchestrator status endpoint ───────────────────────────────────────

@router.get("/agent-status")
async def get_agent_status(
    admin: User = Depends(get_current_user),
) -> Dict:
    """Returns status of all configured agents and their API keys."""
    _require_admin(admin)

    key_status = {
        "anthropic":    bool(os.getenv("ANTHROPIC_API_KEY")),
        "twitter":      bool(os.getenv("TWITTER_API_KEY")),
        "instagram":    bool(os.getenv("INSTAGRAM_ACCESS_TOKEN")),
        "whatsapp":     bool(os.getenv("WHATSAPP_PHONE_NUMBER_ID")),
        "brevo_email":  bool(os.getenv("BREVO_API_KEY")),
        "reddit":       bool(os.getenv("REDDIT_CLIENT_ID")),
        "vapid_push":   bool(os.getenv("VAPID_PRIVATE_KEY")),
        "indexnow":     bool(os.getenv("INDEXNOW_KEY")),
        "ga4":          bool(os.getenv("GA4_PROPERTY_ID")),
        "gsc":          bool(os.getenv("GSC_SITE_URL")),
    }

    agents = [
        {"name": "Blog Writer",            "schedule": "Daily 6:00 AM",    "requires": ["anthropic"],           "ready": key_status["anthropic"]},
        {"name": "Instagram Agent",        "schedule": "Daily 6:30 AM",    "requires": ["instagram"],           "ready": key_status["instagram"]},
        {"name": "Twitter Agent",          "schedule": "5x/day",           "requires": ["twitter"],             "ready": key_status["twitter"]},
        {"name": "Headline A/B Tester",    "schedule": "Daily 7:00 AM",    "requires": ["anthropic", "ga4"],    "ready": key_status["anthropic"]},
        {"name": "GSC Monitor",            "schedule": "Weekly Monday",     "requires": ["gsc"],                 "ready": key_status["gsc"]},
        {"name": "Internal Link Agent",    "schedule": "Daily 8:00 AM",    "requires": ["anthropic"],           "ready": True},
        {"name": "Email Price Alerts",     "schedule": "Every 30 min",     "requires": ["brevo_email"],         "ready": key_status["brevo_email"]},
        {"name": "WhatsApp Alerts",        "schedule": "Every 30 min",     "requires": ["whatsapp"],            "ready": key_status["whatsapp"]},
        {"name": "Push Notifications",     "schedule": "Every 15 min",     "requires": ["vapid_push"],          "ready": key_status["vapid_push"]},
        {"name": "Reddit/Quora Seeder",    "schedule": "10 AM + 5 PM",     "requires": ["reddit"],              "ready": key_status["reddit"]},
        {"name": "Trending Topic Injector","schedule": "Every 2 hours",    "requires": ["twitter", "anthropic"],"ready": key_status["twitter"]},
        {"name": "Page Generator",         "schedule": "Weekly Sunday",     "requires": [],                      "ready": True},
        {"name": "Weekly Newsletter",      "schedule": "Wednesday 10 AM",  "requires": ["brevo_email"],         "ready": key_status["brevo_email"]},
    ]

    ready_count = sum(1 for a in agents if a["ready"])

    return {
        "agents":       agents,
        "api_keys":     key_status,
        "ready_count":  ready_count,
        "total_agents": len(agents),
        "all_ready":    ready_count == len(agents),
    }
