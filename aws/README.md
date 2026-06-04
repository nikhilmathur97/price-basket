# PriceBasket — AWS Migration Guide

## Architecture

```
Users → Vercel (Next.js)  ←── stays on Vercel, no change
              ↓ API calls
    AWS Application Load Balancer  (always-on, no cold starts)
              ↓
    ECS Fargate — FastAPI API      (0.25 vCPU, 512 MB, ~$9/mo)
              ↓              ↓              ↓
    RDS PostgreSQL    ElastiCache    ECS Fargate
    t3.micro          Redis          Celery Worker
    always-on         t3.micro       always-on
    ~$15/mo           ~$13/mo        ~$9/mo
```

**Total AWS cost: ~$62/month** (vs Render free = cold starts, Render Starter = $28/month)

**Render stays PAUSED** — switch back in 1 step by changing one Vercel env var.

---

## Prerequisites

Install these on your local machine:

```bash
# macOS
brew install awscli jq docker

# Configure AWS credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Region: ap-south-1, Output: json
```

---

## Step 1: Create IAM User (do this in AWS Console)

> **NEVER share your root AWS credentials. Create a dedicated IAM user.**

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam)
2. Click **Users** → **Create user**
3. Username: `pricebasket-deploy`
4. Click **Attach policies directly** → **Create policy**
5. Click **JSON** tab → paste contents of [`aws/iam-policy.json`](iam-policy.json)
6. Policy name: `pricebasket-deploy-policy` → Create
7. Attach `pricebasket-deploy-policy` to the user
8. Click **Create user** → **Security credentials** → **Create access key**
9. Choose **CLI** → Download CSV

Then configure locally:
```bash
aws configure --profile pricebasket
# Enter the Access Key ID and Secret from the CSV
export AWS_PROFILE=pricebasket
```

---

## Step 2: Run Setup (one-time, ~15 minutes)

```bash
chmod +x aws/setup.sh aws/deploy.sh aws/rollback-to-render.sh aws/scale-down.sh aws/scale-up.sh aws/teardown.sh

./aws/setup.sh
```

This will:
- Create VPC, subnets, security groups
- Create RDS PostgreSQL (always-on)
- Create ElastiCache Redis (always-on)
- Build and push Docker images to ECR
- Create ECS Fargate cluster + services (always-on, no cold starts)
- Create Application Load Balancer
- Save all outputs to `aws/outputs.env`

---

## Step 3: Pause Render (don't delete)

1. Go to [render.com/dashboard](https://render.com/dashboard)
2. Click `pricebasket-api` → **Suspend Service**
3. Click `pricebasket-worker` → **Suspend Service**
4. **Do NOT delete** — keep for rollback

---

## Step 4: Update Vercel to Point to AWS

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click your project → **Settings** → **Environment Variables**
3. Update `NEXT_PUBLIC_API_URL`:
   - **Old value:** `https://pricebasket-api.onrender.com`
   - **New value:** `http://<ALB_DNS>` (from `aws/outputs.env`)
4. Click **Save** → Go to **Deployments** → **Redeploy**

---

## Step 5: Verify

```bash
# Get ALB URL from outputs
source aws/outputs.env
curl http://${ALB_DNS}/health
# Expected: {"status":"ok","version":"1.0.0","env":"production"}

curl http://${ALB_DNS}/api/v1/products/featured?limit=5
# Expected: JSON array of products
```

---

## Deploying Code Updates

Every time you push new backend code:

```bash
./aws/deploy.sh
```

This builds new Docker images, pushes to ECR, and does a **zero-downtime rolling update** on ECS.

---

## Rollback to Render (1-step)

If anything goes wrong on AWS:

```bash
./aws/rollback-to-render.sh
```

Then:
1. Resume Render services (render.com → Resume)
2. Change `NEXT_PUBLIC_API_URL` back to `https://pricebasket-api.onrender.com` in Vercel
3. Redeploy Vercel

**Total rollback time: ~2 minutes**

---

## Cost Management

### Temporarily pause AWS (switch to Render)
```bash
./aws/scale-down.sh   # stops ECS compute, saves ~$18/month
```

### Bring AWS back online
```bash
./aws/scale-up.sh
```

### Permanently delete everything
```bash
./aws/teardown.sh     # WARNING: deletes all data
```

---

## Monthly Cost Breakdown

| Service | Type | Cost |
|---------|------|------|
| ECS Fargate (API) | 0.25 vCPU, 512 MB | ~$9 |
| ECS Fargate (Worker) | 0.25 vCPU, 512 MB | ~$9 |
| RDS PostgreSQL | t3.micro, 20 GB | ~$15 |
| ElastiCache Redis | t3.micro | ~$13 |
| Application Load Balancer | - | ~$16 |
| **Total** | | **~$62/month** |

> **Free Tier Note:** If your AWS account is < 12 months old, RDS t3.micro and some other services are free for 750 hours/month. Your actual cost could be ~$25/month.

---

## Files Reference

| File | Purpose |
|------|---------|
| [`aws/setup.sh`](setup.sh) | One-time infrastructure setup |
| [`aws/deploy.sh`](deploy.sh) | Push code updates to AWS |
| [`aws/rollback-to-render.sh`](rollback-to-render.sh) | Switch back to Render instantly |
| [`aws/scale-down.sh`](scale-down.sh) | Stop compute to save money |
| [`aws/scale-up.sh`](scale-up.sh) | Bring AWS back online |
| [`aws/teardown.sh`](teardown.sh) | Delete everything permanently |
| [`aws/iam-policy.json`](iam-policy.json) | Minimal IAM permissions needed |
| [`aws/outputs.env`](outputs.env) | Generated by setup.sh (gitignored) |

---

## Troubleshooting

### ECS task keeps restarting
```bash
# Check logs
aws logs tail /ecs/pricebasket-api --follow --region ap-south-1
```

### Database connection error
```bash
# Verify RDS is running
aws rds describe-db-instances --db-instance-identifier pricebasket-db --region ap-south-1 \
  --query 'DBInstances[0].DBInstanceStatus'
```

### Check ECS service status
```bash
aws ecs describe-services \
  --cluster pricebasket-cluster \
  --services pricebasket-api \
  --region ap-south-1 \
  --query 'services[0].{status:status,running:runningCount,desired:desiredCount}'
```
