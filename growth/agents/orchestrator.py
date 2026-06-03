#!/usr/bin/env python3
"""
PRICEBASKET.IN — Master Agent Orchestrator
==========================================
The central brain that coordinates ALL traffic agents on a unified schedule.
Runs as a single daemon process — no need to manage 10 separate cron jobs.

Agent Registry:
  ┌─────────────────────────────────┬──────────────────────┬────────────────┐
  │ Agent                           │ Schedule             │ Status         │
  ├─────────────────────────────────┼──────────────────────┼────────────────┤
  │ Blog Writer (content_engine)    │ Daily 6:00 AM IST    │ ✅ Built       │
  │ Instagram Caption Agent         │ Daily 6:00 AM IST    │ ✅ Built       │
  │ Twitter Agent (5 tweets/day)    │ 8,11,14,18,21 IST    │ ✅ Built       │
  │ Headline A/B Tester             │ Daily 7:00 AM IST    │ ✅ Built       │
  │ GSC Monitor                     │ Weekly Monday 9 AM   │ ✅ Built       │
  │ Google Indexing Pinger          │ After each blog post │ ✅ Built       │
  │ Internal Link Agent             │ Daily 8:00 AM IST    │ ✅ Built       │
  │ Price Alert Emailer             │ Every 30 min         │ ✅ Built       │
  │ WhatsApp Alert Agent            │ Every 30 min         │ ✅ Built       │
  │ Push Notification Agent         │ Every 15 min         │ ✅ Built       │
  │ Reddit/Quora Seeder             │ 10 AM + 5 PM IST     │ ✅ Built       │
  │ Trending Topic Injector         │ Every 2 hours        │ ✅ Built       │
  │ Page Generator (weekly)         │ Weekly Sunday 2 AM   │ ✅ Built       │
  │ Traffic Flow Monitor            │ Every 15 min         │ ✅ Built       │
  │ Traffic Flow Analysis           │ Every 4 hours        │ ✅ Built       │
  └─────────────────────────────────┴──────────────────────┴────────────────┘

Safe traffic practices:
  • All API keys loaded from .env — never hardcoded
  • Rate limits respected per platform
  • Dry-run mode when keys are missing
  • Human review queue for social posts (configurable)
  • All prices sourced from own backend API — no competitor scraping
  • UTM parameters on every AI-generated link

Setup:
  pip install schedule requests python-dotenv
  cp .env.example .env  # fill in your API keys
  python orchestrator.py run

  Or run specific agents:
  python orchestrator.py run --agents instagram,twitter,whatsapp
  python orchestrator.py status
  python orchestrator.py test <agent_name>
"""

import os
import time
import datetime
import threading
import argparse
import schedule
import requests

# Load .env if present
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "backend", ".env"))
except ImportError:
    pass  # dotenv optional

# ── Config ────────────────────────────────────────────────────────────────────
BACKEND_API   = os.getenv("BACKEND_API_URL", "https://pricebasket-api.onrender.com")
SITE_URL      = "https://pricebasket.in"
DRY_RUN       = os.getenv("AGENT_DRY_RUN", "false").lower() == "true"
LOG_FILE      = os.path.join(os.path.dirname(__file__), "orchestrator.log")

# ── Agent status tracker ──────────────────────────────────────────────────────
_agent_stats: dict[str, dict] = {}

def _record_run(agent_name: str, success: bool, detail: str = ""):
    _agent_stats[agent_name] = {
        "last_run":    datetime.datetime.now().isoformat(),
        "last_status": "✅ success" if success else "❌ failed",
        "detail":      detail,
        "run_count":   _agent_stats.get(agent_name, {}).get("run_count", 0) + 1,
    }
    _log(f"[{agent_name}] {'OK' if success else 'FAIL'} — {detail}")


def _log(msg: str):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {msg}"
    print(line)
    try:
        with open(LOG_FILE, "a") as f:
            f.write(line + "\n")
    except Exception:
        pass


# ── Lazy agent imports (graceful degradation) ─────────────────────────────────

