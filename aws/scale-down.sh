#!/bin/bash
# =============================================================================
# PriceBasket — Scale Down AWS (stop billing while keeping infra intact)
# =============================================================================
# Scales ECS services to 0 tasks — stops compute billing but keeps:
#   - RDS (still billed ~$15/month even when stopped after 7 days)
#   - ElastiCache (still billed ~$13/month)
#   - VPC, ALB, ECR (minimal cost)
#
# Use this when temporarily switching to Render to save ~$18/month on compute.
# Run aws/scale-up.sh to bring AWS back online.
#
# Usage:
#   chmod +x aws/scale-down.sh
#   ./aws/scale-down.sh
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/outputs.env"
APP_NAME="pricebasket"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo -e "${YELLOW}Scaling down ECS services to 0...${NC}"

aws ecs update-service --cluster "${APP_NAME}-cluster" --service "${APP_NAME}-api"    --desired-count 0 --region $AWS_REGION >/dev/null
aws ecs update-service --cluster "${APP_NAME}-cluster" --service "${APP_NAME}-worker" --desired-count 0 --region $AWS_REGION >/dev/null

# Stop RDS (saves ~$15/month for up to 7 days, then AWS auto-restarts it)
aws rds stop-db-instance --db-instance-identifier "${APP_NAME}-db" --region $AWS_REGION >/dev/null 2>&1 || true

echo -e "${GREEN}✅ ECS scaled to 0. RDS stopped.${NC}"
echo "Savings: ~$18/month compute stopped"
echo "Still billed: ALB (~$16/month), ElastiCache (~$13/month)"
echo ""
echo "To bring AWS back: ./aws/scale-up.sh"
