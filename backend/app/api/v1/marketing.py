"""
PriceBasket Digital Marketing Agent System — FastAPI router.

Endpoints:
  POST /marketing/agents/run          → stream AI response (SSE) — Gemini primary, Claude fallback
  POST /marketing/content             → save content
  GET  /marketing/content             → list content (filters)
  GET  /marketing/content/:id         → single content
  PUT  /marketing/content/:id         → update status/schedule
  DELETE /marketing/content/:id       → soft-delete (archived)

  POST /marketing/campaigns           → save campaign
  GET  /marketing/campaigns           → list campaigns
  GET  /marketing/campaigns/:id       → campaign detail

  POST /marketing/analytics           → log metric
  GET  /marketing/analytics/summary   → dashboard aggregation
  GET  /marketing/analytics/chart     → time-series data

  POST /marketing/goals               → set monthly goal
  GET  /marketing/goals               → current month goals
  PUT  /marketing/goals/:id           → update current value

  GET  /marketing/schedule/today      → content due today
  GET  /marketing/schedule/week       → this week's calendar
  POST /marketing/schedule            → create entry
  PUT  /marketing/schedule/:id        → mark posted / update

  POST /marketing/utm                 → generate UTM link
  GET  /marketing/dashboard/stats     → all dashboard KPIs
"""
import json
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal, get_db
from app.middleware.auth_middleware import require_admin
from app.models.marketing import (
    MarketingAnalytics,
    MarketingCampaign,
    MarketingContent,
    MarketingGoal,
    MarketingSchedule,
)
from app.marketing.creative_generator import generate_platform_creative
from app.marketing.publishers import dispatch as publish_dispatch
from app.marketing.ai_engine import ai_engine
from app.marketing.agent_prompts import build_prompt as _build_v3_prompt

log = structlog.get_logger(__name__)
router = APIRouter()

# ── Agent metadata ─────────────────────────────────────────────────────────────

AGENT_PLATFORMS: Dict[str, str] = {
    "seo":       "Google Search / Blog",
    "reddit":    "Reddit",
    "instagram": "Instagram",
    "twitter":   "Twitter/X",
    "whatsapp":  "WhatsApp",
    "youtube":   "YouTube Shorts",
    "quora":     "Quora",
    "email":     "Email Newsletter",
    "linkedin":  "LinkedIn",
    "campaign":  "All Channels",
}

VALID_AGENT_IDS = set(AGENT_PLATFORMS.keys())

# ── Prompt builders ────────────────────────────────────────────────────────────

MASTER_SYSTEM_PROMPT = """You are PriceBasket's Free Digital Marketing AI Agent — an elite content creator \
that generates professional, platform-native marketing content using ONLY free channels.

BRAND IDENTITY:
- Product: PriceBasket (pricebasket.in) — India's grocery price comparison app
- Tagline: "COMPARE • SAVE • SMART"
- Brand Voice: Smart, witty, savings-obsessed, authentic Hinglish where natural
- Founder city: Jodhpur, Rajasthan — use Tier 2 India angle as authentic USP

COMPETITIVE EDGE (use in content):
- Covers 6 platforms: Blinkit + Zepto + Swiggy Instamart + BigBasket + JioMart + Flipkart Minutes
- Competitors miss JioMart & Flipkart Minutes coverage
- No ad clutter — clean UX
- Tier 2 city support (Jodhpur, Jaipur, Indore etc.)
- Price history trend charts
- Users save avg ₹150–400/month

CONTENT RULES (never violate):
1. Every piece ends with CTA → pricebasket.in or app download link
2. Never mention competitor app names directly in public content — use "other apps"
3. Hinglish = natural mix, never forced translation
4. Include real numbers: ₹150–400/month savings, 6 platforms, prices updated every 30 min
5. Reddit/Quora content must feel 100% organic — zero sales language
6. Hashtags must be specific and researched, not generic
7. Always include at least one relatable real-life grocery struggle moment"""


