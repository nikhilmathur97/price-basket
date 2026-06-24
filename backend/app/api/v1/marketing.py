"""
PriceBasket Free Digital Marketing Agent System — FastAPI router.

Endpoints:
  POST /marketing/agents/run          → stream Claude response (SSE)
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


def _build_user_prompt(agent_id: str, inputs: dict, tone: str, city: str) -> str:
    i = inputs  # shorthand

    if agent_id == "seo":
        return f"""Write a complete SEO content package for PriceBasket.
Target keyword: {i.get('keyword', 'grocery price comparison app India')}
Topic: {i.get('topic', 'how to save money on groceries')}
Word count: {i.get('word_count', '600')}
City focus: {city} | Tone: {tone}

DELIVER:
1. BLOG ARTICLE — Full article with H1 + 3 H2 subheadings. Natural keyword use. End with app download CTA. Include 1 comparison table (platform vs price).
2. META TITLE — 60 chars max, include keyword
3. META DESCRIPTION — 155 chars max, compelling + keyword
4. FAQ SCHEMA — 3 Q&As in complete JSON-LD format, paste-ready
5. INTERNAL LINKS — 3 anchor text suggestions for linking to other pricebasket.in pages

WHY THIS WORKS: [2-line SEO strategy rationale]"""

    if agent_id == "reddit":
        return f"""Write a Reddit organic content package for PriceBasket.
Subreddit target: {i.get('subreddit', 'r/india')}
Post angle: {i.get('angle', 'story')}
City: {city} | Tone: conversational, human

DELIVER:
1. POST TITLE — Optimized for upvotes, not sales. ≤120 chars.
2. POST BODY — 200 words. First-person story. Genuine discovery moment. PriceBasket appears as natural solution, never as subject.
3. COMMENT DAY 2 — Adding value follow-up comment
4. COMMENT DAY 4 — Responding to imagined question/skepticism
5. COMMENT DAY 7 — Update post with "results"
6. SUBREDDIT LIST — 5 subreddits + why each one works + best day/time to post
7. SAFETY RULES — 3 tips to avoid removal or spam flags

WHY THIS WORKS: [Reddit organic strategy rationale]"""

    if agent_id == "instagram":
        return f"""Write a complete Instagram content package for PriceBasket.
Post type: {i.get('post_type', 'carousel')}
Theme: {i.get('theme', 'savings')}
Tone: {tone} | City: {city}

DELIVER:
1. CAPTION A — Hinglish, 150 words, 3-5 emojis, ends with engagement question
2. CAPTION B — English, punchy 80 words, wit over warmth
3. HASHTAG SET — Exactly 30 hashtags on separate lines:
   [HIGH VOLUME - 10]: #GroceryIndia etc.
   [MID VOLUME - 10]: #BlinkvsBigBasket etc.
   [NICHE - 10]: #JodhpurSavings etc.
4. REEL SCRIPT — 15s hook: LINE 1 (0-3s hook) / LINES 2-4 (3-13s reveal) / LINE 5 (13-15s CTA)
5. CAROUSEL SLIDES — Title for each of 6 slides + 1-line copy per slide
6. VISUAL BRIEF — Image/design description for Canva (colors, layout, text placement)

WHY THIS WORKS: [Instagram algorithm rationale]"""

    if agent_id == "twitter":
        tweet_count = i.get('tweet_count', '8')
        return f"""Write a viral Twitter/X thread for PriceBasket.
Topic: {i.get('topic', 'how to save on groceries')}
Hook style: {i.get('hook_style', 'shocking stat')}
Tweet count: {tweet_count}
Tone: {tone}

DELIVER:
1. THREAD — {tweet_count} tweets numbered X/{tweet_count}.
   Tweet 1: Pattern interrupt hook (no "I", start with number/question/bold claim)
   Tweets 2-{int(tweet_count)-1}: Value, story, data, insight
   Tweet {tweet_count}: CTA + pricebasket.in
   Each tweet ≤280 chars. Line breaks for readability.
2. STANDALONE TWEET — Single punchy tweet version for off-thread posting
3. HASHTAGS — 5 hashtags (2 trending + 3 niche)
4. REPLY TEMPLATES — 2 pre-written replies for when people engage
5. BEST TIME — Day + time to post for max Indian audience reach

WHY THIS WORKS: [Twitter virality rationale]"""

    if agent_id == "whatsapp":
        return f"""Write a WhatsApp marketing content package for PriceBasket.
