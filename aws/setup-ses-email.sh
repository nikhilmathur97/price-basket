#!/bin/bash
# =============================================================================
# PriceBasket — AWS SES Setup & Forgot-Password Email Automation
# =============================================================================
# This script fully automates the AWS SES configuration needed for the
# forgot-password email flow to work.
#
# What it does:
#   1. Verifies the sender domain/email in SES (ap-south-1)
#   2. Creates a least-privilege IAM inline policy (ses:SendEmail) on the
#      ECS task role so the running container can send email without any
#      hardcoded credentials
#   3. Updates the Secrets Manager secret with AWS_SES_FROM_EMAIL
#   4. Re-registers the ECS API task definition with the new env var injected
#   5. Force-deploys the ECS API service (zero-downtime rolling update)
#   6. Optionally requests SES production access (removes sandbox limits)
#
# Usage:
#   chmod +x aws/setup-ses-email.sh
#   ./aws/setup-ses-email.sh
#
#   Override defaults:
#   SES_FROM_EMAIL=hello@yourdomain.com ./aws/setup-ses-email.sh
#   REQUEST_PRODUCTION=false ./aws/setup-ses-email.sh   # skip sandbox lift
#
# Prerequisites:
#   - AWS CLI v2 installed and configured (aws configure)
#   - jq installed (brew install jq / apt install jq)
#   - The ECS cluster from aws/setup.sh must already exist
# =============================================================================

set -euo pipefail

# ── Configuration (override via env vars) ─────────────────────────────────────
AWS_REGION="${AWS_REGION:-ap-south-1}"
APP_NAME="${APP_NAME:-pricebasket}"
SES_FROM_EMAIL="${SES_FROM_EMAIL:-founder@pricebasket.in}"
REQUEST_PRODUCTION="${REQUEST_PRODUCTION:-true}"   # set false to skip sandbox lift request

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $1"; }
success() { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
step()    { echo -e "\n${BLUE}━━━ $1 ━━━${NC}"; }

# ── Prerequisite checks ───────────────────────────────────────────────────────
command -v aws >/dev/null 2>&1 || error "AWS CLI not installed. Run: brew install awscli"
command -v jq  >/dev/null 2>&1 || error "jq not installed. Run: brew install jq"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
info "Account: ${ACCOUNT_ID}  |  Region: ${AWS_REGION}  |  Sender: ${SES_FROM_EMAIL}"

# Derive domain from the from-email for domain-level verification
SES_DOMAIN=$(echo "$SES_FROM_EMAIL" | cut -d'@' -f2)

# =============================================================================
# STEP 1: SES — Verify sender identity
# =============================================================================
step "Step 1/5: SES — Verify sender identity"

# Check if already verified
EXISTING_STATUS=$(aws sesv2 get-email-identity \
  --email-identity "$SES_FROM_EMAIL" \
  --region "$AWS_REGION" \
  --query 'VerificationStatus' --output text 2>/dev/null || echo "NOT_FOUND")

if [[ "$EXISTING_STATUS" == "SUCCESS" ]]; then
  success "SES identity '${SES_FROM_EMAIL}' is already verified ✓"
else
  info "Creating SES email identity for '${SES_FROM_EMAIL}'..."
  aws sesv2 create-email-identity \
    --email-identity "$SES_FROM_EMAIL" \
    --region "$AWS_REGION" \
    --tags "Key=Project,Value=${APP_NAME}" >/dev/null 2>&1 || true

  # Also try domain-level verification (preferred — covers all addresses)
  DOMAIN_STATUS=$(aws sesv2 get-email-identity \
    --email-identity "$SES_DOMAIN" \
    --region "$AWS_REGION" \
    --query 'VerificationStatus' --output text 2>/dev/null || echo "NOT_FOUND")

  if [[ "$DOMAIN_STATUS" != "SUCCESS" ]]; then
    info "Creating SES domain identity for '${SES_DOMAIN}'..."
    DKIM_TOKENS=$(aws sesv2 create-email-identity \
      --email-identity "$SES_DOMAIN" \
      --region "$AWS_REGION" \
      --tags "Key=Project,Value=${APP_NAME}" \
      --query 'DkimAttributes.Tokens' --output json 2>/dev/null || echo "[]")

    echo ""
    warn "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    warn "ACTION REQUIRED: Add these DNS records to verify '${SES_DOMAIN}'"
    warn "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  Add the following CNAME records to your DNS (GoDaddy / Cloudflare / Route53):"
    echo ""

    # Print DKIM CNAME records
    if [[ "$DKIM_TOKENS" != "[]" && "$DKIM_TOKENS" != "null" ]]; then
      echo "$DKIM_TOKENS" | jq -r '.[]' | while read -r token; do
        echo "  Type:  CNAME"
        echo "  Name:  ${token}._domainkey.${SES_DOMAIN}"
        echo "  Value: ${token}.dkim.amazonses.com"
        echo ""
      done
    fi

    # Also print SPF + DMARC recommendations
    echo "  Type:  TXT"
    echo "  Name:  ${SES_DOMAIN}"
    echo "  Value: \"v=spf1 include:amazonses.com ~all\""
    echo ""
    echo "  Type:  TXT"
    echo "  Name:  _dmarc.${SES_DOMAIN}"
    echo "  Value: \"v=DMARC1; p=none; rua=mailto:dmarc@${SES_DOMAIN}\""
    echo ""
    warn "After adding DNS records, verification takes 5–72 hours."
    warn "The forgot-password flow will work as soon as verification completes."
    warn "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
  else
    success "Domain '${SES_DOMAIN}' already verified ✓"
  fi

  # For email-address identity: SES sends a verification email — inform user
  if [[ "$EXISTING_STATUS" == "NOT_FOUND" ]]; then
    warn "A verification email was sent to '${SES_FROM_EMAIL}'."
    warn "Click the link in that email to complete verification."
    warn "(Or use domain verification above — no per-address emails needed.)"
  fi
fi

# =============================================================================
# STEP 2: IAM — Grant ses:SendEmail to the ECS task role
# =============================================================================
step "Step 2/5: IAM — Grant ses:SendEmail to ECS task role"

TASK_ROLE_NAME="${APP_NAME}-ecs-exec-role"

# Check role exists
aws iam get-role --role-name "$TASK_ROLE_NAME" >/dev/null 2>&1 || \
  error "IAM role '${TASK_ROLE_NAME}' not found. Run aws/setup.sh first."

SES_POLICY_NAME="${APP_NAME}-ses-send-email"

SES_POLICY_DOC=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSESSendEmail",
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ses:FromAddress": "${SES_FROM_EMAIL}"
        }
      }
    }
  ]
}
EOF
)

