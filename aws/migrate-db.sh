#!/bin/bash
# ============================================================
# Migrate Render PostgreSQL → AWS RDS
# Usage: ./aws/migrate-db.sh "postgresql://user:pass@host/db"
# ============================================================
set -e

RENDER_DB_URL="${1:-}"
if [ -z "$RENDER_DB_URL" ]; then
  echo "Usage: ./aws/migrate-db.sh 'postgresql://pricebasket:PASSWORD@dpg-xxx.render.com/pricebasket_db'"
  exit 1
fi

# Load AWS credentials
source "$(dirname "$0")/set-credentials.sh" 2>/dev/null || true

AWS_REGION="ap-south-1"
RDS_HOST="pricebasket-db.cf6ksq4yotjm.ap-south-1.rds.amazonaws.com"
RDS_PORT="5432"
RDS_DB="pricebasket_db"
RDS_USER="pricebasket"

# Get RDS password from Secrets Manager
echo "=== Getting RDS password from Secrets Manager ==="
RDS_PASS=$(aws secretsmanager get-secret-value \
  --secret-id pricebasket/production/env \
  --region $AWS_REGION \
  --query SecretString --output text 2>&1 | \
  python3 -c "
import sys, re
text = sys.stdin.read()
# Find JSON part
idx = text.find('{\"')
if idx >= 0:
    import json
    d = json.loads(text[idx:])
    # Extract password from DATABASE_URL
    db_url = d.get('DATABASE_URL', '')
    m = re.search(r'://[^:]+:([^@]+)@', db_url)
    if m:
        print(m.group(1))
" 2>&1)

if [ -z "$RDS_PASS" ]; then
  echo "❌ Could not get RDS password. Enter it manually:"
  read -s -p "RDS password: " RDS_PASS
  echo ""
fi

DUMP_FILE="/tmp/pricebasket_render_dump.sql"
echo "=== Step 1: Dumping Render DB to $DUMP_FILE ==="
PGPASSWORD="" pg_dump \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --schema=public \
  "$RENDER_DB_URL" \
  -f "$DUMP_FILE" 2>&1

echo "Dump size: $(du -sh $DUMP_FILE)"

echo "=== Step 2: Restoring to AWS RDS ==="
# Allow RDS access from local machine temporarily via security group
MY_IP=$(curl -s https://checkip.amazonaws.com 2>/dev/null || echo "0.0.0.0")
SG_RDS=$(aws ec2 describe-security-groups \
  --region $AWS_REGION \
  --filters "Name=group-name,Values=pricebasket-rds-sg" \
  --query 'SecurityGroups[0].GroupId' --output text 2>&1 | tail -1)

echo "Adding temp inbound rule for $MY_IP to RDS SG $SG_RDS..."
aws ec2 authorize-security-group-ingress \
  --group-id "$SG_RDS" \
  --protocol tcp \
  --port 5432 \
  --cidr "$MY_IP/32" \
  --region $AWS_REGION 2>&1 || echo "(rule may already exist)"

echo "Restoring dump to RDS..."
PGPASSWORD="$RDS_PASS" psql \
  -h "$RDS_HOST" \
  -p "$RDS_PORT" \
  -U "$RDS_USER" \
  -d "$RDS_DB" \
  -f "$DUMP_FILE" 2>&1 | tail -20

echo "=== Step 3: Removing temp inbound rule ==="
aws ec2 revoke-security-group-ingress \
  --group-id "$SG_RDS" \
  --protocol tcp \
  --port 5432 \
  --cidr "$MY_IP/32" \
  --region $AWS_REGION 2>&1 || true

echo "=== Step 4: Verifying data ==="
PGPASSWORD="$RDS_PASS" psql \
  -h "$RDS_HOST" -p "$RDS_PORT" -U "$RDS_USER" -d "$RDS_DB" \
  -c "SELECT COUNT(*) as products FROM products; SELECT COUNT(*) as categories FROM categories; SELECT COUNT(*) as platforms FROM platforms;" 2>&1 || true

echo ""
echo "✅ Database migration complete!"
echo "Now invalidate Redis cache by restarting ECS service:"
echo "  aws ecs update-service --cluster pricebasket-cluster --service pricebasket-api --force-new-deployment --region ap-south-1"
