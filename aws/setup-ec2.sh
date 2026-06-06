#!/bin/bash
# =============================================================================
# PriceBasket — EC2 + ALB + Auto Scaling Group Setup
# =============================================================================
# Uses existing VPC, RDS, ElastiCache, Security Groups from previous setup.
# Creates:
#   - EC2 Security Group (SSH + HTTP from ALB)
#   - EC2 t3.small instance (2 vCPU, 2 GB RAM) in public subnet
#   - Application Load Balancer (existing ALB SG reused)
#   - Target Group + Listener
#   - Launch Template for ASG
#   - Auto Scaling Group (min 1, max 3, scale at 70% CPU)
#   - Key Pair for SSH access
# =============================================================================

set -euo pipefail

AWS_REGION="ap-south-1"
APP_NAME="pricebasket"
ACCOUNT_ID="443414059511"

# ── Existing resources ────────────────────────────────────────────────────────
VPC_ID="vpc-0a41d6ec89091ea0b"
SUBNET_PUB_1="subnet-0d943df69c1294238"   # pricebasket-public-1a
SUBNET_PUB_2="subnet-0fbf96dac51836079"   # pricebasket-public-1b
SUBNET_PRIV_1="subnet-0eb29d7f068e4766c"  # pricebasket-private-1a
SUBNET_PRIV_2="subnet-0e8db26a710cd450a"  # pricebasket-private-1b
SG_ALB="sg-023060588da4926dc"             # pricebasket-alb-sg
SG_RDS="sg-0be9e5eb61e740c04"             # pricebasket-rds-sg
SG_REDIS="sg-07f0170c8b325ca76"           # pricebasket-redis-sg

# ── Colours ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }

info "Setting up EC2 + ALB + ASG for PriceBasket (region: $AWS_REGION)"

# =============================================================================
# STEP 1: EC2 Security Group
# =============================================================================
info "Step 1: Creating EC2 security group..."