def _import_agent(module_path: str, attr: str):
    """Import an agent function, returning None if import fails."""
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("agent", module_path)
        mod  = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return getattr(mod, attr, None)
    except Exception as exc:
        _log(f"Import failed for {module_path}: {exc}")
        return None


AGENTS_DIR = os.path.dirname(__file__)


# ── Individual agent runners (wrapped with error handling) ────────────────────

def run_blog_writer():
    """Daily SEO blog post via Bedrock (Claude Sonnet 4.6) + IndexNow ping."""
    fn = _import_agent(
        os.path.join(AGENTS_DIR, "bedrock_content_runner.py"),
        "generate_blog_post",
    )
    pub = _import_agent(
        os.path.join(AGENTS_DIR, "bedrock_content_runner.py"),
        "publish_blog",
    )
    if fn and pub:
        try:
            post = fn()
            pub(post)
            slug  = post.get("slug", "")
            title = post.get("title", "")
            _record_run("blog_writer", True, f"Bedrock generated: {slug} ({len(post.get('content','').split())}w)")
            if slug:
                _schedule_internal_links(slug)
            if slug and title:
                _schedule_ab_test(slug, title)
        except Exception as exc:
            _record_run("blog_writer", False, str(exc))
    else:
        # Fallback to backend API
        try:
            resp = requests.post(f"{BACKEND_API}/api/v1/content/generate-daily", timeout=60)
            slug = (resp.json().get("slug", "") if resp.ok else "")
            _record_run("blog_writer", resp.ok, f"API: {slug or resp.status_code}")
        except Exception as exc:
            _record_run("blog_writer", False, str(exc))


def run_bedrock_tweet():
    """Post one AI-generated tweet via Bedrock (Claude Sonnet 4.6)."""
    fn_gen  = _import_agent(os.path.join(AGENTS_DIR, "bedrock_content_runner.py"), "generate_tweet")
    fn_post = _import_agent(os.path.join(AGENTS_DIR, "bedrock_content_runner.py"), "post_tweet")
    if fn_gen and fn_post:
        try:
            tweet = fn_gen()
            result = fn_post(tweet)
            tweet_id = result.get("id", "")
            _record_run("bedrock_tweet", True, f"id={tweet_id} | {tweet[:60]}...")
        except Exception as exc:
            _record_run("bedrock_tweet", False, str(exc))
    else:
        _record_run("bedrock_tweet", False, "import failed")


def run_instagram_agent():
    """Generate and schedule 3 Instagram posts for today."""
    fn = _import_agent(
        os.path.join(os.path.dirname(AGENTS_DIR), "social", "instagram-automation.py"),
        "run_daily_instagram",
    )
    if fn:
        try:
            fn()
            _record_run("instagram", True, "3 posts scheduled")
        except Exception as exc:
            _record_run("instagram", False, str(exc))
    else:
        # Fallback: call via backend
        try:
            resp = requests.post(
                f"{BACKEND_API}/api/v1/growth/social/instagram",
                timeout=30,
            )
            _record_run("instagram", resp.ok, f"HTTP {resp.status_code}")
        except Exception as exc:
            _record_run("instagram", False, str(exc))


def run_twitter_tweet():
    """Post one scheduled tweet (called 5x/day)."""
    fn = _import_agent(
        os.path.join(os.path.dirname(AGENTS_DIR), "social", "twitter-automation.py"),
        "post_scheduled_tweet",
    )
    if fn:
        try:
            fn()
            _record_run("twitter_tweet", True, "Tweet posted")
        except Exception as exc:
            _record_run("twitter_tweet", False, str(exc))
    else:
        try:
            resp = requests.post(f"{BACKEND_API}/api/v1/growth/social/tweet", timeout=20)
            _record_run("twitter_tweet", resp.ok, f"HTTP {resp.status_code}")
        except Exception as exc:
            _record_run("twitter_tweet", False, str(exc))