# Put (create or replace) the inline policy
aws iam put-role-policy \
  --role-name "$TASK_ROLE_NAME" \
  --policy-name "$SES_POLICY_NAME" \
  --policy-document "$SES_POLICY_DOC"

success "IAM inline policy '${SES_POLICY_NAME}' attached to '${TASK_ROLE_NAME}'"

# Also add SES permissions to the iam-policy.json for future reference
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IAM_POLICY_FILE="${SCRIPT_DIR}/iam-policy.json"

if ! grep -q '"ses:SendEmail"' "$IAM_POLICY_FILE" 2>/dev/null; then
  info "Updating aws/iam-policy.json with SES permissions..."
  # Use jq to append the SES statement
  jq '.Statement += [{
    "Sid": "SES",
    "Effect": "Allow",
    "Action": ["ses:SendEmail", "ses:SendRawEmail", "ses:GetEmailIdentity",
               "ses:CreateEmailIdentity", "ses:ListEmailIdentities",
               "ses:GetAccount"],
    "Resource": "*"
  }]' "$IAM_POLICY_FILE" > /tmp/iam-policy-updated.json && \
  mv /tmp/iam-policy-updated.json "$IAM_POLICY_FILE"
  success "aws/iam-policy.json updated with SES statement"
fi

# =============================================================================
# STEP 3: Secrets Manager — Add AWS_SES_FROM_EMAIL to the secret
# =============================================================================
step "Step 3/5: Secrets Manager — Inject AWS_SES_FROM_EMAIL"

SECRET_ID="${APP_NAME}/production/env"

# Check secret exists
SECRET_ARN=$(aws secretsmanager describe-secret \
  --secret-id "$SECRET_ID" \
  --region "$AWS_REGION" \
  --query 'ARN' --output text 2>/dev/null || echo "")

