# PriceBasket.in — Master Automation Guide & Tool Stack

---

## COMPLETE TOOL STACK

### Tier 1: Core Infrastructure (Must Have — Day 1)

| Tool | Purpose | Cost/Month | Priority | Setup Time |
|------|---------|-----------|----------|-----------|
| **n8n** (self-hosted) | Workflow automation hub | ₹0 (self-hosted) or $20 cloud | 🔴 Critical | 2 hours |
| **Google Analytics 4** | Web analytics | Free | 🔴 Critical | 30 min |
| **Google Search Console** | SEO monitoring | Free | 🔴 Critical | 15 min |
| **Google Merchant Center** | Shopping feed | Free | 🔴 Critical | 1 hour |
| **Brevo (Sendinblue)** | Email marketing | Free (300/day) → ₹1,500/mo | 🔴 Critical | 1 hour |
| **Anthropic Claude API** | AI content generation | ~$20-50/mo | 🔴 Critical | 30 min |
| **Slack** | Internal alerts | Free | 🔴 Critical | 15 min |

### Tier 2: Growth Channels (Must Have — Week 1)

| Tool | Purpose | Cost/Month | Priority | Setup Time |
|------|---------|-----------|----------|-----------|
| **Buffer** | Social media scheduling | $6/mo (Essentials) | 🟠 High | 1 hour |
| **Twitter API v2** | Twitter automation | Free (Basic) → $100/mo | 🟠 High | 2 hours |
| **Instagram Graph API** | Instagram posting | Free | 🟠 High | 3 hours |
| **Google Ads** | Paid acquisition | Budget-based | 🟠 High | 4 hours |
| **Google Ads Scripts** | Bid automation | Free (within Ads) | 🟠 High | 1 hour |
| **YouTube Studio** | Video publishing | Free | 🟠 High | 30 min |

### Tier 3: Analytics & Monitoring (Week 2)

| Tool | Purpose | Cost/Month | Priority | Setup Time |
|------|---------|-----------|----------|-----------|
| **Hotjar** | Heatmaps & recordings | Free (35 sessions/day) → ₹2,000/mo | 🟡 Medium | 30 min |
| **Ahrefs / Semrush** | SEO research | $99-129/mo | 🟡 Medium | 1 hour |
| **Google Indexing API** | Fast URL indexing | Free | 🟡 Medium | 1 hour |
| **Uptime Robot** | Site monitoring | Free | 🟡 Medium | 15 min |
| **Sentry** | Error tracking | Free (5K events) | 🟡 Medium | 30 min |

### Tier 4: Scale Tools (Month 2+)

| Tool | Purpose | Cost/Month | Priority | Setup Time |
|------|---------|-----------|----------|-----------|
| **Klaviyo** | Advanced email automation | $45/mo (1K contacts) | 🟢 Later | 4 hours |
| **Mixpanel** | Product analytics | Free (20M events) | 🟢 Later | 2 hours |
| **Intercom** | Customer support chat | $74/mo | 🟢 Later | 2 hours |
| **Canva Pro** | Design automation | $13/mo | 🟢 Later | 30 min |
| **ElevenLabs** | AI voiceover for YouTube | $5/mo | 🟢 Later | 1 hour |
| **Descript** | Video editing | $12/mo | 🟢 Later | 2 hours |

---

## API ENDPOINTS & CREDENTIALS NEEDED

### Google APIs
```bash
# Required Google Cloud APIs to enable:
# 1. Google Analytics Data API
# 2. Google Search Console API  
# 3. Google Indexing API
# 4. Content API for Shopping (Merchant Center)
# 5. Google Ads API

# Service Account Setup:
# 1. Go to console.cloud.google.com
# 2. Create project: "pricebasket-growth"
# 3. Enable all 5 APIs above
# 4. Create Service Account: growth-automation@pricebasket-growth.iam.gserviceaccount.com
# 5. Download JSON key → save as growth/credentials/google-service-account.json
# 6. Add service account email to:
#    - GSC property as "Owner"
#    - GA4 property as "Viewer"
#    - Merchant Center as "Admin"

GOOGLE_SERVICE_ACCOUNT_FILE=growth/credentials/google-service-account.json
GA4_PROPERTY_ID=properties/XXXXXXXXX
GSC_SITE_URL=https://pricebasket.in
GMC_MERCHANT_ID=XXXXXXXXX
```

