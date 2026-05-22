#!/usr/bin/env bash
# scripts/setup_db.sh
# Creates PostgreSQL user + database for PriceBasket.
# Run once on a fresh server: bash scripts/setup_db.sh
set -euo pipefail

DB_USER="pricebasket"
DB_PASS="secret"
DB_NAME="pricebasket_db"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
step() { echo -e "\n${CYAN}==> $*${NC}"; }
ok()   { echo -e "  ${GREEN}[OK]${NC} $*"; }

step "Creating PostgreSQL user '${DB_USER}'"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" \
  | grep -q 1 && ok "User already exists" || \
  sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"

step "Creating database '${DB_NAME}'"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" \
  | grep -q 1 && ok "Database already exists" || \
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

step "Granting privileges"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
sudo -u postgres psql -d "${DB_NAME}" -c "GRANT ALL ON SCHEMA public TO ${DB_USER};"

ok "Database setup complete"
echo -e "\n  Connection URL:"
echo -e "  postgresql+asyncpg://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
