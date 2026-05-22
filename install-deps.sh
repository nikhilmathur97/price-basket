#!/usr/bin/env bash
# install-deps.sh — Install all dependencies for Price Basket on Ubuntu/Debian
# Usage: bash install-deps.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$SCRIPT_DIR/backend"
FRONTEND="$SCRIPT_DIR/frontend"
VENV="$BACKEND/.venv"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

step()  { echo -e "\n${CYAN}==> $*${NC}"; }
ok()    { echo -e "  ${GREEN}[OK]${NC} $*"; }
warn()  { echo -e "  ${YELLOW}[!!]${NC} $*"; }
err()   { echo -e "  ${RED}[X] ${NC} $*"; }
info()  { echo -e "       $*"; }

echo ""
echo -e "${CYAN}  ╔══════════════════════════════════════════╗"
echo -e "  ║   Price Basket — Dependency Installer   ║"
echo -e "  ╚══════════════════════════════════════════╝${NC}"
echo ""

# ── 1. System packages (apt) ──────────────────────────────────────────────────
step "Updating apt and installing base system packages"

# Remove deadsnakes PPA if it was previously added and is causing errors
if sudo grep -r "deadsnakes" /etc/apt/sources.list /etc/apt/sources.list.d/ &>/dev/null 2>&1; then
    warn "Removing leftover deadsnakes PPA (not supported on this Ubuntu version)..."
    sudo add-apt-repository --remove -y ppa:deadsnakes/ppa 2>/dev/null || true
    sudo rm -f /etc/apt/sources.list.d/*deadsnakes* 2>/dev/null || true
fi

sudo apt-get update -qq
sudo apt-get install -y -qq \
    curl wget gnupg ca-certificates lsb-release software-properties-common \
    build-essential libssl-dev libffi-dev python3-pip \
    libxml2-dev libxslt1-dev \
    postgresql postgresql-contrib \
    redis-server
ok "Base system packages installed"

# ── Python 3.12 ───────────────────────────────────────────────────────────────
step "Installing Python 3.12"

# Determine best available Python binary
PYTHON_BIN=""

# 1) Try python3.12 from default repos (Ubuntu 24.10+ already has it)
if sudo apt-get install -y -qq python3.12 python3.12-venv python3.12-dev 2>/dev/null; then
    PYTHON_BIN="python3.12"
    ok "Python 3.12 installed from default repos"

# 2) deadsnakes PPA — only for Ubuntu 20.04 / 22.04 / 24.04
elif [[ "$(lsb_release -cs 2>/dev/null)" =~ ^(focal|jammy|noble)$ ]]; then
    info "Adding deadsnakes PPA..."
    sudo add-apt-repository -y ppa:deadsnakes/ppa
    sudo apt-get update -qq
    sudo apt-get install -y -qq python3.12 python3.12-venv python3.12-dev
    PYTHON_BIN="python3.12"
    ok "Python 3.12 installed via deadsnakes PPA"

# 3) Fall back to whatever python3 is available (must be 3.10+)
else
    if python3 -c "import sys; assert sys.version_info >= (3,10)" 2>/dev/null; then
        sudo apt-get install -y -qq python3-venv python3-dev
        PYTHON_BIN="python3"
        PY_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
        ok "Using system Python $PY_VER"
    else
        echo -e "  ${RED}[X]${NC} Python 3.10+ is required. Please install manually: https://python.org"
        exit 1
    fi
fi

# ── 2. Node.js 20 (via NodeSource) ───────────────────────────────────────────
step "Checking Node.js 20+"

if command -v node &>/dev/null && node --version | grep -qE '^v(2[0-9]|[3-9][0-9])'; then
    ok "Node.js $(node --version) already installed"
else
    info "Installing Node.js 20 LTS via NodeSource..."
    # Download setup script first, then run — avoids sudo -E pipe issue
    curl -fsSL https://deb.nodesource.com/setup_20.x -o /tmp/nodesource_setup.sh
    sudo bash /tmp/nodesource_setup.sh
    rm -f /tmp/nodesource_setup.sh
    sudo apt-get install -y nodejs
    ok "Node.js $(node --version) installed"
fi

# ── 3. Start PostgreSQL + create DB ──────────────────────────────────────────
step "Starting PostgreSQL and creating database"

sudo systemctl enable postgresql --quiet
sudo systemctl start postgresql

# Create user + DB (ignore errors if they already exist)
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='pricebasket'" \
    | grep -q 1 \
    || sudo -u postgres psql -c "CREATE USER pricebasket WITH PASSWORD 'secret';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='pricebasket_db'" \
    | grep -q 1 \
    || sudo -u postgres psql -c "CREATE DATABASE pricebasket_db OWNER pricebasket;"

ok "PostgreSQL ready — database: pricebasket_db / user: pricebasket / password: secret"

# ── 4. Start Redis ─────────────────────────────────────────────────────────────
step "Starting Redis"
sudo systemctl enable redis-server --quiet
sudo systemctl start redis-server
ok "Redis running on localhost:6379"

# ── 5. Python virtual environment ────────────────────────────────────────────
step "Creating Python virtual environment"

if [ -d "$VENV" ]; then
    ok "Virtual environment already exists at backend/.venv"
else
    $PYTHON_BIN -m venv "$VENV"
    ok "Created virtual environment at backend/.venv"
fi

step "Installing Python packages (backend/requirements.txt)"
info "This may take 1-2 minutes..."
"$VENV/bin/pip" install --upgrade pip --quiet
"$VENV/bin/pip" install -r "$BACKEND/requirements.txt"
ok "All Python packages installed"

# ── 6. Node.js packages ───────────────────────────────────────────────────────
step "Installing Node.js packages (frontend/)"
info "This may take 1-2 minutes..."
cd "$FRONTEND"
npm install
npm audit fix --force 2>/dev/null || npm audit fix 2>/dev/null || true
ok "All Node.js packages installed"
cd "$SCRIPT_DIR"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}  ╔══════════════════════════════════════════╗"
echo -e "  ║   All dependencies installed!           ║"
echo -e "  ╚══════════════════════════════════════════╝${NC}"
echo ""
echo "  Next step:"
echo "    bash start-dev.sh"
echo ""