### Social Media APIs
```bash
# Twitter/X API v2
# 1. Apply at developer.twitter.com
# 2. Create app: "PriceBasket Growth Bot"
# 3. Enable OAuth 2.0 + Read/Write permissions
TWITTER_API_KEY=xxxxxxxxxxxxxxxxxxxx
TWITTER_API_SECRET=xxxxxxxxxxxxxxxxxxxx
TWITTER_ACCESS_TOKEN=xxxxxxxxxxxxxxxxxxxx
TWITTER_ACCESS_TOKEN_SECRET=xxxxxxxxxxxxxxxxxxxx
TWITTER_BEARER_TOKEN=xxxxxxxxxxxxxxxxxxxx

# Instagram Graph API
# 1. Create Facebook Developer App at developers.facebook.com
# 2. Add Instagram Basic Display + Instagram Graph API products
# 3. Connect Instagram Business Account
# 4. Generate long-lived access token (60-day expiry, auto-refresh)
INSTAGRAM_ACCESS_TOKEN=xxxxxxxxxxxxxxxxxxxx
INSTAGRAM_BUSINESS_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxx

# Buffer API
# 1. Sign up at buffer.com
# 2. Go to buffer.com/developers → Create App
BUFFER_ACCESS_TOKEN=xxxxxxxxxxxxxxxxxxxx
BUFFER_PROFILE_IDS={
  "twitter": "xxxxxxxxxxxxxxxxxxxx",
  "instagram": "xxxxxxxxxxxxxxxxxxxx",
  "linkedin": "xxxxxxxxxxxxxxxxxxxx"
}
```

### AI & Communication APIs
```bash
# Anthropic Claude
# 1. Sign up at console.anthropic.com
# 2. Create API key
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx

# Brevo (Email)
# 1. Sign up at brevo.com
# 2. Settings → API Keys → Create
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxx
BREVO_SENDER_EMAIL=hello@pricebasket.in
BREVO_SENDER_NAME=PriceBasket

# Slack Webhooks
# 1. Go to api.slack.com/apps
# 2. Create app → Incoming Webhooks → Add to workspace
SLACK_WEBHOOK_GROWTH=https://hooks.slack.com/services/xxx/xxx/xxx
SLACK_WEBHOOK_ALERTS=https://hooks.slack.com/services/xxx/xxx/xxx
SLACK_WEBHOOK_ERRORS=https://hooks.slack.com/services/xxx/xxx/xxx
```

---

## MASTER CRON SCHEDULE

### Every 15 Minutes
```cron
*/15 * * * * python growth/seo/google-shopping-feed.py update_prices
```

### Every Hour
```cron
0 * * * * python growth/seo/gsc-automation.py check_indexing
0 * * * * python growth/social/twitter-automation.py check_mentions
```

### Every 2 Hours
```cron
0 */2 * * * python growth/seo/google-shopping-feed.py run_feed_update
```

### Daily Schedule (IST = UTC+5:30)

