"""
PriceBasket Marketing Agent Prompts v3.0
Comprehensive, platform-native prompts for all 10 agents.
"""
import json


def build_prompt(agent_id: str, inputs: dict, tone: str, city: str) -> str:
    handlers = {
        "seo":      _seo,
        "reddit":   _reddit,
        "instagram": _instagram,
        "twitter":  _twitter,
        "whatsapp": _whatsapp,
        "youtube":  _youtube,
        "quora":    _quora,
        "email":    _email,
        "linkedin": _linkedin,
        "campaign": _campaign,
    }
    fn = handlers.get(agent_id, _generic)
    return fn(inputs, tone, city)


def _seo(i: dict, tone: str, city: str) -> str:
    kw = i.get("keyword", "grocery price comparison app India")
    topic = i.get("topic", "How to save money on quick-commerce groceries")
    wc = i.get("word_count", "800")
    return f"""Write a complete, publish-ready SEO content package for PriceBasket.
Keyword: {kw}
Topic: {topic}
Word count target: {wc} | Tone: {tone} | City: {city}

═══ DELIVER ALL OF THESE ═══════════════════════════════════

1. BLOG ARTICLE (full {wc} words)
   - H1 headline (keyword included)
   - Introduction: hook in first 2 sentences (stat or question)
   - H2: The Problem — why grocery prices vary across apps
   - H2: The Solution — PriceBasket, how it compares 6 platforms
   - H2: Real Savings Examples — comparison table: Item | Blinkit | Zepto | BigBasket | PriceBasket shows cheapest
   - H2: How to Use PriceBasket — 3 steps, under 100 words
   - Conclusion + strong CTA: "Download PriceBasket free → pricebasket.in"
   - Keyword density: 1.5% (natural, not stuffed)

2. META TITLE (≤60 chars — include keyword)
3. META DESCRIPTION (≤155 chars — include keyword + benefit + CTA)
4. FAQ SCHEMA — 5 Q&As in complete JSON-LD (paste-ready)
5. OPEN GRAPH TAGS — og:title, og:description, og:image suggestion
6. INTERNAL LINKING MAP — 4 anchor text + destination URL suggestions
7. SOCIAL SHARING COPY — Twitter (280 chars) + LinkedIn (150 chars) versions

📊 STRATEGY NOTE: [why this ranks + estimated timeline]"""


def _reddit(i: dict, tone: str, city: str) -> str:
    sub = i.get("subreddit", "r/india")
    angle = i.get("angle", "story")
    return f"""Write a complete Reddit organic seeding package for PriceBasket.
Subreddit: {sub} | Angle: {angle} | City: {city}

CRITICAL: Every word must sound like a real human post. Zero marketing language.
If it reads like an ad it will be downvoted and removed.

═══ DELIVER ALL OF THESE ═══════════════════════════════════

1. MAIN POST
   TITLE (≤120 chars): Curiosity/story/question format. Test: would YOU upvote this?
   BODY (180-220 words):
   - Para 1: Relatable problem/observation (grocery prices, delivery, savings)
   - Para 2: Discovery story — found PriceBasket by accident or searching
   - Para 3: Specific result with numbers (saved ₹X on specific item)
   - Include ONE tiny imperfection (e.g. "UI is a bit simple but does the job")
   - NEVER start with "I discovered" or "I found" — too generic
   - End with open question to invite comments

2. FOLLOW-UP COMMENT — Day 2 (adding more value, not promoting)
3. RESPONSE COMMENT — Day 4 (replying to imagined "which platforms?" question)
4. UPDATE COMMENT — Day 7 ("Update: saved ₹X more this week")

5. SUBREDDIT STRATEGY TABLE:
   | Subreddit | Why It Works | Best Day | Best Time (IST) | Karma Required |
   Include: r/india, r/delhi, r/bangalore, r/mumbai, r/IndiaInvestments,
            r/frugal_jerk_india, r/personalfinanceindia, r/indianfood

6. KARMA SAFETY RULES — 5 specific rules to avoid removal or shadowban

📊 STRATEGY NOTE: [organic compounding rationale]"""


