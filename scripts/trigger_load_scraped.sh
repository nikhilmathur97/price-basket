#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Trigger the /setup/load-scraped endpoint to push 1,328 real scraped products
# (552 Blinkit + 776 Zepto) into the production database.
#
# Usage:
#   bash scripts/trigger_load_scraped.sh                         # production
#   bash scripts/trigger_load_scraped.sh https://dev-api.url     # dev/staging
# ─────────────────────────────────────────────────────────────────────────────

API_URL="${1:-https://pricebasket-api.onrender.com}"
SEED_KEY="pricebasket-seed-2024"

echo "🚀 Triggering load-scraped on: $API_URL"
echo ""

# First check if endpoint exists
echo "1️⃣  Checking endpoint availability..."
HEALTH=$(curl -s "$API_URL/health" 2>&1)
echo "   Health: $HEALTH"
echo ""

# Call the load-scraped endpoint
echo "2️⃣  Loading 1,328 scraped products into DB..."
RESULT=$(curl -s -X POST "$API_URL/api/v1/setup/load-scraped" \
  -H "x-seed-key: $SEED_KEY" \
  -H "Content-Type: application/json" \
  --max-time 120 \
  2>&1)

echo "   Result: $RESULT"
echo ""

# Check if it worked
if echo "$RESULT" | grep -q '"status":"ok"'; then
  SAVED=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('saved',0))" 2>/dev/null)
  echo "✅ SUCCESS! $SAVED products saved to database."
  echo ""
  echo "3️⃣  Verifying featured products..."
  FEATURED=$(curl -s "$API_URL/api/v1/products/featured?limit=5" 2>&1 | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    if isinstance(d, list):
        print(f'   Found {len(d)} featured products')
        for p in d[:3]:
            print(f'   - {p[\"name\"]} | prices: {len(p.get(\"prices\", []))}')
    else:
        print(f'   Response: {d}')
except:
    print(f'   Raw: {sys.stdin.read()[:200]}')
" 2>&1)
  echo "$FEATURED"
elif echo "$RESULT" | grep -q '"detail":"Not Found"'; then
  echo "❌ Endpoint not found — Render hasn't deployed yet."
  echo "   Go to Render dashboard → pricebasket-api → Manual Deploy"
elif echo "$RESULT" | grep -q '"detail":"Invalid seed key"'; then
  echo "❌ Wrong seed key. Check SEED_SECRET env var in Render."
else
  echo "⚠️  Unexpected response: $RESULT"
fi