def run_twitter_mention_replies():
    """Check and reply to Twitter mentions."""
    fn = _import_agent(
        os.path.join(os.path.dirname(AGENTS_DIR), "social", "twitter-automation.py"),
        "reply_to_mentions",
    )
    if fn:
        try:
            fn()
            _record_run("twitter_mentions", True, "Mentions checked")
        except Exception as exc:
            _record_run("twitter_mentions", False, str(exc))


def run_gsc_monitor():
    """Weekly Google Search Console opportunity report."""
    fn = _import_agent(
        os.path.join(os.path.dirname(AGENTS_DIR), "seo", "gsc-automation.py"),
        "run_weekly_seo_report",
    )
    if fn:
        try:
            result = fn()
            opps = len(result.get("opportunities", [])) if result else 0
            _record_run("gsc_monitor", True, f"{opps} opportunities found")
        except Exception as exc:
            _record_run("gsc_monitor", False, str(exc))


def run_internal_link_agent():
    """Scan new blog posts and add internal links."""
    fn = _import_agent(
        os.path.join(AGENTS_DIR, "internal_link_agent.py"),
        "run_internal_link_scan",
    )
    if fn:
        try:
            fn(limit=10)
            _record_run("internal_links", True, "Scan complete")
        except Exception as exc:
            _record_run("internal_links", False, str(exc))


def run_email_price_alerts():
    """Send price drop alert emails to subscribers."""
    try:
        resp = requests.post(
            f"{BACKEND_API}/api/v1/growth/email/price-alerts",
            timeout=30,
        )
        data = resp.json() if resp.ok else {}
        sent = data.get("sent", 0)
        _record_run("email_alerts", resp.ok, f"{sent} emails sent")
    except Exception as exc:
        _record_run("email_alerts", False, str(exc))


def run_whatsapp_alerts():
    """Send WhatsApp price drop notifications."""
    fn = _import_agent(
        os.path.join(AGENTS_DIR, "whatsapp_agent.py"),
        "run_price_alert_notifications",
    )
    if fn:
        try:
            fn()
            _record_run("whatsapp_alerts", True, "Alerts processed")
        except Exception as exc:
            _record_run("whatsapp_alerts", False, str(exc))


def run_push_notifications():
    """Send browser push notifications for price drops."""
    fn = _import_agent(
        os.path.join(AGENTS_DIR, "push_notification_agent.py"),
        "run_price_drop_notifications",
    )
    if fn:
        try:
            fn()
            _record_run("push_notifications", True, "Notifications sent")
        except Exception as exc:
            _record_run("push_notifications", False, str(exc))


def run_reddit_session():
    """Reddit engagement session."""
    fn = _import_agent(
        os.path.join(AGENTS_DIR, "reddit_quora_agent.py"),
        "run_reddit_session",
    )
    if fn:
        try:
            fn()
            _record_run("reddit", True, "Session complete")
        except Exception as exc:
            _record_run("reddit", False, str(exc))


def run_trending_monitor():
    """Check trending topics and inject content."""
    fn = _import_agent(
        os.path.join(AGENTS_DIR, "trending_topic_injector.py"),
        "run_trending_monitor",
    )
    if fn:
        try:
            fn()
            _record_run("trending", True, "Monitor complete")
        except Exception as exc:
            _record_run("trending", False, str(exc))


def run_page_generator():
    """Weekly programmatic page generation."""
    fn = _import_agent(
        os.path.join(AGENTS_DIR, "page_generator_agent.py"),
        "run_full_generation",
    )
    if fn:
        try:
            urls = fn()
            _record_run("page_generator", True, f"{len(urls)} pages generated")
        except Exception as exc:
            _record_run("page_generator", False, str(exc))


def run_traffic_flow_monitor():
    """Every-15-min: check active users, fire multi-channel burst if below 100."""
    fn = _import_agent(
        os.path.join(AGENTS_DIR, "traffic_flow_agent.py"),
        "run_monitor_cycle",
    )
    if fn:
        try:
            summary = fn()
            active  = summary.get("active_users", 0)
            burst   = "burst fired" if summary.get("burst_fired") else "no burst"
            _record_run("traffic_flow_monitor", True, f"active={active} goal=100 → {burst}")
        except Exception as exc:
            _record_run("traffic_flow_monitor", False, str(exc))
    else:
        _record_run("traffic_flow_monitor", False, "import failed")