SG_EC2=$(aws ec2 create-security-group \
  --group-name "${APP_NAME}-ec2-sg" \
  --description "PriceBasket EC2 instances" \
  --vpc-id $VPC_ID \
  --region $AWS_REGION \
  --query 'GroupId' --output text 2>/dev/null || \
  aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=${APP_NAME}-ec2-sg" "Name=vpc-id,Values=${VPC_ID}" \
    --region $AWS_REGION \
    --query 'SecurityGroups[0].GroupId' --output text)

# Allow SSH from anywhere (restrict to your IP in production)
aws ec2 authorize-security-group-ingress --group-id $SG_EC2 --protocol tcp --port 22   --cidr 0.0.0.0/0 --region $AWS_REGION 2>/dev/null || true
# Allow HTTP from ALB only
aws ec2 authorize-security-group-ingress --group-id $SG_EC2 --protocol tcp --port 8000 --source-group $SG_ALB --region $AWS_REGION 2>/dev/null || true
# Allow all outbound
aws ec2 authorize-security-group-egress  --group-id $SG_EC2 --protocol -1 --cidr 0.0.0.0/0 --region $AWS_REGION 2>/dev/null || true

# Allow EC2 to reach RDS
aws ec2 authorize-security-group-ingress --group-id $SG_RDS   --protocol tcp --port 5432 --source-group $SG_EC2 --region $AWS_REGION 2>/dev/null || true
# Allow EC2 to reach Redis
aws ec2 authorize-security-group-ingress --group-id $SG_REDIS --protocol tcp --port 6379 --source-group $SG_EC2 --region $AWS_REGION 2>/dev/null || true

success "EC2 security group: $SG_EC2"

# =============================================================================
# STEP 2: Key Pair
# =============================================================================
info "Step 2: Creating SSH key pair..."

KEY_NAME="${APP_NAME}-ec2-key"
KEY_FILE="$HOME/.ssh/${KEY_NAME}.pem"

if ! aws ec2 describe-key-pairs --key-names $KEY_NAME --region $AWS_REGION >/dev/null 2>&1; then
  aws ec2 create-key-pair \
    --key-name $KEY_NAME \
    --region $AWS_REGION \
    --query 'KeyMaterial' \
    --output text > "$KEY_FILE"
  chmod 400 "$KEY_FILE"
  success "Key pair saved to: $KEY_FILE"
else
  warn "Key pair $KEY_NAME already exists — skipping creation"
  warn "If you lost the .pem file, delete the key pair in AWS console and re-run"
fi

# =============================================================================
# STEP 3: Get secrets from Secrets Manager
# =============================================================================
info "Step 3: Fetching secrets from Secrets Manager..."

SECRET_JSON=$(aws secretsmanager get-secret-value \
  --secret-id "${APP_NAME}/production/env" \
  --region $AWS_REGION \
  --query 'SecretString' --output text)

DATABASE_URL=$(echo $SECRET_JSON | python3 -c "import sys,json; print(json.load(sys.stdin).get('DATABASE_URL',''))")
REDIS_URL=$(echo $SECRET_JSON | python3 -c "import sys,json; print(json.load(sys.stdin).get('REDIS_URL',''))")
SECRET_KEY=$(echo $SECRET_JSON | python3 -c "import sys,json; print(json.load(sys.stdin).get('SECRET_KEY',''))")
CELERY_BROKER=$(echo $SECRET_JSON | python3 -c "import sys,json; print(json.load(sys.stdin).get('CELERY_BROKER_URL',''))")
CELERY_BACKEND=$(echo $SECRET_JSON | python3 -c "import sys,json; print(json.load(sys.stdin).get('CELERY_RESULT_BACKEND',''))")
GITHUB_TOKEN=$(echo $SECRET_JSON | python3 -c "import sys,json; print(json.load(sys.stdin).get('GITHUB_TOKEN',''))")

success "Secrets loaded"

# =============================================================================
# STEP 4: User Data script (runs on EC2 boot)
# =============================================================================
info "Step 4: Preparing EC2 user data script..."

# Get latest Amazon Linux 2023 AMI
AMI_ID=$(aws ec2 describe-images \
  --owners amazon \
  --filters \
    "Name=name,Values=al2023-ami-2023*-x86_64" \
    "Name=state,Values=available" \
  --region $AWS_REGION \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text)

info "Using AMI: $AMI_ID (Amazon Linux 2023)"

# Write user data script
cat > /tmp/userdata.sh <<USERDATA
#!/bin/bash
# Do NOT use set -e — dnf conflicts must not abort the script
exec > /var/log/userdata.log 2>&1

echo "==> Starting PriceBasket setup at \$(date)"

# ── System packages ───────────────────────────────────────────────────────────
# AL2023 ships curl-minimal which conflicts with curl — use --allowerasing
# Do NOT install curl/wget separately — they're already present
dnf update -y --allowerasing 2>&1 | tail -3 || true
dnf install -y python3.11 python3.11-pip python3.11-devel git gcc postgresql15 \
  libpq-devel unzip htop tmux nginx --allowerasing 2>&1 | tail -5

# ── Python symlinks ───────────────────────────────────────────────────────────
ln -sf /usr/bin/python3.11 /usr/bin/python3
ln -sf /usr/bin/pip3.11 /usr/bin/pip3

# ── Playwright system deps ────────────────────────────────────────────────────
dnf install -y atk cups-libs gtk3 libXcomposite alsa-lib libXcursor libXdamage \
  libXext libXi libXrandr libXScrnSaver libXtst pango at-spi2-atk libXt \
  xorg-x11-server-Xvfb libdrm mesa-libgbm nss nspr libxkbcommon \
  libxshmfence mesa-libGL --allowerasing 2>&1 | tail -5 || true

# ── App directory ─────────────────────────────────────────────────────────────
mkdir -p /opt/pricebasket
cd /opt/pricebasket

# ── Clone repo ────────────────────────────────────────────────────────────────
git clone https://nikhilmathur97:${GITHUB_TOKEN}@github.com/nikhilmathur97/price-basket.git . || \
  (git remote set-url origin https://nikhilmathur97:${GITHUB_TOKEN}@github.com/nikhilmathur97/price-basket.git && git pull)

# ── Python virtualenv ─────────────────────────────────────────────────────────
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt

# ── Playwright Chromium ───────────────────────────────────────────────────────
# AL2023 uses dnf not apt-get, so --with-deps fails. Deps already installed above.
python3 -m playwright install chromium 2>&1 | tail -3 || true

# ── Environment file ──────────────────────────────────────────────────────────
cat > /opt/pricebasket/backend/.env <<EOF
APP_ENV=production
DEBUG=false
SECRET_KEY=${SECRET_KEY}
DATABASE_URL=${DATABASE_URL}
REDIS_URL=${REDIS_URL}
CELERY_BROKER_URL=${CELERY_BROKER}
CELERY_RESULT_BACKEND=${CELERY_BACKEND}
ALLOWED_ORIGINS=https://pricebasket.in,https://www.pricebasket.in,https://dev.pricebasket.in
SITE_URL=https://pricebasket.in
CONTENT_AUTOMATION_ENABLED=true
SOCIAL_AUTOMATION_ENABLED=true
PORT=8000
EOF

# ── Run DB migrations ─────────────────────────────────────────────────────────
cd /opt/pricebasket/backend
source /opt/pricebasket/venv/bin/activate
alembic upgrade head || true

# ── Systemd service for API ───────────────────────────────────────────────────
cat > /etc/systemd/system/pricebasket-api.service <<EOF
[Unit]
Description=PriceBasket FastAPI
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/pricebasket/backend
EnvironmentFile=/opt/pricebasket/backend/.env
ExecStart=/opt/pricebasket/venv/bin/uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 2 \
  --limit-max-requests 1000 \
  --limit-concurrency 100 \
  --timeout-keep-alive 30 \
  --access-log
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# ── Systemd service for Celery worker ────────────────────────────────────────
cat > /etc/systemd/system/pricebasket-worker.service <<EOF
[Unit]
Description=PriceBasket Celery Worker
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/pricebasket/backend
EnvironmentFile=/opt/pricebasket/backend/.env
ExecStart=/opt/pricebasket/venv/bin/celery -A app.workers.celery_app worker \
  --beat --loglevel=info --concurrency=1 --max-memory-per-child=200000
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# ── Fix ownership ─────────────────────────────────────────────────────────────
chown -R ec2-user:ec2-user /opt/pricebasket

# ── Start services ────────────────────────────────────────────────────────────
systemctl daemon-reload
systemctl enable pricebasket-api pricebasket-worker
systemctl start pricebasket-api pricebasket-worker

# ── Auto-update script (git pull + restart on deploy) ────────────────────────
# Store token for future deploys
GITHUB_TOKEN_VAL="${GITHUB_TOKEN}"

cat > /usr/local/bin/pb-deploy <<DEPLOY
#!/bin/bash
set -e
cd /opt/pricebasket
git remote set-url origin https://nikhilmathur97:\${GITHUB_TOKEN_VAL}@github.com/nikhilmathur97/price-basket.git
git pull origin main
source venv/bin/activate
pip install -r backend/requirements.txt --quiet
cd backend
alembic upgrade head || true
systemctl restart pricebasket-api pricebasket-worker
echo "Deployed at \$(date)"
DEPLOY
chmod +x /usr/local/bin/pb-deploy

echo "==> PriceBasket setup complete at \$(date)"
USERDATA

success "User data script ready"

# =============================================================================
# STEP 5: Application Load Balancer
# =============================================================================
info "Step 5: Creating ALB..."

# Check if ALB already exists
EXISTING_ALB=$(aws elbv2 describe-load-balancers \
  --names "${APP_NAME}-alb" \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text 2>/dev/null || echo "None")

if [ "$EXISTING_ALB" = "None" ] || [ -z "$EXISTING_ALB" ]; then
  ALB_ARN=$(aws elbv2 create-load-balancer \
    --name "${APP_NAME}-alb" \
    --subnets $SUBNET_PUB_1 $SUBNET_PUB_2 \
    --security-groups $SG_ALB \
    --scheme internet-facing \
    --type application \
    --tags "Key=Project,Value=${APP_NAME}" \
    --region $AWS_REGION \
    --query 'LoadBalancers[0].LoadBalancerArn' --output text)
  success "ALB created: $ALB_ARN"
else
  ALB_ARN=$EXISTING_ALB
  warn "ALB already exists: $ALB_ARN"
fi

ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].DNSName' --output text)

# Target Group
EXISTING_TG=$(aws elbv2 describe-target-groups \
  --names "${APP_NAME}-ec2-tg" \
  --region $AWS_REGION \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text 2>/dev/null || echo "None")

if [ "$EXISTING_TG" = "None" ] || [ -z "$EXISTING_TG" ]; then
  TG_ARN=$(aws elbv2 create-target-group \
    --name "${APP_NAME}-ec2-tg" \
    --protocol HTTP \
    --port 8000 \
    --vpc-id $VPC_ID \
    --target-type instance \
    --health-check-path /health \
    --health-check-interval-seconds 30 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --health-check-timeout-seconds 10 \
    --region $AWS_REGION \
    --query 'TargetGroups[0].TargetGroupArn' --output text)
  success "Target group created: $TG_ARN"
else
  TG_ARN=$EXISTING_TG
  warn "Target group already exists: $TG_ARN"
fi

# HTTP Listener (port 80 → forward to TG)
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions "Type=forward,TargetGroupArn=${TG_ARN}" \
  --region $AWS_REGION >/dev/null 2>/dev/null || true

success "ALB DNS: $ALB_DNS"

# =============================================================================
# STEP 6: Launch Template for ASG
# =============================================================================
info "Step 6: Creating Launch Template..."

USERDATA_B64=$(base64 -i /tmp/userdata.sh)

LT_ID=$(aws ec2 create-launch-template \
  --launch-template-name "${APP_NAME}-lt" \
  --version-description "v1" \
  --launch-template-data "{
    \"ImageId\": \"${AMI_ID}\",
    \"InstanceType\": \"t3.small\",
    \"KeyName\": \"${KEY_NAME}\",
    \"SecurityGroupIds\": [\"${SG_EC2}\"],
    \"UserData\": \"${USERDATA_B64}\",
    \"IamInstanceProfile\": {},
    \"BlockDeviceMappings\": [{
      \"DeviceName\": \"/dev/xvda\",
      \"Ebs\": {
        \"VolumeSize\": 20,
        \"VolumeType\": \"gp3\",
        \"DeleteOnTermination\": true
      }
    }],
    \"TagSpecifications\": [{
      \"ResourceType\": \"instance\",
      \"Tags\": [
        {\"Key\": \"Name\", \"Value\": \"${APP_NAME}-api\"},
        {\"Key\": \"Project\", \"Value\": \"${APP_NAME}\"}
      ]
    }],
    \"MetadataOptions\": {
      \"HttpTokens\": \"required\",
      \"HttpEndpoint\": \"enabled\"
    }
  }" \
  --region $AWS_REGION \
  --query 'LaunchTemplate.LaunchTemplateId' --output text 2>/dev/null || \
  aws ec2 describe-launch-templates \
    --launch-template-names "${APP_NAME}-lt" \
    --region $AWS_REGION \
    --query 'LaunchTemplates[0].LaunchTemplateId' --output text)

