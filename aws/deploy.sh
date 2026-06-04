#!/bin/bash
# =============================================================================
# PriceBasket — AWS Deploy Script (push new code updates)
# =============================================================================
# Run this whenever you push new backend code to update AWS.
# Usage:
#   chmod +x aws/deploy.sh
#   ./aws/deploy.sh
# =============================================================================

set -euo pipefail

# Load outputs from setup
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUTS="${SCRIPT_DIR}/outputs.env"
[ -f "$OUTPUTS" ] || { echo "ERROR: aws/outputs.env not found. Run aws/setup.sh first."; exit 1; }
source "$OUTPUTS"

BACKEND_DIR="$(dirname "$SCRIPT_DIR")/backend"
APP_NAME="pricebasket"

RED='\033[0;31m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }

info "Deploying PriceBasket to AWS (region: $AWS_REGION)..."

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Build + push API image
info "Building API image..."
docker build -t "${APP_NAME}-api:latest" -f "${BACKEND_DIR}/Dockerfile" "${BACKEND_DIR}"
docker tag "${APP_NAME}-api:latest" "${ECR_API}:latest"
docker push "${ECR_API}:latest"
success "API image pushed"

# Build + push Worker image
info "Building Worker image..."
docker build -t "${APP_NAME}-worker:latest" -f "${BACKEND_DIR}/Dockerfile.worker" "${BACKEND_DIR}"
docker tag "${APP_NAME}-worker:latest" "${ECR_WORKER}:latest"
docker push "${ECR_WORKER}:latest"
success "Worker image pushed"

# Force ECS to pull new images (rolling update, zero downtime)
info "Triggering ECS rolling update..."
aws ecs update-service \
  --cluster "${APP_NAME}-cluster" \
  --service "${APP_NAME}-api" \
  --force-new-deployment \
  --region $AWS_REGION >/dev/null

aws ecs update-service \
  --cluster "${APP_NAME}-cluster" \
  --service "${APP_NAME}-worker" \
  --force-new-deployment \
  --region $AWS_REGION >/dev/null

info "Waiting for API service to stabilise (~2 min)..."
aws ecs wait services-stable \
  --cluster "${APP_NAME}-cluster" \
  --services "${APP_NAME}-api" \
  --region $AWS_REGION

success "Deploy complete!"
echo ""
echo "API URL: http://${ALB_DNS}"
echo "Health:  $(curl -s http://${ALB_DNS}/health)"
