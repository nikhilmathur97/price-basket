# 🛒 Price Basket

> **Real-time price intelligence for quick commerce** — compare Blinkit, Zepto, BigBasket & Swiggy Instamart in one unified cart.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docs.docker.com/compose/)

---

## ✨ Core Features

| Feature | Description |
|---|---|
| **Real-time Price Comparison** | Fetch & cache prices across all 4 platforms every 3–5 min via scraping + Redis |
| **Smart Cart Optimizer** | 4 strategies: Cheapest Single, Fastest, Cheapest Split, Best Value Split |
| **WebSocket Price Push** | Prices update live in the browser without page refresh |
| **Price Drop Alerts** | Users set target price → email/push notification when triggered |
| **AI Highlights** | Cheapest 🟢 / Fastest ⚡ / Best Value ⭐ badges computed via weighted scoring |
| **Voice Search** | Browser SpeechRecognition API — "Find cheapest milk" |
| **Price History Charts** | 30-day Recharts line chart per product per platform |
| **Guest Cart** | Works without login via session ID cookie |
| **Admin Dashboard** | Platform CRUD, product management, real-time stats |

---

## 🏗️ Architecture

Enterprise target-state architecture, HLD/LLD, data model, scraping strategy, security, deployment, and rollout plan are documented in [docs/enterprise-architecture.md](docs/enterprise-architecture.md).

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser / Mobile                      │
│     Next.js 14 (App Router) + Zustand + React Query         │
│     WebSocket ──────────────────────────────────────────┐   │
└──────────────────────────┬──────────────────────────────┼───┘
                           │ HTTPS                        │ WSS
                    ┌──────▼──────┐                       │
                    │   Nginx     │  reverse proxy        │
                    │  (TLS/443)  │  rate limiting        │
                    └──┬──────┬───┘                       │
              REST API │      │ WebSocket                 │
                    ┌──▼──────▼───────────────────────────┘
                    │         FastAPI (uvicorn × 4)       │
                    │  Auth · Products · Cart · Prices    │
                    │  Admin · WebSocket (pub/sub)        │
                    └──┬──────┬──────────────┬────────────┘
             SQLAlchemy │  Redis│              │ Celery Tasks
                    ┌──▼──┐ ┌─▼────┐  ┌──────▼──────────┐
                    │ RDS │ │Redis │  │  Celery Workers  │
                    │ PG  │ │Cache │  │  price_refresh   │
                    │ 16  │ │+PubSub  │  send_alerts     │
                    └─────┘ └──────┘  └──────┬───────────┘
                                             │ scrape
                    ┌────────────────────────▼────────────┐
                    │  Scraper Registry (async httpx)     │
                    │  Blinkit · Zepto · BigBasket · IM   │
                    │  retry + proxy rotation + UA rotate │
                    └─────────────────────────────────────┘