success "Launch Template: $LT_ID"

# =============================================================================
# STEP 7: Auto Scaling Group
# =============================================================================
info "Step 7: Creating Auto Scaling Group..."

aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name "${APP_NAME}-asg" \
  --launch-template "LaunchTemplateId=${LT_ID},Version=\$Latest" \
  --min-size 1 \
  --max-size 3 \
  --desired-capacity 1 \
  --vpc-zone-identifier "${SUBNET_PUB_1},${SUBNET_PUB_2}" \
  --target-group-arns $TG_ARN \
  --health-check-type ELB \
  --health-check-grace-period 180 \
  --tags "Key=Name,Value=${APP_NAME}-api,PropagateAtLaunch=true" \
         "Key=Project,Value=${APP_NAME},PropagateAtLaunch=true" \
  --region $AWS_REGION 2>/dev/null || warn "ASG already exists"

# CPU-based auto scaling policy (scale out at 70% CPU)
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name "${APP_NAME}-asg" \
  --policy-name "${APP_NAME}-cpu-scale" \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration '{
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ASGAverageCPUUtilization"
    },
    "TargetValue": 70.0,
    "DisableScaleIn": false
  }' \
  --region $AWS_REGION >/dev/null 2>/dev/null || true

success "ASG created with CPU auto-scaling at 70%"