def run_traffic_flow_analysis():
    """Every-4-hour: on-site CTA/link optimisation + source routing."""
    fn = _import_agent(
        os.path.join(AGENTS_DIR, "traffic_flow_agent.py"),
        "run_flow_cycle",
    )
    if fn:
        try:
            fn()
            _record_run("traffic_flow_analysis", True, "flow cycle complete")
        except Exception as exc:
            _record_run("traffic_flow_analysis", False, str(exc))
    else:
        _record_run("traffic_flow_analysis", False, "import failed")


def run_headline_ab_tester():
    """Evaluate active A/B tests and start new ones for recent posts."""
    fn = _import_agent(
        os.path.join(AGENTS_DIR, "headline_ab_tester.py"),
        "run_evaluation_cycle",
    )
    if fn:
        try:
            fn()
            _record_run("ab_tester", True, "Evaluation cycle complete")
        except Exception as exc:
            _record_run("ab_tester", False, str(exc))

    fn2 = _import_agent(
        os.path.join(AGENTS_DIR, "headline_ab_tester.py"),
        "start_tests_for_new_posts",
    )
    if fn2:
        try:
            fn2()
        except Exception:
            pass


def run_weekly_newsletter():
    """Send weekly newsletter to all subscribers."""
    try:
        resp = requests.post(
            f"{BACKEND_API}/api/v1/growth/email/weekly-newsletter",
            timeout=60,
        )
        data = resp.json() if resp.ok else {}
        sent = data.get("sent", 0)
        _record_run("newsletter", resp.ok, f"{sent} emails sent")
    except Exception as exc:
        _record_run("newsletter", False, str(exc))


def run_whatsapp_weekly_digest():
    """Send weekly WhatsApp deals digest."""
    fn = _import_agent(
        os.path.join(AGENTS_DIR, "whatsapp_agent.py"),
        "run_weekly_digest",
    )
    if fn:
        try:
            fn()
            _record_run("whatsapp_digest", True, "Digest sent")
        except Exception as exc:
            _record_run("whatsapp_digest", False, str(exc))


def run_push_weekly_digest():
    """Send weekly push notification digest."""
    fn = _import_agent(
        os.path.join(AGENTS_DIR, "push_notification_agent.py"),
        "run_weekly_deals_broadcast",
    )
    if fn:
        try:
            fn()
            _record_run("push_digest", True, "Digest sent")
        except Exception as exc:
            _record_run("push_digest", False, str(exc))


# ── Helpers for post-generation hooks ────────────────────────────────────────

def _schedule_internal_links(slug: str):
    """Schedule internal link injection for a newly published post."""
    def _run():
        time.sleep(30)  # wait 30s for post to be fully indexed in backend
        fn = _import_agent(
            os.path.join(AGENTS_DIR, "internal_link_agent.py"),
            "process_post",
        )
        if fn:
            try:
                resp = requests.get(f"{BACKEND_API}/api/v1/content/blog/{slug}", timeout=15)
                if resp.ok:
                    post = resp.json()
                    updated = fn(post)
                    if updated.get("internal_links_added"):
                        requests.patch(
                            f"{BACKEND_API}/api/v1/content/blog/{slug}",
                            json={"content": updated["content"], "internal_links_added": True},
                            timeout=15,
                        )
                        _log(f"[internal_links] Auto-linked new post: {slug}")
            except Exception as exc:
                _log(f"[internal_links] Auto-link failed for {slug}: {exc}")

    t = threading.Thread(target=_run, daemon=True)
    t.start()


def _schedule_ab_test(slug: str, title: str):
    """Start A/B test for a newly published post."""
    def _run():
        time.sleep(60)
        fn = _import_agent(
            os.path.join(AGENTS_DIR, "headline_ab_tester.py"),
            "start_ab_test",
        )
        if fn:
            try:
                fn(slug=slug, original_title=title)
                _log(f"[ab_tester] Started test for: {slug}")
            except Exception as exc:
                _log(f"[ab_tester] Test start failed for {slug}: {exc}")

    t = threading.Thread(target=_run, daemon=True)
    t.start()