def _instagram(i: dict, tone: str, city: str) -> str:
    post_type = i.get("post_type", "carousel")
    theme = i.get("theme", "savings")
    return f"""Write a complete Instagram content package for PriceBasket.
Post type: {post_type} | Theme: {theme} | Tone: {tone} | City: {city}

═══ DELIVER ALL OF THESE ═══════════════════════════════════

1. CAPTION A — HINGLISH VERSION
   - Opening hook (first line visible before "more" — must stop scrolling)
   - 150 words max | 4-5 emojis (natural, not spam)
   - Include specific saving: "Amul Butter ₹8 sasta on Zepto vs Blinkit"
   - End with: engagement question + pricebasket.in link mention

2. CAPTION B — ENGLISH VERSION
   - 80 words max | punchy opener | witty tone
   - Different angle from Caption A

3. HASHTAG SET (30 total on individual lines)
   [HIGH VOLUME — 10]: 100k+ posts
   [MID VOLUME — 10]: 10k-100k posts
   [NICHE/LOCAL — 10]: under 10k, city-specific, highly targeted

4. REEL SCRIPT (exact words for each second)
   [0s-3s]  HOOK TEXT + VOICEOVER: (scroll-stopper)
   [3s-10s] PROBLEM: (relatable moment)
   [10s-25s] REVEAL: (PriceBasket comparison, real numbers)
   [25s-35s] PROOF: (savings total)
   [35s-40s] CTA: (download + link)
   Mark each line: ON-SCREEN TEXT: / VOICEOVER: / VISUAL:

5. CAROUSEL COPY (7 slides)
   Slide 1: COVER — hook headline + visual brief
   Slides 2-5: One insight per slide (headline + 1-line copy + stat)
   Slide 6: Comparison table (Blinkit vs Zepto vs PriceBasket finds cheapest)
   Slide 7: CTA slide (copy + button text)

6. STORY SEQUENCE (5 stories)
   Story 1-4: Content/poll/question
   Story 5: Swipe-up CTA

7. VISUAL BRIEF for each post type
   Colors, layout, font style, image composition

📊 STRATEGY NOTE: [Instagram algorithm rationale]"""


def _twitter(i: dict, tone: str, city: str) -> str:
    n = int(i.get("tweet_count", 8))
    topic = i.get("topic", "how Indians unknowingly pay more for the same groceries")
    hook = i.get("hook_style", "shocking stat")
    return f"""Write a viral Twitter/X content package for PriceBasket.
Topic: {topic}
Hook style: {hook} | Tweets: {n} | Tone: {tone}

═══ DELIVER ALL OF THESE ═══════════════════════════════════

1. VIRAL THREAD ({n} tweets)
   Tweet 1 (HOOK — most important):
   - Do NOT start with "I" or "Thread:"
   - Start with NUMBER, QUESTION, or BOLD CLAIM
   - Must make someone stop mid-scroll
   - Include promise of what they'll learn

   Tweets 2-{n - 2} (BODY):
   - One insight per tweet
   - Use specific ₹ amounts
   - Real platform comparisons
   - Short sentences, lots of line breaks
   - At least 2 tweets with bullet lists

   Tweet {n - 1} (PROOF): Specific result/testimonial style
   Tweet {n} (CTA): "RT this to save a friend ₹400/month" + pricebasket.in

   Each tweet: number it X/{n} | max 280 chars | use line breaks

2. STANDALONE TWEET (no thread) — 240 chars, different angle

3. QUOTE TWEET BAIT — 1 controversial/provocative statement that makes
   people want to disagree (drives RT + comments)

4. POLL TWEET — 4-option poll on grocery habits (drives engagement,
   naturally leads to PriceBasket in replies)

5. HASHTAG SET — 5 tags (2 trending Indian + 3 niche)
6. THREAD VISUAL BRIEF — What images/screenshots to attach to which tweets
7. REPLY BANK — 4 pre-written replies for common reactions

📊 STRATEGY NOTE: [Twitter virality mechanics]"""


