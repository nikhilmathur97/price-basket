"""
PriceBasket Marketing AI Engine v3.0
- Text: Amazon Bedrock (Claude) primary → Gemini REST fallback → error
- Images: Pollinations.ai (free) → Stability AI (optional)

Provider priority:
  1. Amazon Bedrock (Claude via ~/.aws/credentials — already configured)
  2. Gemini REST API (multi-model fallback on 429)
  3. Error message if both unavailable
"""
import asyncio
import base64
import json as _json
import logging
import os
import urllib.parse
from typing import AsyncGenerator

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

MASTER_SYSTEM = """You are PriceBasket's Professional Digital Marketing AI Agent — an expert
content creator, brand strategist, and social media specialist.

═══ BRAND BIBLE ════════════════════════════════════════════════════════

Product:  PriceBasket (pricebasket.in)
Category: India's smartest quick-commerce grocery price comparison app
Tagline:  COMPARE • SAVE • SMART
Primary:  #F47A20 (Orange) | Secondary: #1a1a1a (Black)
Voice:    Witty, savings-obsessed, smart, authentic Hinglish where natural
Founder:  Nikhil — Jodhpur, Rajasthan (Tier 2 India perspective = USP)
Users:    Urban Indians 22–40, housewives, students, budget-conscious families

═══ COMPETITIVE MOAT ═══════════════════════════════════════════════════

✅ Covers ALL 6 platforms: Blinkit + Zepto + Swiggy Instamart +
   BigBasket + JioMart + Flipkart Minutes
✅ Competitors (QuickCompare etc.) miss JioMart & Flipkart Minutes
✅ Zero ad clutter — clean, fast UX
✅ Tier 2 city support: Jodhpur, Jaipur, Indore, Nagpur etc.
✅ Price history trend charts (unique feature)
✅ Prices refresh every 30 minutes
✅ Users save avg ₹150–400/month

═══ CONTENT LAW (never violate) ════════════════════════════════════════

1. EVERY piece ends with CTA → pricebasket.in or app download link
2. NEVER name competitors negatively — use "other apps" tactfully
3. HINGLISH = natural blend, never mechanical translation
4. USE REAL NUMBERS: ₹150-400/month savings, 6 platforms, 30-min updates
5. Reddit/Quora = 100% organic — zero sales language ever
6. Hashtags = researched & specific (#GroceryHackIndia > #savings)
7. Every post must contain ONE relatable everyday grocery moment
8. Tier 2 city angle whenever possible — differentiates from metro-only apps

═══ OUTPUT STANDARD ════════════════════════════════════════════════════

- Structure with clear headers
- Deliver ALL requested pieces — never truncate or summarise
- Platform-specific character/word limits strictly respected
- End every output with a brief "📊 STRATEGY NOTE:" (2-line rationale)"""


def _bedrock_available() -> bool:
    """Check if AWS credentials + boto3 are available."""
    try:
        import boto3  # type: ignore
        client = boto3.client("sts", region_name=os.getenv("AWS_REGION", "us-east-1"))
        client.get_caller_identity()
        return True
    except Exception:
        return False


