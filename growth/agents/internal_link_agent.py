#!/usr/bin/env python3
"""
PRICEBASKET.IN — Internal Link Agent
=====================================
Scans new blog posts and automatically adds contextual internal links to:
  • Product compare pages  (/compare/atta, /compare/oil, etc.)
  • City pages             (/grocery-prices-mumbai, etc.)
  • Deal pages             (/deals/blinkit, /deals/zepto, etc.)
  • Other relevant blog posts

How it works:
  1. Fetches new/unlinked blog posts from the content API
  2. Scans each post for product names, city names, platform names
  3. Generates contextual anchor text + target URL pairs
  4. Patches the post content with internal links
  5. Tracks which posts have been processed (dedup)

SEO impact: reduces bounce rate, increases pages/session, passes PageRank
to high-value compare/product pages.

Setup:
  pip install anthropic requests
  Set env vars: ANTHROPIC_API_KEY, BACKEND_API_URL
"""

import os
import re
import json
import time
import datetime
import requests

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

# ── Config ────────────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
BACKEND_API       = os.getenv("BACKEND_API_URL", "https://pricebasket-api.onrender.com")
SITE_URL          = "https://pricebasket.in"
MAX_LINKS_PER_POST = 5   # Google recommends not over-linking
MIN_WORDS_BETWEEN_LINKS = 100  # avoid link density issues

# ── Link target database ──────────────────────────────────────────────────────
# Maps trigger phrases → internal URLs + anchor text
LINK_TARGETS = {
    # Products
    "atta":           {"url": "/compare/atta",         "anchor": "compare atta prices"},
    "wheat flour":    {"url": "/compare/atta",         "anchor": "compare wheat flour prices"},
    "rice":           {"url": "/compare/rice",         "anchor": "compare rice prices"},
    "basmati":        {"url": "/compare/rice",         "anchor": "compare basmati rice prices"},
    "dal":            {"url": "/compare/dal",          "anchor": "compare dal prices"},
    "toor dal":       {"url": "/compare/dal",          "anchor": "compare toor dal prices"},
    "cooking oil":    {"url": "/compare/cooking-oil",  "anchor": "compare cooking oil prices"},
    "sunflower oil":  {"url": "/compare/cooking-oil",  "anchor": "compare sunflower oil prices"},
    "ghee":           {"url": "/compare/ghee",         "anchor": "compare ghee prices"},
    "milk":           {"url": "/compare/milk",         "anchor": "compare milk prices"},
    "butter":         {"url": "/compare/butter",       "anchor": "compare butter prices"},
    "paneer":         {"url": "/compare/paneer",       "anchor": "compare paneer prices"},
    "sugar":          {"url": "/compare/sugar",        "anchor": "compare sugar prices"},
    "salt":           {"url": "/compare/salt",         "anchor": "compare salt prices"},
    "tea":            {"url": "/compare/tea",          "anchor": "compare tea prices"},
    "shampoo":        {"url": "/compare/shampoo",      "anchor": "compare shampoo prices"},
    "soap":           {"url": "/compare/soap",         "anchor": "compare soap prices"},
    "detergent":      {"url": "/compare/detergent",    "anchor": "compare detergent prices"},
    "biscuits":       {"url": "/compare/biscuits",     "anchor": "compare biscuit prices"},
    "maggi":          {"url": "/compare/maggi",        "anchor": "compare Maggi prices"},
    # Platforms
    "blinkit":        {"url": "/deals/blinkit",        "anchor": "Blinkit deals today"},
    "zepto":          {"url": "/deals/zepto",          "anchor": "Zepto deals today"},
    "bigbasket":      {"url": "/deals/bigbasket",      "anchor": "BigBasket deals today"},
    "big basket":     {"url": "/deals/bigbasket",      "anchor": "BigBasket deals today"},
    "jiomart":        {"url": "/deals/jiomart",        "anchor": "JioMart deals today"},
    "jio mart":       {"url": "/deals/jiomart",        "anchor": "JioMart deals today"},
    "instamart":      {"url": "/deals/instamart",      "anchor": "Instamart deals today"},
    "swiggy instamart": {"url": "/deals/instamart",   "anchor": "Swiggy Instamart deals"},
    # Cities
    "mumbai":         {"url": "/grocery-prices-mumbai",     "anchor": "grocery prices in Mumbai"},
    "delhi":          {"url": "/grocery-prices-delhi",      "anchor": "grocery prices in Delhi"},
    "bangalore":      {"url": "/grocery-prices-bangalore",  "anchor": "grocery prices in Bangalore"},
    "bengaluru":      {"url": "/grocery-prices-bangalore",  "anchor": "grocery prices in Bangalore"},
    "hyderabad":      {"url": "/grocery-prices-hyderabad",  "anchor": "grocery prices in Hyderabad"},
    "chennai":        {"url": "/grocery-prices-chennai",    "anchor": "grocery prices in Chennai"},
    "kolkata":        {"url": "/grocery-prices-kolkata",    "anchor": "grocery prices in Kolkata"},
    "pune":           {"url": "/grocery-prices-pune",       "anchor": "grocery prices in Pune"},
    "ahmedabad":      {"url": "/grocery-prices-ahmedabad",  "anchor": "grocery prices in Ahmedabad"},
    # High-value pages
    "price comparison":   {"url": "/",                      "anchor": "grocery price comparison"},
    "compare prices":     {"url": "/",                      "anchor": "compare grocery prices"},
    "price alert":        {"url": "/alerts",                "anchor": "set a price alert"},
    "price drop alert":   {"url": "/alerts",                "anchor": "price drop alerts"},
    "cart optimizer":     {"url": "/cart",                  "anchor": "cart optimizer"},
    "save money":         {"url": "/blog/how-to-save-money-groceries", "anchor": "save money on groceries"},
    "quick commerce":     {"url": "/blog/quick-commerce-price-comparison", "anchor": "quick commerce price comparison"},
}

