#!/usr/bin/env python3
"""
PRICEBASKET.IN — Google Search Console Automation
Fetches low-hanging fruit keywords (positions 4-20), identifies update opportunities,
emails weekly report to admin, and auto-submits new URLs for indexing.

Setup:
  pip install google-auth google-auth-httplib2 google-api-python-client requests
  Set env vars: GSC_SITE_URL, ADMIN_EMAIL, SENDGRID_API_KEY, INDEXING_API_KEY
"""

import os
import json
import datetime
import requests
from google.oauth2 import service_account
from googleapiclient.discovery import build

# ── Config ────────────────────────────────────────────────────────────────────
SITE_URL = os.getenv("GSC_SITE_URL", "https://pricebasket.in")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@pricebasket.in")
SENDGRID_KEY = os.getenv("SENDGRID_API_KEY", "")
SERVICE_ACCOUNT_FILE = os.getenv("GSC_SERVICE_ACCOUNT_JSON", "gsc-service-account.json")
SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly",
          "https://www.googleapis.com/auth/indexing"]

# ── Auth ──────────────────────────────────────────────────────────────────────
def get_credentials():
    return service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES
    )

def get_gsc_service():
    creds = get_credentials()
    return build("searchconsole", "v1", credentials=creds)

# ── Fetch low-hanging fruit (positions 4-20) ──────────────────────────────────
def fetch_opportunity_keywords(days_back: int = 28) -> list[dict]:
    """Returns keywords ranking 4-20 with high impressions — easy wins to push to top 3."""
    service = get_gsc_service()
    end_date = datetime.date.today()
    start_date = end_date - datetime.timedelta(days=days_back)

    response = service.searchanalytics().query(
        siteUrl=SITE_URL,
        body={
            "startDate": str(start_date),
            "endDate": str(end_date),
            "dimensions": ["query", "page"],
            "rowLimit": 500,
            "dimensionFilterGroups": [{
                "filters": [{
                    "dimension": "query",
                    "operator": "notContains",
                    "expression": "pricebasket"
                }]
            }]
        }
    ).execute()

    opportunities = []
    for row in response.get("rows", []):
        position = row.get("position", 0)
        impressions = row.get("impressions", 0)
        clicks = row.get("clicks", 0)
        ctr = row.get("ctr", 0)
        query = row["keys"][0]
        page = row["keys"][1]

        # Low-hanging fruit: positions 4-20 with decent impressions
        if 4 <= position <= 20 and impressions >= 100:
            potential_clicks = impressions * 0.25  # ~25% CTR if position 1
            current_clicks = clicks
            click_gain = potential_clicks - current_clicks
            opportunities.append({
                "keyword": query,
                "page": page,
                "current_position": round(position, 1),
                "impressions": impressions,
                "current_clicks": clicks,
                "current_ctr": round(ctr * 100, 2),
                "potential_clicks_at_pos1": round(potential_clicks),
                "click_gain_opportunity": round(click_gain),
                "priority": "HIGH" if impressions > 1000 else "MEDIUM" if impressions > 300 else "LOW"
            })

    # Sort by click gain opportunity (highest first)
    opportunities.sort(key=lambda x: x["click_gain_opportunity"], reverse=True)
    return opportunities[:50]  # Top 50 opportunities

# ── Identify pages needing content updates ────────────────────────────────────
def identify_pages_to_update(opportunities: list[dict]) -> list[dict]:
    """Groups opportunities by page and identifies which pages need content updates."""
    page_map = {}
    for opp in opportunities:
        page = opp["page"]
        if page not in page_map:
            page_map[page] = {"page": page, "keywords": [], "total_opportunity": 0}
        page_map[page]["keywords"].append(opp["keyword"])
        page_map[page]["total_opportunity"] += opp["click_gain_opportunity"]

    pages = list(page_map.values())
    pages.sort(key=lambda x: x["total_opportunity"], reverse=True)

    for page in pages:
        page["action"] = _recommend_action(page["page"], page["keywords"])

    return pages[:20]

def _recommend_action(page: str, keywords: list[str]) -> str:
    """Recommends specific content action for a page."""
    if "/blog/" in page:
        return "Update blog post: add FAQ section, refresh stats, add internal links to compare pages"
    elif "/compare/" in page:
        return "Add more product examples, update prices table, add 'People also ask' section"
    elif "/product/" in page:
        return "Add price history chart, add comparison table, add schema markup"
    elif "/grocery-prices-" in page:
        return "Add city-specific deals section, add local platform availability info"
    else:
        return "Add more keyword-rich content, improve meta description, add FAQ schema"

# ── Auto-submit URLs for indexing ─────────────────────────────────────────────
def submit_url_for_indexing(url: str) -> dict:
    """Submits a URL to Google Indexing API for immediate crawling."""
    creds = get_credentials()
    service = build("indexing", "v3", credentials=creds)
    try:
        result = service.urlNotifications().publish(
            body={"url": url, "type": "URL_UPDATED"}
        ).execute()
        return {"url": url, "status": "submitted", "result": result}
    except Exception as e:
        return {"url": url, "status": "error", "error": str(e)}

