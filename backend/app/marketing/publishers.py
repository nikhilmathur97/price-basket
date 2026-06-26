"""
PriceBasket Live Social Media Publishers v3.0
Posts directly to platform APIs.
All credentials read from backend/.env (already configured there).
"""
import asyncio
import logging
import os
import smtplib
from dataclasses import dataclass, field
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class PostResult:
    success: bool
    platform: str
    post_id: str = ""
    url: str = ""
    error: str = ""

    def dict(self):
        return {
            "success": self.success,
            "platform": self.platform,
            "post_id": self.post_id,
            "url": self.url,
            "error": self.error,
        }


# ── TWITTER ──────────────────────────────────────────────────────────────────

async def post_twitter(content: str, image_b64: str = "") -> PostResult:
    """Post a tweet or thread using Twitter API v2 via tweepy."""
    try:
        import tweepy  # type: ignore
    except ImportError:
        return PostResult(False, "twitter", error="tweepy not installed. Run: pip install tweepy")

    api_key    = settings.TWITTER_API_KEY
    api_secret = settings.TWITTER_API_SECRET
    acc_token  = settings.TWITTER_ACCESS_TOKEN
    acc_secret = settings.TWITTER_ACCESS_SECRET

    if not all([api_key, api_secret, acc_token, acc_secret]):
        return PostResult(False, "twitter", error="Missing Twitter credentials in .env (TWITTER_API_KEY / TWITTER_ACCESS_TOKEN etc.)")

    try:
        client = tweepy.Client(
            consumer_key=api_key,
            consumer_secret=api_secret,
            access_token=acc_token,
            access_token_secret=acc_secret,
        )
        tweets = _split_thread(content)
        if len(tweets) > 1:
            first = client.create_tweet(text=tweets[0])
            pid   = first.data["id"]
            for tw in tweets[1:]:
                r   = client.create_tweet(text=tw, in_reply_to_tweet_id=pid)
                pid = r.data["id"]
                await asyncio.sleep(2)
            first_id = str(first.data["id"])
            return PostResult(True, "twitter", post_id=first_id,
                              url=f"https://twitter.com/i/web/status/{first_id}")
        r = client.create_tweet(text=tweets[0][:280])
        tid = str(r.data["id"])
        return PostResult(True, "twitter", post_id=tid,
                          url=f"https://twitter.com/i/web/status/{tid}")
    except Exception as e:
        return PostResult(False, "twitter", error=str(e))


def _split_thread(text: str) -> list:
    """Split numbered thread into individual tweets."""
    import re
    parts = re.split(r"\n(?=\d+/\d+\s)", text.strip())
    if len(parts) > 1:
        return [p[:280] for p in parts if p.strip()]
    return [text[:280]]


# ── REDDIT ────────────────────────────────────────────────────────────────────

async def post_reddit(title: str, body: str, subreddit: str = "india") -> PostResult:
    """Submit a self-post to Reddit using PRAW."""
    try:
        import praw  # type: ignore
    except ImportError:
        return PostResult(False, "reddit", error="praw not installed. Run: pip install praw")

    client_id     = os.getenv("REDDIT_CLIENT_ID", "")
    client_secret = os.getenv("REDDIT_CLIENT_SECRET", "")
    username      = os.getenv("REDDIT_USERNAME", "")
    password      = os.getenv("REDDIT_PASSWORD", "")
    user_agent    = os.getenv("REDDIT_USER_AGENT", "PriceBasketAgent/3.0")

    if not all([client_id, client_secret, username, password]):
        return PostResult(False, "reddit", error="Missing Reddit credentials. Set REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET / REDDIT_USERNAME / REDDIT_PASSWORD in .env")

    try:
        reddit = praw.Reddit(
            client_id=client_id,
            client_secret=client_secret,
            username=username,
            password=password,
            user_agent=user_agent,
        )
        sub  = reddit.subreddit(subreddit.replace("r/", ""))
        post = sub.submit(title=title[:300], selftext=body)
        return PostResult(True, "reddit", post_id=post.id,
                          url=f"https://reddit.com{post.permalink}")
    except Exception as e:
        return PostResult(False, "reddit", error=str(e))


# ── WHATSAPP ──────────────────────────────────────────────────────────────────