Message type: {i.get('message_type', 'broadcast')}
Group type: {i.get('group_type', 'housing-society')}
Urgency: {i.get('urgency', 'medium')}
City: {city}

DELIVER:
1. MAIN MESSAGE — ≤200 words. Personal tone (from a friend). Max 3 emojis total. Include specific savings figure (₹X saved this week). Ends with pricebasket.in.
2. FOLLOW-UP DAY 3 — 60-word nudge for non-clickers. Different angle.
3. FOLLOW-UP DAY 7 — FOMO angle. "Prices changed again" trigger.
4. GROUP INTRO — Natural script for introducing PriceBasket organically in a WhatsApp group. Must not sound like an ad. Max 3 sentences.
5. POLL MESSAGE — Engaging grocery poll (drives organic discussion, not about PriceBasket directly)

WHY THIS WORKS: [WhatsApp viral loop rationale]"""

    if agent_id == "youtube":
        return f"""Write a complete YouTube Shorts content package for PriceBasket.
Concept: {i.get('concept', 'price comparison reveal')}
Duration: {i.get('duration', '45s')}
Style: {i.get('style', 'talking-head')}
Tone: {tone} | City: {city}

DELIVER:
1. FULL SCRIPT — Timestamped, labeled per line:
   VOICEOVER: [spoken words]
   ON-SCREEN: [text to show]
   B-ROLL: [visual to show / what to film]
   Hook at 0-3s. Must work muted (text carries story).
2. THUMBNAIL CONCEPT — Describe: background, subject, text overlay (≤6 words), emotion
3. TITLES — 3 options (keyword + curiosity + hindi variant)
4. DESCRIPTION — 150 words with 3 keywords + pricebasket.in + app link
5. TAGS — 15 tags (mix of broad + specific + Hindi)
6. EDITING NOTES — 5 specific cut/effect suggestions for CapCut free

WHY THIS WORKS: [YouTube Shorts algorithm rationale]"""

    if agent_id == "quora":
        return f"""Write a Quora authority content package for PriceBasket.
Question theme: {i.get('theme', 'app comparison')}
Answer style: {i.get('style', 'data-driven')}
City: {city}

DELIVER:
1. ANSWER 1 (300 words) — Question: "Which app is best for comparing grocery prices in India?" Lead with data/insight. PriceBasket as natural recommendation, NOT first sentence.
2. ANSWER 2 (250 words) — Question: "How do I save money ordering from Blinkit and Zepto?" Practical tips first. PriceBasket as the tool, not the product.
3. ANSWER 3 (200 words) — Question: "Is quick commerce cheaper than local kirana shops?" Data-driven comparison. PriceBasket as reference for real prices.
4. QUESTION TARGETING LIST — 10 Quora questions to answer with estimated monthly views
5. AUTHOR BIO — 50-word bio establishing credibility (pricing/savings expert angle)
6. UPVOTE HOOKS — Opening line for each answer (first 15 words = upvote bait)

WHY THIS WORKS: [Quora SEO compounding rationale]"""

    if agent_id == "email":
        return f"""Write a complete email marketing package for PriceBasket.
Newsletter type: {i.get('newsletter_type', 'weekly-digest')}
Top price drops this week: {i.get('price_drops', 'Amul Butter ₹8 cheaper on Zepto, Tata Salt ₹5 cheaper on Blinkit')}
Segment: {i.get('segment', 'active')}

DELIVER:
1. NEWSLETTER — "PriceBasket Savings Digest" full email:
   SUBJECT A/B/C: 3 subject line variants (curiosity / savings / FOMO)
   PREVIEW TEXT: 90 chars for each subject
   GREETING: Personal, first-name friendly
   SECTION 1: This week's top 3 price drops (specific platform + item + saving)
   SECTION 2: Savings tip of the week (how to use PriceBasket smartly)
   SECTION 3: Did you know? (one product feature spotlight)
   CTA BUTTON: Text + URL
   FOOTER: Unsubscribe note + pricebasket.in
2. WELCOME EMAIL — For new subscribers. 150 words. Deliver immediate value.
3. RE-ENGAGEMENT EMAIL 1 (Day 7 no open) — Subject + 80-word body
4. RE-ENGAGEMENT EMAIL 2 (Day 14 no open) — Subject + 60-word body (FOMO angle)
5. RE-ENGAGEMENT EMAIL 3 (Day 21 no open) — "Last email" breakup style. 40 words.

WHY THIS WORKS: [Email list compounding rationale]"""

    if agent_id == "linkedin":
        return f"""Write a LinkedIn marketing package for PriceBasket.