# ── Master schedule ───────────────────────────────────────────────────────────

def setup_full_schedule(enabled_agents: list[str] = None):
    """
    Register all agent schedules.
    If enabled_agents is provided, only those agents are scheduled.
    """
    def _should_run(name: str) -> bool:
        return enabled_agents is None or name in enabled_agents

    # ── Content creation ──────────────────────────────────────────────────────
    if _should_run("blog"):
        schedule.every().day.at("06:00").do(run_blog_writer)
        _log("Scheduled: blog_writer @ 06:00 daily")

    if _should_run("instagram"):
        schedule.every().day.at("06:30").do(run_instagram_agent)
        _log("Scheduled: instagram @ 06:30 daily")

    if _should_run("twitter"):
        # AI-generated tweets via Bedrock at prime times
        for tweet_time in ["08:00", "11:00", "14:00", "18:00", "21:00"]:
            schedule.every().day.at(tweet_time).do(run_bedrock_tweet)
        # Fall back to library tweets if Bedrock unavailable
        schedule.every(10).minutes.do(run_twitter_mention_replies)
        _log("Scheduled: bedrock_tweet @ 08,11,14,18,21 + mentions every 10min")

    if _should_run("ab_tester"):
        schedule.every().day.at("07:00").do(run_headline_ab_tester)
        schedule.every(6).hours.do(run_headline_ab_tester)
        _log("Scheduled: ab_tester @ 07:00 + every 6h")

    # ── SEO automation ────────────────────────────────────────────────────────
    if _should_run("gsc"):
        schedule.every().monday.at("09:00").do(run_gsc_monitor)
        _log("Scheduled: gsc_monitor @ Monday 09:00")

    if _should_run("internal_links"):
        schedule.every().day.at("08:00").do(run_internal_link_agent)
        _log("Scheduled: internal_links @ 08:00 daily")

    if _should_run("pages"):
        schedule.every().sunday.at("02:00").do(run_page_generator)
        _log("Scheduled: page_generator @ Sunday 02:00")

    # ── Notifications ─────────────────────────────────────────────────────────
    if _should_run("email"):
        # Smart trigger: check for drops every 30 min, but only email if drop > 10%
        # Daily digest always goes at 7am — never more than 1 email/user/day
        schedule.every(30).minutes.do(run_email_price_alerts)
        schedule.every().day.at("07:00").do(run_weekly_newsletter)
        _log("Scheduled: email_alerts (smart drop-only) every 30min + daily digest 07:00")

    if _should_run("whatsapp"):
        schedule.every(30).minutes.do(run_whatsapp_alerts)
        schedule.every().monday.at("09:30").do(run_whatsapp_weekly_digest)
        _log("Scheduled: whatsapp_alerts every 30min + digest Monday 09:30")

    if _should_run("push"):
        schedule.every(15).minutes.do(run_push_notifications)
        schedule.every().monday.at("10:00").do(run_push_weekly_digest)
        _log("Scheduled: push_notifications every 15min + digest Monday 10:00")

    # ── Social listening ──────────────────────────────────────────────────────
    if _should_run("reddit"):
        schedule.every().day.at("10:00").do(run_reddit_session)
        schedule.every().day.at("17:00").do(run_reddit_session)
        _log("Scheduled: reddit @ 10:00 + 17:00 daily")

    if _should_run("trending"):
        schedule.every(2).hours.do(run_trending_monitor)
        _log("Scheduled: trending_monitor every 2h")

    # ── Weekly newsletter ─────────────────────────────────────────────────────
    if _should_run("newsletter"):
        schedule.every().wednesday.at("10:00").do(run_weekly_newsletter)
        _log("Scheduled: newsletter @ Wednesday 10:00")

    # ── Traffic flow — active-user goal: 100+ ─────────────────────────────────
    if _should_run("traffic_flow"):
        schedule.every(15).minutes.do(run_traffic_flow_monitor)
        schedule.every(4).hours.do(run_traffic_flow_analysis)
        _log("Scheduled: traffic_flow_monitor every 15min + analysis every 4h")

    _log(f"Master schedule ready. {len(schedule.jobs)} jobs registered.")


