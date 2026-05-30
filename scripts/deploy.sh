#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# PriceBasket — One-Command Deploy & SEO Push
# Run: bash scripts/push_to_production.py  (or: bash scripts/deploy.sh)
#
# What this does:
#  1. Runs TypeScript check (zero errors)
#  2. Commits all changes with auto-generated message
#  3. Pushes to GitHub main branch
#  4. GitHub Actions auto-triggers:
#     → Deploys frontend to Vercel
#     → Deploys backend to Render (auto-deploy on push)
#     → Submits sitemap to Google + Bing
#     → Sends IndexNow ping for instant indexing
#     → Runs Lighthouse SEO audit
#     → Notifies Telegram channel
# ─────────────────────────────────────────────────────────────────────────────

set -e

echo ""
echo "🚀 PriceBasket — Deploy & SEO Push"
echo "══════════════════════════════════"
echo ""

# ── Step 1: TypeScript check ──────────────────────────────────────────────────
echo "📋 Step 1/4: TypeScript check..."
cd frontend
if npx tsc --noEmit 2>&1; then
    echo "  ✅ Zero TypeScript errors"
else
    echo "  ❌ TypeScript errors found — fix before pushing"
    exit 1
fi
cd ..

# ── Step 2: Git status ────────────────────────────────────────────────────────
echo ""
echo "📁 Step 2/4: Checking git status..."
CHANGED=$(git status --porcelain | wc -l | tr -d ' ')
if [ "$CHANGED" -eq "0" ]; then
    echo "  ℹ No changes to commit — already up to date"
    echo ""
    echo "  Run 'git push origin main' to re-trigger the pipeline"
    exit 0
fi
echo "  📝 $CHANGED file(s) changed"
git status --short

# ── Step 3: Commit ────────────────────────────────────────────────────────────
echo ""
echo "💾 Step 3/4: Committing changes..."
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
COMMIT_MSG="deploy: SEO + marketing automation update — $TIMESTAMP

Changes:
- SEO landing pages: /best-grocery-deals, /save-money-groceries
- 20 compare pages pre-rendered (blinkit-vs-zepto etc.)
- Homepage: FAQ JSON-LD, WhatsApp banner, compare grid
- Footer: Compare links column + SEO keyword paragraph
- Layout: GA4 analytics + expanded keywords
- Product pages: WhatsApp share button
- Sitemap: All new pages at priority 0.85-0.95
- render.yaml: Marketing automation auto-enabled
- start.sh: Auto-submits sitemap on every deploy
- vercel.json: Security headers + SEO cache headers
- GitHub Actions: Auto-deploy + SEO submit pipeline"

git add -A
git commit -m "$COMMIT_MSG"
echo "  ✅ Committed"

# ── Step 4: Push ──────────────────────────────────────────────────────────────
echo ""
echo "🌐 Step 4/4: Pushing to GitHub..."
git push origin main
echo "  ✅ Pushed to main"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════"
echo "✅ DEPLOYED! GitHub Actions pipeline triggered."
echo ""
echo "What's happening now (automatically):"
echo "  🔄 Vercel: Building + deploying frontend..."
echo "  🔄 Render: Deploying backend + worker..."
echo "  📡 Sitemap: Will be submitted to Google + Bing"
echo "  ⚡ IndexNow: 12 key pages submitted for instant indexing"
echo "  📊 Lighthouse: SEO audit running..."
echo "  💬 Telegram: Deploy notification being sent..."
echo ""
echo "Track progress:"
echo "  GitHub Actions: https://github.com/nikhilmathur97/price-basket/actions"
echo "  Vercel:         https://vercel.com/dashboard"
echo "  Render:         https://dashboard.render.com"
echo ""
echo "After deploy (check these):"
echo "  Live site:      https://pricebasket.in"
echo "  Sitemap:        https://pricebasket.in/sitemap.xml"
echo "  New page 1:     https://pricebasket.in/best-grocery-deals"
echo "  New page 2:     https://pricebasket.in/save-money-groceries"
echo "  Compare:        https://pricebasket.in/compare/blinkit-vs-zepto"
echo "══════════════════════════════════════════════════════"
echo ""
