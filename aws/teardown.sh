#!/bin/bash
# =============================================================================
# PriceBasket — Full AWS Teardown (delete everything, stop all billing)
# =============================================================================
# WARNING: This PERMANENTLY deletes all AWS resources.
# Use scale-down.sh if you just want to pause.
# Use rollback-to-render.sh if you want to switch to Render.
#
# Usage:
#   chmod +x aws/teardown.sh
#   ./aws/teardown.sh
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/outputs.env"
APP_NAME="pricebasket"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo -e "${RED}⚠️  WARNING: This will DELETE all AWS resources permanently.${NC}"
echo "Type 'DELETE' to confirm:"
read -r CONFIRM
[ "$CONFIRM" = "DELETE" ] || { echo "Aborted."; exit 0; }

echo -e "${YELLOW}Tearing down AWS infrastructure...${NC}"

# Scale ECS to 0 first
aws ecs update-service --cluster "${APP_NAME}-cluster" --service "${APP_NAME}-api"    --desired-count 0 --region $AWS_REGION >/dev/null 2>&1 || true
aws ecs update-service --cluster "${APP_NAME}-cluster" --service "${APP_NAME}-worker" --desired-count 0 --region $AWS_REGION >/dev/null 2>&1 || true
sleep 30

# Delete ECS services
aws ecs delete-service --cluster "${APP_NAME}-cluster" --service "${APP_NAME}-api"    --force --region $AWS_REGION >/dev/null 2>&1 || true
aws ecs delete-service --cluster "${APP_NAME}-cluster" --service "${APP_NAME}-worker" --force --region $AWS_REGION >/dev/null 2>&1 || true

# Delete ECS cluster
aws ecs delete-cluster --cluster "${APP_NAME}-cluster" --region $AWS_REGION >/dev/null 2>&1 || true

# Delete ALB + Target Group
aws elbv2 delete-load-balancer --load-balancer-arn $ALB_ARN --region $AWS_REGION >/dev/null 2>&1 || true
sleep 10
TG_ARN=$(aws elbv2 describe-target-groups --names "${APP_NAME}-tg" --region $AWS_REGION --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || echo "")
[ -n "$TG_ARN" ] && aws elbv2 delete-target-group --target-group-arn $TG_ARN --region $AWS_REGION >/dev/null 2>&1 || true

# Delete RDS
aws rds delete-db-instance \
  --db-instance-identifier "${APP_NAME}-db" \
  --skip-final-snapshot \
  --region $AWS_REGION >/dev/null 2>&1 || true

# Delete ElastiCache
aws elasticache delete-cache-cluster --cache-cluster-id "${APP_NAME}-redis" --region $AWS_REGION >/dev/null 2>&1 || true

# Delete ECR images
aws ecr delete-repository --repository-name "${APP_NAME}-api"    --force --region $AWS_REGION >/dev/null 2>&1 || true
aws ecr delete-repository --repository-name "${APP_NAME}-worker" --force --region $AWS_REGION >/dev/null 2>&1 || true

# Delete Secrets Manager
aws secretsmanager delete-secret \
  --secret-id "${APP_NAME}/production/env" \
  --force-delete-without-recovery \
  --region $AWS_REGION >/dev/null 2>&1 || true

# Delete CloudWatch log groups
aws logs delete-log-group --log-group-name "/ecs/${APP_NAME}-api"    --region $AWS_REGION >/dev/null 2>&1 || true
aws logs delete-log-group --log-group-name "/ecs/${APP_NAME}-worker" --region $AWS_REGION >/dev/null 2>&1 || true

echo "Waiting for RDS/Redis to finish deleting (~5 min)..."
sleep 60

# Delete subnet groups
aws rds delete-db-subnet-group --db-subnet-group-name "${APP_NAME}-db-subnet" --region $AWS_REGION >/dev/null 2>&1 || true
aws elasticache delete-cache-subnet-group --cache-subnet-group-name "${APP_NAME}-redis-subnet" --region $AWS_REGION >/dev/null 2>&1 || true

# Delete NAT Gateway + release EIP
NAT_GW=$(aws ec2 describe-nat-gateways \
  --filter "Name=tag:Name,Values=${APP_NAME}-nat" "Name=state,Values=available" \
  --region $AWS_REGION --query 'NatGateways[0].NatGatewayId' --output text 2>/dev/null || echo "")
if [ -n "$NAT_GW" ] && [ "$NAT_GW" != "None" ]; then
  aws ec2 delete-nat-gateway --nat-gateway-id $NAT_GW --region $AWS_REGION >/dev/null 2>&1 || true
  sleep 30
fi

# Release Elastic IPs
aws ec2 describe-addresses --region $AWS_REGION \
  --query 'Addresses[?Tags[?Key==`Project`&&Value==`pricebasket`]].AllocationId' \
  --output text | xargs -I{} aws ec2 release-address --allocation-id {} --region $AWS_REGION 2>/dev/null || true

# Delete VPC (subnets, route tables, security groups, IGW first)
VPC_ID_LOCAL=$VPC_ID
aws ec2 describe-subnets --filters "Name=vpc-id,Values=${VPC_ID_LOCAL}" --region $AWS_REGION \
  --query 'Subnets[].SubnetId' --output text | \
  xargs -I{} aws ec2 delete-subnet --subnet-id {} --region $AWS_REGION 2>/dev/null || true

aws ec2 describe-route-tables --filters "Name=vpc-id,Values=${VPC_ID_LOCAL}" "Name=association.main,Values=false" \
  --region $AWS_REGION --query 'RouteTables[].RouteTableId' --output text | \
  xargs -I{} aws ec2 delete-route-table --route-table-id {} --region $AWS_REGION 2>/dev/null || true

aws ec2 describe-internet-gateways --filters "Name=attachment.vpc-id,Values=${VPC_ID_LOCAL}" \
  --region $AWS_REGION --query 'InternetGateways[].InternetGatewayId' --output text | \
  xargs -I{} sh -c "aws ec2 detach-internet-gateway --internet-gateway-id {} --vpc-id ${VPC_ID_LOCAL} --region $AWS_REGION && aws ec2 delete-internet-gateway --internet-gateway-id {} --region $AWS_REGION" 2>/dev/null || true

aws ec2 describe-security-groups --filters "Name=vpc-id,Values=${VPC_ID_LOCAL}" \
  --region $AWS_REGION --query 'SecurityGroups[?GroupName!=`default`].GroupId' --output text | \
  xargs -I{} aws ec2 delete-security-group --group-id {} --region $AWS_REGION 2>/dev/null || true

aws ec2 delete-vpc --vpc-id $VPC_ID_LOCAL --region $AWS_REGION >/dev/null 2>&1 || true

# Delete IAM role
aws iam detach-role-policy --role-name "${APP_NAME}-ecs-exec-role" --policy-arn "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy" 2>/dev/null || true
aws iam detach-role-policy --role-name "${APP_NAME}-ecs-exec-role" --policy-arn "arn:aws:iam::aws:policy/SecretsManagerReadWrite" 2>/dev/null || true
aws iam delete-role --role-name "${APP_NAME}-ecs-exec-role" 2>/dev/null || true

echo -e "${GREEN}✅ All AWS resources deleted. Billing stopped.${NC}"
echo ""
echo "Render is still paused. To reactivate:"
echo "  1. Go to render.com → Resume services"
echo "  2. Update Vercel NEXT_PUBLIC_API_URL=https://pricebasket-api.onrender.com"
