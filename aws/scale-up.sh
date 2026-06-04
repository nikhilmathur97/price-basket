#!/bin/bash
# =============================================================================
# PriceBasket — Scale Up AWS (bring back online from scale-down)
# =============================================================================
# Usage:
#   chmod +x aws/scale-up.sh
#   ./aws/scale-up.sh
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/outputs.env"
APP_NAME="pricebasket"

BLUE='\033[0;34m'; GREEN='\033[0;32m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }

info "Starting RDS instance..."
aws rds start-db-instance --db-instance-identifier "${APP_NAME}-db" --region $AWS_REGION >/dev/null 2>&1 || true

info "Waiting for RDS to be available (~3 min)..."
aws rds wait db-instance-available --db-instance-identifier "${APP_NAME}-db" --region $AWS_REGION

info "Scaling ECS services back to 1..."
aws ecs update-service --cluster "${APP_NAME}-cluster" --service "${APP_NAME}-api"    --desired-count 1 --region $AWS_REGION >/dev/null
aws ecs update-service --cluster "${APP_NAME}-cluster" --service "${APP_NAME}-worker" --desired-count 1 --region $AWS_REGION >/dev/null

info "Waiting for API service to be healthy (~2 min)..."
aws ecs wait services-stable --cluster "${APP_NAME}-cluster" --services "${APP_NAME}-api" --region $AWS_REGION

success "AWS is back online!"
echo "API URL: http://${ALB_DNS}/health"
echo ""
echo "If you were on Render, update Vercel:"
echo "  NEXT_PUBLIC_API_URL=http://${ALB_DNS}"
