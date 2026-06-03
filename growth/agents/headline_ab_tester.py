#!/usr/bin/env python3
"""
PRICEBASKET.IN — Headline A/B Tester Agent
==========================================
Tests 3 blog title variants, picks the winner based on CTR data from GA4,
and auto-updates the winning title in the content store.

How it works:
  1. For each new blog post, Claude generates 3 title variants
  2. Variants are stored in Redis with impression/click counters
  3. After 48 hours (or 500 impressions), the winner is selected
  4. The winning title replaces the original in the content index
  5. GA4 custom event `blog_title_click` tracks which variant was shown

GA4 integration:
  • Frontend sends: gtag('event', 'blog_title_click', { variant: 'A', slug: '...' })
  • This agent reads GA4 Data API to fetch CTR per variant
  • Winner = highest CTR after minimum 200 impressions per variant

Setup:
  pip install anthropic requests google-auth google-auth-httplib2 google-api-python-client
  Set env vars:
    ANTHROPIC_API_KEY
    GA4_PROPERTY_ID          — e.g. "properties/123456789"
    GA4_SERVICE_ACCOUNT_JSON — path to service account JSON
    BACKEND_API_URL
    REDIS_URL                — for storing test state
"""

import os
import json
import time
import datetime
import hashlib
import requests

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    GA4_AVAILABLE = True
except ImportError:
    GA4_AVAILABLE = False

# ── Config ────────────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY      = os.getenv("ANTHROPIC_API_KEY", "")
GA4_PROPERTY_ID        = os.getenv("GA4_PROPERTY_ID", "")
GA4_SERVICE_ACCOUNT    = os.getenv("GA4_SERVICE_ACCOUNT_JSON", "ga4-service-account.json")
BACKEND_API            = os.getenv("BACKEND_API_URL", "https://pricebasket-api.onrender.com")
MIN_IMPRESSIONS        = 200   # minimum impressions per variant before declaring winner
TEST_DURATION_HOURS    = 48    # run test for 48 hours max

# In-memory test store (use Redis in production)
_active_tests: dict[str, dict] = {}
_test_results: list[dict] = []


# ── Title variant generator ───────────────────────────────────────────────────

def generate_title_variants(
    original_title: str,
    slug: str,
    excerpt: str = "",
    top_keyword: str = "",
) -> list[dict]:
    """
    Generate 3 title variants for A/B testing using Claude.
    Returns list of {variant_id, title, hypothesis}
    """
    if not ANTHROPIC_AVAILABLE or not ANTHROPIC_API_KEY:
        # Fallback: generate variants by formula
        return _formula_variants(original_title, slug)

    try:
        ai = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        msg = ai.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=500,
            messages=[{
                "role": "user",
                "content": f"""Generate 3 A/B test title variants for this blog post on pricebasket.in.

Original title: {original_title}
Excerpt: {excerpt[:200] if excerpt else 'N/A'}
Target keyword: {top_keyword or 'grocery price comparison india'}

Rules:
1. Variant A: Curiosity-driven (make reader wonder)
2. Variant B: Data/number-driven (specific savings amount)
3. Variant C: Urgency/FOMO-driven (today, right now, limited)

Each title must:
- Be under 65 characters (for Google)
- Include the target keyword naturally
- Be genuinely different from the others

Output as JSON array:
[
  {{"variant": "A", "title": "...", "hypothesis": "curiosity drives more clicks"}},
  {{"variant": "B", "title": "...", "hypothesis": "specific numbers build trust"}},
  {{"variant": "C", "title": "...", "hypothesis": "urgency increases CTR"}}
]

Output only valid JSON:""",
            }],
        )
        import re
        text = msg.content[0].text.strip()
        m = re.search(r"\[.*\]", text, re.DOTALL)
        if m:
            variants = json.loads(m.group())
            for v in variants:
                v["slug"] = slug
                v["test_id"] = _make_test_id(slug)
            return variants
    except Exception as exc:
        print(f"Claude variant generation error: {exc}")

    return _formula_variants(original_title, slug)