def submit_new_blog_post(slug: str) -> dict:
    """Call this whenever a new blog post is published."""
    url = f"https://pricebasket.in/blog/{slug}"
    return submit_url_for_indexing(url)

# ── Email weekly report ───────────────────────────────────────────────────────
def send_weekly_report(opportunities: list[dict], pages_to_update: list[dict]) -> bool:
    """Sends weekly SEO opportunity report via SendGrid."""
    if not SENDGRID_KEY:
        print("No SendGrid key — printing report instead")
        _print_report(opportunities, pages_to_update)
        return True

    top_opps = opportunities[:10]
    opp_rows = "\n".join([
        f"<tr><td>{o['keyword']}</td><td>#{o['current_position']}</td>"
        f"<td>{o['impressions']:,}</td><td>+{o['click_gain_opportunity']:,}</td>"
        f"<td><b>{o['priority']}</b></td></tr>"
        for o in top_opps
    ])

    page_rows = "\n".join([
        f"<tr><td>{p['page']}</td><td>{len(p['keywords'])}</td>"
        f"<td>+{p['total_opportunity']:,}</td><td>{p['action'][:80]}...</td></tr>"
        for p in pages_to_update[:10]
    ])

    html = f"""
    <h2>🚀 PriceBasket.in — Weekly SEO Opportunity Report</h2>
    <p>Generated: {datetime.date.today()} | Total opportunities found: {len(opportunities)}</p>

    <h3>Top 10 Keywords to Push to Position 1-3</h3>
    <table border="1" cellpadding="8" style="border-collapse:collapse;width:100%">
      <tr style="background:#ea580c;color:white">
        <th>Keyword</th><th>Current Pos</th><th>Impressions</th><th>Click Gain</th><th>Priority</th>
      </tr>
      {opp_rows}
    </table>

    <h3>Pages Needing Content Updates</h3>
    <table border="1" cellpadding="8" style="border-collapse:collapse;width:100%">
      <tr style="background:#ea580c;color:white">
        <th>Page</th><th>Keywords</th><th>Click Opportunity</th><th>Recommended Action</th>
      </tr>
      {page_rows}
    </table>

    <p>View full dashboard: <a href="https://pricebasket.in/admin/growth">pricebasket.in/admin/growth</a></p>
    """

    payload = {
        "personalizations": [{"to": [{"email": ADMIN_EMAIL}]}],
        "from": {"email": "seo@pricebasket.in", "name": "PriceBasket SEO Bot"},
        "subject": f"📊 Weekly SEO Report — {len(opportunities)} opportunities found | {datetime.date.today()}",
        "content": [{"type": "text/html", "value": html}]
    }

    resp = requests.post(
        "https://api.sendgrid.com/v3/mail/send",
        headers={"Authorization": f"Bearer {SENDGRID_KEY}", "Content-Type": "application/json"},
        json=payload
    )
    return resp.status_code == 202

def _print_report(opportunities, pages_to_update):
    print("\n" + "="*60)
    print("PRICEBASKET.IN — WEEKLY SEO OPPORTUNITY REPORT")
    print("="*60)
    print(f"\nTop 10 Low-Hanging Fruit Keywords:")
    for i, o in enumerate(opportunities[:10], 1):
        print(f"  {i}. '{o['keyword']}' — Position #{o['current_position']} — "
              f"{o['impressions']:,} impressions — +{o['click_gain_opportunity']:,} potential clicks")
    print(f"\nTop 5 Pages to Update:")
    for p in pages_to_update[:5]:
        print(f"  {p['page']} — {len(p['keywords'])} keywords — +{p['total_opportunity']:,} clicks")
        print(f"    Action: {p['action']}")

# ── Main runner ───────────────────────────────────────────────────────────────
def run_weekly_seo_report():
    print("Fetching GSC data for pricebasket.in...")
    opportunities = fetch_opportunity_keywords(days_back=28)
    pages_to_update = identify_pages_to_update(opportunities)
    print(f"Found {len(opportunities)} keyword opportunities")
    print(f"Found {len(pages_to_update)} pages needing updates")
    success = send_weekly_report(opportunities, pages_to_update)
    print(f"Report sent: {success}")
    return {"opportunities": opportunities, "pages": pages_to_update}

def run_daily_indexing(new_urls: list[str]):
    """Call daily with any new URLs published that day."""
    results = []
    for url in new_urls:
        result = submit_url_for_indexing(url)
        results.append(result)
        print(f"Submitted: {url} — {result['status']}")
    return results

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "index":
        urls = sys.argv[2:]
        run_daily_indexing(urls)
    else:
        run_weekly_seo_report()