| Time IST | Time UTC | Job | Script |
|----------|----------|-----|--------|
| 6:00 AM | 12:30 AM | Generate daily blog post | `n8n workflow 1` |
| 6:30 AM | 1:00 AM | Submit new blog URL to GSC | `gsc-automation.py index` |
| 7:00 AM | 1:30 AM | Update Google Shopping Feed | `google-shopping-feed.py` |
| 8:00 AM | 2:30 AM | Post morning tweet | `twitter-automation.py morning` |
| 9:00 AM | 3:30 AM | Post Instagram content | `instagram-automation.py post` |
| 11:00 AM | 5:30 AM | Post midday tweet | `twitter-automation.py midday` |
| 2:00 PM | 8:30 AM | Post afternoon tweet | `twitter-automation.py afternoon` |
| 5:00 PM | 11:30 AM | Check Google Ads performance | `google-ads-scripts.js` (in Ads) |
| 6:00 PM | 12:30 PM | Post evening tweet | `twitter-automation.py evening` |
| 9:00 PM | 3:30 PM | Post night tweet | `twitter-automation.py night` |
| 10:00 PM | 4:30 PM | Daily analytics snapshot | `n8n workflow 3 (daily)` |
| 11:00 PM | 5:30 PM | Price alert processing | `n8n workflow 2` |

### Weekly Schedule

| Day | Time IST | Job |
|-----|----------|-----|
| Monday | 9:00 AM | Weekly growth report email (n8n workflow 3) |
| Monday | 6:00 PM | YouTube video publish |
| Tuesday | 10:00 AM | GSC opportunity keyword report |
| Wednesday | 12:00 PM | YouTube tips video publish |
| Thursday | 9:00 AM | Google Ads bid review (manual) |
| Friday | 7:00 PM | YouTube platform news video |
| Saturday | 10:00 AM | YouTube Short publish |
| Sunday | 6:00 PM | Weekly Instagram carousel (top 5 deals) |

### Monthly Schedule

| Date | Job |
|------|-----|
| 1st | Monthly savings report to all users (email) |
| 1st | Google Ads budget review |
| 5th | Press release distribution (if milestone hit) |
| 15th | Mid-month SEO audit |
| Last day | Monthly analytics review + next month planning |

---

## N8N SETUP GUIDE

### Installation (Self-hosted on your server)
```bash
# Option 1: Docker (recommended)
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# Option 2: npm
npm install n8n -g
n8n start

# Access at: http://localhost:5678
# Set up tunnel for webhooks: npx localtunnel --port 5678
```

### Environment Variables for n8n
```bash
# Add to n8n environment:
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your-secure-password
WEBHOOK_URL=https://your-n8n-domain.com
N8N_ENCRYPTION_KEY=your-32-char-encryption-key

# Credentials to add in n8n UI:
# 1. HTTP Request → Anthropic (API Key)
# 2. HTTP Request → Brevo (API Key)
# 3. Slack → Webhook URL
# 4. Google Analytics → Service Account
# 5. Twitter → OAuth2
```

### Importing Workflows
```bash
# Import the n8n-workflows.json file:
# 1. Open n8n UI
# 2. Click "+" → Import from File
# 3. Select growth/automation/n8n-workflows.json
# 4. Update all credential references
# 5. Activate each workflow
```

---

## GOOGLE ADS SCRIPTS SETUP

### How to Install Scripts
```
1. Log into Google Ads
2. Tools & Settings → Bulk Actions → Scripts
3. Click "+" → New Script
4. Paste script from growth/ads/google-ads-scripts.js
5. Authorize → Preview → Save
6. Set schedule: Hourly (for bid management) or Daily (for reports)
```

### Scripts to Install (in order)
1. `pauseLowCtrKeywords()` — Schedule: Daily at 9 AM
2. `increaseBidsHighRoas()` — Schedule: Every 6 hours
3. `reduceBidsExpensiveKeywords()` — Schedule: Every 6 hours
4. `checkBudgetPacing()` — Schedule: Hourly
5. `generateDealRSAs()` — Run once to generate ad copy

