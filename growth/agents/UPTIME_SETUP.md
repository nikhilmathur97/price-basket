# PriceBasket — Uptime Monitoring Setup

Two layers of monitoring keep the site fast and let you know the instant it breaks.

| Layer | Runs | Coverage | Status |
|-------|------|----------|--------|
| **Local launchd agent** | Your Mac, every 10 min | While Mac is on/awake | ✅ Installed |
| **UptimeRobot** (this guide) | UptimeRobot cloud, every 5 min | True 24/7, Mac off | ⬜ 2-min signup |

> Why both: the launchd agent gives rich local logs while you work; UptimeRobot
> guarantees the Render backend stays warm overnight and alerts you even when
> your laptop is closed. GitHub Actions cron was tried but is throttled
> (5-hour gaps observed), so it can't be relied on for keep-warm.

---

## The keep-warm monitor that matters most

**Render free tier sleeps after 15 min idle.** A cold start makes the first
visitor wait 30–50s for data — terrible for SEO and bounce rate. The single
most important monitor is the one pinging the backend more often than every
15 min:

```
https://pricebasket-api.onrender.com/health
```

UptimeRobot's free 5-min interval keeps it permanently warm.

---

## UptimeRobot setup (free, ~2 minutes)

1. Sign up at **https://uptimerobot.com** (free plan = 50 monitors, 5-min checks).
2. Verify your email and add it as an alert contact (Settings → Alert Contacts —
   usually added automatically on signup).
3. Create monitors with **+ Add New Monitor**. Use these exact settings:

### Monitor 1 — Backend keep-warm (MOST IMPORTANT)
| Field | Value |
|-------|-------|
| Monitor Type | HTTP(s) |
| Friendly Name | PriceBasket API (keep-warm) |
| URL | `https://pricebasket-api.onrender.com/health` |
| Monitoring Interval | 5 minutes |
| Alert Contacts | your email |

### Monitor 2 — Homepage
| Field | Value |
|-------|-------|
| Monitor Type | HTTP(s) |
| Friendly Name | PriceBasket Homepage |
| URL | `https://pricebasket.in/` |
| Monitoring Interval | 5 minutes |

### Monitor 3 — Search (core flow)
| Field | Value |
|-------|-------|
| Monitor Type | HTTP(s) |
| Friendly Name | PriceBasket Search |
| URL | `https://pricebasket.in/search` |
| Monitoring Interval | 5 minutes |

### Monitor 4 — A deals page (new SEO pages)
| Field | Value |
|-------|-------|
| Monitor Type | HTTP(s) |
| Friendly Name | PriceBasket Deals |
| URL | `https://pricebasket.in/deals/blinkit` |
| Monitoring Interval | 5 minutes |

> All four URLs were verified returning HTTP 200 on 2026-06-03.

### Optional but recommended
- **Keyword monitor** (catches "soft" failures where the page returns 200 but is
  broken): set Monitor Type = "Keyword", URL = `https://pricebasket.in/`, and
  Keyword = `PriceBasket` with "alert when keyword NOT exists". This catches a
  blank/error page that still returns 200.
- **Public status page**: Settings → Status Pages → create one. Free, gives you a
  shareable `stats.uptimerobot.com/...` link and social proof.

---

## Local launchd agent (already installed)

Runs `uptime_monitor.py --once` every 10 minutes via macOS launchd.

| Item | Path |
|------|------|
| Script | `~/.pricebasket-monitor/uptime_monitor.py` |
| launchd plist | `~/Library/LaunchAgents/com.pricebasket.uptimemonitor.plist` |
| Output log | `~/.pricebasket-monitor/uptime_monitor.out.log` |
| Error log | `~/.pricebasket-monitor/uptime_monitor.err.log` |
| Source (repo) | `growth/agents/uptime_monitor.py` |

### Manage
```bash
# watch live
tail -f ~/.pricebasket-monitor/uptime_monitor.out.log

# stop / start
launchctl unload ~/Library/LaunchAgents/com.pricebasket.uptimemonitor.plist
launchctl load   ~/Library/LaunchAgents/com.pricebasket.uptimemonitor.plist

# confirm registered (last exit code should be 0)
launchctl list | grep pricebasket
```

### Optional: Slack/Discord alerts for the local agent
Add an incoming-webhook URL and reload:
```bash
# edit the plist to add an EnvironmentVariables dict with ALERT_WEBHOOK_URL,
# or run manually with:
ALERT_WEBHOOK_URL="https://hooks.slack.com/services/XXX" \
  python3 ~/.pricebasket-monitor/uptime_monitor.py --interval 600
```

---

## How to read REAL traffic (not uptime)

Uptime ≠ users. To see whether actual people are arriving:

- **Google Analytics → Reports → Realtime** — live visitors right now. Open the
  site on your phone over mobile data to confirm tracking fires.
- **Google Search Console → Performance** — clicks & impressions from Google.
  New pages take **3–7 days** to start showing data; the 46 new pages added
  on 2026-06-03 should begin appearing within that window.

---

## Keeping the two monitors in sync

If you change the live URLs, update both:
1. `growth/agents/uptime_monitor.py` → `MONITORED_TARGETS`, then
   `cp growth/agents/uptime_monitor.py ~/.pricebasket-monitor/uptime_monitor.py`
2. The corresponding UptimeRobot monitors in the dashboard.