Content type: {i.get('content_type', 'founder-story')}
Target audience: {i.get('target', 'consumer-awareness')}
Tone: {tone}

DELIVER:
1. FOUNDER POST (Nikhil's personal post) — 200 words story format:
   Line 1: Pattern interrupt hook (not "I am proud to announce")
   Lines 2-8: Problem → Decision → Build → Result story
   End with open question to drive comments (LinkedIn ranks comments)
2. COMPANY PAGE POST — More formal. Product/data angle. 120 words.
3. B2B COLD DM — For FMCG brand managers about pricing intelligence API:
   Opening: curiosity hook (not "Hi, I'm from PriceBasket")
   Value prop: SKU-level competitor pricing data (₹25k–1.25L/month)
   CTA: 15-min call ask. ≤100 words.
4. CONNECTION NOTE — 300 chars max. Reason to connect that's about them, not you.
5. HASHTAGS — 10 LinkedIn hashtags sorted by relevance
6. COMMENT TEMPLATES — 3 engagement comments to leave on related posts

WHY THIS WORKS: [LinkedIn organic growth rationale]"""

    if agent_id == "campaign":
        return f"""Build a complete free digital marketing campaign for PriceBasket.
Theme: {i.get('theme', 'Compare Before You Cart')}
Duration: {i.get('duration', '30 days')}
Primary goal: {i.get('goal', 'app installs')}
City focus: {city}

DELIVER:
1. CREATIVE CONCEPT — Campaign name + 1-paragraph creative brief + key message
2. WEEKLY PLAN:
   Week 1 (Foundation): Which 3 agents to run, what content, which platforms, what days
   Week 2 (Amplify): Content types, cross-posting, community engagement targets
   Week 3 (Convert): Conversion-focused content, CTA intensity, email push
   Week 4 (Retain + B2B): Retention content, referral ask, B2B LinkedIn outreach
3. DAILY POSTING SCHEDULE — Mon–Sun, each day: platform + content type + best time
4. CONTENT REPURPOSING MAP — Show how 1 SEO blog → Twitter thread → Instagram carousel → WhatsApp message → Quora answer → YouTube Short
5. KPI TARGETS (Month 1, realistic free-channel numbers):
   - Instagram organic reach, Reddit post impressions, Quora answer views
   - Email subscribers gained, YouTube Shorts views, Website sessions from organic
6. FREE TOOLS CHECKLIST — Tool name + purpose + setup time
7. WEEK 1 ACTION CHECKLIST — Day-by-day todo list admin can tick off

WHY THIS WORKS: [Full campaign compounding strategy rationale]"""

    return f"Generate marketing content for PriceBasket. Context: {json.dumps(i)}. Tone: {tone}. City: {city}."


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
    """Stream a Gemini marketing agent response via SSE. Auto-saves to DB on completion."""
    if body.agent_id not in VALID_AGENT_IDS:
        raise HTTPException(status_code=400, detail=f"Unknown agent_id '{body.agent_id}'. Valid: {sorted(VALID_AGENT_IDS)}")

    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured on the backend.")

    try:
        from google import genai
        from google.genai import types as genai_types
    except ImportError:
        raise HTTPException(status_code=503, detail="google-genai SDK not installed. Run: pip install google-genai")

    system_prompt = _build_system_prompt(body.agent_id)
    if body.custom_context:
        system_prompt += f"\n\nADDITIONAL CONTEXT FROM ADMIN:\n{body.custom_context}"

    user_prompt = _build_user_prompt(body.agent_id, body.inputs, body.tone, body.city)

    async def event_stream():
        accumulated = []
        try:
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            stream = await client.aio.models.generate_content_stream(
                model="gemini-flash-lite-latest",
                contents=user_prompt,
                config=genai_types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    max_output_tokens=4000,
                    temperature=0.9,
                ),
            )
            async for chunk in stream:
                if chunk.text:
                    accumulated.append(chunk.text)
                    yield f"data: {json.dumps({'text': chunk.text})}\n\n"

            # Auto-save to DB after stream completes
            full_content = "".join(accumulated)
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
                yield f"data: [SAVED:{content_id}]\n\n"
            except Exception as save_err:
                log.error("marketing_content_save_failed", error=str(save_err))
                # Stream already complete — just skip the save notification

            yield "data: [DONE]\n\n"

        except Exception as err:
            log.error("marketing_agent_stream_failed", agent=body.agent_id, error=str(err))
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