```

---

## 📁 Project Structure

```
price-basket/
├── backend/                    # FastAPI Python service
│   ├── app/
│   │   ├── main.py             # App factory, middleware, routers
│   │   ├── config.py           # Pydantic settings
│   │   ├── database.py         # Async SQLAlchemy engine
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── api/v1/             # Route handlers
│   │   │   ├── auth.py         # JWT register/login/refresh/logout
│   │   │   ├── products.py     # Search, categories, featured
│   │   │   ├── cart.py         # Cart CRUD + optimization endpoint
│   │   │   ├── prices.py       # Real-time prices, history, alerts
│   │   │   ├── users.py        # User profile
│   │   │   ├── admin.py        # Platform/product management
│   │   │   └── websocket.py    # WS price push + Redis pub/sub
│   │   ├── services/
│   │   │   ├── auth_service.py     # JWT, bcrypt, token rotation
│   │   │   ├── price_engine.py     # Fan-out scrape + Redis cache
│   │   │   ├── cart_optimizer.py   # 4-strategy optimization
│   │   │   └── notification_service.py
│   │   ├── scrapers/           # Per-platform async scrapers
│   │   ├── cache/              # Redis client helpers
│   │   ├── workers/            # Celery tasks + beat schedule
│   │   └── middleware/         # JWT auth + sliding-window rate limiter
│   ├── migrations/             # Alembic async migrations
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                   # Next.js 14 App Router
│   ├── src/
│   │   ├── app/                # Pages (layout, home, search, cart, product, auth)
│   │   ├── components/         # Header, SearchBar, ProductCard, PriceComparison,
│   │   │                       # CartDrawer, CartOptimizer, CategoryGrid, Hero, etc.
│   │   ├── hooks/              # useSearch, useWebSocket, useCart
│   │   ├── store/              # Zustand — authStore, cartStore
│   │   ├── services/api.ts     # Axios client with JWT + refresh interceptors
│   │   ├── types/              # Shared TypeScript interfaces
│   │   └── lib/utils.ts
│   ├── tailwind.config.ts      # Blinkit-inspired green theme
│   └── Dockerfile
│
├── infrastructure/
│   ├── nginx/nginx.conf        # TLS, rate limiting, proxy rules, security headers
│   └── aws/terraform/          # VPC, RDS, ElastiCache, ECS, ALB, ECR, S3
│
├── monitoring/
│   ├── prometheus/prometheus.yml
│   └── grafana/
│
├── docker-compose.yml          # Full local stack (API, frontend, PG, Redis, Nginx,
│                               # Celery worker+beat, Flower, Prometheus, Grafana)
└── README.md
```

---

## �️ Database Setup & Admin User

> **Run these steps once on a fresh server before starting the app.**  
> If signup returns a 500 error, it almost always means migrations have not been run.

### Step 1 — Create the PostgreSQL database

```bash
# Creates user 'pricebasket' + database 'pricebasket_db'
bash scripts/setup_db.sh
```

### Step 2 — Create the backend `.env` file

```bash
cat > backend/.env << 'EOF'
APP_ENV=production
SECRET_KEY=replace-with-a-long-random-string-min-32-chars
DATABASE_URL=postgresql+asyncpg://pricebasket:secret@127.0.0.1:5432/pricebasket_db
REDIS_URL=redis://127.0.0.1:6379/0
CELERY_BROKER_URL=redis://127.0.0.1:6379/1
CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/2
ALLOWED_ORIGINS=http://localhost:3000,https://test.pricebasket.in
EOF
```

### Step 3 — Install Python dependencies & activate venv

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Step 4 — Generate & run Alembic migrations (creates all tables)

```bash
cd backend
source .venv/bin/activate

# Generate migration if no versions exist yet
alembic revision --autogenerate -m "init"

# Apply migrations — this creates all tables in PostgreSQL
alembic upgrade head
```

### Step 5 — Create the admin user

```bash
# From repo root — uses defaults below, override via env if needed
bash scripts/run_create_admin.sh
```

Default admin credentials (change after first login):

| Field    | Value                      |
|----------|----------------------------|
| Email    | `admin@pricebasket.in`     |
| Password | `Admin@PB2024`             |
| Name     | `Nikhil Admin`             |
| Role     | `is_admin = true`          |

Override credentials before running:
```bash
ADMIN_EMAIL=you@domain.com \
ADMIN_PASSWORD=YourStrongPass1 \
ADMIN_NAME="Your Name" \
bash scripts/run_create_admin.sh
```

### Step 6 — (Optional) Seed full demo data

Loads 35 products, 4 platforms, 12 categories + the admin user:

```bash
bash scripts/run_seed.sh
```

### Verify — test registration manually

```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass1","full_name":"Test User"}' \
  | python3 -m json.tool
```

- `201` → success ✅  
- `409` → email already exists (expected on re-run) ✅  
- `500` → migrations not applied → re-run `alembic upgrade head`  
- `000` / connection refused → backend not started  

---

## �🚀 Quick Start (Local)

### Prerequisites
- Docker Desktop ≥ 24
- Node.js 20+ (for local frontend dev)
- Python 3.12+ (for local backend dev)

### 1. Clone & configure

```bash
git clone https://github.com/your-org/price-basket.git
cd price-basket

# Backend env
cp backend/.env.example backend/.env
# Edit: SECRET_KEY, SMTP credentials, etc.

# Frontend env
cp frontend/.env.example frontend/.env.local
```

### 2. Start the full stack

```bash
docker compose up --build -d
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API docs (Swagger) | http://localhost:8000/docs |
| Grafana | http://localhost:3001  (admin / admin) |
| Prometheus | http://localhost:9090 |
| Flower (Celery) | http://localhost:5555 |

### 3. Run DB migrations

```bash
docker compose exec api alembic upgrade head
```

### 4. Seed sample data (optional)

```bash
docker compose exec api python -m scripts.seed_data
```

---

## 🔧 Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
playwright install chromium

# Start PostgreSQL & Redis locally (or use Docker)
docker run -d -p 5432:5432 -e POSTGRES_USER=pricebasket -e POSTGRES_PASSWORD=secret -e POSTGRES_DB=pricebasket_db postgres:16-alpine
docker run -d -p 6379:6379 redis:7-alpine

