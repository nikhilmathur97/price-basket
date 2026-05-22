#!/usr/bin/env bash
# scripts/setup_nginx.sh
# Installs Nginx and configures it to proxy:
#   http://test.pricebasket.in  →  localhost:3000  (Next.js)
# Run once: bash scripts/setup_nginx.sh
set -euo pipefail

DOMAIN="test.pricebasket.in"
NGINX_CONF="/etc/nginx/sites-available/pricebasket"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
step() { echo -e "\n${CYAN}==> $*${NC}"; }
ok()   { echo -e "  ${GREEN}[OK]${NC} $*"; }

step "Installing Nginx"
sudo apt-get update -qq
sudo apt-get install -y nginx

step "Writing Nginx config"
sudo tee "$NGINX_CONF" > /dev/null <<'EOF'
server {
    listen 80;
    server_name test.pricebasket.in;

    # Increase body size for file uploads
    client_max_body_size 10M;

    # Proxy everything to Next.js (which itself proxies /api/* to FastAPI)
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    # WebSocket support for Next.js hot reload & app WebSockets
    location /_next/webpack-hmr {
        proxy_pass         http://127.0.0.1:3000/_next/webpack-hmr;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
    }
}
EOF

step "Enabling site"
sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/pricebasket
sudo rm -f /etc/nginx/sites-enabled/default

step "Testing Nginx config"
sudo nginx -t

step "Reloading Nginx"
sudo systemctl enable nginx
sudo systemctl restart nginx

step "Opening port 80 in UFW"
sudo ufw allow 80/tcp

ok "Done! Visit: http://${DOMAIN}"
