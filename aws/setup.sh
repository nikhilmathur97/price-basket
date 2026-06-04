#!/bin/bash
# =============================================================================
# PriceBasket — AWS Infrastructure Setup Script
# =============================================================================
# Run this in AWS CloudShell (https://console.aws.amazon.com/cloudshell)
# or locally with AWS CLI configured.
#
# What this creates:
#   - VPC + Subnets + Internet Gateway + NAT Gateway
#   - RDS PostgreSQL (t3.micro, always-on)
#   - ElastiCache Redis (t3.micro, always-on)
#   - ECR repositories (API + Worker Docker images)
#   - ECS Cluster (Fargate, always-on — NO cold starts)
#   - Application Load Balancer
#   - ECS Services (API + Worker)
#   - Secrets Manager (for DB password, SECRET_KEY, etc.)
#
# Render stays PAUSED — switch back in one step by changing NEXT_PUBLIC_API_URL
#
# Usage:
#   chmod +x aws/setup.sh
#   ./aws/setup.sh
#
# Prerequisites:
#   - AWS CLI installed and configured (aws configure)
#   - Docker installed (for building images)
#   - jq installed (brew install jq / apt install jq)
# =============================================================================

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
AWS_REGION="ap-south-1"          # Mumbai — closest to Indian users
APP_NAME="pricebasket"
ENV="production"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Instance sizes (cost-optimised for startup)
DB_INSTANCE_CLASS="db.t3.micro"   # ~$15/month
REDIS_NODE_TYPE="cache.t3.micro"  # ~$13/month
ECS_CPU="256"                      # 0.25 vCPU per service
ECS_MEMORY="512"                   # 512 MB per service

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Prerequisite checks ───────────────────────────────────────────────────────
command -v aws  >/dev/null 2>&1 || error "AWS CLI not installed"
command -v docker >/dev/null 2>&1 || error "Docker not installed"
command -v jq   >/dev/null 2>&1 || error "jq not installed (brew install jq)"

info "Setting up PriceBasket on AWS (region: $AWS_REGION, account: $ACCOUNT_ID)"

# =============================================================================
# STEP 1: VPC + NETWORKING
# =============================================================================
info "Step 1/10: Creating VPC and networking..."

VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=${APP_NAME}-vpc},{Key=Project,Value=${APP_NAME}}]" \
  --region $AWS_REGION \
  --query 'Vpc.VpcId' --output text)
success "VPC created: $VPC_ID"

# Enable DNS hostnames (required for RDS)
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames --region $AWS_REGION
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-support --region $AWS_REGION

# Public subnets (for ALB)
SUBNET_PUB_1=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID --cidr-block 10.0.1.0/24 \
  --availability-zone "${AWS_REGION}a" \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${APP_NAME}-public-1a}]" \
  --region $AWS_REGION --query 'Subnet.SubnetId' --output text)

SUBNET_PUB_2=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID --cidr-block 10.0.2.0/24 \
  --availability-zone "${AWS_REGION}b" \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${APP_NAME}-public-1b}]" \
  --region $AWS_REGION --query 'Subnet.SubnetId' --output text)

# Private subnets (for ECS, RDS, Redis)
SUBNET_PRIV_1=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID --cidr-block 10.0.3.0/24 \
  --availability-zone "${AWS_REGION}a" \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${APP_NAME}-private-1a}]" \
  --region $AWS_REGION --query 'Subnet.SubnetId' --output text)

SUBNET_PRIV_2=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID --cidr-block 10.0.4.0/24 \
  --availability-zone "${AWS_REGION}b" \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${APP_NAME}-private-1b}]" \
  --region $AWS_REGION --query 'Subnet.SubnetId' --output text)

# Internet Gateway
IGW_ID=$(aws ec2 create-internet-gateway \
  --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=${APP_NAME}-igw}]" \
  --region $AWS_REGION --query 'InternetGateway.InternetGatewayId' --output text)
aws ec2 attach-internet-gateway --internet-gateway-id $IGW_ID --vpc-id $VPC_ID --region $AWS_REGION