def _build_system_prompt(agent_id: str) -> str:
    extras = {
        "seo": "\nSEO FOCUS: Write for Indian grocery shoppers. Target keyword density 1.5%. Always include pricebasket.in CTA. Use conversational Hindi-English mix where natural.",
        "reddit": "\nREDDIT FOCUS: Posts must feel 100% organic. NO sales language. Tell a real-sounding savings story. Mention PriceBasket only naturally in context.",
        "instagram": "\nINSTAGRAM FOCUS: Write for urban Indian millennials 22–35. Hinglish captions must feel native not forced. Hashtags must be specific not generic. Every Reel hook must create a scroll-stop moment in first 2 seconds.",
        "twitter": "\nTWITTER FOCUS: Make people stop scrolling. Tweet 1 must be a pattern interrupt. Use data, specific rupee amounts, relatable grocery situations. Never start with 'I' — start with a number, question, or bold statement.",
        "whatsapp": "\nWHATSAPP FOCUS: Messages must feel like a friend sharing a tip, NOT a brand broadcasting. No corporate language. Maximum 3 emojis total. Must mention specific savings amount (₹150–400/month avg). Always end with pricebasket.in link.",
        "youtube": "\nYOUTUBE FOCUS: Maximum retention. Hook in first 3 seconds or viewer swipes. Formula: Hook → Problem → Reveal → Proof → CTA. On-screen text must reinforce, not repeat, the voiceover. Design for muted viewing.",
        "quora": "\nQUORA FOCUS: Establish genuine expertise. PriceBasket must appear as a natural recommendation, never the first sentence. Lead with data or personal insight. These answers will rank on Google — include target keyword naturally in first 50 words.",
        "email": "\nEMAIL FOCUS: Subject lines must create curiosity or urgency without clickbait. Body must deliver real value before asking for anything. Sign off from 'Nikhil & the PriceBasket team' for personal touch.",
        "linkedin": "\nLINKEDIN FOCUS: Build founder brand for Nikhil while growing PriceBasket. B2B angle: sell pricing intelligence data to FMCG/D2C brands. Consumer angle: thought leadership on quick commerce price disparity. Always end with a question to drive comments.",
        "campaign": "\nCAMPAIGN FOCUS: Build campaigns that compound. Week 1 = SEO foundation + community seeding. Week 2 = social proof + video. Week 3 = email list + WhatsApp warm. Week 4 = B2B outreach + retention.",
    }
    return MASTER_SYSTEM_PROMPT + extras.get(agent_id, "")


def _derive_title(content: str, agent_id: str) -> str:
    """Extract a short title from the first meaningful line of generated content."""
    for line in content.strip().splitlines():
        line = line.strip().lstrip("#").strip()
        if len(line) > 10:
            return line[:120]
    return f"{agent_id.upper()} content"


# ── Pydantic schemas ───────────────────────────────────────────────────────────

class AgentRunRequest(BaseModel):
    agent_id: str
    inputs: Dict[str, Any] = {}
    tone: str = "hinglish"
    city: str = "Jodhpur"
    custom_context: str = ""
    generate_creative: bool = True   # auto-generate SVG poster
    creative_theme: str = "orange"   # orange | dark | minimal


class PublishRequest(BaseModel):
    content_id: Optional[str] = None
    content: str
    platform: str
    extra: Dict[str, Any] = {}


class CreativeRequest(BaseModel):
    platform: str = "instagram"
    headline: str
    subtext: str = ""
    theme: str = "orange"


class ContentUpdate(BaseModel):
    status: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    title: Optional[str] = None
    utm_link: Optional[str] = None


class CampaignCreate(BaseModel):
    name: str
    theme: Optional[str] = None
    goal: Optional[str] = None
    city: Optional[str] = None
    duration_days: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    plan_content: Optional[str] = None


class AnalyticsCreate(BaseModel):
    content_id: Optional[str] = None
    platform: str
    metric_name: str
    metric_value: int
    notes: Optional[str] = None
    recorded_at: Optional[date] = None