# ── Processed post tracker ────────────────────────────────────────────────────
_processed_slugs: set[str] = set()


# ── Rule-based link injection ─────────────────────────────────────────────────

def find_link_opportunities(text: str, existing_links: list[str] = None) -> list[dict]:
    """
    Scan text for trigger phrases and return link opportunities.
    Returns list of {phrase, url, anchor, position, context}
    """
    existing_links = existing_links or []
    opportunities  = []
    text_lower     = text.lower()
    used_urls      = set(existing_links)
    last_link_pos  = -MIN_WORDS_BETWEEN_LINKS * 6  # ~6 chars per word

    # Sort by phrase length (longest first) to avoid partial matches
    sorted_targets = sorted(LINK_TARGETS.items(), key=lambda x: len(x[0]), reverse=True)

    for phrase, target in sorted_targets:
        if len(opportunities) >= MAX_LINKS_PER_POST:
            break

        url = target["url"]
        if url in used_urls:
            continue  # Don't link to same URL twice

        # Find phrase in text (case-insensitive, whole word)
        pattern = r'\b' + re.escape(phrase) + r'\b'
        matches = list(re.finditer(pattern, text_lower))

        for match in matches:
            pos = match.start()

            # Enforce minimum distance between links
            if pos - last_link_pos < MIN_WORDS_BETWEEN_LINKS * 6:
                continue

            # Get original case from text
            original_phrase = text[pos:pos + len(phrase)]

            # Get surrounding context
            context_start = max(0, pos - 50)
            context_end   = min(len(text), pos + len(phrase) + 50)
            context        = text[context_start:context_end]

            opportunities.append({
                "phrase":   original_phrase,
                "url":      SITE_URL + url,
                "anchor":   target["anchor"],
                "position": pos,
                "context":  context,
            })
            used_urls.add(url)
            last_link_pos = pos
            break  # Only link each URL once

    return opportunities


def inject_links_into_html(html: str, opportunities: list[dict]) -> str:
    """
    Inject <a> tags into HTML content for each opportunity.
    Skips phrases already inside <a> tags.
    """
    if not opportunities:
        return html

    # Sort by position descending (inject from end to preserve positions)
    sorted_opps = sorted(opportunities, key=lambda x: x["position"], reverse=True)

    for opp in sorted_opps:
        phrase = re.escape(opp["phrase"])
        url    = opp["url"]
        anchor = opp["anchor"]

        # Don't link inside existing <a> tags
        # Simple check: find the phrase and verify it's not already linked
        pattern = r'(?<!href=")(?<!>)(\b' + phrase + r'\b)(?![^<]*</a>)'

        replacement = f'<a href="{url}" title="{anchor}" class="internal-link">{opp["phrase"]}</a>'

        # Replace only the first occurrence
        html, count = re.subn(pattern, replacement, html, count=1, flags=re.IGNORECASE)
        if count > 0:
            pass  # Successfully injected

    return html