# Elastic IP + NAT Gateway (for private subnets to reach internet for scraping)
EIP_ALLOC=$(aws ec2 allocate-address --domain vpc --region $AWS_REGION --query 'AllocationId' --output text)
NAT_GW=$(aws ec2 create-nat-gateway \
  --subnet-id $SUBNET_PUB_1 \
  --allocation-id $EIP_ALLOC \
  --tag-specifications "ResourceType=natgateway,Tags=[{Key=Name,Value=${APP_NAME}-nat}]" \
  --region $AWS_REGION --query 'NatGateway.NatGatewayId' --output text)

info "Waiting for NAT Gateway to become available (~60s)..."
aws ec2 wait nat-gateway-available --nat-gateway-ids $NAT_GW --region $AWS_REGION

# Route tables
RT_PUB=$(aws ec2 create-route-table --vpc-id $VPC_ID --region $AWS_REGION --query 'RouteTable.RouteTableId' --output text)
aws ec2 create-route --route-table-id $RT_PUB --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW_ID --region $AWS_REGION >/dev/null
aws ec2 associate-route-table --route-table-id $RT_PUB --subnet-id $SUBNET_PUB_1 --region $AWS_REGION >/dev/null
aws ec2 associate-route-table --route-table-id $RT_PUB --subnet-id $SUBNET_PUB_2 --region $AWS_REGION >/dev/null

RT_PRIV=$(aws ec2 create-route-table --vpc-id $VPC_ID --region $AWS_REGION --query 'RouteTable.RouteTableId' --output text)
aws ec2 create-route --route-table-id $RT_PRIV --destination-cidr-block 0.0.0.0/0 --nat-gateway-id $NAT_GW --region $AWS_REGION >/dev/null
aws ec2 associate-route-table --route-table-id $RT_PRIV --subnet-id $SUBNET_PRIV_1 --region $AWS_REGION >/dev/null
aws ec2 associate-route-table --route-table-id $RT_PRIV --subnet-id $SUBNET_PRIV_2 --region $AWS_REGION >/dev/null

success "Networking ready"

# =============================================================================
# STEP 2: SECURITY GROUPS
# =============================================================================
info "Step 2/10: Creating security groups..."

# ALB: accepts HTTP/HTTPS from internet
SG_ALB=$(aws ec2 create-security-group \
  --group-name "${APP_NAME}-alb-sg" --description "ALB security group" \
  --vpc-id $VPC_ID --region $AWS_REGION --query 'GroupId' --output text)
aws ec2 authorize-security-group-ingress --group-id $SG_ALB --protocol tcp --port 80  --cidr 0.0.0.0/0 --region $AWS_REGION >/dev/null
aws ec2 authorize-security-group-ingress --group-id $SG_ALB --protocol tcp --port 443 --cidr 0.0.0.0/0 --region $AWS_REGION >/dev/null

# ECS: accepts traffic from ALB only
SG_ECS=$(aws ec2 create-security-group \
  --group-name "${APP_NAME}-ecs-sg" --description "ECS tasks security group" \
  --vpc-id $VPC_ID --region $AWS_REGION --query 'GroupId' --output text)
aws ec2 authorize-security-group-ingress --group-id $SG_ECS --protocol tcp --port 8000 --source-group $SG_ALB --region $AWS_REGION >/dev/null

# RDS: accepts traffic from ECS only
SG_RDS=$(aws ec2 create-security-group \
  --group-name "${APP_NAME}-rds-sg" --description "RDS security group" \
  --vpc-id $VPC_ID --region $AWS_REGION --query 'GroupId' --output text)
aws ec2 authorize-security-group-ingress --group-id $SG_RDS --protocol tcp --port 5432 --source-group $SG_ECS --region $AWS_REGION >/dev/null

# Redis: accepts traffic from ECS only
SG_REDIS=$(aws ec2 create-security-group \
  --group-name "${APP_NAME}-redis-sg" --description "Redis security group" \
  --vpc-id $VPC_ID --region $AWS_REGION --query 'GroupId' --output text)