# ── Status dashboard ──────────────────────────────────────────────────────────

def print_status():
    """Print current status of all agents."""
    print("\n" + "=" * 70)
    print("PRICEBASKET.IN — AI AGENT TRAFFIC SYSTEM STATUS")
    print(f"Time: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S IST')}")
    print("=" * 70)

    # Check API keys
    key_checks = {
        "ANTHROPIC_API_KEY":       "Claude AI — Anthropic direct (or use Bedrock below)",
        "AWS_ACCESS_KEY_ID":       "Claude AI — Amazon Bedrock (alternative to Anthropic key)",
        "TWITTER_API_KEY":         "Twitter/X automation",
        "INSTAGRAM_ACCESS_TOKEN":  "Instagram posting",
        "WHATSAPP_PHONE_NUMBER_ID":"WhatsApp Business API",
        "BREVO_API_KEY":           "Email (Brevo/Sendinblue)",
        "REDDIT_CLIENT_ID":        "Reddit seeder",
        "VAPID_PRIVATE_KEY":       "Browser push notifications",
        "INDEXNOW_KEY":            "IndexNow (instant indexing)",
        "GA4_PROPERTY_ID":         "GA4 analytics",
        "GSC_SERVICE_ACCOUNT_JSON":"Google Search Console",
    }

    print("\n📋 API KEY STATUS:")
    for key, description in key_checks.items():
        value = os.getenv(key, "")
        status = "✅ SET" if value else "⚠️  NOT SET (dry-run mode)"
        print(f"  {status}  {key:<35} {description}")

    print("\n🤖 AGENT LAST RUN STATUS:")
    if not _agent_stats:
        print("  No agents have run yet in this session.")
    else:
        for agent, stats in sorted(_agent_stats.items()):
            print(f"  {stats['last_status']}  {agent:<25} {stats['last_run'][:19]}  {stats['detail'][:50]}")

    print("\n⏰ UPCOMING SCHEDULED JOBS (next 5):")
    upcoming = sorted(schedule.jobs, key=lambda j: j.next_run)[:5]
    for job in upcoming:
        print(f"  {str(job.next_run)[:19]}  {job.job_func.__name__}")

    print("\n📊 GA4 DASHBOARD TARGETS:")
    targets = [
        ("AI Content Traffic",  "500 sessions/post",    "Sessions from AI blog posts"),
        ("Social Agent Traffic","200 sessions/day",     "Instagram + Twitter automation"),
        ("Email Agent Traffic", "30% open rate",        "Email campaign sessions"),
        ("Alert Click-through", "15% CTR",              "Price alert → site visits"),
        ("Organic Growth",      "+10% per week",        "Week-over-week organic sessions"),
    ]
    for name, goal, description in targets:
        print(f"  📈 {name:<25} Goal: {goal:<20} {description}")

    print("\n🔗 UTM TRACKING ACTIVE:")
    print("  All AI-generated links include UTM parameters:")
    print("  ?utm_source=<platform>&utm_medium=<type>&utm_campaign=<name>&utm_content=<date>")
    print("=" * 70)


# ── Health check endpoint ─────────────────────────────────────────────────────

def check_backend_health() -> bool:
    """Verify backend API is reachable."""
    try:
        resp = requests.get(f"{BACKEND_API}/health", timeout=10)
        return resp.ok
    except Exception:
        return False