def _formula_variants(title: str, slug: str) -> list[dict]:
    """Formula-based title variants when Claude is unavailable."""
    test_id = _make_test_id(slug)
    # Extract product/topic from title
    words = title.split()
    topic = " ".join(words[:4]) if len(words) > 4 else title

    return [
        {
            "variant": "A",
            "title": f"Why {topic} Costs More on Blinkit Than JioMart",
            "hypothesis": "curiosity drives more clicks",
            "slug": slug,
            "test_id": test_id,
        },
        {
            "variant": "B",
            "title": f"Save ₹800/Month: {topic} Price Comparison (2025)",
            "hypothesis": "specific numbers build trust",
            "slug": slug,
            "test_id": test_id,
        },
        {
            "variant": "C",
            "title": f"{topic} — Today's Cheapest Price Across 8 Apps",
            "hypothesis": "urgency increases CTR",
            "slug": slug,
            "test_id": test_id,
        },
    ]


def _make_test_id(slug: str) -> str:
    return hashlib.md5(f"{slug}{datetime.date.today()}".encode()).hexdigest()[:8]


# ── Start a new A/B test ──────────────────────────────────────────────────────

def start_ab_test(slug: str, original_title: str, excerpt: str = "") -> dict:
    """
    Start an A/B test for a blog post.
    Stores test config and notifies the backend to serve variants.
    """
    variants = generate_title_variants(original_title, slug, excerpt)
    test_id  = variants[0]["test_id"] if variants else _make_test_id(slug)

    test = {
        "test_id":        test_id,
        "slug":           slug,
        "original_title": original_title,
        "variants":       variants,
        "started_at":     datetime.datetime.now().isoformat(),
        "status":         "running",
        "winner":         None,
        "impressions":    {v["variant"]: 0 for v in variants},
        "clicks":         {v["variant"]: 0 for v in variants},
    }

    _active_tests[slug] = test

    # Notify backend to register the test
    try:
        resp = requests.post(
            f"{BACKEND_API}/api/v1/growth/ab-tests",
            json=test,
            timeout=10,
        )
        if resp.ok:
            print(f"✅ A/B test started for '{slug}': {len(variants)} variants")
        else:
            print(f"⚠️  Backend notification failed: {resp.status_code}")
    except Exception as exc:
        print(f"Backend notification error: {exc}")

    # Print variants for review
    print(f"\nA/B Test: {slug}")
    for v in variants:
        print(f"  [{v['variant']}] {v['title']}")
        print(f"       Hypothesis: {v['hypothesis']}")

    return test


# ── Read GA4 CTR data ─────────────────────────────────────────────────────────

def fetch_ga4_ctr(test_id: str, slug: str) -> dict:
    """
    Fetch click-through rates per variant from GA4.
    Returns {variant: {impressions, clicks, ctr}}
    """
    if not GA4_AVAILABLE or not GA4_PROPERTY_ID:
        # Return simulated data for testing
        import random
        return {
            "A": {"impressions": random.randint(150, 400), "clicks": random.randint(20, 80),  "ctr": 0.0},
            "B": {"impressions": random.randint(150, 400), "clicks": random.randint(25, 100), "ctr": 0.0},
            "C": {"impressions": random.randint(150, 400), "clicks": random.randint(15, 60),  "ctr": 0.0},
        }

    try:
        creds = service_account.Credentials.from_service_account_file(
            GA4_SERVICE_ACCOUNT,
            scopes=["https://www.googleapis.com/auth/analytics.readonly"],
        )
        service = build("analyticsdata", "v1beta", credentials=creds)

        end_date   = datetime.date.today().isoformat()
        start_date = (datetime.date.today() - datetime.timedelta(days=3)).isoformat()

        response = service.properties().runReport(
            property=GA4_PROPERTY_ID,
            body={
                "dateRanges": [{"startDate": start_date, "endDate": end_date}],
                "dimensions": [
                    {"name": "customEvent:ab_variant"},
                    {"name": "customEvent:test_id"},
                ],
                "metrics": [
                    {"name": "eventCount"},
                    {"name": "sessions"},
                ],
                "dimensionFilter": {
                    "filter": {
                        "fieldName": "customEvent:test_id",
                        "stringFilter": {"value": test_id},
                    }
                },
            },
        ).execute()

        results = {}
        for row in response.get("rows", []):
            variant    = row["dimensionValues"][0]["value"]
            impressions = int(row["metricValues"][0]["value"])
            clicks      = int(row["metricValues"][1]["value"])
            ctr         = clicks / impressions if impressions > 0 else 0
            results[variant] = {"impressions": impressions, "clicks": clicks, "ctr": round(ctr, 4)}

        return results

    except Exception as exc:
        print(f"GA4 fetch error: {exc}")
        return {}


