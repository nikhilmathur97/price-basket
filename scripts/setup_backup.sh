#!/bin/bash
# One-time setup for scripts/backup_full.sh — installs dependencies, creates
# the S3 bucket, generates the encryption passphrase, and installs the daily
# cron job. Run once as root on the EC2 box:
#
#   sudo ./scripts/setup_backup.sh <s3-bucket-name>
#
# The one thing this script cannot do: Google Drive OAuth consent. That
# needs your own Google login in a browser, once, ever — run `rclone config`
# after this script finishes (exact prompts are in the chat instructions).
set -euo pipefail

BUCKET="${1:?Usage: sudo ./scripts/setup_backup.sh <s3-bucket-name>}"
REGION="ap-south-1"

echo "==> Installing dependencies..."
apt-get update -qq
apt-get install -y -qq zip gnupg unzip >/dev/null

if ! command -v aws >/dev/null; then
  curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
  unzip -q -o /tmp/awscliv2.zip -d /tmp
  /tmp/aws/install
fi

if ! command -v rclone >/dev/null; then
  curl -s https://rclone.org/install.sh | bash
fi

echo "==> Ensuring S3 bucket exists..."
if ! aws s3api head-bucket --bucket "$BUCKET" --region "$REGION" 2>/dev/null; then
  aws s3 mb "s3://$BUCKET" --region "$REGION"
fi

echo "==> Writing secrets files..."
mkdir -p /opt/pricebasket
echo "BACKUP_S3_BUCKET=$BUCKET" > /opt/pricebasket/.backup_env
chmod 600 /opt/pricebasket/.backup_env

if [ ! -f /opt/pricebasket/.backup_passphrase ]; then
  openssl rand -base64 32 > /opt/pricebasket/.backup_passphrase
  chmod 600 /opt/pricebasket/.backup_passphrase
  echo ""
  echo "############################################################"
  echo "# SAVE THIS PASSPHRASE IN YOUR PASSWORD MANAGER NOW.        #"
  echo "# It is the ONLY way to decrypt your backups if this server #"
  echo "# is ever lost:                                             #"
  cat /opt/pricebasket/.backup_passphrase
  echo "############################################################"
fi

echo "==> Installing daily cron job (00:00 IST)..."
mkdir -p /opt/pricebasket/backups
CRON_LINE="0 0 * * * /opt/pricebasket/repo/scripts/backup_full.sh >> /opt/pricebasket/backups/backup.log 2>&1"
( crontab -l 2>/dev/null | grep -vF "backup_full.sh" ; echo "CRON_TZ=Asia/Kolkata" ; echo "$CRON_LINE" ) | crontab -

echo ""
echo "==> Done. Everything is automated except Google Drive access."
echo "    Run 'rclone config' next — one-time, interactive, needs your browser."