def _whatsapp(i: dict, tone: str, city: str) -> str:
    msg_type = i.get("message_type", "broadcast")
    grp = i.get("group_type", "housing-society")
    urgency = i.get("urgency", "medium")
    return f"""Write a complete WhatsApp marketing package for PriceBasket.
Message type: {msg_type} | Group: {grp} | Urgency: {urgency} | City: {city}

═══ DELIVER ALL OF THESE ═══════════════════════════════════

1. MAIN BROADCAST MESSAGE
   - ≤200 words | from-a-friend tone (NOT corporate)
   - Open with observation, NOT "Hi everyone" or "Dear members"
   - Include: specific saving this week (e.g. "Atta 5kg ₹15 sasta on Zepto aaj")
   - MAX 3 emojis total
   - End: pricebasket.in + "No ads, no spam — just prices 🙂"

2. FOLLOW-UP DAY 3 (for non-clickers)
   - 60 words | new angle | different savings example

3. FOLLOW-UP DAY 7 (FOMO trigger)
   - 45 words | "Prices changed again..." | urgency without pressure

4. GROUP INTRODUCTION SCRIPT
   - Natural way to introduce PriceBasket in housing society group
   - ≤3 sentences | sounds like personal recommendation, not promotion
   - Variation A: for groups you're a member of
   - Variation B: for groups where you're introducing yourself first

5. ENGAGEMENT POLL
   - WhatsApp poll question + 4 options
   - About grocery habits (not directly about PriceBasket)
   - Natural follow-up line mentioning PriceBasket

6. STATUS UPDATES — 3 WhatsApp Status texts (≤100 chars each)
7. FORWARD-FRIENDLY VERSION — Condensed message people will naturally forward

📊 STRATEGY NOTE: [WhatsApp viral loop + group dynamics rationale]"""


def _youtube(i: dict, tone: str, city: str) -> str:
    concept = i.get("concept", "price comparison reveal")
    duration = i.get("duration", "45s")
    style = i.get("style", "talking-head")
    return f"""Write a complete YouTube Shorts content package for PriceBasket.
Concept: {concept} | Duration: {duration} | Style: {style} | Tone: {tone} | City: {city}

═══ DELIVER ALL OF THESE ═══════════════════════════════════

1. FULL SHOOTING SCRIPT (timestamped, every second)
   Format each line as:
   [Xs-Xs] | VOICEOVER: "..." | ON-SCREEN: "..." | VISUAL: "..."

   Structure:
   [0s-3s]   HOOK — shocking question or price reveal
   [3s-8s]   PROBLEM — relatable grocery pain (muted viewers understand via ON-SCREEN)
   [8s-20s]  REVEAL — show PriceBasket, walk through 1 comparison
   [20s-35s] PROOF — show actual savings number
   [35s-{duration[:-1]}s] CTA — download link, subscribe push

   NOTE: ON-SCREEN text alone must tell the complete story (30% viewers watch muted)

2. THUMBNAIL CONCEPT
   - Background description + color
   - Main subject + expression
   - Text overlay (≤6 bold words)
   - Emotion to convey
   - A/B test variant description

3. TITLE OPTIONS (5 variants)
   A: Keyword-optimized
   B: Curiosity gap
   C: Hindi hook
   D: Savings number
   E: Pain point

4. DESCRIPTION (200 words)
   - First 2 lines: keyword-rich
   - App links + pricebasket.in
   - Call to subscribe + comment ask

5. TAGS (20 tags — Hindi + English mix)
6. CAPCUT EDIT NOTES (8 specific free effects/cuts to use)
7. SERIES PLAN — Next 4 Shorts topics to create a content series

📊 STRATEGY NOTE: [YouTube Shorts algorithm + retention rationale]"""