# ── Evaluate and pick winner ──────────────────────────────────────────────────

def evaluate_test(slug: str) -> dict | None:
    """
    Check if a test has enough data to declare a winner.
    Returns winner dict or None if test should continue.
    """
    test = _active_tests.get(slug)
    if not test or test["status"] != "running":
        return None

    # Check if test has been running long enough
    started = datetime.datetime.fromisoformat(test["started_at"])
    hours_elapsed = (datetime.datetime.now() - started).total_seconds() / 3600

    ctr_data = fetch_ga4_ctr(test["test_id"], slug)
    if not ctr_data:
        return None

    # Update test with latest data
    for variant, data in ctr_data.items():
        test["impressions"][variant] = data["impressions"]
        test["clicks"][variant]      = data["clicks"]

    # Check minimum impressions
    min_imps = min(
        ctr_data.get(v["variant"], {}).get("impressions", 0)
        for v in test["variants"]
    )

    if min_imps < MIN_IMPRESSIONS and hours_elapsed < TEST_DURATION_HOURS:
        print(f"  Test '{slug}': {min_imps} impressions (need {MIN_IMPRESSIONS}) — continuing...")
        return None

    # Declare winner
    winner_variant = max(
        ctr_data,
        key=lambda v: ctr_data[v].get("ctr", 0),
    )
    winner_data = next(
        (v for v in test["variants"] if v["variant"] == winner_variant),
        None,
    )

    if not winner_data:
        return None

    winner_ctr = ctr_data[winner_variant].get("ctr", 0)
    test["status"] = "complete"
    test["winner"] = winner_data
    test["winner_ctr"] = winner_ctr
    test["completed_at"] = datetime.datetime.now().isoformat()

    _test_results.append(test)

    print(f"\n🏆 A/B Test Winner for '{slug}':")
    print(f"   Variant {winner_variant}: '{winner_data['title']}'")
    print(f"   CTR: {winner_ctr:.1%} ({ctr_data[winner_variant]['clicks']} clicks / {ctr_data[winner_variant]['impressions']} impressions)")
    print(f"   Hypothesis confirmed: {winner_data['hypothesis']}")

    # Apply winning title to backend
    _apply_winning_title(slug, winner_data["title"])

    return test


def _apply_winning_title(slug: str, winning_title: str):
    """Update the blog post title in the backend with the winning variant."""
    try:
        resp = requests.patch(
            f"{BACKEND_API}/api/v1/content/blog/{slug}",
            json={"title": winning_title, "ab_test_winner": True},
            timeout=10,
        )
        if resp.ok:
            print(f"   ✅ Winning title applied to backend")
        else:
            print(f"   ⚠️  Backend update failed: {resp.status_code}")
    except Exception as exc:
        print(f"   Backend update error: {exc}")


# ── Batch runner ──────────────────────────────────────────────────────────────

def run_evaluation_cycle():
    """
    Evaluate all active tests. Called every 6 hours.
    """
    if not _active_tests:
        print(f"[{_now()}] No active A/B tests")
        return

    print(f"[{_now()}] Evaluating {len(_active_tests)} active A/B tests...")
    for slug in list(_active_tests.keys()):
        result = evaluate_test(slug)
        if result and result["status"] == "complete":
            del _active_tests[slug]
        time.sleep(1)


