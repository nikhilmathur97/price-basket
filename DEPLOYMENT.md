# Price Basket — Deployment Guide

> Complete guide covering hosting setup, GitHub integration, CI/CD pipeline, and production deployment.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Firebase Setup (Attempted)](#firebase-setup-attempted)
4. [Vercel Hosting Setup (Frontend)](#vercel-hosting-setup-frontend)
5. [GitHub Repository Connection](#github-repository-connection)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [GitHub Secrets Configuration](#github-secrets-configuration)
8. [Custom Domain Setup](#custom-domain-setup)
9. [Backend Server Setup](#backend-server-setup)
10. [How Deployments Work](#how-deployments-work)
11. [Environment Variables](#environment-variables)

---

## Architecture Overview

```
GitHub (nikhilmathur97/price-basket)
        │
        │  git push
        ▼
GitHub Actions (.github/workflows/deploy.yml)
        │
        ├──► Vercel (Frontend — Next.js 14)
        │         └── https://test2.pricebasket.in
        │
        └──► VPS Server via SSH (Backend — FastAPI)
                  ├── FastAPI on port 8000 (PM2)
                  ├── Celery Worker (PM2)
                  └── Nginx reverse proxy → https://api.test2.pricebasket.in
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router, SSR) |
| Backend | Python FastAPI + Uvicorn |
| Background Jobs | Celery + Redis |
| Database | PostgreSQL |
| Cache | Redis |
| Frontend Hosting | Vercel |
| Backend Hosting | VPS (PM2 + Nginx) |
| CI/CD | GitHub Actions |
| Domain | test2.pricebasket.in (Cloudflare DNS) |

---

## Firebase Setup (Attempted)

Firebase was the initial target but was not used due to the following constraints:

### Why Firebase Was Dropped

| Requirement | Firebase Support | Resolution |
|---|---|---|
| Next.js SSR (App Hosting) | Requires Blaze (paid) plan | Switched to Vercel (free) |
| PostgreSQL | Not supported | Cloud SQL / external DB |
| Redis | Not supported | Upstash Redis |
| FastAPI Python backend | Not supported natively | VPS + SSH deploy |

### Firebase CLI Commands Run

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Enable web frameworks experiment (needed for Next.js App Router)
firebase experiments:enable webframeworks

# Attempted App Hosting init — blocked by Blaze requirement
firebase init hosting
# → Selected: App Hosting (SSR support)
# → Error: Firebase App Hosting requires billing to be enabled
```

### Firebase Files Created

- `firebase.json` — Hosting configuration
- `.firebaserc` — Project alias (`price-basket-prod`)

---

## Vercel Hosting Setup (Frontend)

Vercel was chosen as the frontend host — purpose-built for Next.js, free tier, zero config.

### Steps Performed

#### 1. Install Vercel CLI
```bash
npm install -g vercel
```

#### 2. Login to Vercel
```bash
vercel login
# → Selected: Continue with GitHub
# → Authorized in browser
```

#### 3. Create & Deploy Project
```bash
cd frontend
vercel --yes
# Vercel auto-detected Next.js
# Created project: nikhilmathur428-3892s-projects/frontend
# First deploy URL: https://frontend-nu-black-69.vercel.app
```

#### 4. Add Environment Variables
```bash
vercel env add NEXT_PUBLIC_API_URL production
# Value: https://api.test2.pricebasket.in

vercel env add NEXT_PUBLIC_WS_URL production
# Value: wss://api.test2.pricebasket.in
```

#### 5. Add Custom Domain
```bash
vercel domains add test2.pricebasket.in
# Vercel returned required DNS record:
# A  test2  76.76.21.21
```

### Vercel Project Details

| Field | Value |
|---|---|
| Project Name | frontend |
| Org ID | `team_KHLA60LqPLQzMO93fpdeNGmb` |
| Project ID | `prj_uOOCdYAaTxLylSpOLA0mQTrPAQig` |
| Production URL | https://test2.pricebasket.in |
| Vercel Dashboard | https://vercel.com/nikhilmathur428-3892s-projects/frontend |

---

## GitHub Repository Connection

### Repository
`https://github.com/nikhilmathur97/price-basket`

### Branch Strategy
| Branch | Purpose |
|---|---|
| `feature/price-basket` | Main working branch — deploys to production |
| `main` | Production branch — also triggers deploy on push |

### Steps Performed

#### 1. Verify Remote
```bash
git remote -v
# origin  https://github.com/nikhilmathur97/price-basket.git
```

#### 2. Install & Login GitHub CLI
```bash
brew install gh
gh auth login --web
# → Selected: GitHub.com → HTTPS → Login with web browser
# → Entered one-time code at https://github.com/login/device
```

#### 3. Add GitHub Secrets via CLI
```bash
echo "$VERCEL_TOKEN"      | gh secret set VERCEL_TOKEN      --repo nikhilmathur97/price-basket
echo "$VERCEL_ORG_ID"     | gh secret set VERCEL_ORG_ID     --repo nikhilmathur97/price-basket
echo "$VERCEL_PROJECT_ID" | gh secret set VERCEL_PROJECT_ID --repo nikhilmathur97/price-basket
echo "https://api.test2.pricebasket.in" | gh secret set API_URL --repo nikhilmathur97/price-basket
echo "wss://api.test2.pricebasket.in"   | gh secret set WS_URL  --repo nikhilmathur97/price-basket
```

---

## CI/CD Pipeline

Pipeline file: `.github/workflows/deploy.yml`

### Branch Strategy

```
developer
    │
    ├── writes code on feature/price-basket
    │         │
    │         └── git push origin feature/price-basket
    │                   (no auto-deploy — staging/review only)
    │
    └── opens Pull Request → feature/price-basket → main
                  │
                  └── merge to main
                            │
                            └── GitHub Actions auto-fires
                                      │
                                      └── deploys to PRODUCTION
```

**Production always deploys from `main` only.**

### Trigger Methods

| Method | How | When to use |
|---|---|---|
| **Automatic** | Push or merge to `main` | Normal release flow |
| **Manual (Console)** | GitHub Actions tab → Run workflow | Hotfix, re-deploy, selective deploy |

### Manual Deploy from GitHub Console

1. Go to `github.com/nikhilmathur97/price-basket/actions`
2. Click **"Deploy Price Basket"** in the left sidebar
3. Click **"Run workflow"** (top right)
4. Choose options:
   - **Branch to deploy from** — `main` or `feature/price-basket`
   - **Target environment** — `production` or `preview`
   - **Skip backend deployment?** — `true` to deploy frontend only
5. Click **"Run workflow"**

### Pipeline Flow

```
Trigger (push to main OR manual)
               │
               ├─ Job 1: Deploy Frontend → Vercel
               │    ├── Checkout selected branch
               │    ├── Setup Node.js 20
               │    ├── Install Vercel CLI
               │    ├── vercel pull (fetch env from Vercel)
               │    ├── vercel build --prod / --preview
               │    └── vercel deploy --prebuilt --prod / preview
               │
               └─ Job 2: Deploy Backend → Server (after Job 1)
                    ├── Skip if "Skip backend" = true
                    ├── SSH into VPS
                    ├── git pull selected branch
                    ├── pip install -r requirements.txt
                    ├── alembic upgrade head (DB migrations)
                    ├── pm2 restart pricebasket-api
                    └── pm2 restart pricebasket-worker
```

### Full Pipeline File

```yaml
name: Deploy Price Basket

on:
  push:
    branches:
      - feature/price-basket
      - main

jobs:
  deploy-frontend:
    name: Deploy Frontend → Vercel
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json
      - name: Install Vercel CLI
        run: npm install -g vercel@latest
      - name: Pull Vercel environment
        working-directory: frontend
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
      - name: Build
        working-directory: frontend
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
      - name: Deploy to Vercel
        working-directory: frontend
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-backend:
    name: Deploy Backend → Server (SSH)
    runs-on: ubuntu-latest
    needs: deploy-frontend
    steps:
      - uses: actions/checkout@v4
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          port: 22
          script: |
            cd /opt/price-basket
            git pull origin feature/price-basket
            source backend/.venv/bin/activate
            pip install -q -r backend/requirements.txt
            cd backend && alembic upgrade head && cd ..
            pm2 restart pricebasket-api || pm2 start \
              "uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2" \
              --name pricebasket-api \
              --cwd /opt/price-basket/backend \
              --interpreter /opt/price-basket/backend/.venv/bin/python
            pm2 restart pricebasket-worker || pm2 start \
              "celery -A app.workers.celery_app worker --loglevel=info --concurrency=2" \
              --name pricebasket-worker \
              --cwd /opt/price-basket/backend \
              --interpreter /opt/price-basket/backend/.venv/bin/python
            pm2 save
```

---

## GitHub Secrets Configuration

Go to: `github.com/nikhilmathur97/price-basket → Settings → Secrets → Actions`

### Secrets Currently Set

| Secret | Purpose | Set By |
|---|---|---|
| `VERCEL_TOKEN` | Authenticates GitHub Actions with Vercel | Automated via gh CLI |
| `VERCEL_ORG_ID` | Identifies Vercel organisation | Automated via gh CLI |
| `VERCEL_PROJECT_ID` | Identifies Vercel project | Automated via gh CLI |
| `API_URL` | Backend URL injected into Next.js build | Automated via gh CLI |
| `WS_URL` | WebSocket URL injected into Next.js build | Automated via gh CLI |
| `SERVER_HOST` | VPS IP for SSH backend deploy | **Add manually** |
| `SERVER_USER` | SSH username (e.g. `ubuntu`) | **Add manually** |
| `SERVER_SSH_KEY` | Private SSH key contents | **Add manually** |

### Add Remaining Secrets (Backend SSH)

```bash
# Add your server IP
echo "YOUR_VPS_IP" | gh secret set SERVER_HOST --repo nikhilmathur97/price-basket

# Add SSH username
echo "ubuntu" | gh secret set SERVER_USER --repo nikhilmathur97/price-basket

# Add private SSH key
cat ~/.ssh/id_rsa | gh secret set SERVER_SSH_KEY --repo nikhilmathur97/price-basket
```

---

## Custom Domain Setup

Domain: `test2.pricebasket.in`
DNS Provider: Cloudflare

### DNS Records Added

| Type | Name | Value | Purpose |
|---|---|---|---|
| `A` | `test2` | `76.76.21.21` | Points to Vercel (frontend) |
| `A` | `api` | `YOUR_VPS_IP` | Points to VPS (backend API) |

### Vercel Domain Command
```bash
vercel domains add test2.pricebasket.in
# Success! Domain test2.pricebasket.in added to project frontend
```

### SSL
Vercel auto-provisions a free SSL certificate via Let's Encrypt once DNS propagates (~2–5 min).

---

## Backend Server Setup

Run these commands **once** on your VPS to set up the backend:

```bash
# 1. Clone the repo
git clone https://github.com/nikhilmathur97/price-basket.git /opt/price-basket
cd /opt/price-basket/backend

# 2. Create Python virtual environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 3. Set up production environment
cp .env.production.example .env
nano .env   # fill in DATABASE_URL, SECRET_KEY, REDIS_URL etc.

# 4. Run database migrations
alembic upgrade head

# 5. Install PM2 (process manager)
npm install -g pm2

# 6. Start API server
pm2 start "uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2" \
  --name pricebasket-api \
  --cwd /opt/price-basket/backend \
  --interpreter /opt/price-basket/backend/.venv/bin/python

# 7. Start Celery worker
pm2 start "celery -A app.workers.celery_app worker --loglevel=info --concurrency=2" \
  --name pricebasket-worker \
  --cwd /opt/price-basket/backend \
  --interpreter /opt/price-basket/backend/.venv/bin/python

# 8. Save PM2 process list and enable startup
pm2 save
pm2 startup   # run the command it prints

# 9. Install and configure Nginx
sudo apt install nginx certbot python3-certbot-nginx -y
sudo nano /etc/nginx/sites-available/pricebasket-api
```

Nginx config for `api.test2.pricebasket.in`:

```nginx
server {
    listen 80;
    server_name api.test2.pricebasket.in;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/pricebasket-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Enable HTTPS
sudo certbot --nginx -d api.test2.pricebasket.in
```

---

## How Deployments Work

### Automatic (every git push)

```bash
git add .
git commit -m "your change"
git push origin feature/price-basket
# ↓ GitHub Actions fires automatically
# ↓ Frontend builds and deploys to test2.pricebasket.in (~2 min)
# ↓ Backend pulls code and restarts on your server (~30 sec)
```

### Monitor Deployments

```bash
# View latest runs
gh run list --repo nikhilmathur97/price-basket

# Watch a specific run live
gh run watch RUN_ID --repo nikhilmathur97/price-basket

# View logs of a failed run
gh run view RUN_ID --repo nikhilmathur97/price-basket --log-failed
```

### Vercel Dashboard
`https://vercel.com/nikhilmathur428-3892s-projects/frontend`

---

## Environment Variables

### Frontend (`frontend/.env.production`)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.test2.pricebasket.in` |
| `NEXT_PUBLIC_WS_URL` | `wss://api.test2.pricebasket.in` |

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `APP_ENV` | `production` |
| `SECRET_KEY` | Strong random string (64+ chars) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection URL |
| `CELERY_BROKER_URL` | Redis URL for Celery broker |
| `CELERY_RESULT_BACKEND` | Redis URL for Celery results |
| `ALLOWED_ORIGINS` | `https://test2.pricebasket.in` |
| `SENTRY_DSN` | Optional — error tracking |
| `APIFY_API_TOKEN` | Optional — price scraping |

See `backend/.env.production.example` for the full template.

---

## Live URLs

| Service | URL |
|---|---|
| Frontend | https://test2.pricebasket.in |
| Backend API | https://api.test2.pricebasket.in |
| API Docs (dev only) | https://api.test2.pricebasket.in/docs |
| WebSocket | wss://api.test2.pricebasket.in/ws |
| Vercel Dashboard | https://vercel.com/nikhilmathur428-3892s-projects/frontend |
| GitHub Actions | https://github.com/nikhilmathur97/price-basket/actions |
