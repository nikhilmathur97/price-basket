#!/bin/bash
# Full disaster-recovery backup: Postgres + Redis + deploy config + secrets,
# bundled into one encrypted file, uploaded to S3 (this account) and Google
# Drive (survives the AWS account itself being lost/suspended).
#
# Run via cron at 00:00 IST. Needs /opt/pricebasket/.backup_env and
# /opt/pricebasket/.backup_passphrase to exist first — see backup.env.example.
set -euo pipefail

REPO_DIR="/opt/pricebasket/repo"
BACKUP_ROOT="/opt/pricebasket/backups"
ENV_FILE="/opt/pricebasket/.env"
SECRETS_FILE="/opt/pricebasket/.backup_env"
PASSPHRASE_FILE="/opt/pricebasket/.backup_passphrase"
LOCAL_RETENTION_DAYS=7
GDRIVE_ROOT_FOLDER_ID="1qRW_bfiZM-o_4DLQjoipNaI-BhhxIKlJ"

source "$SECRETS_FILE"   # defines BACKUP_S3_BUCKET (+ AWS creds if not using an instance role)

TS=$(TZ="Asia/Kolkata" date +%Y-%m-%d_%H%M%S)
DATE_FOLDER=$(TZ="Asia/Kolkata" date +%Y-%m-%d)
BUNDLE="pricebasket_backup_${TS}"
WORKDIR="${BACKUP_ROOT}/tmp_${TS}"

mkdir -p "$WORKDIR" "$BACKUP_ROOT"
cd "$REPO_DIR"

echo "[$TS] ==> Dumping Postgres..."
docker compose exec -T postgres pg_dump -U pricebasket -Fc pricebasket_db > "$WORKDIR/postgres.dump"

echo "[$TS] ==> Dumping Redis (best-effort, non-critical)..."
docker compose exec -T redis redis-cli SAVE >/dev/null 2>&1 || true
docker cp "$(docker compose ps -q redis)":/data/dump.rdb "$WORKDIR/redis.rdb" 2>/dev/null || true

echo "[$TS] ==> Copying deploy config + secrets..."
cp docker-compose.yml "$WORKDIR/"
cp "$ENV_FILE" "$WORKDIR/env_backup"

cat > "$WORKDIR/RESTORE.md" <<'EOF'
# PriceBasket — restore on a fresh account/server

1. Provision a new box (Ubuntu), install Docker + Docker Compose.
2. mkdir -p /opt/pricebasket && cd /opt/pricebasket
3. git clone <your-repo-url> repo    # or unzip a code copy you keep separately —
                                      # this backup holds DATA + CONFIG, not app source
4. cp env_backup /opt/pricebasket/.env
5. cp docker-compose.yml /opt/pricebasket/repo/docker-compose.yml
6. cd /opt/pricebasket/repo
7. docker compose up -d postgres redis
8. docker compose exec -T postgres createdb -U pricebasket pricebasket_db || true
9. docker compose exec -T postgres pg_restore -U pricebasket -d pricebasket_db --clean --if-exists < postgres.dump
10. (optional) docker cp redis.rdb "$(docker compose ps -q redis)":/data/dump.rdb && docker compose restart redis
11. docker compose up -d --build api worker
12. Point DNS (and Caddy will auto-issue TLS) at the new box's IP.
EOF

echo "[$TS] ==> Zipping..."
( cd "$WORKDIR" && zip -r -q "${BACKUP_ROOT}/${BUNDLE}.zip" . )

echo "[$TS] ==> Encrypting (contains DB creds / JWT secret — never upload this plain)..."
gpg --batch --yes --passphrase-file "$PASSPHRASE_FILE" \
    --symmetric --cipher-algo AES256 \
    -o "${BACKUP_ROOT}/${BUNDLE}.zip.gpg" "${BACKUP_ROOT}/${BUNDLE}.zip"
rm -f "${BACKUP_ROOT}/${BUNDLE}.zip"
rm -rf "$WORKDIR"

echo "[$TS] ==> Uploading to S3 (s3://${BACKUP_S3_BUCKET}/${DATE_FOLDER}/)..."
aws s3 cp "${BACKUP_ROOT}/${BUNDLE}.zip.gpg" "s3://${BACKUP_S3_BUCKET}/${DATE_FOLDER}/${BUNDLE}.zip.gpg"

echo "[$TS] ==> Uploading to Google Drive..."
rclone copy "${BACKUP_ROOT}/${BUNDLE}.zip.gpg" "gdrive:${DATE_FOLDER}" \
    --drive-root-folder-id "$GDRIVE_ROOT_FOLDER_ID"

echo "[$TS] ==> Pruning local copies older than ${LOCAL_RETENTION_DAYS}d..."
find "$BACKUP_ROOT" -maxdepth 1 -name "pricebasket_backup_*.zip.gpg" -mtime "+${LOCAL_RETENTION_DAYS}" -delete

echo "[$TS] ==> Done: ${BUNDLE}.zip.gpg"