class GoalCreate(BaseModel):
    month: date
    platform: str
    metric_name: str
    target_value: int


class GoalUpdate(BaseModel):
    current_value: int


class ScheduleCreate(BaseModel):
    content_id: Optional[str] = None
    platform: str
    scheduled_for: datetime
    notes: Optional[str] = None


class ScheduleUpdate(BaseModel):
    is_posted: Optional[bool] = None
    scheduled_for: Optional[datetime] = None
    notes: Optional[str] = None


class UTMRequest(BaseModel):
    destination_url: str
    source: str
    medium: str
    campaign: str
    content: Optional[str] = None
    term: Optional[str] = None


# ── Helper: serialize model to dict ───────────────────────────────────────────

def _content_to_dict(c: MarketingContent) -> dict:
    return {
        "id": str(c.id),
        "agent_id": c.agent_id,
        "platform": c.platform,
        "title": c.title,
        "content": c.content,
        "inputs": c.inputs,
        "tone": c.tone,
        "city": c.city,
        "status": c.status,
        "scheduled_at": c.scheduled_at.isoformat() if c.scheduled_at else None,
        "published_at": c.published_at.isoformat() if c.published_at else None,
        "utm_link": c.utm_link,
        "created_at": c.created_at.isoformat(),
        "updated_at": c.updated_at.isoformat(),
    }


# ── MODULE: Streaming agent endpoint ─────────────────────────────────────────

@router.post("/agents/run")
async def run_agent(
    body: AgentRunRequest,
    admin=Depends(require_admin),
):
    """Stream marketing agent response via SSE. Gemini primary, Claude fallback. Auto-saves to DB."""
    if body.agent_id not in VALID_AGENT_IDS:
        raise HTTPException(status_code=400, detail=f"Unknown agent_id '{body.agent_id}'. Valid: {sorted(VALID_AGENT_IDS)}")

    engine_status = ai_engine.status()
    if not engine_status["ready"]:
        raise HTTPException(
            status_code=503,
            detail="No AI provider configured. Add GEMINI_API_KEY (or ANTHROPIC_API_KEY) to backend/.env",
        )

    from app.marketing.ai_engine import MASTER_SYSTEM as ENGINE_SYSTEM
    system_prompt = _build_system_prompt(body.agent_id)
    if body.custom_context:
        system_prompt += f"\n\nADDITIONAL CONTEXT FROM ADMIN:\n{body.custom_context}"

    # Use v3.0 comprehensive prompts via agent_prompts module
    user_prompt = _build_v3_prompt(body.agent_id, body.inputs, body.tone, body.city)

    async def event_stream():
        accumulated = []
        try:
            async for text_chunk in ai_engine.stream(user_prompt, system_prompt, body.agent_id):
                accumulated.append(text_chunk)
                yield f"data: {json.dumps({'type': 'chunk', 'text': text_chunk})}\n\n"

            full_content = "".join(accumulated)

            # ── Generate SVG creative ──────────────────────────────────────
            if body.generate_creative:
                try:
                    headline = _extract_headline(full_content, body.agent_id)
                    subtext  = _extract_subtext(full_content)
                    svg = generate_platform_creative(
                        platform=body.agent_id,
                        headline=headline,
                        subtext=subtext,
                        theme=body.creative_theme,
                    )
                    if svg:
                        yield f"data: {json.dumps({'type': 'creative', 'svg': svg, 'platform': body.agent_id})}\n\n"
                except Exception as ce:
                    log.warning("creative_gen_failed", error=str(ce))

            # ── Auto-save to DB ────────────────────────────────────────────
            content_id = uuid.uuid4()
            try:
                async with AsyncSessionLocal() as db:
                    obj = MarketingContent(
                        id=content_id,
                        agent_id=body.agent_id,
                        platform=AGENT_PLATFORMS[body.agent_id],
                        title=_derive_title(full_content, body.agent_id),
                        content=full_content,
                        inputs=body.inputs,
                        tone=body.tone,
                        city=body.city,
                        status="draft",
                    )
                    db.add(obj)
                    await db.commit()
                    log.info("marketing_content_saved", agent=body.agent_id, content_id=str(content_id))
                yield f"data: {json.dumps({'type': 'saved', 'content_id': str(content_id)})}\n\n"
                # Legacy format for backward-compat with existing hook
                yield f"data: [SAVED:{content_id}]\n\n"
            except Exception as save_err:
                log.error("marketing_content_save_failed", error=str(save_err))

            ai_provider = engine_status.get("active", "gemini")
            yield f"data: {json.dumps({'type': 'done', 'content_id': str(content_id), 'word_count': len(full_content.split()), 'provider': ai_provider})}\n\n"
            yield "data: [DONE]\n\n"

        except Exception as err:
            log.error("marketing_agent_stream_failed", agent=body.agent_id, error=str(err))
            yield f"data: {json.dumps({'type': 'error', 'message': str(err)})}\n\n"
            yield f"data: [ERROR]{str(err)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-store",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def _extract_headline(text: str, agent_id: str) -> str:
    """Extract a short headline from generated content for the SVG creative."""
    lines = [l.strip() for l in text.split("\n") if l.strip() and len(l.strip()) > 10]
    for line in lines[:5]:
        clean = line.lstrip("#•-*123456789. ").strip()
        if 10 < len(clean) < 80 and not clean.startswith("{"):
            return clean
    defaults = {
        "instagram": "Save ₹400/Month on Groceries",
        "twitter":   "You're Paying Too Much for Groceries",
        "reddit":    "Found an app that saves me ₹300/month",
        "whatsapp":  "Grocery Prices Compared Instantly",
        "seo":       "Best Grocery Price Comparison App India",
        "youtube":   "I Checked 6 Delivery Apps — Huge Difference",
        "linkedin":  "Building PriceBasket from Jodhpur",
        "email":     "This Week's Biggest Grocery Price Drops",
        "quora":     "PriceBasket: Compare 6 Platforms Instantly",
        "campaign":  "Compare Before You Cart — 30 Day Plan",
    }
    return defaults.get(agent_id, "Smart Grocery Savings with PriceBasket")