cp .env.example .env
uvicorn app.main:app --reload --port 8000

# In a separate terminal — Celery worker
celery -A app.workers.celery_app worker --loglevel=info -Q prices,notifications

# In another terminal — Celery beat
celery -A app.workers.celery_app beat --loglevel=info
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

---

## 🔑 API Endpoints

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Login → JWT + httpOnly refresh cookie |
| POST | `/api/v1/auth/refresh` | Rotate access token |
| POST | `/api/v1/auth/logout` | Revoke all tokens |
| GET  | `/api/v1/auth/me` | Current user profile |

### Products
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/products?q=milk&sort=price_asc` | Search with pagination |
| GET | `/api/v1/products/{id}` | Product + live prices |
| GET | `/api/v1/products/categories` | Category tree |
| GET | `/api/v1/products/featured` | Homepage featured |

### Prices
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/prices/{product_id}` | Current cross-platform prices |
| GET | `/api/v1/prices/{product_id}/history?days=30` | Historical data |
| GET | `/api/v1/prices/alerts/me` | My price alerts |
| POST | `/api/v1/prices/alerts` | Create price alert |
| DELETE | `/api/v1/prices/alerts/{id}` | Delete alert |

### Cart
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/cart` | Get active cart |
| POST | `/api/v1/cart/items` | Add item |
| PATCH | `/api/v1/cart/items/{id}` | Update qty / platform |
| DELETE | `/api/v1/cart/items/{id}` | Remove item |
| GET | `/api/v1/cart/optimize` | Get optimization strategies |

### WebSocket
```
ws://localhost:8000/ws/prices

# Subscribe to real-time price updates:
{"action": "subscribe", "product_ids": ["uuid1", "uuid2"]}
# Receive:
{"type": "price_update", "product_id": "uuid1", "prices": [...]}
```

---

## ☁️ AWS Deployment

```bash
cd infrastructure/aws/terraform

# Initialise
terraform init

# Preview
terraform plan -var="acm_certificate_arn=arn:aws:acm:..." -var="production=true"

# Apply
terraform apply
```

**Infrastructure created:**
- VPC with public/private subnets across 2 AZs
- RDS PostgreSQL 16 (Multi-AZ in production)
- ElastiCache Redis 7
- ECS Fargate cluster
- Application Load Balancer with HTTPS listener
- ECR repositories for API and frontend images
- S3 bucket for static assets
- CloudWatch logging

### CI/CD (GitHub Actions)

```bash
# Build and push to ECR
docker build -t $ECR_API_URL:$SHA ./backend
docker push $ECR_API_URL:$SHA

# Run migrations
aws ecs run-task --cluster pricebasket-cluster --task-definition migrate ...

# Update ECS service
aws ecs update-service --cluster pricebasket-cluster --service api --force-new-deployment
```

---

## 🔒 Security

- **JWT** with short-lived access tokens (30 min) + httpOnly refresh cookie rotation
- **bcrypt** password hashing (rounds=12)
- **Rate limiting** via Redis sliding window (5 req/min on auth endpoints)
- **CORS** restricted to allowed origins
- **Nginx** security headers (CSP, X-Frame-Options, HSTS)
- **RDS** in private subnets — no public access
- **Scraper** never stores raw credentials; proxy rotation prevents IP bans
- **Input validation** via Pydantic v2 with strict type coercion

---

## 📊 Monitoring

- **Prometheus** + **FastAPI Instrumentator** — latency, error rate, throughput per endpoint
- **Grafana** dashboards — API health, price refresh success rate, celery queue depth
- **Sentry** for error tracking (set `SENTRY_DSN` in env)
- **Structured logging** via `structlog` (JSON in production)

---

## 🧪 Testing

```bash
cd backend
pytest tests/ -v --cov=app --cov-report=term-missing
```

---

## 🗺️ Roadmap

- [ ] OAuth2 (Google login)
- [ ] Mobile app (React Native)
- [ ] ML price prediction model (scikit-learn + historical data)
- [ ] Subscription recurring cart
- [ ] Coupon/promo aggregation
- [ ] Delivery ETA map view
- [ ] A/B testing engine for recommendation widgets
- [ ] Official platform APIs (when available)

---

## ⚠️ Disclaimer

This project uses web scraping as a fallback where official APIs are unavailable. Always comply with each platform's Terms of Service. Use official APIs whenever they are available. Implement appropriate rate limiting and caching to be a responsible scraper.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