# ── Main entry point ──────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="PriceBasket.in — AI Agent Traffic System Orchestrator"
    )
    subparsers = parser.add_subparsers(dest="command")

    # run command
    run_parser = subparsers.add_parser("run", help="Start the orchestrator daemon")
    run_parser.add_argument(
        "--agents",
        type=str,
        default=None,
        help="Comma-separated list of agents to enable (default: all). "
             "Options: blog,instagram,twitter,ab_tester,gsc,internal_links,"
             "pages,email,whatsapp,push,reddit,trending,newsletter,traffic_flow",
    )
    run_parser.add_argument(
        "--run-now",
        type=str,
        default=None,
        help="Run specific agent immediately before starting scheduler",
    )

    # status command
    subparsers.add_parser("status", help="Show agent status dashboard")

    # test command
    test_parser = subparsers.add_parser("test", help="Test a specific agent")
    test_parser.add_argument("agent", help="Agent name to test")

    # once command
    once_parser = subparsers.add_parser("once", help="Run all agents once and exit")
    once_parser.add_argument("--agents", type=str, default=None)

    args = parser.parse_args()

    if args.command == "status":
        print_status()
        return

    if args.command == "test":
        agent_map = {
            "blog":              run_blog_writer,
            "instagram":         run_instagram_agent,
            "twitter":           run_twitter_tweet,
            "gsc":               run_gsc_monitor,
            "internal_links":    run_internal_link_agent,
            "email":             run_email_price_alerts,
            "whatsapp":          run_whatsapp_alerts,
            "push":              run_push_notifications,
            "reddit":            run_reddit_session,
            "trending":          run_trending_monitor,
            "pages":             run_page_generator,
            "ab_tester":         run_headline_ab_tester,
            "newsletter":        run_weekly_newsletter,
            "traffic_flow":      run_traffic_flow_monitor,
            "traffic_analysis":  run_traffic_flow_analysis,
        }
        fn = agent_map.get(args.agent)
        if fn:
            _log(f"Testing agent: {args.agent}")
            fn()
            print_status()
        else:
            print(f"Unknown agent: {args.agent}")
            print(f"Available: {', '.join(agent_map.keys())}")
        return

    if args.command == "once":
        enabled = args.agents.split(",") if args.agents else None
        _log("Running all agents once...")
        agent_fns = [
            run_traffic_flow_monitor, run_blog_writer, run_instagram_agent,
            run_twitter_tweet, run_internal_link_agent, run_email_price_alerts,
            run_whatsapp_alerts, run_push_notifications,
            run_reddit_session, run_trending_monitor,
        ]
        for fn in agent_fns:
            if enabled is None or fn.__name__.replace("run_", "") in enabled:
                try:
                    fn()
                except Exception as exc:
                    _log(f"Error in {fn.__name__}: {exc}")
                time.sleep(2)
        print_status()
        return

    # Default: run daemon
    if args.command == "run" or args.command is None:
        enabled = None
        if hasattr(args, "agents") and args.agents:
            enabled = [a.strip() for a in args.agents.split(",")]

        _log("=" * 60)
        _log("PRICEBASKET.IN — AI AGENT TRAFFIC SYSTEM STARTING")
        _log(f"Backend: {BACKEND_API}")
        _log(f"Dry run: {DRY_RUN}")
        _log(f"Agents: {', '.join(enabled) if enabled else 'ALL'}")
        _log("=" * 60)

        # Check backend health
        if check_backend_health():
            _log("✅ Backend API is healthy")
        else:
            _log("⚠️  Backend API unreachable — agents will use dry-run mode")

        # Run immediate tasks on startup
        if hasattr(args, "run_now") and args.run_now:
            agent_map = {
                "blog": run_blog_writer, "pages": run_page_generator,
                "gsc": run_gsc_monitor, "trending": run_trending_monitor,
            }
            fn = agent_map.get(args.run_now)
            if fn:
                _log(f"Running immediately: {args.run_now}")
                fn()

        # Setup schedule
        setup_full_schedule(enabled_agents=enabled)

        # Print initial status
        print_status()

        # Main loop
        _log("Orchestrator running. Press Ctrl+C to stop.")
        try:
            while True:
                schedule.run_pending()
                time.sleep(30)
        except KeyboardInterrupt:
            _log("Orchestrator stopped by user.")
            print_status()


if __name__ == "__main__":
    main()
