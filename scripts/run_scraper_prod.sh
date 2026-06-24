#!/bin/bash
# run_scraper_prod.sh
# Self-contained wrapper: downloads the Python scraper from S3 using the
# instance IAM role and runs it with the production DATABASE_URL hardcoded.
# Uploaded to S3 and executed via SSM.

set -e

PYTHON=/opt/pricebasket/venv/bin/python3
LOG=/tmp/scrape_prod.log

echo "[$(date)] Starting Blinkit scraper on production..." | tee $LOG

# Download the Python scraper using instance IAM role (no presigned URL needed)
aws s3 cp s3://pricebasket-build-443414059511/scrape_blinkit_prod.py /tmp/scrape_blinkit_prod.py --region ap-south-1

echo "[$(date)] Scraper downloaded. Starting run..." | tee -a $LOG

# Run with hardcoded production DATABASE_URL
export DATABASE_URL="postgresql+asyncpg://pricebasket:SiXdaVvWiYYlOfpuydxwd5ynutdAub8o@pricebasket-db.cf6ksq4yotjm.ap-south-1.rds.amazonaws.com:5432/pricebasket_db"

cd /opt/pricebasket/backend
PYTHONUNBUFFERED=1 $PYTHON -u /tmp/scrape_blinkit_prod.py >> $LOG 2>&1

echo "[$(date)] Scraper finished." | tee -a $LOG
tail -30 $LOG