aws ec2 authorize-security-group-ingress --group-id $SG_REDIS --protocol tcp --port 6379 --source-group $SG_ECS --region $AWS_REGION >/dev/null

success "Security groups ready"

# =============================================================================
# STEP 3: RDS POSTGRESQL
# =============================================================================
info "Step 3/10: Creating RDS PostgreSQL (t3.micro, always-on)..."

DB_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=')
DB_SUBNET_GROUP="${APP_NAME}-db-subnet"

aws rds create-db-subnet-group \
  --db-subnet-group-name $DB_SUBNET_GROUP \
  --db-subnet-group-description "PriceBasket DB subnet group" \
  --subnet-ids $SUBNET_PRIV_1 $SUBNET_PRIV_2 \
  --region $AWS_REGION >/dev/null

aws rds create-db-instance \
  --db-instance-identifier "${APP_NAME}-db" \
  --db-instance-class $DB_INSTANCE_CLASS \
  --engine postgres \
  --engine-version "15.4" \
  --master-username pricebasket \
  --master-user-password "$DB_PASSWORD" \
  --db-name pricebasket_db \
  --db-subnet-group-name $DB_SUBNET_GROUP \
  --vpc-security-group-ids $SG_RDS \
  --no-publicly-accessible \
  --storage-type gp3 \
  --allocated-storage 20 \
  --backup-retention-period 7 \
  --no-multi-az \
  --no-deletion-protection \
  --tags "Key=Project,Value=${APP_NAME}" \
  --region $AWS_REGION >/dev/null

info "RDS creating (takes ~5 min, continuing with other steps)..."

# =============================================================================
# STEP 4: ELASTICACHE REDIS
# =============================================================================
info "Step 4/10: Creating ElastiCache Redis (t3.micro, always-on)..."

REDIS_SUBNET_GROUP="${APP_NAME}-redis-subnet"

aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name $REDIS_SUBNET_GROUP \
  --cache-subnet-group-description "PriceBasket Redis subnet group" \
  --subnet-ids $SUBNET_PRIV_1 $SUBNET_PRIV_2 \
  --region $AWS_REGION >/dev/null

aws elasticache create-cache-cluster \
  --cache-cluster-id "${APP_NAME}-redis" \
  --cache-node-type $REDIS_NODE_TYPE \
  --engine redis \
  --engine-version "7.0" \
  --num-cache-nodes 1 \
  --cache-subnet-group-name $REDIS_SUBNET_GROUP \
  --security-group-ids $SG_REDIS \
  --tags "Key=Project,Value=${APP_NAME}" \
  --region $AWS_REGION >/dev/null

info "Redis creating (takes ~3 min, continuing)..."

# =============================================================================
# STEP 5: ECR REPOSITORIES
# =============================================================================
info "Step 5/10: Creating ECR repositories..."

ECR_API="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}-api"
ECR_WORKER="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}-worker"

aws ecr create-repository --repository-name "${APP_NAME}-api"    --region $AWS_REGION >/dev/null 2>&1 || true
aws ecr create-repository --repository-name "${APP_NAME}-worker" --region $AWS_REGION >/dev/null 2>&1 || true

success "ECR repositories: $ECR_API"

# =============================================================================
# STEP 6: BUILD & PUSH DOCKER IMAGES
# =============================================================================
info "Step 6/10: Building and pushing Docker images..."

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")/backend"

# Build API image
docker build -t "${APP_NAME}-api:latest" -f "${BACKEND_DIR}/Dockerfile" "${BACKEND_DIR}"
docker tag "${APP_NAME}-api:latest" "${ECR_API}:latest"
docker push "${ECR_API}:latest"
success "API image pushed"

# Build Worker image
docker build -t "${APP_NAME}-worker:latest" -f "${BACKEND_DIR}/Dockerfile.worker" "${BACKEND_DIR}"
docker tag "${APP_NAME}-worker:latest" "${ECR_WORKER}:latest"
docker push "${ECR_WORKER}:latest"
success "Worker image pushed"