if [[ -z "$SECRET_ARN" ]]; then
  warn "Secret '${SECRET_ID}' not found — creating it now with SES config only."
  warn "You will need to add DATABASE_URL, SECRET_KEY etc. manually."
  aws secretsmanager create-secret \
    --name "$SECRET_ID" \
    --description "PriceBasket production environment variables" \
    --secret-string "{\"AWS_SES_FROM_EMAIL\": \"${SES_FROM_EMAIL}\"}" \
    --region "$AWS_REGION" >/dev/null
  SECRET_ARN=$(aws secretsmanager describe-secret \
    --secret-id "$SECRET_ID" \
    --region "$AWS_REGION" \
    --query 'ARN' --output text)
  success "Secret created: ${SECRET_ARN}"
else
  # Merge AWS_SES_FROM_EMAIL into the existing secret JSON
  CURRENT_SECRET=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRET_ID" \
    --region "$AWS_REGION" \
    --query 'SecretString' --output text)

  UPDATED_SECRET=$(echo "$CURRENT_SECRET" | \
    jq --arg v "$SES_FROM_EMAIL" '. + {"AWS_SES_FROM_EMAIL": $v}')

  aws secretsmanager update-secret \
    --secret-id "$SECRET_ID" \
    --secret-string "$UPDATED_SECRET" \
    --region "$AWS_REGION" >/dev/null

  success "Secret '${SECRET_ID}' updated with AWS_SES_FROM_EMAIL=${SES_FROM_EMAIL}"
fi

# =============================================================================
# STEP 4: ECS — Re-register task definition with AWS_SES_FROM_EMAIL injected
# =============================================================================
step "Step 4/5: ECS — Update task definition & force deploy"

CLUSTER_NAME="${APP_NAME}-cluster"
SERVICE_NAME="${APP_NAME}-api"
TASK_FAMILY="${APP_NAME}-api"

# Check cluster exists
aws ecs describe-clusters \
  --clusters "$CLUSTER_NAME" \
  --region "$AWS_REGION" \
  --query 'clusters[0].clusterName' --output text >/dev/null 2>&1 || \
  error "ECS cluster '${CLUSTER_NAME}' not found. Run aws/setup.sh first."

# Get the current (latest) task definition
CURRENT_TASK_DEF=$(aws ecs describe-task-definition \
  --task-definition "$TASK_FAMILY" \
  --region "$AWS_REGION" \
  --query 'taskDefinition' 2>/dev/null || echo "")

if [[ -z "$CURRENT_TASK_DEF" ]]; then
  warn "No existing task definition found for '${TASK_FAMILY}'."
  warn "Skipping ECS update — run aws/setup.sh first, then re-run this script."