# =============================================================================
# STEP 8: Save outputs
# =============================================================================
cat > "$(dirname "$0")/ec2-outputs.env" <<EOF
# PriceBasket EC2 Outputs — $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# DO NOT COMMIT — contains sensitive values

ALB_DNS=${ALB_DNS}
ALB_ARN=${ALB_ARN}
TG_ARN=${TG_ARN}
SG_EC2=${SG_EC2}
LT_ID=${LT_ID}
KEY_FILE=${KEY_FILE}
AMI_ID=${AMI_ID}

# ── Update these in Vercel env vars ──────────────────────────────────────────
NEW_BACKEND_URL=http://${ALB_DNS}
NEW_API_URL=http://${ALB_DNS}
EOF

echo ""
echo "============================================================"
echo -e "${GREEN}✅ EC2 + ALB + ASG Setup Complete!${NC}"
echo "============================================================"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo "1. Wait ~5 min for EC2 to boot and install dependencies"
echo "   Then test: curl http://${ALB_DNS}/health"
echo ""
echo "2. SSH into the instance to check logs:"
echo "   INSTANCE_IP=\$(aws ec2 describe-instances --filters 'Name=tag:Name,Values=${APP_NAME}-api' 'Name=instance-state-name,Values=running' --region ${AWS_REGION} --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)"
echo "   ssh -i ${KEY_FILE} ec2-user@\$INSTANCE_IP"
echo "   sudo journalctl -u pricebasket-api -f"
echo ""
echo "3. Update Vercel environment variables:"
echo "   BACKEND_URL = http://${ALB_DNS}"
echo "   API_URL     = http://${ALB_DNS}"
echo "   (Vercel → Project → Settings → Environment Variables → Redeploy)"
echo ""
echo "4. To deploy new code: ssh in and run: pb-deploy"
echo ""
echo "5. Pause Render (don't delete — for rollback):"
echo "   render.com → each service → Suspend"
echo ""
echo -e "${BLUE}📁 Config saved to: aws/ec2-outputs.env${NC}"
echo "============================================================"