# =============================================================================
# STEP 7: SECRETS MANAGER
# =============================================================================
info "Step 7/10: Storing secrets in AWS Secrets Manager..."

SECRET_KEY=$(openssl rand -hex 32)

# Wait for RDS to be available before getting endpoint
info "Waiting for RDS to be available (this may take 5-8 min)..."
aws rds wait db-instance-available --db-instance-identifier "${APP_NAME}-db" --region $AWS_REGION

DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier "${APP_NAME}-db" \
  --region $AWS_REGION \
  --query 'DBInstances[0].Endpoint.Address' --output text)

# Wait for Redis
info "Waiting for Redis to be available..."
aws elasticache wait cache-cluster-available --cache-cluster-id "${APP_NAME}-redis" --region $AWS_REGION 2>/dev/null || sleep 60

REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
  --cache-cluster-id "${APP_NAME}-redis" \
  --show-cache-node-info \
  --region $AWS_REGION \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' --output text)

DATABASE_URL="postgresql+asyncpg://pricebasket:${DB_PASSWORD}@${DB_ENDPOINT}:5432/pricebasket_db"
REDIS_URL="redis://${REDIS_ENDPOINT}:6379/0"

# Store all secrets
aws secretsmanager create-secret \
  --name "${APP_NAME}/production/env" \
  --description "PriceBasket production environment variables" \
  --secret-string "{
    \"SECRET_KEY\": \"${SECRET_KEY}\",
    \"DATABASE_URL\": \"${DATABASE_URL}\",
    \"REDIS_URL\": \"${REDIS_URL}\",
    \"CELERY_BROKER_URL\": \"redis://${REDIS_ENDPOINT}:6379/1\",
    \"CELERY_RESULT_BACKEND\": \"redis://${REDIS_ENDPOINT}:6379/2\",
    \"DB_PASSWORD\": \"${DB_PASSWORD}\",
    \"DB_ENDPOINT\": \"${DB_ENDPOINT}\",
    \"REDIS_ENDPOINT\": \"${REDIS_ENDPOINT}\"
  }" \
  --region $AWS_REGION >/dev/null

success "Secrets stored in Secrets Manager"

# =============================================================================
# STEP 8: ECS CLUSTER + IAM ROLES
# =============================================================================
info "Step 8/10: Creating ECS cluster and IAM roles..."

# ECS Cluster
aws ecs create-cluster \
  --cluster-name "${APP_NAME}-cluster" \
  --capacity-providers FARGATE \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1 \
  --tags "key=Project,value=${APP_NAME}" \
  --region $AWS_REGION >/dev/null

# ECS Task Execution Role
TRUST_POLICY='{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "ecs-tasks.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}'

EXEC_ROLE_ARN=$(aws iam create-role \
  --role-name "${APP_NAME}-ecs-exec-role" \
  --assume-role-policy-document "$TRUST_POLICY" \
  --query 'Role.Arn' --output text 2>/dev/null || \
  aws iam get-role --role-name "${APP_NAME}-ecs-exec-role" --query 'Role.Arn' --output text)

aws iam attach-role-policy \
  --role-name "${APP_NAME}-ecs-exec-role" \
  --policy-arn "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy" 2>/dev/null || true

# Allow reading secrets
aws iam attach-role-policy \
  --role-name "${APP_NAME}-ecs-exec-role" \
  --policy-arn "arn:aws:iam::aws:policy/SecretsManagerReadWrite" 2>/dev/null || true

# CloudWatch Logs
aws logs create-log-group --log-group-name "/ecs/${APP_NAME}-api"    --region $AWS_REGION 2>/dev/null || true
aws logs create-log-group --log-group-name "/ecs/${APP_NAME}-worker" --region $AWS_REGION 2>/dev/null || true

success "ECS cluster and IAM ready"

# =============================================================================
# STEP 9: ECS TASK DEFINITIONS + SERVICES
# =============================================================================
info "Step 9/10: Creating ECS task definitions and services..."