async def post_whatsapp(message: str, phone_numbers: list) -> PostResult:
    """Send WhatsApp messages via Meta Cloud API."""
    try:
        import httpx  # type: ignore
    except ImportError:
        return PostResult(False, "whatsapp", error="httpx not installed. Run: pip install httpx")

    token    = settings.WHATSAPP_ACCESS_TOKEN
    phone_id = settings.WHATSAPP_PHONE_NUMBER_ID

    if not token or not phone_id:
        return PostResult(False, "whatsapp",
                          error="Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID in .env")

    if not phone_numbers:
        return PostResult(False, "whatsapp", error="No phone numbers provided")

    success_count = 0
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            for phone in phone_numbers:
                r = await client.post(
                    f"https://graph.facebook.com/v19.0/{phone_id}/messages",
                    headers={"Authorization": f"Bearer {token}"},
                    json={
                        "messaging_product": "whatsapp",
                        "to": phone,
                        "type": "text",
                        "text": {"body": message[:4096]},
                    },
                )
                if r.status_code == 200:
                    success_count += 1
        return PostResult(True, "whatsapp",
                          post_id=f"sent:{success_count}/{len(phone_numbers)}")
    except Exception as e:
        return PostResult(False, "whatsapp", error=str(e))


# ── LINKEDIN ──────────────────────────────────────────────────────────────────

async def post_linkedin(content: str, is_company: bool = False) -> PostResult:
    """Post to LinkedIn via UGC Posts API."""
    try:
        import httpx  # type: ignore
    except ImportError:
        return PostResult(False, "linkedin", error="httpx not installed. Run: pip install httpx")

    token   = os.getenv("LINKEDIN_ACCESS_TOKEN", "")
    org_id  = os.getenv("LINKEDIN_ORGANIZATION_ID", "")
    person  = os.getenv("LINKEDIN_PERSON_URN", "")

    if not token:
        return PostResult(False, "linkedin",
                          error="Missing LINKEDIN_ACCESS_TOKEN. Set it in .env.marketing")

    author = f"urn:li:organization:{org_id}" if (is_company and org_id) else f"urn:li:person:{person}"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(
                "https://api.linkedin.com/v2/ugcPosts",
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-Restli-Protocol-Version": "2.0.0",
                },
                json={
                    "author": author,
                    "lifecycleState": "PUBLISHED",
                    "specificContent": {
                        "com.linkedin.ugc.ShareContent": {
                            "shareCommentary": {"text": content[:3000]},
                            "shareMediaCategory": "NONE",
                        }
                    },
                    "visibility": {
                        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
                    },
                },
            )
        if r.status_code == 201:
            pid = r.headers.get("x-restli-id", "unknown")
            return PostResult(True, "linkedin", post_id=pid,
                              url=f"https://www.linkedin.com/feed/update/{pid}")
        return PostResult(False, "linkedin",
                          error=f"HTTP {r.status_code}: {r.text[:200]}")
    except Exception as e:
        return PostResult(False, "linkedin", error=str(e))


# ── MEDIUM ────────────────────────────────────────────────────────────────────

async def post_medium(title: str, content: str, tags: list = None) -> PostResult:
    """Publish a post to Medium via Integration Token."""
    try:
        import httpx  # type: ignore
    except ImportError:
        return PostResult(False, "medium", error="httpx not installed. Run: pip install httpx")

    token  = os.getenv("MEDIUM_INTEGRATION_TOKEN", "")
    author = os.getenv("MEDIUM_AUTHOR_ID", "")

    if not token or not author:
        return PostResult(False, "medium",
                          error="Missing MEDIUM_INTEGRATION_TOKEN or MEDIUM_AUTHOR_ID in .env.marketing")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(
                f"https://api.medium.com/v1/users/{author}/posts",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "title": title,
                    "contentFormat": "markdown",
                    "content": content,
                    "tags": tags or ["grocery", "india", "savings", "pricebasket"],
                    "publishStatus": "public",
                },
            )
        if r.status_code == 201:
            d = r.json()["data"]
            return PostResult(True, "medium", post_id=d["id"], url=d["url"])
        return PostResult(False, "medium",
                          error=f"HTTP {r.status_code}: {r.text[:200]}")
    except Exception as e:
        return PostResult(False, "medium", error=str(e))


