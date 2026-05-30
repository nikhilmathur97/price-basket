"""
Social card generator
=====================
Renders a branded 1080×1080 "deal" image (PNG bytes) for social posts using
Pillow. Pure-Python, no network. If rendering fails for any reason it returns
None and callers fall back to the product's own image URL.
"""
from __future__ import annotations

import io
from typing import Optional

import structlog

from app.services.deals import Deal

log = structlog.get_logger(__name__)

BRAND = (234, 88, 12)        # #ea580c
DARK = (26, 26, 46)          # #1a1a2e
WHITE = (255, 255, 255)
GREEN = (34, 197, 94)
MUTED = (161, 161, 170)

W = H = 1080


def _font(size: int, bold: bool = False):
    from PIL import ImageFont

    # Try a few fonts that commonly exist on Linux (Render) and macOS; fall back
    # to Pillow's bundled default so we never crash on a missing font.
    candidates = (
        [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        ]
        if bold
        else [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        ]
    )
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except Exception:  # noqa: BLE001
            continue
    return ImageFont.load_default()


def _wrap(draw, text: str, font, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    line = ""
    for w in words:
        trial = f"{line} {w}".strip()
        if draw.textlength(trial, font=font) <= max_width:
            line = trial
        else:
            if line:
                lines.append(line)
            line = w
    if line:
        lines.append(line)
    return lines


def render_deal_card(deal: Deal) -> Optional[bytes]:
    try:
        from PIL import Image, ImageDraw

        img = Image.new("RGB", (W, H), DARK)
        draw = ImageDraw.Draw(img)

        # Top brand bar
        draw.rectangle([0, 0, W, 24], fill=BRAND)

        # Logo / wordmark
        draw.text((70, 70), "🛒 PriceBasket", font=_font(46, bold=True), fill=WHITE)

        # Big savings badge
        draw.rounded_rectangle(
            [70, 180, 70 + 520, 180 + 200], radius=28, fill=BRAND
        )
        draw.text(
            (110, 205), "SAVE", font=_font(48, bold=True), fill=WHITE
        )
        draw.text(
            (110, 260),
            f"{deal.savings_percent}%",
            font=_font(120, bold=True),
            fill=WHITE,
        )

        # Product name (wrapped)
        name_font = _font(58, bold=True)
        name = deal.name if not deal.brand else f"{deal.brand} {deal.name}"
        lines = _wrap(draw, name, name_font, W - 140)[:3]
        y = 440
        for ln in lines:
            draw.text((70, y), ln, font=name_font, fill=WHITE)
            y += 70

        # Unit
        if deal.unit:
            draw.text((70, y + 6), deal.unit, font=_font(36), fill=MUTED)
            y += 56

        # Price line
        y = max(y + 30, 760)
        draw.text(
            (70, y),
            f"₹{int(deal.best_price)}",
            font=_font(96, bold=True),
            fill=GREEN,
        )
        best_w = draw.textlength(f"₹{int(deal.best_price)}", font=_font(96, bold=True))
        draw.text(
            (70 + best_w + 30, y + 40),
            f"₹{int(deal.highest_price)}",
            font=_font(52),
            fill=MUTED,
        )
        # strike-through on the high price
        strike_x0 = 70 + best_w + 30
        strike_x1 = strike_x0 + draw.textlength(
            f"₹{int(deal.highest_price)}", font=_font(52)
        )
        draw.line([strike_x0, y + 70, strike_x1, y + 70], fill=MUTED, width=4)

        # Cheapest platform
        if deal.cheapest_platform:
            draw.text(
                (70, y + 120),
                f"Cheapest on {deal.cheapest_platform}",
                font=_font(40, bold=True),
                fill=BRAND,
            )

        # Footer
        draw.text(
            (70, H - 70),
            "Compare live prices → pricebasket.in",
            font=_font(34),
            fill=MUTED,
        )

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()
    except Exception as exc:  # noqa: BLE001
        log.warning("social_card_render_failed", error=str(exc))
        return None