### Campaign Structure
```
Account: PriceBasket.in
│
├── Campaign 1: Brand Keywords [₹500/day]
│   ├── Ad Group: Brand Exact
│   │   └── Keywords: [pricebasket], [pricebasket.in], [price basket india]
│   └── Ad Group: Brand Broad
│       └── Keywords: pricebasket grocery, pricebasket comparison
│
├── Campaign 2: Competitor Keywords [₹800/day]
│   ├── Ad Group: Blinkit Alternatives
│   │   └── Keywords: blinkit alternative, cheaper than blinkit
│   ├── Ad Group: Zepto Alternatives
│   │   └── Keywords: zepto alternative, zepto price comparison
│   └── Ad Group: BigBasket Alternatives
│       └── Keywords: bigbasket price check, bigbasket vs zepto
│
├── Campaign 3: Generic Grocery [₹1,200/day]
│   ├── Ad Group: Price Comparison
│   │   └── Keywords: grocery price comparison india, compare grocery prices
│   ├── Ad Group: Savings Intent
│   │   └── Keywords: save money groceries india, cheapest grocery delivery
│   └── Ad Group: Product Specific
│       └── Keywords: cheapest atta online, best price cooking oil india
│
├── Campaign 4: City Targeting [₹600/day]
│   ├── Ad Group: Mumbai
│   ├── Ad Group: Delhi
│   ├── Ad Group: Bengaluru
│   └── Ad Group: Hyderabad
│
└── Campaign 5: Remarketing [₹400/day]
    ├── Ad Group: Visited Homepage (no conversion)
    ├── Ad Group: Searched Product (no click-through)
    └── Ad Group: 7-day inactive users
```

---

## EMAIL FUNNEL SETUP (Brevo)

### List Structure
```
Lists:
├── All Users (master list)
├── New Users (< 7 days)
├── Active Users (opened email in 30 days)
├── Price Alert Subscribers
├── Inactive Users (no open in 60 days)
└── Unsubscribed (never email)
```

### Automation Flows
```
Flow 1: Welcome Series
Trigger: New user signup
├── Immediately: Welcome email (email-funnel.py → send_welcome)
├── Day 3: Savings report (send_day3)
└── Day 7: Top deals (send_day7)

Flow 2: Price Alert
Trigger: Price drops 10%+ on watched product
└── Immediately: Price alert email (send_price_alert)

Flow 3: Re-engagement
Trigger: No open in 30 days
├── Day 30: "We miss you" email with top deals
├── Day 45: "Last chance" email with exclusive offer
└── Day 60: Move to inactive list

Flow 4: Monthly Digest
Trigger: 1st of every month
└── Monthly savings report to all active users
```

### Email Performance Benchmarks (India)
| Metric | Industry Avg | Our Target |
|--------|-------------|-----------|
| Open Rate | 18-22% | 28%+ |
| Click Rate | 2-3% | 5%+ |
| Unsubscribe | < 0.5% | < 0.3% |
| Deliverability | 85% | 95%+ |

---

## SEO AUTOMATION PIPELINE

### Daily Blog Generation (via n8n + Claude)
```
6:00 AM: n8n triggers
→ Fetch top 3 trending grocery searches from GSC API
→ Check which keywords have no blog post yet
→ Send to Claude API with blog prompt (see blog-ai-prompt.md)
→ Claude returns 1,500-word SEO blog post
→ Auto-publish to /blog/[slug] via CMS API
→ Submit URL to Google Indexing API
→ Post teaser to Twitter + Instagram
```

### Weekly SEO Audit (via n8n)
```
Tuesday 10:00 AM:
→ Fetch all keywords ranking 4-20 from GSC
→ Identify pages with declining clicks (>20% drop week-over-week)
→ Flag pages with CTR < 2% despite good impressions
→ Generate action list
→ Send Slack message to #seo-alerts channel
→ Email weekly SEO report to founder
```

### Google Shopping Feed Update
```
Every 2 hours:
→ Fetch latest prices from PriceBasket API
→ Build XML feed with all products
→ Upload to Google Merchant Center
→ Log success/failure to Slack
```

---

## MONITORING & ALERTS

### Slack Channel Structure
```
#growth-daily     — Daily metrics snapshot
#seo-alerts       — GSC drops, indexing issues
#ads-alerts       — Budget pacing, ROAS drops
#social-alerts    — Viral spikes, engagement drops
#price-alerts     — Price drop notifications sent
#errors           — System errors, API failures
#wins             — Milestone celebrations (auto-posted)
```