def inject_links_into_markdown(markdown: str, opportunities: list[dict]) -> str:
    """Inject markdown links into plain text/markdown content."""
    if not opportunities:
        return markdown

    sorted_opps = sorted(opportunities, key=lambda x: x["position"], reverse=True)

    for opp in sorted_opps:
        phrase  = opp["phrase"]
        url     = opp["url"]
        anchor  = opp["anchor"]
        pattern = r'\b' + re.escape(phrase) + r'\b'

        # Don't re-link already linked text
        if f']({url})' in markdown:
            continue

        replacement = f'[{phrase}]({url} "{anchor}")'
        markdown, count = re.subn(pattern, replacement, markdown, count=1, flags=re.IGNORECASE)

    return markdown


# ── AI-enhanced link suggestion ───────────────────────────────────────────────

def get_ai_link_suggestions(post_title: str, post_excerpt: str, post_content: str) -> list[dict]:
    """
    Use Claude to suggest additional contextual internal links beyond the rule set.
    Returns list of {phrase, url, anchor, reason}
    """
    if not ANTHROPIC_AVAILABLE or not ANTHROPIC_API_KEY:
        return []

    # Build available pages list
    available_pages = [
        f"{SITE_URL}{target['url']} — {target['anchor']}"
        for target in LINK_TARGETS.values()
    ][:20]

    try:
        ai = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        msg = ai.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=600,
            messages=[{
                "role": "user",
                "content": f"""You are an SEO specialist for pricebasket.in.
Suggest 3-5 internal links to add to this blog post.

Post title: {post_title}
Excerpt: {post_excerpt[:300]}

Available internal pages:
{chr(10).join(available_pages[:15])}

Rules:
1. Only suggest links to pages in the available list
2. The anchor text must appear naturally in the post content
3. Each link must add value for the reader
4. Don't suggest the same URL twice

Output JSON array:
[{{"phrase": "exact text from post", "url": "full URL", "anchor": "link title", "reason": "why this link helps"}}]

Output only valid JSON:""",
            }],
        )
        text = msg.content[0].text.strip()
        m = re.search(r"\[.*\]", text, re.DOTALL)
        if m:
            return json.loads(m.group())
    except Exception as exc:
        print(f"AI link suggestion error: {exc}")

    return []


# ── Fetch and process posts ───────────────────────────────────────────────────

def fetch_unlinked_posts(limit: int = 10) -> list[dict]:
    """Fetch recent blog posts that haven't been processed for internal links."""
    try:
        resp = requests.get(
            f"{BACKEND_API}/api/v1/content/blog",
            params={"limit": limit, "internal_links_added": "false"},
            timeout=15,
        )
        if resp.ok:
            posts = resp.json().get("posts", [])
            return [p for p in posts if p.get("slug") not in _processed_slugs]
    except Exception as exc:
        print(f"Fetch posts error: {exc}")

    # Fallback: fetch all recent posts
    try:
        resp = requests.get(
            f"{BACKEND_API}/api/v1/content/blog?limit={limit}",
            timeout=15,
        )
        if resp.ok:
            posts = resp.json().get("posts", [])
            return [p for p in posts if p.get("slug") not in _processed_slugs]
    except Exception:
        pass

    return []


def process_post(post: dict) -> dict:
    """
    Process a single blog post: find link opportunities and inject them.
    Returns updated post dict.
    """
    slug    = post.get("slug", "")
    title   = post.get("title", "")
    excerpt = post.get("excerpt", "")
    content = post.get("content", "")

    print(f"  Processing: {slug}")

    # Convert content to string if it's a list of blocks
    if isinstance(content, list):
        content_str = " ".join(
            " ".join(block.get("paragraphs", []) + block.get("bullets", []))
            for block in content
        )
    else:
        content_str = str(content)

    # Find rule-based opportunities
    opportunities = find_link_opportunities(content_str)

    # Get AI suggestions for additional links
    ai_suggestions = get_ai_link_suggestions(title, excerpt, content_str)

    # Merge (AI suggestions that aren't already covered)
    existing_urls = {opp["url"] for opp in opportunities}
    for suggestion in ai_suggestions:
        if suggestion.get("url") not in existing_urls:
            opportunities.append(suggestion)

    opportunities = opportunities[:MAX_LINKS_PER_POST]

    if not opportunities:
        print(f"    No link opportunities found")
        _processed_slugs.add(slug)
        return post

    print(f"    Found {len(opportunities)} link opportunities:")
    for opp in opportunities:
        print(f"      '{opp['phrase']}' → {opp['url']}")

    # Inject links into content
    if isinstance(post.get("content"), list):
        # Structured content (list of blocks) — inject into paragraph text
        updated_content = []
        for block in post["content"]:
            updated_block = dict(block)
            if "paragraphs" in block:
                updated_block["paragraphs"] = [
                    inject_links_into_markdown(p, opportunities)
                    for p in block["paragraphs"]
                ]
            if "bullets" in block:
                updated_block["bullets"] = [
                    inject_links_into_markdown(b, opportunities)
                    for b in block["bullets"]
                ]
            updated_content.append(updated_block)
        post["content"] = updated_content
    else:
        # HTML content
        post["content"] = inject_links_into_html(str(content), opportunities)

    post["internal_links_added"] = True
    post["internal_links_count"] = len(opportunities)
    post["internal_links"]       = [{"phrase": o["phrase"], "url": o["url"]} for o in opportunities]

    return post