def _quora(i: dict, tone: str, city: str) -> str:
    theme = i.get("theme", "app comparison")
    style = i.get("style", "data-driven")
    return f"""Write a complete Quora authority package for PriceBasket.
Theme: {theme} | Style: {style} | City: {city}

These answers WILL rank on Google for years. Write accordingly.

═══ DELIVER ALL OF THESE ═══════════════════════════════════

1. ANSWER 1 — "Which is the best app to compare grocery prices in India?" (320 words)
   - Opening: DATA or INSIGHT (not "Great question!" or "PriceBasket is...")
   - Structure: Context → Criteria → 3 app options → Why PriceBasket wins
   - PriceBasket must NOT appear before sentence 4
   - Include actual comparison data (6 platforms covered = factual differentiator)
   - End: CTA wrapped in helpful framing ("You can check live comparisons at pricebasket.in")

2. ANSWER 2 — "How can I save money ordering from Blinkit and Zepto?" (260 words)
   - 5 numbered tips
   - PriceBasket appears as Tip #3 (middle = most believable placement)
   - Other tips are genuinely helpful

3. ANSWER 3 — "Is quick commerce actually cheaper than local kirana shops?" (220 words)
   - Data-driven analysis with actual price examples
   - PriceBasket as the tool to do this comparison yourself
   - Balanced conclusion (honest helps credibility)

4. ANSWER 4 — "Which delivery app has best prices for groceries in {city}?" (180 words)
   - City-specific angle (highest Google ranking potential)
   - Local context where possible

5. QUESTION TARGETING LIST — 10 more Quora questions to answer
   | Question | Est. monthly views | Google ranking difficulty | Priority |

6. AUTHOR BIO — 60-word bio establishing credibility (pricing/savings expert, NOT "PriceBasket founder")

7. UPVOTE OPTIMIZERS — First 15 words for each answer

8. LINK PLACEMENT GUIDE — Exactly where + how to place pricebasket.in in each answer
   without triggering Quora's spam filter

📊 STRATEGY NOTE: [Quora → Google SEO compounding rationale]"""


def _email(i: dict, tone: str, city: str) -> str:
    nl_type = i.get("newsletter_type", "weekly-digest")
    drops = i.get("price_drops", "Amul Butter ₹8 cheaper on Zepto, Tata Salt ₹5 cheaper on BigBasket")
    segment = i.get("segment", "active")
    return f"""Write a complete email marketing package for PriceBasket.
Type: {nl_type} | Price drops: {drops} | Segment: {segment} | Tone: {tone}

═══ DELIVER ALL OF THESE ═══════════════════════════════════

1. WEEKLY SAVINGS DIGEST (full email, ready to send)

   SUBJECT LINES (A/B/C test):
   A: Curiosity ≤50 chars
   B: Savings number ≤50 chars
   C: Hinglish ≤50 chars
   PREVIEW TEXT: 90 chars for each

   BODY:
   GREETING: Personal ({{first_name}} merge tag), conversational

   SECTION 1: "This Week's Top 5 Price Drops" 🔥
   Format: [Item] — [Cheapest Platform] vs [Most Expensive]: Save [₹X]
   (Use the price drops above + 3 invented realistic ones)

   SECTION 2: "Savings Hack of the Week" 💡
   One smart tip for using PriceBasket better

   SECTION 3: "Did You Know?" 🤔
   One platform feature or stat that surprises people

   SECTION 4: CTA button text + URL

   P.S. Line: One cheeky/warm closing line
   FOOTER: Unsubscribe | pricebasket.in | Social links

2. WELCOME EMAIL (new subscriber, 160 words)
   Deliver immediate value (one price hack TODAY)
   Set expectations for newsletter
   Warm, founder-personal tone from Nikhil

3. ONBOARDING DRIP SEQUENCE (4 emails)
   Day 1: Welcome (above)
   Day 3: "Your first savings — here's how" (tutorial)
   Day 7: "3 features most users miss" (retention)
   Day 14: "Tell us what to compare next" (engagement)

4. RE-ENGAGEMENT SEQUENCE (3 emails for 30+ day inactive)
   Email 1 (Day 30): Soft nudge — new feature highlight
   Email 2 (Day 37): FOMO — "prices spiked this week"
   Email 3 (Day 44): "Breakup email" — funny, self-aware

📊 STRATEGY NOTE: [Email list compounding + deliverability rationale]"""


