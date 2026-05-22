#!/usr/bin/env bash
# scripts/run_seed.sh
# Runs the seed script inside the backend virtual environment.
# Usage: bash scripts/run_seed.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
VENV="${ROOT}/backend/.venv"

if [ ! -f "${VENV}/bin/python" ]; then
  echo "ERROR: Virtual env not found at ${VENV}"
  echo "       Run: bash start-dev.sh  first to set it up."
  exit 1
fi

echo ""
echo "Running seed script..."
cd "${ROOT}"
# Export only the variables the seed script needs (avoids JSON-array bash issues)
export DATABASE_URL=$(grep '^DATABASE_URL=' "${ROOT}/backend/.env" | cut -d'=' -f2-)
export SECRET_KEY=$(grep '^SECRET_KEY=' "${ROOT}/backend/.env" | cut -d'=' -f2-)
"${VENV}/bin/python" scripts/seed_data.py