else
  # Build new task def: add AWS_SES_FROM_EMAIL to the environment array
  # and add the secret from Secrets Manager (so it's also available via secret injection)
  NEW_TASK_DEF=$(echo "$CURRENT_TASK_DEF" | jq \
    --arg ses_from "$SES_FROM_EMAIL" \
    --arg secret_arn "$SECRET_ARN" \
    '
    # Remove fields that cannot be re-submitted
    del(.taskDefinitionArn, .revision, .status, .requiresAttributes,
        .compatibilities, .registeredAt, .registeredBy) |

    # Inject AWS_SES_FROM_EMAIL into the first container environment
    .containerDefinitions[0].environment = (
      (.containerDefinitions[0].environment // []) |
      map(select(.name != "AWS_SES_FROM_EMAIL")) +
      [{"name": "AWS_SES_FROM_EMAIL", "value": $ses_from}]
    ) |

    # Also inject via secrets (Secrets Manager) so it can be rotated without redeploy
    .containerDefinitions[0].secrets = (
      (.containerDefinitions[0].secrets // []) |
      map(select(.name != "AWS_SES_FROM_EMAIL")) +
      [{"name": "AWS_SES_FROM_EMAIL", "valueFrom": ($secret_arn + ":AWS_SES_FROM_EMAIL::")}]
    )
    ')

  # Register the new revision
  NEW_TASK_ARN=$(echo "$NEW_TASK_DEF" | \
    aws ecs register-task-definition \
      --cli-input-json /dev/stdin \
      --region "$AWS_REGION" \
      --query 'taskDefinition.taskDefinitionArn' --output text)

  success "New task definition registered: ${NEW_TASK_ARN}"

  # Force a rolling deploy of the API service
  aws ecs update-service \
    --cluster "$CLUSTER_NAME" \
    --service "$SERVICE_NAME" \
    --task-definition "$NEW_TASK_ARN" \
    --force-new-deployment \
    --region "$AWS_REGION" >/dev/null

  success "ECS service '${SERVICE_NAME}' force-deployed with new task definition"

  info "Waiting for service to stabilise (this takes ~2 min)..."
  aws ecs wait services-stable \
    --cluster "$CLUSTER_NAME" \
    --services "$SERVICE_NAME" \
    --region "$AWS_REGION" && \
    success "ECS service is stable ✓" || \
    warn "Service did not stabilise within timeout — check ECS console for details"
fi

# =============================================================================
# STEP 5: (Optional) Request SES production access (remove sandbox)
# =============================================================================
step "Step 5/5: SES sandbox — Request production access"

if [[ "$REQUEST_PRODUCTION" == "true" ]]; then
  # Check current account-level sending status
  SANDBOX_STATUS=$(aws sesv2 get-account \
    --region "$AWS_REGION" \
    --query 'ProductionAccessEnabled' --output text 2>/dev/null || echo "false")

  if [[ "$SANDBOX_STATUS" == "True" || "$SANDBOX_STATUS" == "true" ]]; then
    success "SES account is already in production mode (sandbox lifted) ✓"
  else
    info "Submitting SES production access request..."
    aws sesv2 put-account-details \
      --mail-type TRANSACTIONAL \
      --website-url "https://pricebasket.in" \
      --use-case-description "PriceBasket sends transactional password-reset emails to registered users who explicitly request them via the forgot-password flow. Volume is low (<1000/day). We maintain a hard bounce/complaint suppression list." \
      --additional-contact-email-addresses "tech@pricebasket.in" \
      --production-access-enabled \
      --region "$AWS_REGION" 2>/dev/null && \
      success "SES production access request submitted (AWS reviews in 24–48 h)" || \
      warn "Could not auto-submit production request — do it manually:"
    echo ""
    echo "  AWS Console → SES → Account dashboard → Request production access"
    echo "  Or: https://console.aws.amazon.com/ses/home?region=${AWS_REGION}#/account"
    echo ""
  fi
else
  warn "Skipping production access request (REQUEST_PRODUCTION=false)"
  warn "While in sandbox, emails can only be sent to verified addresses."
fi

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅  SES Setup Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "  Sender identity : ${YELLOW}${SES_FROM_EMAIL}${NC}"
echo -e "  AWS Region      : ${YELLOW}${AWS_REGION}${NC}"
echo -e "  IAM role        : ${YELLOW}${TASK_ROLE_NAME}${NC}"
echo -e "  Secret          : ${YELLOW}${SECRET_ID}${NC}"
echo ""
echo -e "${YELLOW}📋 Checklist before forgot-password emails will work:${NC}"
echo ""
echo "  ☐  DNS records added for domain verification (Step 1 output above)"
echo "  ☐  SES identity status = SUCCESS"
echo "     aws sesv2 get-email-identity --email-identity ${SES_FROM_EMAIL} \\"
echo "       --region ${AWS_REGION} --query VerificationStatus"
echo ""
echo "  ☐  SES out of sandbox (or test with a verified recipient address)"
echo "     aws sesv2 get-account --region ${AWS_REGION} --query ProductionAccessEnabled"
echo ""
echo "  ☐  ECS service running new task revision"
echo "     aws ecs describe-services --cluster ${CLUSTER_NAME} \\"
echo "       --services ${SERVICE_NAME} --region ${AWS_REGION} \\"
echo "       --query 'services[0].{running:runningCount,desired:desiredCount,status:status}'"
echo ""
echo "  ☐  Test the full flow:"
echo "     curl -X POST https://api.pricebasket.in/api/v1/auth/forgot-password \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"email\": \"your-verified-test@email.com\"}'"
echo "     # → HTTP 204 (success, no body)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
