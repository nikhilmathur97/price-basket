#!/usr/bin/env bash
# stop-dev.sh — Stop all Price Basket dev processes
set -euo pipefail

GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
ok() { echo -e "  ${GREEN}[OK]${NC} $*"; }

echo -e "\n${CYAN}==> Stopping Price Basket dev servers${NC}"

for pidfile in /tmp/pricebasket_backend.pid /tmp/pricebasket_frontend.pid; do
    if [ -f "$pidfile" ]; then
        PID=$(cat "$pidfile")
        if kill "$PID" 2>/dev/null; then
            ok "Killed process $PID ($(basename $pidfile .pid))"
        fi
        rm -f "$pidfile"
    fi
done

# Kill by port as fallback
fuser -k 8000/tcp 2>/dev/null && ok "Freed port 8000" || true
fuser -k 3000/tcp 2>/dev/null && ok "Freed port 3000" || true

echo ""
ok "All stopped"
echo ""
