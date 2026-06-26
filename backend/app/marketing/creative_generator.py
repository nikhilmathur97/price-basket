"""
PriceBasket Marketing Creative Generator v3.0
Generates professional SVG posters for all platforms.
No Canva. No external service. Pure Python SVG.
"""
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

BRAND_ORANGE = "#F47A20"
BRAND_BLACK  = "#1a1a1a"
BRAND_WHITE  = "#ffffff"
BRAND_DARK   = "#0f0f0f"


def _wrap_text(text: str, max_chars: int) -> list:
    """Wrap text at word boundaries."""
    words = str(text).split()
    lines, current = [], ""
    for word in words:
        if len(current) + len(word) + 1 <= max_chars:
            current += (" " if current else "") + word
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines[:5]


def _esc(text: str) -> str:
    """Escape XML special characters for SVG text."""
    return (str(text)
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&#39;"))


def generate_instagram_post_svg(
    headline: str,
    subtext: str,
    stat: str = "Save ₹400/month",
    cta: str = "pricebasket.in",
    theme: str = "orange",
) -> str:
    h_lines = _wrap_text(headline, 22)
    s_lines = _wrap_text(subtext, 38)

    if theme == "dark":
        bg1, bg2, text_col, accent = "#0f0f0f", "#1a1a1a", BRAND_WHITE, BRAND_ORANGE
    elif theme == "minimal":
        bg1, bg2, text_col, accent = "#FFF8F3", "#fff", BRAND_BLACK, BRAND_ORANGE
    else:
        bg1, bg2, text_col, accent = BRAND_ORANGE, "#e56a10", BRAND_WHITE, BRAND_WHITE

    h_y = 340 - (len(h_lines) - 1) * 36
    h_svgs = "".join([
        f'<tspan x="540" dy="{0 if i == 0 else 72}">{_esc(l)}</tspan>'
        for i, l in enumerate(h_lines)
    ])
    s_svgs = "".join([
        f'<tspan x="540" dy="{0 if i == 0 else 40}">{_esc(l)}</tspan>'
        for i, l in enumerate(s_lines)
    ])
    divider_y = h_y + len(h_lines) * 72 - 20
    sub_y     = h_y + len(h_lines) * 72 + 40
    badge_y   = 780
    platform_icons = "".join([
        f'<text x="{180 + i * 120}" y="970" font-size="32" text-anchor="middle">{icon}</text>'
        for i, icon in enumerate(["🟢", "🟡", "🟠", "🔵", "🛒", "🟣"])
    ])
    platform_labels = "".join([
        f'<text x="{180 + i * 120}" y="1005" font-family="Arial,sans-serif" font-size="16" fill="{text_col}" opacity="0.5" text-anchor="middle">{name}</text>'
        for i, name in enumerate(["Blinkit", "Zepto", "Instamart", "BigBasket", "JioMart", "Flipkart"])
    ])

    return f'''<svg viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg" width="1080" height="1080">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{bg1}"/>
      <stop offset="100%" stop-color="{bg2}"/>
    </linearGradient>
    <linearGradient id="card" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.15)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.05)"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
  </defs>
  <rect width="1080" height="1080" fill="url(#bg)"/>
  <circle cx="1000" cy="100" r="220" fill="rgba(255,255,255,0.06)"/>
  <circle cx="80" cy="980" r="180" fill="rgba(255,255,255,0.06)"/>
  <circle cx="950" cy="950" r="120" fill="rgba(255,255,255,0.04)"/>
  <circle cx="150" cy="150" r="80" fill="rgba(255,255,255,0.08)"/>
  <rect x="0" y="0" width="1080" height="8" fill="{accent}" opacity="0.6"/>
  <rect x="60" y="50" width="160" height="52" rx="12" fill="rgba(255,255,255,0.15)" filter="url(#shadow)"/>
  <text x="140" y="84" font-family="Arial Black,Arial,sans-serif" font-size="22" font-weight="900" fill="{text_col}" text-anchor="middle" letter-spacing="1">&#x1F6D2; PB</text>
  <rect x="60" y="140" width="960" height="680" rx="32" fill="url(#card)" filter="url(#shadow)"/>
  <rect x="60" y="140" width="960" height="680" rx="32" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
  <text font-family="Arial Black,Arial,sans-serif" font-size="64" font-weight="900" fill="{text_col}" text-anchor="middle" y="{h_y}">{h_svgs}</text>
  <rect x="440" y="{divider_y}" width="200" height="4" rx="2" fill="{accent}" opacity="0.7"/>
  <text font-family="Arial,sans-serif" font-size="36" fill="{text_col}" opacity="0.85" text-anchor="middle" y="{sub_y}">{s_svgs}</text>
  <rect x="340" y="{badge_y}" width="400" height="80" rx="40" fill="{'rgba(255,255,255,0.2)' if theme == 'orange' else accent}"/>
  <text x="540" y="{badge_y + 50}" font-family="Arial Black,Arial,sans-serif" font-size="30" font-weight="900" fill="{BRAND_WHITE if theme != 'minimal' else BRAND_BLACK}" text-anchor="middle">{_esc(stat)}</text>
  <rect x="60" y="870" width="960" height="2" fill="rgba(255,255,255,0.15)"/>
  <text x="540" y="920" font-family="Arial,sans-serif" font-size="24" fill="{text_col}" opacity="0.7" text-anchor="middle">Compare across 6 platforms</text>
  {platform_icons}
  {platform_labels}
  <text x="1020" y="1050" font-family="Arial Black,Arial,sans-serif" font-size="22" font-weight="900" fill="{text_col}" opacity="0.8" text-anchor="end">{_esc(cta)}</text>
</svg>'''


def generate_twitter_banner_svg(headline: str, subtext: str, **kwargs) -> str:
    h_lines = _wrap_text(headline, 30)
    h_svgs = "".join([
        f'<tspan x="80" dy="{0 if i == 0 else 80}">{_esc(l)}</tspan>'
        for i, l in enumerate(h_lines)
    ])
    sub_y = 220 + len(h_lines) * 80

    return f'''<svg viewBox="0 0 1500 500" xmlns="http://www.w3.org/2000/svg" width="1500" height="500">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f0f0f"/>
      <stop offset="60%" stop-color="#1a0d00"/>
      <stop offset="100%" stop-color="{BRAND_ORANGE}"/>
    </linearGradient>
  </defs>
  <rect width="1500" height="500" fill="url(#g)"/>
  <circle cx="1300" cy="80" r="200" fill="{BRAND_ORANGE}" opacity="0.12"/>
  <circle cx="200" cy="420" r="160" fill="{BRAND_ORANGE}" opacity="0.08"/>
  <rect x="0" y="0" width="6" height="500" fill="{BRAND_ORANGE}"/>
  <text x="80" y="60" font-family="Arial Black,Arial,sans-serif" font-size="28" font-weight="900" fill="{BRAND_ORANGE}">&#x1F6D2; PRICEBASKET</text>
  <text x="80" y="82" font-family="Arial,sans-serif" font-size="18" fill="rgba(255,255,255,0.4)">COMPARE &#x2022; SAVE &#x2022; SMART</text>
  <text font-family="Arial Black,Arial,sans-serif" font-size="72" font-weight="900" fill="{BRAND_WHITE}" y="200">{h_svgs}</text>
  <text x="80" y="{sub_y}" font-family="Arial,sans-serif" font-size="32" fill="rgba(255,255,255,0.7)">{_esc(subtext[:80])}</text>
  <rect x="1250" y="180" width="200" height="60" rx="30" fill="{BRAND_ORANGE}"/>
  <text x="1350" y="218" font-family="Arial Black,Arial,sans-serif" font-size="20" font-weight="900" fill="{BRAND_WHITE}" text-anchor="middle">Try Free &#x2192;</text>
  <text x="1350" y="250" font-family="Arial,sans-serif" font-size="18" fill="rgba(255,255,255,0.5)" text-anchor="middle">pricebasket.in</text>
</svg>'''


def generate_whatsapp_poster_svg(headline: str, subtext: str, savings: str = "&#x20B9;320", **kwargs) -> str:
    lines = _wrap_text(headline, 38)
    bubble_h = 80 + len(lines) * 36 + 80
    text_lines = "".join([
        f'<text x="90" y="{210 + i * 36}" font-family="Arial,sans-serif" font-size="22" fill="#1a1a1a">{_esc(l)}</text>'
        for i, l in enumerate(lines)
    ])
    savings_y   = 240 + len(lines) * 36
    cta_y       = 360 + len(lines) * 36
    ts_y        = 435 + len(lines) * 36
    now_str     = datetime.now().strftime("%I:%M %p")

    return f'''<svg viewBox="0 0 800 900" xmlns="http://www.w3.org/2000/svg" width="800" height="900">
  <rect width="800" height="900" fill="#075E54"/>
  <rect x="20" y="20" width="760" height="860" rx="24" fill="#128C7E"/>
  <rect x="40" y="40" width="720" height="820" rx="20" fill="#ECE5DD"/>
  <rect x="40" y="40" width="720" height="80" rx="20" fill="#075E54"/>
  <circle cx="90" cy="80" r="24" fill="#25D366"/>
  <text x="90" y="87" font-size="20" text-anchor="middle">&#x1F6D2;</text>
  <text x="130" y="75" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="{BRAND_WHITE}">PriceBasket Official</text>
  <text x="130" y="98" font-family="Arial,sans-serif" font-size="14" fill="rgba(255,255,255,0.7)">Marketing Team</text>
  <rect x="60" y="160" width="560" height="{bubble_h}" rx="16" fill="{BRAND_WHITE}"/>
  <polygon points="60,180 40,200 60,220" fill="{BRAND_WHITE}"/>
  {text_lines}
  <rect x="60" y="{savings_y}" width="560" height="80" rx="12" fill="#25D366" opacity="0.15"/>
  <text x="340" y="{savings_y + 45}" font-family="Arial Black,Arial,sans-serif" font-size="36" font-weight="900" fill="#075E54" text-anchor="middle">&#x1F49A; Save {savings}/month</text>
  <rect x="60" y="{cta_y}" width="560" height="70" rx="35" fill="#25D366"/>
  <text x="340" y="{cta_y + 42}" font-family="Arial Black,Arial,sans-serif" font-size="26" font-weight="900" fill="{BRAND_WHITE}" text-anchor="middle">&#x1F517; pricebasket.in</text>
  <text x="600" y="{ts_y}" font-family="Arial,sans-serif" font-size="18" fill="rgba(0,0,0,0.4)">{now_str} &#x2713;&#x2713;</text>
</svg>'''


def generate_linkedin_post_svg(headline: str, subtext: str, **kwargs) -> str:
    b_lines = _wrap_text(subtext, 60)
    body_lines = "".join([
        f'<text x="60" y="{220 + i * 32}" font-family="Arial,sans-serif" font-size="20" fill="#333">{_esc(l)}</text>'
        for i, l in enumerate(b_lines[:6])
    ])
    more_y = 240 + len(b_lines[:6]) * 32

    return f'''<svg viewBox="0 0 1200 628" xmlns="http://www.w3.org/2000/svg" width="1200" height="628">
  <rect width="1200" height="628" fill="white"/>
  <rect x="0" y="0" width="1200" height="10" fill="#0077b5"/>
  <circle cx="60" cy="60" r="36" fill="#0077b5"/>
  <text x="60" y="67" font-size="24" text-anchor="middle" fill="white">N</text>
  <text x="110" y="50" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#1a1a1a">Nikhil &#x2022; PriceBasket Founder</text>
  <text x="110" y="72" font-family="Arial,sans-serif" font-size="14" fill="#666">Building India&#39;s smartest grocery price comparison app</text>
  <rect x="0" y="100" width="1200" height="528" fill="#fff"/>
  <rect x="0" y="100" width="8" height="528" fill="{BRAND_ORANGE}"/>
  <text x="60" y="175" font-family="Arial Black,Arial,sans-serif" font-size="38" font-weight="900" fill="#1a1a1a">{_esc(headline[:55])}</text>
  {body_lines}
  <text x="60" y="{more_y}" font-family="Arial,sans-serif" font-size="18" fill="{BRAND_ORANGE}" font-weight="700">... Read more</text>
  <rect x="0" y="540" width="1200" height="88" fill="#f3f2ef"/>
  <text x="60" y="590" font-size="20" fill="#666">&#x1F44D; 124</text>
  <text x="150" y="590" font-size="20" fill="#666">&#x1F4AC; 38 comments</text>
  <text x="320" y="590" font-size="20" fill="#666">&#x1F501; 12 reposts</text>
  <text x="1100" y="590" font-family="Arial Black,Arial,sans-serif" font-size="18" fill="{BRAND_ORANGE}" text-anchor="end">pricebasket.in</text>
</svg>'''


def generate_reddit_post_svg(headline: str, subtext: str, **kwargs) -> str:
    h_lines = _wrap_text(headline, 55)
    s_lines = _wrap_text(subtext, 70)
    h_svgs = "".join([
        f'<text x="60" y="{100 + i * 36}" font-family="Arial,sans-serif" font-size="26" font-weight="700" fill="#1a1a1a">{_esc(l)}</text>'
        for i, l in enumerate(h_lines)
    ])
    body_start = 100 + len(h_lines) * 36 + 20
    s_svgs = "".join([
        f'<text x="60" y="{body_start + i * 28}" font-family="Arial,sans-serif" font-size="20" fill="#333">{_esc(l)}</text>'
        for i, l in enumerate(s_lines[:4])
    ])

    return f'''<svg viewBox="0 0 900 500" xmlns="http://www.w3.org/2000/svg" width="900" height="500">
  <rect width="900" height="500" fill="#1a1a1b"/>
  <rect x="20" y="20" width="860" height="460" rx="12" fill="#272729"/>
  <circle cx="60" cy="55" r="18" fill="#ff4500"/>
  <text x="60" y="62" font-size="16" text-anchor="middle" fill="white">r/</text>
  <text x="88" y="50" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="rgba(255,255,255,0.9)">r/india</text>
  <text x="88" y="68" font-family="Arial,sans-serif" font-size="13" fill="rgba(255,255,255,0.4)">Posted by u/savings_enthusiast &#x2022; 2h</text>
  <rect x="40" y="80" width="820" height="2" fill="rgba(255,255,255,0.08)"/>
  {h_svgs}
  {s_svgs}
  <rect x="40" y="420" width="820" height="2" fill="rgba(255,255,255,0.08)"/>
  <text x="60" y="455" font-family="Arial,sans-serif" font-size="16" fill="rgba(255,255,255,0.4)">&#x2B06; 847 &#x2022; &#x1F4AC; 234 comments &#x2022; &#x1F517; Share &#x2022; &#x1F4BE; Save</text>
</svg>'''


def generate_email_preview_svg(headline: str, subtext: str, **kwargs) -> str:
    h_lines = _wrap_text(headline, 50)
    s_lines = _wrap_text(subtext, 65)
    h_svgs = "".join([
        f'<text x="60" y="{160 + i * 40}" font-family="Arial,sans-serif" font-size="28" font-weight="700" fill="#1a1a1a">{_esc(l)}</text>'
        for i, l in enumerate(h_lines)
    ])
    body_start = 160 + len(h_lines) * 40 + 20
    s_svgs = "".join([
        f'<text x="60" y="{body_start + i * 28}" font-family="Arial,sans-serif" font-size="18" fill="#444">{_esc(l)}</text>'
        for i, l in enumerate(s_lines[:4])
    ])
    cta_y = body_start + len(s_lines[:4]) * 28 + 30

    return f'''<svg viewBox="0 0 700 500" xmlns="http://www.w3.org/2000/svg" width="700" height="500">
  <rect width="700" height="500" fill="#f4f4f4"/>
  <rect x="20" y="20" width="660" height="460" rx="8" fill="white"/>
  <rect x="20" y="20" width="660" height="70" rx="8" fill="{BRAND_ORANGE}"/>
  <text x="350" y="62" font-family="Arial Black,Arial,sans-serif" font-size="24" font-weight="900" fill="white" text-anchor="middle">&#x1F6D2; PriceBasket Weekly Digest</text>
  <rect x="40" y="100" width="620" height="2" fill="#eee"/>
  <text x="60" y="130" font-family="Arial,sans-serif" font-size="16" fill="#888">Hi there &#x1F44B; | This week&#39;s top grocery savings</text>
  {h_svgs}
  {s_svgs}
  <rect x="60" y="{cta_y}" width="240" height="50" rx="25" fill="{BRAND_ORANGE}"/>
  <text x="180" y="{cta_y + 32}" font-family="Arial Black,Arial,sans-serif" font-size="18" font-weight="900" fill="white" text-anchor="middle">Compare Now &#x2192;</text>
  <rect x="20" y="440" width="660" height="40" rx="8" fill="#f9f9f9"/>
  <text x="350" y="465" font-family="Arial,sans-serif" font-size="13" fill="#aaa" text-anchor="middle">pricebasket.in &#x2022; Unsubscribe &#x2022; Privacy Policy</text>
</svg>'''


CREATIVE_GENERATORS = {
    "instagram": generate_instagram_post_svg,
    "twitter":   generate_twitter_banner_svg,
    "whatsapp":  generate_whatsapp_poster_svg,
    "linkedin":  generate_linkedin_post_svg,
    "reddit":    generate_reddit_post_svg,
    "email":     generate_email_preview_svg,
    "quora":     generate_reddit_post_svg,   # reuse reddit style
    "seo":       generate_linkedin_post_svg, # reuse linkedin style
    "youtube":   generate_twitter_banner_svg,
    "campaign":  generate_instagram_post_svg,
}


def generate_platform_creative(
    platform: str,
    headline: str,
    subtext: str = "",
    theme: str = "orange",
    **kwargs,
) -> str:
    """Return SVG string for given platform. Falls back to Instagram style."""
    gen = CREATIVE_GENERATORS.get(platform, generate_instagram_post_svg)
    try:
        return gen(headline=headline, subtext=subtext, theme=theme, **kwargs)
    except Exception as e:
        logger.error(f"Creative gen error ({platform}): {e}")
        try:
            return generate_instagram_post_svg(headline=headline, subtext=subtext, theme=theme)
        except Exception:
            return ""
