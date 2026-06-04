#!/bin/bash
# =============================================================================
# PriceBasket — Rollback to Render (one-step switch)
# =============================================================================
# Run this to instantly switch traffic back to Render.
# AWS infrastructure stays intact — just traffic is redirected.
#
# Usage:
#   chmod +x aws/rollback-to-render.sh
#   ./aws/rollback-to-render.sh
# =============================================================================

set -euo pipefail

RENDER_API_URL="https://pricebasket-api.onrender.com"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

echo ""
echo -e "${YELLOW}⚠️  Rolling back to Render...${NC}"
echo ""
echo "This will:"
echo "  1. Show you the Vercel env var to change (1 click)"
echo "  2. Remind you to resume Render services"
echo "  3. AWS infrastructure stays intact (not deleted)"
echo ""

echo -e "${BLUE}Step 1: Update Vercel environment variable${NC}"
echo "  Go to: https://vercel.com/dashboard → pricebasket → Settings → Environment Variables"
echo "  Change: NEXT_PUBLIC_API_URL"
echo "  From:   (your ALB URL)"
echo "  To:     ${RENDER_API_URL}"
echo "  Then:   Redeploy (Vercel → Deployments → Redeploy latest)"
echo ""

echo -e "${BLUE}Step 2: Resume Render services${NC}"
echo "  Go to: https://render.com/dashboard"
echo "  Resume: pricebasket-api (click Resume)"
echo "  Resume: pricebasket-worker (click Resume)"
echo "  Wait:   ~30s for Render to start"
echo ""

echo -e "${BLUE}Step 3: Verify${NC}"
echo "  curl ${RENDER_API_URL}/health"
echo ""

echo -e "${GREEN}✅ Rollback complete once Vercel redeploys (~1 min)${NC}"
echo ""
echo "AWS infrastructure is still running. To stop AWS costs:"
echo "  Scale ECS services to 0: aws/scale-down.sh"
echo "  Or fully teardown:        aws/teardown.sh"