class AIEngine:
    def status(self) -> dict:
        bedrock_ok = _bedrock_available()
        gemini_ready = bool(settings.GEMINI_API_KEY)
        claude_key = getattr(settings, "ANTHROPIC_API_KEY", "")
        claude_ready = bool(claude_key)

        if bedrock_ok:
            active = "bedrock"
            model = os.getenv("BEDROCK_MODEL_ID", "us.anthropic.claude-sonnet-4-6")
        elif gemini_ready:
            active = "gemini"
            model = getattr(settings, "GEMINI_MODEL", "gemini-2.0-flash-lite")
        elif claude_ready:
            active = "claude"
            model = getattr(settings, "ANTHROPIC_MODEL", "claude-sonnet-4-6")
        else:
            active = "none"
            model = ""

        return {
            "bedrock": bedrock_ok,
            "gemini": gemini_ready,
            "claude": claude_ready,
            "image_ai": "pollinations",
            "active": active,
            "model": model,
            "ready": bedrock_ok or gemini_ready or claude_ready,
        }

    async def stream(
        self,
        prompt: str,
        system: str = MASTER_SYSTEM,
        agent_id: str = "",
    ) -> AsyncGenerator[str, None]:
        """Stream text — Bedrock primary, Gemini fallback, Claude fallback."""

        # ── 1. Amazon Bedrock (Claude) ─────────────────────────────────────────
        if _bedrock_available():
            try:
                async for chunk in self._stream_bedrock(prompt, system):
                    yield chunk
                return
            except Exception as e:
                logger.warning("bedrock_stream_failed — error=%s agent=%s, trying Gemini", str(e)[:150], agent_id)

        # ── 2. Gemini REST API (multi-model fallback) ──────────────────────────
        if settings.GEMINI_API_KEY:
            try:
                async for chunk in self._stream_gemini(prompt, system):
                    yield chunk
                return
            except Exception as e:
                logger.warning("gemini_stream_failed — error=%s agent=%s, trying Claude", str(e)[:150], agent_id)

        # ── 3. Anthropic Claude direct API ────────────────────────────────────
        claude_key = getattr(settings, "ANTHROPIC_API_KEY", "")
        if claude_key:
            async for chunk in self._stream_claude(prompt, system, claude_key):
                yield chunk
            return

        yield "❌ No AI provider available. Amazon Bedrock credentials are configured — check AWS region or model access."

    async def _stream_bedrock(self, prompt: str, system: str) -> AsyncGenerator[str, None]:
        """Stream from Amazon Bedrock (Claude) using invoke_model_with_response_stream."""
        import boto3  # type: ignore

        region = os.getenv("AWS_REGION", "us-east-1")
        model  = os.getenv("BEDROCK_MODEL_ID", "us.anthropic.claude-sonnet-4-6")

        body = _json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4000,
            "temperature": 0.9,
            "system": system,
            "messages": [{"role": "user", "content": prompt}],
        })

        loop = asyncio.get_event_loop()

        def _invoke():
            client = boto3.client("bedrock-runtime", region_name=region)
            return client.invoke_model_with_response_stream(
                modelId=model,
                body=body,
                contentType="application/json",
                accept="application/json",
            )

        response = await loop.run_in_executor(None, _invoke)
        stream = response.get("body")

        if not stream:
            raise Exception("Bedrock returned empty stream body")

        def _read_stream():
            chunks = []
            for event in stream:
                chunk = event.get("chunk")
                if chunk:
                    data = _json.loads(chunk.get("bytes", b"{}"))
                    if data.get("type") == "content_block_delta":
                        delta = data.get("delta", {})
                        if delta.get("type") == "text_delta":
                            chunks.append(delta.get("text", ""))
            return chunks

        text_chunks = await loop.run_in_executor(None, _read_stream)
        for chunk in text_chunks:
            if chunk:
                yield chunk
                await asyncio.sleep(0)

    async def _stream_gemini(self, prompt: str, system: str) -> AsyncGenerator[str, None]:
        """Stream from Gemini via direct REST API with multi-model fallback on 429."""
        configured_model = getattr(settings, "GEMINI_MODEL", "gemini-2.0-flash-lite")
        api_key = settings.GEMINI_API_KEY

        fallback_models = [configured_model]
        for m in ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-2.5-flash"]:
            if m not in fallback_models:
                fallback_models.append(m)

        last_error = None
        for model in fallback_models:
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}"
                f":streamGenerateContent?key={api_key}&alt=sse"
            )
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "systemInstruction": {"parts": [{"text": system}]},
                "generationConfig": {"maxOutputTokens": 4000, "temperature": 0.9},
            }
            try:
                yielded = False
                async with httpx.AsyncClient(timeout=120.0) as client:
                    async with client.stream("POST", url, json=payload) as resp:
                        if resp.status_code == 429:
                            await resp.aread()
                            last_error = f"Gemini {model} quota exceeded (429)"
                            logger.warning("gemini_model_quota_exceeded — model=%s trying next", model)
                            continue
                        if resp.status_code != 200:
                            body = await resp.aread()
                            last_error = f"Gemini API {resp.status_code}: {body.decode()[:200]}"
                            continue
                        async for line in resp.aiter_lines():
                            if not line.startswith("data: "):
                                continue
                            data_str = line[6:].strip()
                            if not data_str or data_str == "[DONE]":
                                continue
                            try:
                                chunk = _json.loads(data_str)
                                parts = (
                                    chunk.get("candidates", [{}])[0]
                                    .get("content", {})
                                    .get("parts", [])
                                )
                                for part in parts:
                                    text = part.get("text", "")
                                    if text:
                                        yielded = True
                                        yield text
                            except Exception:
                                continue
                if yielded:
                    return
            except Exception as e:
                last_error = str(e)
                logger.warning("gemini_model_failed — model=%s error=%s", model, str(e)[:100])
                continue

        raise Exception(last_error or "All Gemini models quota exceeded.")

    async def _stream_claude(self, prompt: str, system: str, api_key: str) -> AsyncGenerator[str, None]:
        import anthropic  # type: ignore

        model = getattr(settings, "ANTHROPIC_MODEL", "claude-sonnet-4-6")
        loop = asyncio.get_event_loop()
        chunks = await loop.run_in_executor(
            None,
            lambda: list(
                anthropic.Anthropic(api_key=api_key)
                .messages.stream(
                    model=model,
                    max_tokens=4000,
                    system=system,
                    messages=[{"role": "user", "content": prompt}],
                )
                .text_stream
            ),
        )
        for chunk in chunks:
            yield chunk
            await asyncio.sleep(0)

    async def generate_image_pollinations(
        self,
        prompt: str,
        width: int = 1080,
        height: int = 1080,
    ) -> str:
        """Generate an image via Pollinations.ai (free, no API key needed)."""
        try:
            encoded = urllib.parse.quote(prompt[:500])
            url = (
                f"https://image.pollinations.ai/prompt/{encoded}"
                f"?width={width}&height={height}&nologo=true&model=flux"
            )
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    return f"data:image/jpeg;base64,{base64.b64encode(resp.content).decode()}"
        except Exception as e:
            logger.warning("pollinations_image_failed — error=%s", str(e))
        return ""

    async def generate_image_stability(self, prompt: str) -> str:
        """Generate an image via Stability AI (25 free credits/month)."""
        key = getattr(settings, "STABILITY_AI_KEY", "") or ""
        if not key:
            return ""
        try:
            engine = getattr(settings, "STABILITY_ENGINE", "stable-diffusion-xl-1024-v1-0")
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    f"https://api.stability.ai/v1/generation/{engine}/text-to-image",
                    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                    json={
                        "text_prompts": [{"text": prompt, "weight": 1}],
                        "width": 1024,
                        "height": 1024,
                        "steps": 30,
                    },
                )
                if resp.status_code == 200:
                    img = resp.json()["artifacts"][0]["base64"]
                    return f"data:image/png;base64,{img}"
        except Exception as e:
            logger.warning("stability_ai_failed — error=%s", str(e))
        return ""

    async def generate_marketing_image(self, prompt: str, size: str = "square") -> str:
        """Try Stability AI first, fall back to Pollinations."""
        dims = {
            "square": (1080, 1080),
            "wide": (1200, 630),
            "story": (1080, 1920),
            "portrait": (1080, 1350),
        }
        w, h = dims.get(size, (1080, 1080))
        key = getattr(settings, "STABILITY_AI_KEY", "") or ""
        img = await self.generate_image_stability(prompt) if key else ""
        if not img:
            img = await self.generate_image_pollinations(prompt, w, h)
        return img


ai_engine = AIEngine()
