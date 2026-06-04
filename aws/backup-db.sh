#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# backup-db.sh — Dump AWS RDS PostgreSQL to S3 via a one-shot ECS Fargate task
#
# Usage:
#   ./aws/backup-db.sh
#
# The dump is saved to:
#   s3://pricebasket-build-443414059511/db-backups/pricebasket-rds-<TIMESTAMP>.sql.gz
#
# To restore from a backup:
#   aws s3 cp s3://pricebasket-build-443414059511/db-backups/<FILE>.sql.gz /tmp/dump.sql.gz
#   gunzip /tmp/dump.sql.gz
#   PGPASSWORD="<RDS_PASS>" psql -h <RDS_HOST> -U pricebasket -d pricebasket_db -f /tmp/dump.sql
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BUCKET="pricebasket-build-443414059511"
REGION="ap-south-1"
CLUSTER="pricebasket-cluster"
TASK_DEF="pricebasket-db-backup:1"
SUBNET1="subnet-0eb29d7f068e4766c"
SUBNET2="subnet-0e8db26a710cd450a"
SG="sg-089a925371deeeb7c"
RDS_HOST="pricebasket-db.cf6ksq4yotjm.ap-south-1.rds.amazonaws.com"
RDS_USER="pricebasket"
RDS_DB="pricebasket_db"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DUMP_KEY="db-backups/pricebasket-rds-${TIMESTAMP}.sql.gz"

echo "▶ Starting DB backup..."
echo "  Destination: s3://${BUCKET}/${DUMP_KEY}"

# Get RDS password from Secrets Manager
RDS_PASS=$(aws secretsmanager get-secret-value \
  --secret-id pricebasket/db-password \
  --region "$REGION" \
  --query 'SecretString' --output text | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('password', list(d.values())[0]))" 2>/dev/null \
  || echo "SiXdaVvWiYYlOfpuydxwd5ynutdAub8o")

TASK_ARN=$(aws ecs run-task \
  --cluster "$CLUSTER" \
  --task-definition "$TASK_DEF" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[${SUBNET1},${SUBNET2}],securityGroups=[${SG}],assignPublicIp=DISABLED}" \
  --overrides "{
    \"containerOverrides\": [{
      \"name\": \"backup\",
      \"command\": [
        \"sh\", \"-c\",
        \"apt-get update -qq && apt-get install -y -qq awscli 2>/dev/null; PGPASSWORD=${RDS_PASS} pg_dump --no-owner --no-acl --clean --if-exists -h ${RDS_HOST} -U ${RDS_USER} -d ${RDS_DB} | gzip | aws s3 cp - s3://${BUCKET}/${DUMP_KEY} --region ${REGION} && echo DUMP_SUCCESS\"
      ]
    }]
  }" \
  --region "$REGION" \
  --query 'tasks[0].taskArn' \
  --output text)

echo "  Task: $TASK_ARN"
echo "  Waiting for completion..."

aws ecs wait tasks-stopped \
  --cluster "$CLUSTER" \
  --tasks "$TASK_ARN" \
  --region "$REGION"

EXIT_CODE=$(aws ecs describe-tasks \
  --cluster "$CLUSTER" \
  --tasks "$TASK_ARN" \
  --region "$REGION" \
  --query 'tasks[0].containers[0].exitCode' \
  --output text)

if [ "$EXIT_CODE" = "0" ]; then
  SIZE=$(aws s3 ls "s3://${BUCKET}/${DUMP_KEY}" --region "$REGION" | awk '{print $3}')
  echo ""
  echo "✅ Backup complete!"
  echo "   File: s3://${BUCKET}/${DUMP_KEY}"
  echo "   Size: ${SIZE} bytes"
  echo ""
  echo "Recent backups:"
  aws s3 ls "s3://${BUCKET}/db-backups/" --region "$REGION" | sort -r | head -5
else
  echo "❌ Backup failed with exit code: $EXIT_CODE"
  exit 1
fi