SECRET_ARN=$(aws secretsmanager describe-secret \
  --secret-id "${APP_NAME}/production/env" \
  --region $AWS_REGION \
  --query 'ARN' --output text)

# ── API Task Definition ───────────────────────────────────────────────────────
cat > /tmp/api-task-def.json <<TASKDEF
{
  "family": "${APP_NAME}-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "${ECS_CPU}",
  "memory": "${ECS_MEMORY}",
  "executionRoleArn": "${EXEC_ROLE_ARN}",
  "taskRoleArn": "${EXEC_ROLE_ARN}",
  "containerDefinitions": [{
    "name": "${APP_NAME}-api",
    "image": "${ECR_API}:latest",
    "essential": true,
    "portMappings": [{"containerPort": 8000, "protocol": "tcp"}],
    "environment": [
      {"name": "APP_ENV",    "value": "production"},
      {"name": "DEBUG",      "value": "false"},
      {"name": "ALLOWED_ORIGINS", "value": "https://pricebasket.in,https://www.pricebasket.in"}
    ],
    "secrets": [
      {"name": "SECRET_KEY",            "valueFrom": "${SECRET_ARN}:SECRET_KEY::"},
      {"name": "DATABASE_URL",          "valueFrom": "${SECRET_ARN}:DATABASE_URL::"},
      {"name": "REDIS_URL",             "valueFrom": "${SECRET_ARN}:REDIS_URL::"},
      {"name": "CELERY_BROKER_URL",     "valueFrom": "${SECRET_ARN}:CELERY_BROKER_URL::"},
      {"name": "CELERY_RESULT_BACKEND", "valueFrom": "${SECRET_ARN}:CELERY_RESULT_BACKEND::"}
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group":  "/ecs/${APP_NAME}-api",
        "awslogs-region": "${AWS_REGION}",
        "awslogs-stream-prefix": "ecs"
      }
    },
    "healthCheck": {
      "command": ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"],
      "interval": 30,
      "timeout": 5,
      "retries": 3,
      "startPeriod": 60
    }
  }]
}
TASKDEF

API_TASK_ARN=$(aws ecs register-task-definition \
  --cli-input-json file:///tmp/api-task-def.json \
  --region $AWS_REGION \
  --query 'taskDefinition.taskDefinitionArn' --output text)

# ── Worker Task Definition ────────────────────────────────────────────────────
cat > /tmp/worker-task-def.json <<TASKDEF
{
  "family": "${APP_NAME}-worker",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "${ECS_CPU}",
  "memory": "${ECS_MEMORY}",
  "executionRoleArn": "${EXEC_ROLE_ARN}",
  "taskRoleArn": "${EXEC_ROLE_ARN}",
  "containerDefinitions": [{
    "name": "${APP_NAME}-worker",
    "image": "${ECR_WORKER}:latest",
    "essential": true,
    "environment": [
      {"name": "APP_ENV", "value": "production"},
      {"name": "DEBUG",   "value": "false"}
    ],
    "secrets": [
      {"name": "SECRET_KEY",            "valueFrom": "${SECRET_ARN}:SECRET_KEY::"},
      {"name": "DATABASE_URL",          "valueFrom": "${SECRET_ARN}:DATABASE_URL::"},
      {"name": "REDIS_URL",             "valueFrom": "${SECRET_ARN}:REDIS_URL::"},
      {"name": "CELERY_BROKER_URL",     "valueFrom": "${SECRET_ARN}:CELERY_BROKER_URL::"},
      {"name": "CELERY_RESULT_BACKEND", "valueFrom": "${SECRET_ARN}:CELERY_RESULT_BACKEND::"}
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group":  "/ecs/${APP_NAME}-worker",
        "awslogs-region": "${AWS_REGION}",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }]
}
TASKDEF

WORKER_TASK_ARN=$(aws ecs register-task-definition \
  --cli-input-json file:///tmp/worker-task-def.json \
  --region $AWS_REGION \
  --query 'taskDefinition.taskDefinitionArn' --output text)

# ── Application Load Balancer ─────────────────────────────────────────────────
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name "${APP_NAME}-alb" \
  --subnets $SUBNET_PUB_1 $SUBNET_PUB_2 \
  --security-groups $SG_ALB \
  --scheme internet-facing \
  --type application \
  --tags "Key=Project,Value=${APP_NAME}" \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text)