def update_post_in_backend(post: dict) -> bool:
    """Push updated post back to backend."""
    slug = post.get("slug", "")
    try:
        resp = requests.patch(
            f"{BACKEND_API}/api/v1/content/blog/{slug}",
            json={
                "content":               post.get("content"),
                "internal_links_added":  True,
                "internal_links_count":  post.get("internal_links_count", 0),
                "internal_links":        post.get("internal_links", []),
            },
            timeout=15,
        )
        if resp.ok:
            print(f"    ✅ Updated in backend")
            return True
        print(f"    ⚠️  Backend update failed: {resp.status_code}")
        return False
    except Exception as exc:
        print(f"    Backend update error: {exc}")
        return False


# ── Main runner ───────────────────────────────────────────────────────────────

def run_internal_link_scan(limit: int = 10):
    """
    Scan recent posts and add internal links.
    Runs daily after new content is generated.
    """
    print(f"[{_now()}] Internal link scan starting...")
    posts = fetch_unlinked_posts(limit=limit)

    if not posts:
        print(f"[{_now()}] No unlinked posts found")
        return

    print(f"[{_now()}] Processing {len(posts)} posts...")
    processed = 0
    linked    = 0

    for post in posts:
        slug = post.get("slug", "")
        updated_post = process_post(post)

        if updated_post.get("internal_links_added"):
            success = update_post_in_backend(updated_post)
            if success:
                linked += 1
        else:
            # Mark as processed even if no links added (avoid re-scanning)
            try:
                requests.patch(
                    f"{BACKEND_API}/api/v1/content/blog/{slug}",
                    json={"internal_links_added": True, "internal_links_count": 0},
                    timeout=10,
                )
            except Exception:
                pass

        _processed_slugs.add(slug)
        processed += 1
        time.sleep(1)

    print(f"[{_now()}] Internal link scan done: {processed} processed, {linked} updated with links")


def analyze_post(slug: str):
    """Analyze a single post for link opportunities (dry run)."""
    try:
        resp = requests.get(f"{BACKEND_API}/api/v1/content/blog/{slug}", timeout=15)
        if not resp.ok:
            print(f"Post not found: {slug}")
            return
        post = resp.json()
    except Exception as exc:
        print(f"Fetch error: {exc}")
        return

    content = post.get("content", "")
    if isinstance(content, list):
        content_str = " ".join(
            " ".join(block.get("paragraphs", []) + block.get("bullets", []))
            for block in content
        )
    else:
        content_str = str(content)

    opportunities = find_link_opportunities(content_str)
    print(f"\nLink opportunities for '{post.get('title', slug)}':")
    if not opportunities:
        print("  None found")
    for opp in opportunities:
        print(f"  '{opp['phrase']}' → {opp['url']}")
        print(f"    Context: ...{opp['context']}...")


def _now() -> str:
    return datetime.datetime.now().strftime("%H:%M:%S")


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"

    if cmd == "scan":
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        run_internal_link_scan(limit=limit)

    elif cmd == "analyze" and len(sys.argv) > 2:
        analyze_post(sys.argv[2])

    elif cmd == "test":
        # Test link injection on sample text
        sample = """
        Today we compare atta prices across Blinkit, Zepto, and BigBasket.
        Aashirvaad atta 5kg is cheapest on JioMart at Rs.189.
        Mumbai residents can save the most by comparing apps.
        Set a price alert to get notified when prices drop.
        The cart optimizer helps you split orders across apps.
        """
        opps = find_link_opportunities(sample)
        print(f"Found {len(opps)} opportunities:")
        for opp in opps:
            print(f"  '{opp['phrase']}' → {opp['url']}")
        print("\nWith links injected:")
        print(inject_links_into_markdown(sample, opps))

    elif cmd == "run":
        import schedule
        schedule.every().day.at("08:00").do(run_internal_link_scan)
        print("Internal link agent scheduled: daily at 8am IST")
        while True:
            schedule.run_pending()
            time.sleep(60)

    else:
        print("Usage: python internal_link_agent.py [scan [N]|analyze <slug>|test|run]")
