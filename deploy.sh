#!/usr/bin/env bash
# deploy.sh — Build frontend + restart all services via PM2
# Usage: bash deploy.sh
#
# Workflow:
#   1. Edit code locally, copy changed files to server (scp / git pull)
#   2. Run: bash deploy.sh
#
# First-time setup (run once on a fresh server):
#   bash install-deps.sh
#   bash deploy.sh
#   pm2 save && pm2 startup   ← run the sudo command it prints
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

step()  { echo -e "\n${CYAN}==> $*${NC}"; }
ok()    { echo -e "  ${GREEN}[OK]${NC} $*"; }
warn()  { echo -e "  ${YELLOW}[!!]${NC} $*"; }
die()   { echo -e "  ${RED}[ERR]${NC} $*"; exit 1; }

cd "$SCRIPT_DIR"

# ── 1. Python packages ────────────────────────────────────────────────────────
step "Installing Python packages"
backend/.venv/bin/pip install -r backend/requirements.txt --quiet
ok "Python packages up to date"

# ── 2. Database migrations ────────────────────────────────────────────────────
step "Running database migrations"
cd backend
.venv/bin/alembic upgrade head && ok "Migrations up to date" \
    || warn "Migrations failed — check backend/.env"
cd "$SCRIPT_DIR"

# ── 3. Frontend production build ──────────────────────────────────────────────
step "Building Next.js frontend (production)"
cd frontend

# Ensure node_modules exist
if [ ! -f "node_modules/.bin/next" ]; then
    echo "  Installing npm packages..."
    npm install --silent
fi

npm run build || die "Next.js build failed — fix TypeScript/lint errors above and re-run"
ok "Frontend built successfully"
cd "$SCRIPT_DIR"

# ── 4. Create log dirs ────────────────────────────────────────────────────────
mkdir -p frontend/logs backend/logs

# ── 5. Start/reload via PM2 ecosystem ────────────────────────────────────────
step "Starting services with PM2"

if pm2 list | grep -q "frontend\|backend"; then
    # Already running — do a zero-downtime reload
    pm2 reload ecosystem.config.js --update-env
    ok "Services reloaded (zero downtime)"
else
    # First start
    pm2 start ecosystem.config.js
    ok "Services started"
fi

# Persist process list so PM2 restores them after reboot
pm2 save --force
ok "PM2 process list saved (survives reboots)"

# ── 6. Summary ────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "   Deployed! https://test.pricebasket.in"
echo -e "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
pm2 status
echo ""
echo -e "  ${CYAN}Logs:${NC}"
echo -e "    pm2 logs frontend   ← Next.js"
echo -e "    pm2 logs backend    ← FastAPI"
echo ""
echo -e "  ${YELLOW}NOTE: If this is a fresh server, run once:${NC}"
echo -e "    pm2 startup   ← then run the sudo command it prints"
echo ""
echo ""
