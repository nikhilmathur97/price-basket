#!/usr/bin/env bash
# start-dev.sh — Start Price Basket dev environment natively on Ubuntu/Linux
#
# Usage:
#   bash start-dev.sh               # start everything
#   bash start-dev.sh --backend     # backend only
#   bash start-dev.sh --frontend    # frontend only
#   bash start-dev.sh --skip-install # skip pip/npm install (faster restarts)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$SCRIPT_DIR/backend"
FRONTEND="$SCRIPT_DIR/frontend"
VENV="$BACKEND/.venv"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

step()  { echo -e "\n${CYAN}==> $*${NC}"; }
ok()    { echo -e "  ${GREEN}[OK]${NC} $*"; }
warn()  { echo -e "  ${YELLOW}[!!]${NC} $*"; }
info()  { echo -e "       $*"; }

BACKEND_ONLY=false
FRONTEND_ONLY=false
SKIP_INSTALL=false

for arg in "$@"; do
    case $arg in
        --backend)       BACKEND_ONLY=true ;;
        --frontend)      FRONTEND_ONLY=true ;;
        --skip-install)  SKIP_INSTALL=true ;;
    esac
done

# ── 1. Check PostgreSQL ───────────────────────────────────────────────────────
if [ "$FRONTEND_ONLY" = false ]; then
    step "Checking PostgreSQL (localhost:5432)"
    if nc -z localhost 5432 2>/dev/null; then
        ok "PostgreSQL is running"
    else
        warn "PostgreSQL is not running. Starting it..."
        sudo systemctl start postgresql 2>/dev/null || warn "Could not start PostgreSQL. Run: sudo systemctl start postgresql"
    fi

    # ── 2. Check Redis ─────────────────────────────────────────────────────
    step "Checking Redis (localhost:6379)"
    if nc -z localhost 6379 2>/dev/null; then
        ok "Redis is running"
    else
        warn "Redis is not running. Starting it..."
        sudo systemctl start redis-server 2>/dev/null || warn "Could not start Redis — caching will be disabled"
    fi
fi

# ── 3. Python venv + install ──────────────────────────────────────────────────
if [ "$FRONTEND_ONLY" = false ]; then
    step "Setting up Python environment"

    # Detect Python binary: prefer python3.12, fall back to python3
    if command -v python3.12 &>/dev/null; then
        PYTHON_BIN="python3.12"
    elif command -v python3 &>/dev/null; then
        PYTHON_BIN="python3"
    else
        echo -e "  ${RED}[X]${NC} No python3 found. Run bash install-deps.sh first."
        exit 1
    fi

    VENV_IS_NEW=false
    if [ ! -d "$VENV" ]; then
        $PYTHON_BIN -m venv "$VENV"
        ok "Created virtual environment at backend/.venv (using $PYTHON_BIN)"
        VENV_IS_NEW=true
    else
        ok "Virtual environment exists"
    fi

    # Always install if venv is brand new, even with --skip-install
    if [ "$SKIP_INSTALL" = false ] || [ "$VENV_IS_NEW" = true ]; then
        info "Installing Python packages..."
        "$VENV/bin/pip" install --upgrade pip --quiet
        "$VENV/bin/pip" install -r "$BACKEND/requirements.txt" --quiet
        ok "Python packages up to date"
    fi

    # ── 4. Alembic migrations ──────────────────────────────────────────────
    step "Running database migrations"
    cd "$BACKEND"
    "$VENV/bin/alembic" upgrade head && ok "Migrations up to date" \
        || warn "Migrations failed — check DATABASE_URL in backend/.env"
    cd "$SCRIPT_DIR"
fi

# ── 5. Backend (uvicorn — NO --reload to prevent repeated 502s) ───────────────
if [ "$FRONTEND_ONLY" = false ]; then
    step "Starting FastAPI backend (uvicorn)"

    # Kill any previous uvicorn on port 8000
    fuser -k 8000/tcp 2>/dev/null || true
    sleep 1

    LOG_BACKEND="$BACKEND/uvicorn.log"
    cd "$BACKEND"
    # IMPORTANT: --host 127.0.0.1 (matches nginx upstream), NO --reload
    # --reload causes uvicorn to restart on every .py file change → nginx gets
    # connection refused → max_fails triggered → 30s of 502s per restart.
    nohup "$VENV/bin/uvicorn" app.main:app \
        --host 127.0.0.1 \
        --port 8000 \
        --workers 2 \
        --log-level info \
        > "$LOG_BACKEND" 2>&1 &
    BACKEND_PID=$!
    cd "$SCRIPT_DIR"
    echo $BACKEND_PID > /tmp/pricebasket_backend.pid

    # Wait until port 8000 is accepting connections (max 30s)
    info "Waiting for backend to be ready..."
    for i in $(seq 1 30); do
        if nc -z 127.0.0.1 8000 2>/dev/null; then
            ok "Backend ready (PID $BACKEND_PID) — logs: backend/uvicorn.log"
            break
        fi
        if [ $i -eq 30 ]; then
            warn "Backend did not start within 30s — check backend/uvicorn.log"
        fi
        sleep 1
    done
    info "Swagger: http://localhost:8000/docs"
fi

# ── 6. Frontend (npm run dev) ─────────────────────────────────────────────────
if [ "$BACKEND_ONLY" = false ]; then
    step "Setting up frontend"

    if [ ! -f "$FRONTEND/node_modules/.bin/next" ]; then
        info "Installing npm packages..."
        cd "$FRONTEND" && npm install
        cd "$SCRIPT_DIR"
        ok "npm packages installed"
    elif [ "$SKIP_INSTALL" = false ]; then
        info "Updating npm packages..."
        cd "$FRONTEND" && npm install --silent
        cd "$SCRIPT_DIR"
        ok "npm packages up to date"
    fi

    # Kill any previous Next.js on port 3000
    fuser -k 3000/tcp 2>/dev/null || true
    sleep 1

    LOG_FRONTEND="$FRONTEND/nextjs.log"
    cd "$FRONTEND"
    nohup node_modules/.bin/next dev --hostname 127.0.0.1 --port 3000 > "$LOG_FRONTEND" 2>&1 &
    FRONTEND_PID=$!
    cd "$SCRIPT_DIR"
    echo $FRONTEND_PID > /tmp/pricebasket_frontend.pid

    # Wait until port 3000 is accepting connections (max 60s — Next.js is slow on first start)
    info "Waiting for frontend to be ready (Next.js first compile can take ~30s)..."
    for i in $(seq 1 60); do
        if nc -z 127.0.0.1 3000 2>/dev/null; then
            ok "Frontend ready (PID $FRONTEND_PID) — logs: frontend/nextjs.log"
            break
        fi
        if [ $i -eq 60 ]; then
            warn "Frontend did not start within 60s — check frontend/nextjs.log"
        fi
        sleep 1
    done
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "   Price Basket dev environment started"
echo -e "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Frontend  →  http://localhost:3000"
echo "  API       →  http://localhost:8000"
echo "  Swagger   →  http://localhost:8000/docs"
echo "  Health    →  http://localhost:8000/health"
echo ""
echo "  Tail logs:"
echo "    tail -f backend/uvicorn.log"
echo "    tail -f frontend/nextjs.log"
echo ""
echo "  Stop everything:"
echo "    bash stop-dev.sh"
echo ""