def _extract_subtext(text: str) -> str:
    """Extract a short subtext line from generated content."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    for line in lines[2:8]:
        clean = line.lstrip("#•-*123456789. ").strip()
        if 20 < len(clean) < 120:
            return clean
    return "Compare prices across Blinkit, Zepto, BigBasket & more. Free app."


# ── MODULE: Publish Live ───────────────────────────────────────────────────────

@router.post("/publish")
async def publish_now(
    body: PublishRequest,
    admin=Depends(require_admin),
):
    """Post content directly to a social platform via its API."""
    result = await publish_dispatch(body.platform, body.content, body.extra)

    if not result.success:
        raise HTTPException(
            status_code=400,
            detail={
                "error": result.error,
                "platform": body.platform,
                "fix": f"Check {body.platform.upper()} credentials in .env or Admin → Marketing → Settings",
            },
        )

    # Update DB status if content_id provided
    if body.content_id:
        try:
            uid = uuid.UUID(body.content_id)
            async with AsyncSessionLocal() as db:
                res = await db.execute(
                    select(MarketingContent).where(MarketingContent.id == uid)
                )
                obj = res.scalar_one_or_none()
                if obj:
                    obj.status = "published"
                    obj.published_at = datetime.now(tz=timezone.utc)
                    await db.commit()
        except Exception as e:
            log.warning("publish_db_update_failed", error=str(e))

    return result.dict()


# ── MODULE: Creative Generator ────────────────────────────────────────────────

@router.post("/creative/generate")
async def generate_creative_endpoint(
    body: CreativeRequest,
    admin=Depends(require_admin),
):
    """Generate an SVG poster from custom headline/subtext."""
    svg = generate_platform_creative(
        platform=body.platform,
        headline=body.headline,
        subtext=body.subtext,
        theme=body.theme,
    )
    return {"svg": svg, "platform": body.platform}


# ── MODULE: Credential Status ─────────────────────────────────────────────────

@router.get("/credentials/status")
async def credential_status(admin=Depends(require_admin)):
    """Return which platform credentials are configured."""
    import os
    engine_st = ai_engine.status()
    return {
        "ai": {
            "gemini":       engine_st["gemini"],
            "claude":       engine_st["claude"],
            "active":       engine_st["active"],
            "model":        engine_st.get("model", ""),
            "ready":        engine_st["ready"],
            "image_ai":     engine_st.get("image_ai", "pollinations"),
        },
        "platforms": {
            "twitter":   bool(settings.TWITTER_API_KEY and settings.TWITTER_ACCESS_TOKEN),
            "reddit":    bool(os.getenv("REDDIT_CLIENT_ID") and os.getenv("REDDIT_PASSWORD")),
            "whatsapp":  bool(settings.WHATSAPP_ACCESS_TOKEN and settings.WHATSAPP_PHONE_NUMBER_ID),
            "linkedin":  bool(os.getenv("LINKEDIN_ACCESS_TOKEN")),
            "medium":    bool(os.getenv("MEDIUM_INTEGRATION_TOKEN")),
            "email":     bool(settings.SMTP_USER and settings.SMTP_PASSWORD),
            "instagram": bool(os.getenv("INSTAGRAM_ACCESS_TOKEN")),
            "youtube":   bool(os.getenv("YOUTUBE_API_KEY")),
            "onesignal": bool(os.getenv("ONESIGNAL_APP_ID")),
        },
    }


# ── MODULE: Content CRUD ──────────────────────────────────────────────────────

@router.get("/content")
async def list_content(
    agent_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_admin),
):
    q = select(MarketingContent).where(MarketingContent.status != "deleted")
    if agent_id:
        q = q.where(MarketingContent.agent_id == agent_id)
    if status_filter:
        q = q.where(MarketingContent.status == status_filter)
    if date_from:
        q = q.where(MarketingContent.created_at >= datetime.combine(date_from, datetime.min.time()).replace(tzinfo=timezone.utc))
    if date_to:
        q = q.where(MarketingContent.created_at <= datetime.combine(date_to, datetime.max.time()).replace(tzinfo=timezone.utc))
    if search:
        q = q.where(MarketingContent.title.ilike(f"%{search}%") | MarketingContent.content.ilike(f"%{search}%"))

    total_q = select(func.count()).select_from(q.subquery())
    total = await db.scalar(total_q) or 0

    q = q.order_by(MarketingContent.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(q)
    items = result.scalars().all()

    return {"total": total, "items": [_content_to_dict(c) for c in items]}


@router.get("/content/{content_id}")
async def get_content(content_id: str, db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    try:
        uid = uuid.UUID(content_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid content ID")
    result = await db.execute(select(MarketingContent).where(MarketingContent.id == uid))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Content not found")
    return _content_to_dict(obj)


@router.put("/content/{content_id}")
async def update_content(
    content_id: str,
    body: ContentUpdate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_admin),
):
    try:
        uid = uuid.UUID(content_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid content ID")
    result = await db.execute(select(MarketingContent).where(MarketingContent.id == uid))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Content not found")

    if body.status is not None:
        obj.status = body.status
    if body.scheduled_at is not None:
        obj.scheduled_at = body.scheduled_at
    if body.title is not None:
        obj.title = body.title
    if body.utm_link is not None:
        obj.utm_link = body.utm_link

    await db.commit()
    await db.refresh(obj)
    return _content_to_dict(obj)


@router.delete("/content/{content_id}", status_code=204)
async def delete_content(content_id: str, db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    try:
        uid = uuid.UUID(content_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid content ID")
    result = await db.execute(select(MarketingContent).where(MarketingContent.id == uid))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Content not found")
    obj.status = "archived"
    await db.commit()


# ── MODULE: Campaigns ─────────────────────────────────────────────────────────

@router.post("/campaigns", status_code=201)
async def create_campaign(body: CampaignCreate, db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    obj = MarketingCampaign(**body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {
        "id": str(obj.id), "name": obj.name, "theme": obj.theme, "goal": obj.goal,
        "city": obj.city, "duration_days": obj.duration_days,
        "start_date": obj.start_date.isoformat() if obj.start_date else None,
        "end_date": obj.end_date.isoformat() if obj.end_date else None,
        "status": obj.status, "created_at": obj.created_at.isoformat(),
    }


@router.get("/campaigns")
async def list_campaigns(db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    result = await db.execute(select(MarketingCampaign).order_by(MarketingCampaign.created_at.desc()))
    items = result.scalars().all()
    return [{"id": str(c.id), "name": c.name, "goal": c.goal, "status": c.status,
             "created_at": c.created_at.isoformat()} for c in items]


@router.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str, db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    try:
        uid = uuid.UUID(campaign_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid campaign ID")
    result = await db.execute(select(MarketingCampaign).where(MarketingCampaign.id == uid))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {
        "id": str(obj.id), "name": obj.name, "theme": obj.theme, "goal": obj.goal,
        "city": obj.city, "duration_days": obj.duration_days, "plan_content": obj.plan_content,
        "start_date": obj.start_date.isoformat() if obj.start_date else None,
        "end_date": obj.end_date.isoformat() if obj.end_date else None,
        "status": obj.status, "created_at": obj.created_at.isoformat(),
    }


# ── MODULE: Analytics ─────────────────────────────────────────────────────────

@router.post("/analytics", status_code=201)
async def log_analytics(body: AnalyticsCreate, db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    content_uuid = uuid.UUID(body.content_id) if body.content_id else None
    obj = MarketingAnalytics(
        content_id=content_uuid,
        platform=body.platform,
        metric_name=body.metric_name,
        metric_value=body.metric_value,
        notes=body.notes,
        recorded_at=body.recorded_at or date.today(),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {"id": str(obj.id), "platform": obj.platform, "metric_name": obj.metric_name,
            "metric_value": obj.metric_value, "recorded_at": obj.recorded_at.isoformat()}


@router.get("/analytics/summary")
async def analytics_summary(days: int = Query(30, ge=1, le=365), db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    since = date.today() - timedelta(days=days)
    result = await db.execute(
        select(MarketingAnalytics.platform, MarketingAnalytics.metric_name,
               func.sum(MarketingAnalytics.metric_value).label("total"))
        .where(MarketingAnalytics.recorded_at >= since)
        .group_by(MarketingAnalytics.platform, MarketingAnalytics.metric_name)
    )
    rows = result.all()
    by_platform: Dict[str, Dict[str, int]] = {}
    for platform, metric, total in rows:
        by_platform.setdefault(platform, {})[metric] = int(total or 0)
    total_reach = sum(
        v.get("ig_reach", 0) + v.get("reddit_upvotes", 0) + v.get("youtube_views", 0)
        + v.get("quora_views", 0) + v.get("email_opens", 0)
        for v in by_platform.values()
    )
    return {"by_platform": by_platform, "total_estimated_reach": total_reach, "days": days}


@router.get("/analytics/chart")
async def analytics_chart(days: int = Query(30, ge=7, le=90), db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    since = date.today() - timedelta(days=days)
    result = await db.execute(
        select(MarketingAnalytics.recorded_at, MarketingAnalytics.platform,
               func.sum(MarketingAnalytics.metric_value).label("total"))
        .where(MarketingAnalytics.recorded_at >= since)
        .group_by(MarketingAnalytics.recorded_at, MarketingAnalytics.platform)
        .order_by(MarketingAnalytics.recorded_at)
    )
    rows = result.all()
    points: Dict[str, Dict[str, int]] = {}
    for rec_date, platform, total in rows:
        ds = rec_date.isoformat()
        points.setdefault(ds, {})[platform] = int(total or 0)
    return {"chart": [{"date": d, **vals} for d, vals in sorted(points.items())]}


# ── MODULE: Goals ─────────────────────────────────────────────────────────────

@router.post("/goals", status_code=201)
async def create_goal(body: GoalCreate, db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    # upsert pattern
    existing = await db.execute(
        select(MarketingGoal).where(
            and_(MarketingGoal.month == body.month,
                 MarketingGoal.platform == body.platform,
                 MarketingGoal.metric_name == body.metric_name)
        )
    )
    obj = existing.scalar_one_or_none()
    if obj:
        obj.target_value = body.target_value
    else:
        obj = MarketingGoal(**body.model_dump())
        db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {"id": str(obj.id), "month": obj.month.isoformat(), "platform": obj.platform,
            "metric_name": obj.metric_name, "target_value": obj.target_value, "current_value": obj.current_value}


@router.get("/goals")
async def list_goals(
    month: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_admin),
):
    target_month = month or date.today().replace(day=1)
    result = await db.execute(
        select(MarketingGoal).where(MarketingGoal.month == target_month)
    )
    items = result.scalars().all()
    return [{"id": str(g.id), "month": g.month.isoformat(), "platform": g.platform,
             "metric_name": g.metric_name, "target_value": g.target_value,
             "current_value": g.current_value} for g in items]


@router.put("/goals/{goal_id}")
async def update_goal(goal_id: str, body: GoalUpdate, db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    try:
        uid = uuid.UUID(goal_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid goal ID")
    result = await db.execute(select(MarketingGoal).where(MarketingGoal.id == uid))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Goal not found")
    obj.current_value = body.current_value
    await db.commit()
    return {"id": str(obj.id), "current_value": obj.current_value}


# ── MODULE: Schedule ──────────────────────────────────────────────────────────

def _schedule_to_dict(s: MarketingSchedule) -> dict:
    return {
        "id": str(s.id),
        "content_id": str(s.content_id) if s.content_id else None,
        "platform": s.platform,
        "scheduled_for": s.scheduled_for.isoformat(),
        "notes": s.notes,
        "reminder_sent": s.reminder_sent,
        "is_posted": s.is_posted,
        "posted_at": s.posted_at.isoformat() if s.posted_at else None,
        "created_at": s.created_at.isoformat(),
    }


@router.get("/schedule/today")
async def schedule_today(db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    today = date.today()
    start = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
    end = datetime.combine(today, datetime.max.time()).replace(tzinfo=timezone.utc)
    result = await db.execute(
        select(MarketingSchedule)
        .where(and_(MarketingSchedule.scheduled_for >= start, MarketingSchedule.scheduled_for <= end))
        .order_by(MarketingSchedule.scheduled_for)
    )
    items = result.scalars().all()
    return [_schedule_to_dict(s) for s in items]


@router.get("/schedule/week")
async def schedule_week(db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    today = date.today()
    start = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
    end = datetime.combine(today + timedelta(days=7), datetime.max.time()).replace(tzinfo=timezone.utc)
    result = await db.execute(
        select(MarketingSchedule)
        .where(and_(MarketingSchedule.scheduled_for >= start, MarketingSchedule.scheduled_for <= end))
        .order_by(MarketingSchedule.scheduled_for)
    )
    items = result.scalars().all()
    return [_schedule_to_dict(s) for s in items]


@router.post("/schedule", status_code=201)
async def create_schedule(body: ScheduleCreate, db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    content_uuid = uuid.UUID(body.content_id) if body.content_id else None
    obj = MarketingSchedule(
        content_id=content_uuid,
        platform=body.platform,
        scheduled_for=body.scheduled_for,
        notes=body.notes,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)

    # Update content status to scheduled
    if content_uuid:
        res = await db.execute(select(MarketingContent).where(MarketingContent.id == content_uuid))
        content = res.scalar_one_or_none()
        if content:
            content.status = "scheduled"
            content.scheduled_at = body.scheduled_for
            await db.commit()

    return _schedule_to_dict(obj)


@router.put("/schedule/{schedule_id}")
async def update_schedule(
    schedule_id: str,
    body: ScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_admin),
):
    try:
        uid = uuid.UUID(schedule_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid schedule ID")
    result = await db.execute(select(MarketingSchedule).where(MarketingSchedule.id == uid))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Schedule entry not found")

    if body.is_posted is not None:
        obj.is_posted = body.is_posted
        if body.is_posted:
            obj.posted_at = datetime.now(tz=timezone.utc)
            # Also update content status
            if obj.content_id:
                res = await db.execute(select(MarketingContent).where(MarketingContent.id == obj.content_id))
                content = res.scalar_one_or_none()
                if content:
                    content.status = "published"
                    content.published_at = obj.posted_at
    if body.scheduled_for is not None:
        obj.scheduled_for = body.scheduled_for
    if body.notes is not None:
        obj.notes = body.notes

    await db.commit()
    return _schedule_to_dict(obj)


# ── MODULE: UTM Generator ─────────────────────────────────────────────────────

@router.post("/utm")
async def generate_utm(body: UTMRequest, admin=Depends(require_admin)):
    params = {
        "utm_source": body.source,
        "utm_medium": body.medium,
        "utm_campaign": body.campaign,
    }
    if body.content:
        params["utm_content"] = body.content
    if body.term:
        params["utm_term"] = body.term

    separator = "&" if "?" in body.destination_url else "?"
    utm_link = f"{body.destination_url.rstrip('/')}{separator}{urlencode(params)}"
    return {"utm_link": utm_link, "params": params}


# ── MODULE: Dashboard stats ───────────────────────────────────────────────────

@router.get("/dashboard/stats")
async def dashboard_stats(db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    now = datetime.now(tz=timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)

    # Total content generated (non-deleted)
    total_content = await db.scalar(
        select(func.count()).select_from(MarketingContent).where(MarketingContent.status != "deleted")
    ) or 0

    # Campaigns this month
    campaigns_this_month = await db.scalar(
        select(func.count()).select_from(MarketingCampaign)
        .where(MarketingCampaign.created_at >= month_start)
    ) or 0

    # Scheduled (pending publish)
    scheduled_count = await db.scalar(
        select(func.count()).select_from(MarketingContent)
        .where(MarketingContent.status == "scheduled")
    ) or 0

    # Agents active in last 7 days
    agents_active_result = await db.execute(
        select(func.count(func.distinct(MarketingContent.agent_id)))
        .select_from(MarketingContent)
        .where(MarketingContent.created_at >= week_ago)
    )
    agents_active = agents_active_result.scalar() or 0

    # Estimated organic reach (sum of all metric values)
    total_reach = await db.scalar(
        select(func.sum(MarketingAnalytics.metric_value)).select_from(MarketingAnalytics)
    ) or 0

    # Top performing channel (most generated content this month)
    top_channel_result = await db.execute(
        select(MarketingContent.agent_id, func.count().label("cnt"))
        .where(MarketingContent.created_at >= month_start)
        .group_by(MarketingContent.agent_id)
        .order_by(func.count().desc())
        .limit(1)
    )
    top_row = top_channel_result.first()
    top_channel = top_row[0] if top_row else None

    # Recent content (last 5)
    recent_result = await db.execute(
        select(MarketingContent)
        .where(MarketingContent.status != "deleted")
        .order_by(MarketingContent.created_at.desc())
        .limit(5)
    )
    recent_items = recent_result.scalars().all()

    # Content by platform (for donut chart)
    platform_result = await db.execute(
        select(MarketingContent.agent_id, func.count().label("cnt"))
        .where(MarketingContent.status != "deleted")
        .group_by(MarketingContent.agent_id)
    )
    by_platform = {row[0]: row[1] for row in platform_result.all()}

    return {
        "total_content": total_content,
        "campaigns_this_month": campaigns_this_month,
        "estimated_reach": int(total_reach),
        "agents_active_7d": agents_active,
        "content_scheduled": scheduled_count,
        "top_channel": top_channel,
        "recent_content": [_content_to_dict(c) for c in recent_items],
        "by_platform": by_platform,
    }