### Alert Thresholds
```python
ALERT_RULES = {
    # Traffic
    "traffic_drop_50pct": "Daily sessions < 50% of 7-day avg → Slack #seo-alerts",
    "traffic_spike_3x": "Daily sessions > 3x 7-day avg → Slack #wins",
    
    # SEO
    "keyword_rank_drop_5": "Any top-10 keyword drops 5+ positions → Slack #seo-alerts",
    "indexing_error": "Any URL returns 4xx/5xx → Slack #errors",
    
    # Ads
    "budget_80pct_before_6pm": "80% budget spent before 6 PM IST → Slack #ads-alerts",
    "roas_below_200pct": "Campaign ROAS < 200% for 3 days → Slack #ads-alerts",
    
    # Email
    "open_rate_below_15pct": "Email open rate < 15% → Slack #growth-daily",
    "bounce_rate_above_5pct": "Email bounce rate > 5% → Slack #errors",
    
    # System
    "api_error_rate_above_1pct": "API error rate > 1% → Slack #errors + PagerDuty",
    "price_update_stale_1hr": "Prices not updated in 1 hour → Slack #errors"
}
```

---

## TOTAL MONTHLY COST BREAKDOWN

### Minimum Viable Stack (Month 1)
| Tool | Cost |
|------|------|
| n8n (self-hosted on existing server) | ₹0 |
| Claude API (~50 blog posts + social) | ~₹2,500 |
| Brevo (up to 9,000 emails/month) | ₹0 |
| Buffer Essentials | ~₹500 |
| Google Ads (starter budget) | ₹15,000 |
| **Total** | **~₹18,000/month** |

### Growth Stack (Month 3+)
| Tool | Cost |
|------|------|
| n8n Cloud | ₹1,700 |
| Claude API (200+ pieces/month) | ~₹8,000 |
| Brevo Starter (20K emails) | ₹1,500 |
| Buffer Team | ₹2,000 |
| Ahrefs Lite | ₹8,000 |
| Hotjar Plus | ₹2,000 |
| Google Ads | ₹50,000 |
| **Total** | **~₹73,200/month** |

### Expected ROI at Month 6
```
Monthly ad spend: ₹50,000
Expected ROAS: 400%
Revenue from ads: ₹2,00,000

Organic traffic value (SEO): ₹80,000 equivalent
Email revenue (affiliate): ₹30,000
Social traffic value: ₹20,000

Total value generated: ₹3,30,000
Total tool cost: ₹73,200
Net ROI: 350%
```

---

## QUICK START CHECKLIST

### Week 1 (Foundation)
- [ ] Set up Google Analytics 4 + Search Console
- [ ] Create Google Cloud project + enable APIs
- [ ] Install n8n (Docker)
- [ ] Set up Brevo account + import email templates
- [ ] Create Twitter Developer App
- [ ] Connect Instagram Business Account
- [ ] Set up Slack workspace + channels
- [ ] Install Google Ads Scripts (bid management)
- [ ] Set up Google Merchant Center + upload first feed

### Week 2 (Content)
- [ ] Import n8n workflows from n8n-workflows.json
- [ ] Test daily blog generation workflow
- [ ] Schedule first week of social posts via Buffer
- [ ] Set up price alert email flow in Brevo
- [ ] Create YouTube channel + upload first video
- [ ] Submit sitemap to Google Search Console

### Week 3 (Ads)
- [ ] Launch Google Ads campaigns (start with Brand + Competitor)
- [ ] Set up remarketing audiences in GA4
- [ ] Link GA4 to Google Ads
- [ ] Enable Smart Bidding (Target ROAS)
- [ ] Set up conversion tracking

### Week 4 (Optimise)
- [ ] Review first week of ad performance
- [ ] Analyse top-performing blog posts
- [ ] Identify best-performing social content
- [ ] Set up A/B test for email subject lines
- [ ] Review GSC for quick-win keywords