def _linkedin(i: dict, tone: str, city: str) -> str:
    content_type = i.get("content_type", "founder-story")
    target = i.get("target", "consumer-awareness")
    return f"""Write a complete LinkedIn marketing package for PriceBasket.
Type: {content_type} | Target: {target} | Tone: {tone}

═══ DELIVER ALL OF THESE ═══════════════════════════════════

1. NIKHIL'S FOUNDER POST (personal LinkedIn — 220 words)
   Line 1: HOOK — NOT "Excited to share" or "I'm proud to announce"
   Options: Start with a number, a counterintuitive statement, or a question
   Story arc: Observation in Jodhpur → Decision to build → 1 hard moment → result
   Tone: Honest, slightly vulnerable, builder energy
   Final line: Open question that makes connections want to comment
   [LinkedIn algorithm rewards comments 3x more than likes]

2. COMPANY PAGE POST (PriceBasket official — 130 words)
   More polished. Lead with data or user benefit.
   End with soft CTA.

3. B2B PITCH DM — For FMCG Brand Managers / D2C Founders
   Opening: Curiosity hook (not "Hi, I'm from PriceBasket")
   Value prop: SKU-level competitor pricing data updated every 30 min
   Pricing signal: ₹25k–1.25L/month for API access
   CTA: 15-min call ask. ≤100 words.

4. CONNECTION REQUEST NOTE (≤300 chars)
   Reason to connect that's about them, not you

5. HASHTAG SET — 10 LinkedIn hashtags sorted by relevance

6. COMMENT TEMPLATES — 3 engagement comments to leave on related posts
   to build visibility before posting your own content

7. ARTICLE OUTLINE — Long-form LinkedIn article (1500 words)
   for the content_type: {content_type}
   Headline + 5 section headings + 2-line brief for each

📊 STRATEGY NOTE: [LinkedIn organic growth + B2B pipeline rationale]"""


def _campaign(i: dict, tone: str, city: str) -> str:
    theme = i.get("theme", "Compare Before You Cart")
    duration = i.get("duration", "30 days")
    goal = i.get("goal", "app installs")
    return f"""Build a complete free digital marketing campaign for PriceBasket.
Theme: {theme} | Duration: {duration} | Primary goal: {goal} | City: {city}

═══ DELIVER ALL OF THESE ═══════════════════════════════════

1. CREATIVE CONCEPT — Campaign name + 1-paragraph creative brief + key message

2. WEEKLY PLAN:
   Week 1 (Foundation): 3 agents to run, what content, which platforms, what days
   Week 2 (Amplify): Content types, cross-posting, community engagement targets
   Week 3 (Convert): Conversion-focused content, CTA intensity, email push
   Week 4 (Retain + B2B): Retention content, referral ask, B2B LinkedIn outreach

3. DAILY POSTING SCHEDULE — Mon–Sun, each day: platform + content type + best time IST

4. CONTENT REPURPOSING MAP — Show how:
   1 SEO blog → Twitter thread → Instagram carousel → WhatsApp message → Quora answer → YouTube Short

5. KPI TARGETS (Month 1, realistic free-channel numbers):
   - Instagram organic reach, Reddit post impressions, Quora answer views
   - Email subscribers gained, YouTube Shorts views, Website sessions from organic

6. FREE TOOLS CHECKLIST — Tool name + purpose + setup time (all ₹0)

7. WEEK 1 ACTION CHECKLIST — Day-by-day todo list admin can tick off

📊 STRATEGY NOTE: [Full campaign compounding strategy rationale]"""


def _generic(i: dict, tone: str, city: str) -> str:
    return f"Generate professional marketing content for PriceBasket. Context: {json.dumps(i)}. Tone: {tone}. City: {city}. Include pricebasket.in CTA."
