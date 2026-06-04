#!/usr/bin/env bash
# ============================================================
# deploy.sh — Build & deploy backend to ECS via CodeBuild
# Usage:
#   ./aws/deploy.sh            # deploy latest local code to prod
#   ./aws/deploy.sh dev        # deploy to dev image tag
# ============================================================
set -euo pipefail

ENV="${1:-prod}"
REGION="ap-south-1"
ACCOUNT="443414059511"
ECR_REPO="pricebasket-api"
CLUSTER="pricebasket-cluster"
S3_BUCKET="pricebasket-build-${ACCOUNT}"
CODEBUILD_PROJECT="pricebasket-docker-build"

if [ "$ENV" = "dev" ]; then
  ECS_SERVICE="pricebasket-api-dev"
else
  ECS_SERVICE="pricebasket-api"
fi

echo "🚀 Deploying to environment: $ENV"
echo "   ECS service: $ECS_SERVICE"
echo ""

# ── Step 1: Package backend source ──────────────────────────
echo "📦 Creating source tarball..."
tar -czf /tmp/backend-source.tar.gz \
  --exclude='backend/__pycache__' \
  --exclude='backend/.venv*' \
  --exclude='backend/*.pyc' \
  --exclude='backend/.env' \
  --exclude='**/__pycache__' \
  --exclude='**/*.pyc' \
  --exclude='**/.DS_Store' \
  --exclude='**/._*' \
  backend/
echo "   ✅ Tarball: $(du -sh /tmp/backend-source.tar.gz | cut -f1)"

# ── Step 2: Upload to S3 ─────────────────────────────────────
echo "☁️  Uploading to S3..."
aws s3 cp /tmp/backend-source.tar.gz \
  "s3://${S3_BUCKET}/backend-source.tar.gz" \
  --region "$REGION"
echo "   ✅ Uploaded to s3://${S3_BUCKET}/backend-source.tar.gz"

# ── Step 3: Trigger CodeBuild ────────────────────────────────
echo "🔨 Starting CodeBuild..."
BUILD_ID=$(aws codebuild start-build \
  --project-name "$CODEBUILD_PROJECT" \
  --region "$REGION" \
  --query 'build.id' \
  --output text)
echo "   Build ID: $BUILD_ID"

# ── Step 4: Poll until complete ──────────────────────────────
echo "⏳ Waiting for build to complete..."
for i in $(seq 1 40); do
  RESULT=$(aws codebuild batch-get-builds \
    --ids "$BUILD_ID" \
    --region "$REGION" \
    --query 'builds[0].{status:buildStatus,phase:currentPhase}' \
    --output json)
  STATUS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")
  PHASE=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['phase'])")
  echo "   [$i] $STATUS / $PHASE"
  if [ "$STATUS" = "SUCCEEDED" ]; then
    echo "   ✅ Build succeeded!"
    break
  elif [ "$STATUS" = "FAILED" ] || [ "$STATUS" = "STOPPED" ]; then
    echo "   ❌ Build $STATUS. Check logs:"
    echo "   https://${REGION}.console.aws.amazon.com/codesuite/codebuild/${ACCOUNT}/projects/${CODEBUILD_PROJECT}/build/${BUILD_ID}/log"
    exit 1
  fi
  sleep 30
done

# ── Step 5: Force ECS deployment ────────────────────────────
echo "🔄 Forcing ECS deployment..."
aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "$ECS_SERVICE" \
  --force-new-deployment \
  --region "$REGION" \
  --output json \
  --query 'service.{status:status,running:runningCount,desired:desiredCount}' | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'   Service: {d[\"status\"]} | running={d[\"running\"]} desired={d[\"desired\"]}')
"

# ── Step 6: Wait for ECS stability ──────────────────────────
echo "⏳ Waiting for ECS service to stabilize (up to 5 min)..."
aws ecs wait services-stable \
  --cluster "$CLUSTER" \
  --services "$ECS_SERVICE" \
  --region "$REGION"
echo "   ✅ ECS service is stable!"

# ── Step 7: Smoke test ───────────────────────────────────────
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --region "$REGION" \
  --query 'LoadBalancers[?contains(LoadBalancerName, `pricebasket`)].DNSName' \
  --output text | head -1)

if [ -n "$ALB_DNS" ]; then
  echo "🧪 Smoke testing ALB: http://$ALB_DNS"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${ALB_DNS}/health")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ /health → HTTP $HTTP_CODE"
  else
    echo "   ⚠️  /health → HTTP $HTTP_CODE (may still be warming up)"
  fi
  BULK_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "http://${ALB_DNS}/api/v1/products/bulk" \
    -H "Content-Type: application/json" -d '{"ids":[]}')
  echo "   POST /products/bulk → HTTP $BULK_CODE"
fi

echo ""
echo "✅ Deployment complete!"
echo "   Environment : $ENV"
echo "   ECS Service : $ECS_SERVICE"
echo "   Image       : ${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPO}:latest"
