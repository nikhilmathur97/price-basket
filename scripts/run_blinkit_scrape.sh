#!/usr/bin/env bash
# scripts/run_blinkit_scrape.sh
# Runs the Blinkit bulk scraper against your DB (local or remote).
# Usage:
#   bash scripts/run_blinkit_scrape.sh
#   DATABASE_URL=postgresql+asyncpg://... bash scripts/run_blinkit_scrape.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
VENV="${ROOT}/backend/.venv"

if [ ! -f "${VENV}/bin/python" ] && [ ! -f "${VENV}/bin/python3" ]; then
  echo "ERROR: Virtual env not found at ${VENV}"
  echo "       Run: cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"
  exit 1
fi

PYTHON="${VENV}/bin/python3"
[ -f "${VENV}/bin/python3" ] || PYTHON="${VENV}/bin/python"

echo ""
echo "🟡  Blinkit Bulk Scraper"
echo "========================"

# Load .env if DATABASE_URL not already set
if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f "${ROOT}/backend/.env" ]; then
    export DATABASE_URL=$(grep '^DATABASE_URL=' "${ROOT}/backend/.env" | cut -d'=' -f2-)
    export SECRET_KEY=$(grep '^SECRET_KEY=' "${ROOT}/backend/.env" | cut -d'=' -f2- || echo "dummy")
    # Optional Blinkit location override
    BLINKIT_LAT_VAL=$(grep '^BLINKIT_LAT=' "${ROOT}/backend/.env" 2>/dev/null | cut -d'=' -f2- || echo "")
    BLINKIT_LON_VAL=$(grep '^BLINKIT_LON=' "${ROOT}/backend/.env" 2>/dev/null | cut -d'=' -f2- || echo "")
    [ -n "${BLINKIT_LAT_VAL}" ] && export BLINKIT_LAT="${BLINKIT_LAT_VAL}"
    [ -n "${BLINKIT_LON_VAL}" ] && export BLINKIT_LON="${BLINKIT_LON_VAL}"
  else
    echo "ERROR: No DATABASE_URL env var and no backend/.env found."
    exit 1
  fi
fi

echo "   DATABASE : ${DATABASE_URL:0:40}..."
echo "   LAT/LON  : ${BLINKIT_LAT:-28.4511202} / ${BLINKIT_LON:-77.0965147}"
echo ""

cd "${ROOT}"
"${PYTHON}" scripts/scrape_blinkit_bulk.py
