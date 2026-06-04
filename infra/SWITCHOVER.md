# PriceBasket Platform Switchover Guide

This document explains how to switch the PriceBasket backend between **AWS ECS Fargate** and **Render.com**. The frontend always runs on Vercel and is unaffected by backend platform switches.

---

## Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Switch from AWS → Render](#switch-from-aws--render)
4. [Switch from Render → AWS](#switch-from-render--aws)
5. [DNS Considerations](#dns-considerations)
6. [Cost Comparison](#cost-comparison)

---

## Overview

PriceBasket's backend (FastAPI) can run on either:

- **AWS ECS Fargate** — containerised, auto-scaling, managed via Terraform + GitHub Actions
- **Render.com** — PaaS, simpler ops, managed via `render.yaml` at the repo root

Both platforms serve the same Docker image. Switching is a matter of:
1. Bringing up the new platform
2. Updating the `NEXT_PUBLIC_API_URL` environment variable in Vercel to point to the new backend URL
3. Scaling down (or deleting) the old platform

The frontend on Vercel does **not** need to be redeployed from scratch — only the environment variable needs updating and a redeploy triggered.

---

## Current State

| Component | Platform | URL |
|-----------|----------|-----|
| **Backend API** | AWS ECS Fargate (production) | `http://pricebasket-alb-72968209.ap-south-1.elb.amazonaws.com` |
| **Frontend** | Vercel | `https://pricebasket.in` |
| **Database** | AWS RDS PostgreSQL 15 | `pricebasket-db.cf6ksq4yotjm.ap-south-1.rds.amazonaws.com` |
| **Cache** | AWS ElastiCache Redis 7 | `pricebasket-redis.hdd39f.0001.aps1.cache.amazonaws.com:6379` |

> **Note**: A `render.yaml` file already exists at the repository root from the previous Render.com deployment. It can be used as-is or updated before switching back.

---

## Switch from AWS → Render

Use this procedure when you want to move the backend off AWS ECS and onto Render.com (e.g., to reduce costs during low-traffic periods or simplify operations).

### Step 1: Update `render.yaml`

The `render.yaml` file at the repo root defines the Render service. Verify it points to the correct Docker build settings:

```yaml
# render.yaml (already exists at repo root)
services:
  - type: web
    name: pricebasket-api
    env: docker
    dockerfilePath: ./backend/Dockerfile
    plan: starter          # or standard for more resources
    healthCheckPath: /health
    envVars:
      - key: DATABASE_URL
        sync: false        # set manually in Render dashboard
      - key: REDIS_URL
        sync: false
      - key: ENVIRONMENT
        value: prod
      - key: SECRET_KEY
        sync: false
      - key: ALLOWED_ORIGINS
        value: https://pricebasket.in,https://www.pricebasket.in
```

Commit any changes to `render.yaml` before proceeding:
```bash
git add render.yaml
git commit -m "chore: update render.yaml for switchover"
git push origin main
```

### Step 2: Create a New Web Service on Render

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **New → Web Service**
3. Connect your GitHub account if not already connected
4. Select the repository: `nikhilmathur97/price-basket`
5. Render will detect `render.yaml` automatically — click **Apply**
6. If prompted to choose a branch, select `main`
7. Wait for the initial build to complete (5–10 minutes)

### Step 3: Set Environment Variables in Render Dashboard

In the Render service dashboard → **Environment** tab, add the following variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://pricebasket:<password>@pricebasket-db.cf6ksq4yotjm.ap-south-1.rds.amazonaws.com:5432/pricebasket` |
| `REDIS_URL` | `redis://pricebasket-redis.hdd39f.0001.aps1.cache.amazonaws.com:6379` |
| `ENVIRONMENT` | `prod` |
| `SECRET_KEY` | `<your-secret-key-min-32-chars>` |
| `ALLOWED_ORIGINS` | `https://pricebasket.in,https://www.pricebasket.in` |

> **Important**: If you are switching away from AWS entirely, you will need a separate Redis and PostgreSQL instance accessible from Render (e.g., Render PostgreSQL, Render Redis, or Upstash Redis). The AWS RDS and ElastiCache endpoints are inside a VPC and may not be reachable from Render without additional networking configuration (VPC peering or making them publicly accessible).

Click **Save Changes** — Render will automatically redeploy with the new variables.

### Step 4: Update `NEXT_PUBLIC_API_URL` in Vercel

Once the Render service is live, update the frontend to point to it:

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard) → PriceBasket project
2. Click **Settings → Environment Variables**
3. Find `NEXT_PUBLIC_API_URL` and update its value to your Render URL:
   ```
   https://pricebasket-api.onrender.com
   ```
   (Replace with the actual URL shown in your Render service dashboard)
4. Click **Save**
5. Go to **Deployments** → click the three-dot menu on the latest deployment → **Redeploy**

### Step 5: Verify Health Check

Once Vercel has redeployed, verify the backend is reachable:

```bash
curl https://<your-render-url>/health
# Expected: {"status": "ok"} or similar
```

Also verify the frontend is working end-to-end:
```bash
curl https://pricebasket.in
# Expected: 200 OK with HTML content
```

### Step 6: Scale Down AWS ECS Service

Once you have confirmed the Render deployment is healthy and serving traffic, scale down the AWS ECS service to stop incurring costs:

```bash
# Scale prod service to 0 tasks
aws ecs update-service \
  --cluster pricebasket-cluster \
  --service pricebasket-api-prod \
  --desired-count 0 \
  --region ap-south-1

# Scale dev service to 0 tasks (optional)
aws ecs update-service \
  --cluster pricebasket-cluster \
  --service pricebasket-api-dev \
  --desired-count 0 \
  --region ap-south-1
```

Verify the services have scaled down:
```bash
aws ecs describe-services \
  --cluster pricebasket-cluster \
  --services pricebasket-api-prod pricebasket-api-dev \
  --region ap-south-1 \
  --query 'services[*].{Name:serviceName,Running:runningCount,Desired:desiredCount}'
```

### Step 7: (Optional) Destroy AWS Resources

If you want to permanently remove all AWS infrastructure and stop all associated costs:

```bash
bash aws/teardown.sh
```

> ⚠️ **Warning**: This is irreversible. Ensure you have database backups before running teardown. RDS automated backups are deleted when the instance is destroyed.

---

## Switch from Render → AWS

Use this procedure when you want to move the backend from Render.com back to AWS ECS Fargate.

### Step 1: Ensure Terraform Infrastructure is Applied

Follow the full setup in [`infra/README.md`](./README.md) — specifically Steps 3–8 — to ensure all AWS resources exist and are managed by Terraform.

Verify the ECS cluster and services exist:
```bash
aws ecs describe-clusters \
  --clusters pricebasket-cluster \
  --region ap-south-1 \
  --query 'clusters[0].{Name:clusterName,Status:status,ActiveServices:activeServicesCount}'
```

### Step 2: Push to `main` to Trigger GitHub Actions Deployment

```bash
git checkout main
git push origin main
```

This triggers `.github/workflows/deploy-prod.yml` which builds the Docker image, pushes it to ECR, and deploys it to `pricebasket-api-prod`.

Monitor the workflow:
- GitHub → Actions tab → `Deploy to Production`

### Step 3: Wait for ECS Service to Be Stable

```bash
aws ecs wait services-stable \
  --cluster pricebasket-cluster \
  --services pricebasket-api-prod \
  --region ap-south-1

echo "ECS service is stable"
```

This command blocks until the service reaches a stable state (all desired tasks running). It times out after 10 minutes by default.

Alternatively, poll manually:
```bash
aws ecs describe-services \
  --cluster pricebasket-cluster \
  --services pricebasket-api-prod \
  --region ap-south-1 \
  --query 'services[0].{Running:runningCount,Desired:desiredCount,Status:status}'
```

### Step 4: Update `NEXT_PUBLIC_API_URL` in Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard) → PriceBasket project
2. Click **Settings → Environment Variables**
3. Update `NEXT_PUBLIC_API_URL` to the ALB URL:
   ```
   http://pricebasket-alb-72968209.ap-south-1.elb.amazonaws.com
   ```
4. Click **Save**
5. Go to **Deployments** → redeploy the latest deployment

### Step 5: Verify Health Check

```bash
curl http://pricebasket-alb-72968209.ap-south-1.elb.amazonaws.com/health
# Expected: {"status": "ok"}
```

Also verify the API docs are accessible:
```bash
curl http://pricebasket-alb-72968209.ap-south-1.elb.amazonaws.com/docs
# Expected: 200 OK with Swagger UI HTML
```

### Step 6: Scale Down Render Service

Once AWS is confirmed healthy:

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Select the `pricebasket-api` service
3. Go to **Settings → Scaling**
4. Set **Min Instances** to `0` and **Max Instances** to `0`
5. Click **Save** — Render will scale the service to zero

Or delete the service entirely:
- **Settings → Delete Service** (this is permanent)

---

## DNS Considerations

| Concern | Detail |
|---------|--------|
| **Frontend DNS** | Managed entirely by Vercel. No action needed when switching backends. |
| **Backend URL** | The `NEXT_PUBLIC_API_URL` Vercel environment variable controls which backend the frontend calls. This is the only change needed. |
| **Downtime window** | Zero downtime is achievable: bring up the new backend first, update `NEXT_PUBLIC_API_URL`, redeploy Vercel, then shut down the old backend. |
| **Custom domain for backend** | If you add a custom domain (e.g., `api.pricebasket.in`) pointing to the ALB, you only need to update the DNS record — not the Vercel env var — when switching. This is the recommended long-term setup. |
| **SSL/TLS** | Vercel handles HTTPS for the frontend automatically. For the ALB, add an ACM certificate via Terraform (`aws_acm_certificate` + `aws_lb_listener` on port 443). Render provides HTTPS automatically. |

### Recommended Zero-Downtime Switchover Sequence

```
1. Bring up new backend platform (Render or AWS)
2. Verify /health endpoint on new platform
3. Update NEXT_PUBLIC_API_URL in Vercel → Redeploy Vercel
4. Monitor error rates for 5–10 minutes
5. Scale down / delete old backend platform
```

---

## Cost Comparison

Approximate monthly costs (ap-south-1 / Mumbai region, as of 2025):

| Component | AWS ECS Fargate | Render.com |
|-----------|----------------|------------|
| **Backend compute (prod)** | ~$25–35/mo (1 vCPU, 2GB, 2 tasks) | ~$7–25/mo (Starter–Standard plan) |
| **Backend compute (dev)** | ~$8–12/mo (0.5 vCPU, 1GB, 1 task) | $0 (free tier or suspend when not needed) |
| **Database (PostgreSQL)** | ~$15–25/mo (db.t3.small, Multi-AZ) | ~$7–20/mo (Render PostgreSQL) or free tier |
| **Cache (Redis)** | ~$12–18/mo (ElastiCache cache.t3.micro) | ~$0–10/mo (Render Redis or Upstash free tier) |
| **Load Balancer** | ~$18–22/mo (ALB + LCU charges) | Included in service plan |
| **Data transfer** | ~$2–5/mo | Included in plan |
| **ECR storage** | ~$1–2/mo | N/A (uses Docker Hub or GitHub Container Registry) |
| **Monitoring/Logs** | ~$3–5/mo (CloudWatch) | Included |
| **Total (approx.)** | **~$84–122/mo** | **~$14–55/mo** |

### When to Use Each Platform

| Scenario | Recommended Platform |
|----------|---------------------|
| Early stage / low traffic | Render.com (lower cost, simpler ops) |
| Growing traffic (>10k DAU) | AWS ECS Fargate (auto-scaling, better performance) |
| Need fine-grained control | AWS ECS Fargate |
| Minimal DevOps overhead | Render.com |
| Multi-region requirements | AWS ECS Fargate |
| Cost is primary constraint | Render.com |