TG_ARN=$(aws elbv2 create-target-group \
  --name "${APP_NAME}-tg" \
  --protocol HTTP \
  --port 8000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region $AWS_REGION \
  --query 'TargetGroups[0].TargetGroupArn' --output text)

aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions "Type=forward,TargetGroupArn=${TG_ARN}" \
  --region $AWS_REGION >/dev/null

ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].DNSName' --output text)

# ── ECS Services ──────────────────────────────────────────────────────────────
aws ecs create-service \
  --cluster "${APP_NAME}-cluster" \
  --service-name "${APP_NAME}-api" \
  --task-definition $API_TASK_ARN \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_PRIV_1},${SUBNET_PRIV_2}],securityGroups=[${SG_ECS}],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=${TG_ARN},containerName=${APP_NAME}-api,containerPort=8000" \
  --health-check-grace-period-seconds 120 \
  --tags "key=Project,value=${APP_NAME}" \
  --region $AWS_REGION >/dev/null

aws ecs create-service \
  --cluster "${APP_NAME}-cluster" \
  --service-name "${APP_NAME}-worker" \
  --task-definition $WORKER_TASK_ARN \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_PRIV_1},${SUBNET_PRIV_2}],securityGroups=[${SG_ECS}],assignPublicIp=DISABLED}" \
  --tags "key=Project,value=${APP_NAME}" \
  --region $AWS_REGION >/dev/null

success "ECS services started"

# =============================================================================
# STEP 10: SAVE OUTPUTS
# =============================================================================
info "Step 10/10: Saving configuration..."

cat > "$(dirname "$SCRIPT_DIR")/aws/outputs.env" <<EOF
# ── AWS Infrastructure Outputs ────────────────────────────────────────────────
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# DO NOT COMMIT THIS FILE — contains sensitive values

AWS_REGION=${AWS_REGION}
ACCOUNT_ID=${ACCOUNT_ID}
VPC_ID=${VPC_ID}
ALB_DNS=${ALB_DNS}
ALB_ARN=${ALB_ARN}
DB_ENDPOINT=${DB_ENDPOINT}
REDIS_ENDPOINT=${REDIS_ENDPOINT}
ECR_API=${ECR_API}
ECR_WORKER=${ECR_WORKER}
ECS_CLUSTER=${APP_NAME}-cluster
SECRET_ARN=${SECRET_ARN}

# ── New backend URL (use this in Vercel NEXT_PUBLIC_API_URL) ──────────────────
NEW_API_URL=http://${ALB_DNS}

# ── Old Render URL (pause Render, don't delete — for rollback) ───────────────
OLD_API_URL=https://pricebasket-api.onrender.com
EOF

echo ""
echo "============================================================"
echo -e "${GREEN}✅ AWS Setup Complete!${NC}"
echo "============================================================"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo "1. Wait ~2 min for ECS service to start, then test:"
echo "   curl http://${ALB_DNS}/health"
echo ""
echo "2. Update Vercel environment variable:"
echo "   NEXT_PUBLIC_API_URL=http://${ALB_DNS}"
echo "   (Go to Vercel → Project → Settings → Environment Variables)"
echo ""
echo "3. PAUSE (don't delete) Render services:"
echo "   Go to render.com → each service → Suspend"
echo "   (Can reactivate in 1 click for rollback)"
echo ""
echo "4. To rollback to Render instantly:"
echo "   Change NEXT_PUBLIC_API_URL back to: https://pricebasket-api.onrender.com"
echo "   Then resume Render services"
echo ""
echo -e "${BLUE}📁 Full config saved to: aws/outputs.env${NC}"
echo "============================================================"
