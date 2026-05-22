#!/usr/bin/env bash
# scripts/run_create_admin.sh
# Creates (or resets) the PriceBasket admin user.
# Override credentials via env vars before running:
#   ADMIN_EMAIL=you@domain.com ADMIN_PASSWORD=YourPass1 bash scripts/run_create_admin.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
VENV="${ROOT}/backend/.venv"
ENV_FILE="${ROOT}/backend/.env"

if [ ! -f "${VENV}/bin/python" ]; then
  echo "ERROR: Virtual env not found at ${VENV}"
  echo "       Run: bash install-deps.sh  first."
  exit 1
fi

if [ ! -f "${ENV_FILE}" ]; then
  echo "ERROR: ${ENV_FILE} not found."
  echo "       Create it before running this script."
  exit 1
fi

# Pull DATABASE_URL and SECRET_KEY from .env
export DATABASE_URL=$(grep '^DATABASE_URL=' "${ENV_FILE}" | cut -d'=' -f2-)
export SECRET_KEY=$(grep '^SECRET_KEY=' "${ENV_FILE}" | cut -d'=' -f2-)

# Allow caller to override admin credentials
export ADMIN_EMAIL="${ADMIN_EMAIL:-admin@pricebasket.in}"
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin@PB2024}"
export ADMIN_NAME="${ADMIN_NAME:-Nikhil Admin}"

cd "${ROOT}"
"${VENV}/bin/python" scripts/create_admin.py