# ── EMAIL ─────────────────────────────────────────────────────────────────────

async def post_email(subject: str, html_body: str, to_list: list) -> PostResult:
    """Send email via SMTP (uses existing SMTP settings from app config)."""
    host = settings.SMTP_HOST
    port = settings.SMTP_PORT
    user = settings.SMTP_USER
    pwd  = settings.SMTP_PASSWORD

    if not user or not pwd:
        return PostResult(False, "email",
                          error="Missing SMTP credentials. Set SMTP_USER and SMTP_PASSWORD in .env")

    if not to_list:
        return PostResult(False, "email", error="No recipient email addresses provided")

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"PriceBasket <{user}>"
        msg["To"]      = ", ".join(to_list)
        msg.attach(MIMEText(
            f"<div style='font-family:sans-serif;max-width:600px;margin:0 auto'>{html_body}</div>",
            "html"
        ))

        def _send():
            with smtplib.SMTP(host, port) as s:
                s.starttls()
                s.login(user, pwd)
                s.sendmail(user, to_list, msg.as_string())

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _send)
        return PostResult(True, "email", post_id=f"sent:{len(to_list)}")
    except Exception as e:
        return PostResult(False, "email", error=str(e))


# ── ONESIGNAL PUSH ────────────────────────────────────────────────────────────

async def post_push_notification(
    title: str,
    message: str,
    url: str = "https://pricebasket.in",
) -> PostResult:
    """Send push notification via OneSignal."""
    try:
        import httpx  # type: ignore
    except ImportError:
        return PostResult(False, "onesignal", error="httpx not installed")

    app_id = os.getenv("ONESIGNAL_APP_ID", "")
    key    = os.getenv("ONESIGNAL_REST_API_KEY", "")

    if not app_id or not key:
        return PostResult(False, "onesignal",
                          error="Missing ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY in .env.marketing")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(
                "https://onesignal.com/api/v1/notifications",
                headers={"Authorization": f"Basic {key}"},
                json={
                    "app_id": app_id,
                    "included_segments": ["All"],
                    "headings": {"en": title[:64]},
                    "contents": {"en": message[:256]},
                    "url": url,
                },
            )
        if r.status_code in (200, 201):
            return PostResult(True, "onesignal", post_id=r.json().get("id", ""))
        return PostResult(False, "onesignal", error=f"HTTP {r.status_code}")
    except Exception as e:
        return PostResult(False, "onesignal", error=str(e))


# ── DISPATCHER ────────────────────────────────────────────────────────────────

async def dispatch(platform: str, content: str, extra: dict = None) -> PostResult:
    """Route a publish request to the correct platform handler."""
    extra = extra or {}
    p = platform.lower()

    if p == "twitter":
        return await post_twitter(content)

    if p == "reddit":
        title     = extra.get("title") or content[:100]
        subreddit = extra.get("subreddit", "india")
        return await post_reddit(title, content, subreddit)

    if p == "whatsapp":
        phones_raw = extra.get("phones", extra.get("phone_numbers", ""))
        if isinstance(phones_raw, str):
            phones = [p.strip() for p in phones_raw.split(",") if p.strip()]
        else:
            phones = list(phones_raw)
        return await post_whatsapp(content, phones)

    if p == "linkedin":
        return await post_linkedin(content, extra.get("is_company", False))

    if p == "medium":
        return await post_medium(
            extra.get("title", "PriceBasket"),
            content,
            extra.get("tags", []),
        )

    if p == "email":
        emails_raw = extra.get("emails", extra.get("to_list", ""))
        if isinstance(emails_raw, str):
            to_list = [e.strip() for e in emails_raw.split(",") if e.strip()]
        else:
            to_list = list(emails_raw)
        subject = extra.get("subject", "PriceBasket Update")
        return await post_email(subject, f"<pre style='white-space:pre-wrap'>{content}</pre>", to_list)

    if p in ("push", "onesignal"):
        return await post_push_notification(
            extra.get("title", "PriceBasket"),
            content[:256],
        )

    return PostResult(
        False, platform,
        error=f"Platform '{platform}' does not support auto-posting yet. Copy the content above and post manually."
    )