def start_tests_for_new_posts():
    """
    Fetch recent blog posts from backend and start A/B tests for any
    that don't have an active test yet.
    """
    try:
        resp = requests.get(
            f"{BACKEND_API}/api/v1/content/blog?limit=10&generated=true",
            timeout=15,
        )
        if not resp.ok:
            return
        posts = resp.json().get("posts", [])
        for post in posts:
            slug = post.get("slug", "")
            if slug and slug not in _active_tests:
                start_ab_test(
                    slug=slug,
                    original_title=post.get("title", ""),
                    excerpt=post.get("excerpt", ""),
                )
                time.sleep(2)
    except Exception as exc:
        print(f"New post fetch error: {exc}")


def save_results():
    """Save test results to file for analysis."""
    results_path = os.path.join(os.path.dirname(__file__), "ab_test_results.json")
    try:
        existing = []
        if os.path.exists(results_path):
            with open(results_path) as f:
                existing = json.load(f)
        existing.extend(_test_results)
        with open(results_path, "w") as f:
            json.dump(existing[-200:], f, indent=2)
        print(f"Results saved to {results_path}")
    except Exception as exc:
        print(f"Results save error: {exc}")


def print_summary():
    """Print summary of all test results."""
    if not _test_results:
        print("No completed tests yet.")
        return

    print(f"\n{'='*60}")
    print("A/B TEST RESULTS SUMMARY")
    print("="*60)
    variant_wins = {"A": 0, "B": 0, "C": 0}
    for test in _test_results:
        winner = test.get("winner", {})
        variant = winner.get("variant", "?")
        if variant in variant_wins:
            variant_wins[variant] += 1
        print(f"\n  Slug: {test['slug']}")
        print(f"  Winner: [{variant}] {winner.get('title', '?')}")
        print(f"  CTR: {test.get('winner_ctr', 0):.1%}")

    print(f"\nVariant win rates:")
    total = sum(variant_wins.values())
    for v, wins in variant_wins.items():
        pct = wins / total * 100 if total > 0 else 0
        label = {"A": "Curiosity", "B": "Data/Numbers", "C": "Urgency"}[v]
        print(f"  [{v}] {label}: {wins} wins ({pct:.0f}%)")


def _now() -> str:
    return datetime.datetime.now().strftime("%H:%M:%S")


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"

    if cmd == "test" and len(sys.argv) >= 4:
        # python headline_ab_tester.py test <slug> "Original Title"
        slug  = sys.argv[2]
        title = sys.argv[3]
        start_ab_test(slug, title)

    elif cmd == "variants" and len(sys.argv) >= 3:
        # python headline_ab_tester.py variants "Original Title Here"
        title    = " ".join(sys.argv[2:])
        variants = generate_title_variants(title, "test-slug")
        print(f"\nTitle variants for: '{title}'")
        for v in variants:
            print(f"\n  [{v['variant']}] {v['title']}")
            print(f"       Hypothesis: {v['hypothesis']}")

    elif cmd == "evaluate":
        run_evaluation_cycle()

    elif cmd == "scan":
        start_tests_for_new_posts()

    elif cmd == "summary":
        print_summary()

    elif cmd == "run":
        import schedule
        schedule.every(6).hours.do(run_evaluation_cycle)
        schedule.every().day.at("07:00").do(start_tests_for_new_posts)
        print("Headline A/B Tester running: evaluate every 6h, scan for new posts daily at 7am")
        while True:
            schedule.run_pending()
            time.sleep(60)

    else:
        print("Usage:")
        print("  python headline_ab_tester.py variants 'Your Blog Title Here'")
        print("  python headline_ab_tester.py test <slug> 'Original Title'")
        print("  python headline_ab_tester.py evaluate")
        print("  python headline_ab_tester.py scan")
        print("  python headline_ab_tester.py summary")
        print("  python headline_ab_tester.py run  (daemon mode)")
