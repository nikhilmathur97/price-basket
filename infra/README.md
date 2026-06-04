# PriceBasket Infrastructure Guide

Complete reference for the PriceBasket AWS infrastructure. A freshly hired engineer with AWS experience should be able to provision, deploy, and operate the full stack by following this document end-to-end.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step: Create Infrastructure from Scratch](#step-by-step-create-infrastructure-from-scratch)
4. [Step-by-Step: Deploy Application (Day-to-Day)](#step-by-step-deploy-application-day-to-day)
5. [Environment Variables Reference](#environment-variables-reference)
6. [Two-Environment Strategy](#two-environment-strategy)

---

## Architecture Overview

### Traffic Flow

```
                          ┌─────────────────────────────────────────────────────┐
                          │                    AWS ap-south-1                    │
                          │                                                       │
  Internet Users          │   ┌─────────────────────────────────────────────┐   │
       │                  │   │              VPC (10.0.0.0/16)               │   │
       │                  │   │                                               │   │
       ▼                  │   │  ┌──────────────────────────────────────┐    │   │
  ┌─────────┐             │   │  │     ALB (pricebasket-alb)            │    │   │
  │ Browser │─────────────┼───┼─▶│  .ap-south-1.elb.amazonaws.com      │    │   │
  └─────────┘             │   │  └──────────────┬───────────────────────┘    │   │
       │                  │   │                 │                              │   │
       │ (frontend)       │   │        ┌────────┴────────┐                   │   │
       ▼                  │   │        ▼                 ▼                    │   │
  ┌─────────┐             │   │  ┌──────────┐    ┌──────────┐               │   │
  │ Vercel  │             │   │  │ECS Fargate│   │ECS Fargate│              │   │
  │(Next.js)│             │   │  │  (prod)  │    │  (dev)   │               │   │
  └─────────┘             │   │  │ :latest  │    │  :dev    │               │   │
                          │   │  └────┬─────┘    └────┬─────┘               │   │
                          │   │       │               │                       │   │
                          │   │       └───────┬───────┘                      │   │
                          │   │               │                               │   │
                          │   │    ┌──────────┴──────────┐                   │   │
                          │   │    ▼                     ▼                   │   │
                          │   │  ┌──────────┐    ┌──────────────┐           │   │
                          │   │  │   RDS    │    │ ElastiCache  │           │   │
                          │   │  │PostgreSQL│    │    Redis     │           │   │
                          │   │  │  (15)    │    │    (7.x)     │           │   │
                          │   │  └──────────┘    └──────────────┘           │   │
                          │   └─────────────────────────────────────────────┘   │
                          └─────────────────────────────────────────────────────┘
```

### CI/CD Flow

```
  Developer
      │
      ├── git push origin dev ──────────────────────────────────────────────────┐
      │                                                                           │
      └── git push origin main ─────────────────────────────────────────────┐   │
                                                                              │   │
                                                                              ▼   ▼
                                                                    ┌──────────────────┐
                                                                    │  GitHub Actions   │
                                                                    │                  │
                                                                    │ deploy-prod.yml  │
                                                                    │ deploy-dev.yml   │
                                                                    └────────┬─────────┘
                                                                             │
                                                                    ┌────────▼─────────┐
                                                                    │       ECR        │
                                                                    │ pricebasket-api  │
                                                                    │  :latest / :dev  │
                                                                    └────────┬─────────┘
                                                                             │
                                                                    ┌────────▼─────────┐
                                                                    │   ECS Fargate    │
                                                                    │  prod / dev svc  │
                                                                    └──────────────────┘

  git push origin main ──▶ Vercel (auto-deploy, Next.js frontend)
```

---

## Prerequisites

### Required Tools

| Tool | Minimum Version | Verify Command |
|------|----------------|----------------|
| AWS CLI | v2.x | `aws --version` |
| Terraform | >= 1.5.0 | `terraform --version` |
| Docker | any recent | `docker --version` |
| Git | any recent | `git --version` |
| GitHub CLI | optional | `gh --version` |

Install AWS CLI v2 on macOS:
```bash
brew install awscli
```

Install Terraform >= 1.5.0:
```bash
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```

### AWS Credentials

Configure your AWS credentials before running any Terraform or AWS CLI commands:

```bash
# Option 1: Interactive configuration
aws configure
# AWS Access Key ID: <your-key>
# AWS Secret Access Key: <your-secret>
# Default region name: ap-south-1
# Default output format: json

# Option 2: Environment variables
export AWS_ACCESS_KEY_ID=<your-key>
export AWS_SECRET_ACCESS_KEY=<your-secret>
export AWS_DEFAULT_REGION=ap-south-1
```

Verify credentials are working:
```bash
aws sts get-caller-identity
# Expected: JSON with Account: "443414059511"
```

### GitHub Repository Secrets

The following secrets **must** be set in the GitHub repository before CI/CD pipelines will work.

Navigate to: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Description | Where to Find |
|-------------|-------------|---------------|
| `AWS_ACCESS_KEY_ID` | IAM user access key with ECS, ECR, CloudWatch permissions | AWS Console → IAM → Users → Security credentials |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key (shown once at creation) | AWS Console → IAM → Users → Security credentials |
| `VERCEL_TOKEN` | Personal access token for Vercel API | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Your Vercel team/org ID | Vercel → Project Settings → General → Team ID |
| `VERCEL_PROJECT_ID` | Your Vercel project ID | Vercel → Project Settings → General → Project ID |

The IAM user must have the permissions defined in `aws/iam-policy.json`.

---

## Step-by-Step: Create Infrastructure from Scratch

Follow these steps in order. Do not skip steps.

### Step 1: Clone the Repository

```bash
git clone https://github.com/nikhilmathur97/price-basket.git
cd price-basket
```

### Step 2: Configure AWS Credentials

```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key
# Region: ap-south-1
# Output format: json

# Verify
aws sts get-caller-identity
```

### Step 3: Create the Terraform State S3 Bucket

This bucket stores Terraform state remotely. It must exist **before** running `terraform init`.

```bash
# Create the S3 bucket
aws s3api create-bucket \
  --bucket pricebasket-terraform-state \
  --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1

# Enable versioning (required for state safety)
aws s3api put-bucket-versioning \
  --bucket pricebasket-terraform-state \
  --versioning-configuration Status=Enabled

# Enable server-side encryption
aws s3api put-bucket-encryption \
  --bucket pricebasket-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Block all public access
aws s3api put-public-access-block \
  --bucket pricebasket-terraform-state \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### Step 4: Initialize Terraform for Dev Environment

```bash
cd infra/terraform/environments/dev
terraform init
```

Expected output: `Terraform has been successfully initialized!`

### Step 5: Review the Plan

```bash
terraform plan
```

Review the output carefully. It will show all resources to be created. Verify the resource counts match expectations before proceeding.

### Step 6: Import Existing Resources

If the AWS resources (ECR, RDS, Redis, ALB) already exist and were created outside of Terraform, import them so Terraform can manage them without recreating.

```bash
# Import ECR repository
terraform import module.ecr.aws_ecr_repository.api \
  pricebasket-api

# Import RDS instance
terraform import module.rds.aws_db_instance.main \
  pricebasket-db

# Import ElastiCache Redis cluster
terraform import module.redis.aws_elasticache_cluster.main \
  pricebasket-redis

# Import ALB
terraform import module.alb.aws_lb.main \
  arn:aws:elasticloadbalancing:ap-south-1:443414059511:loadbalancer/app/pricebasket-alb/<alb-id>
```

> **Note**: Replace `<alb-id>` with the actual ALB ID from the AWS Console (EC2 → Load Balancers → select the ALB → copy the ARN suffix).

To find the ALB ARN:
```bash
aws elbv2 describe-load-balancers \
  --names pricebasket-alb \
  --region ap-south-1 \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text
```

### Step 7: Apply the Dev Environment

```bash
terraform apply
# Type 'yes' when prompted
```

Wait for completion. This typically takes 10–15 minutes for a full environment.

### Step 8: Repeat for Prod Environment

```bash
cd ../prod
terraform init
terraform plan
# Import existing resources if needed (same commands as Step 6)
terraform apply
```

### Step 9: Set GitHub Repository Secrets

Set all 5 secrets listed in the [Prerequisites](#github-repository-secrets) section.

To find your AWS Access Key ID and Secret:
```bash
# If you need to create a new IAM user for CI/CD:
aws iam create-user --user-name pricebasket-github-actions
aws iam attach-user-policy \
  --user-name pricebasket-github-actions \
  --policy-arn arn:aws:iam::443414059511:policy/pricebasket-deploy-policy
aws iam create-access-key --user-name pricebasket-github-actions
# Save the AccessKeyId and SecretAccessKey from the output
```

To find Vercel IDs:
1. Go to [vercel.com/account/tokens](https://vercel.com/account/tokens) → Create token → copy as `VERCEL_TOKEN`
2. Go to your Vercel project → Settings → General → copy **Team ID** as `VERCEL_ORG_ID`
3. Same page → copy **Project ID** as `VERCEL_PROJECT_ID`

### Step 10: Push to `dev` Branch to Trigger First Dev Deployment

```bash
git checkout dev
git push origin dev
```

Monitor the deployment:
- GitHub → Actions tab → `Deploy to Dev` workflow
- AWS Console → ECS → Clusters → `pricebasket-cluster` → Services → `pricebasket-api-dev`

### Step 11: Merge `dev` → `main` to Trigger Production Deployment

```bash
git checkout main
git merge dev
git push origin main
```

Monitor:
- GitHub → Actions tab → `Deploy to Production` workflow
- AWS Console → ECS → Clusters → `pricebasket-cluster` → Services → `pricebasket-api-prod`
- Vercel dashboard → Deployments (auto-deploys on push to `main`)

---

## Step-by-Step: Deploy Application (Day-to-Day)

### Deploy to Dev

```bash
git checkout dev
# Make your changes, commit them
git add .
git commit -m "feat: your change description"
git push origin dev
```

This triggers `.github/workflows/deploy-dev.yml` which:
1. Builds the Docker image and tags it `:dev`
2. Pushes to ECR (`443414059511.dkr.ecr.ap-south-1.amazonaws.com/pricebasket-api:dev`)
3. Updates ECS service `pricebasket-api-dev` with the new image
4. Triggers a Vercel preview deployment

### Deploy to Production

```bash
git checkout main
git merge dev
git push origin main
```

This triggers `.github/workflows/deploy-prod.yml` which:
1. Builds the Docker image and tags it `:latest` and `:prod-<git-sha>`
2. Pushes to ECR
3. Updates ECS service `pricebasket-api-prod` with the new image
4. Vercel auto-deploys the frontend from `main`

### Check Deployment Status in AWS Console

1. Go to **AWS Console → ECS → Clusters → `pricebasket-cluster`**
2. Click on the service (`pricebasket-api-prod` or `pricebasket-api-dev`)
3. Check the **Deployments** tab — wait for `Running count` to equal `Desired count`
4. Check the **Events** tab for any errors
5. Check **Tasks** tab to see individual task status

Via AWS CLI:
```bash
aws ecs describe-services \
  --cluster pricebasket-cluster \
  --services pricebasket-api-prod \
  --region ap-south-1 \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Pending:pendingCount}'
```

### Check Vercel Deployment

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select the PriceBasket project
3. Click **Deployments** — the latest deployment should show `Ready`
4. Visit `https://pricebasket.in` to verify the frontend is live

---

## Environment Variables Reference

These environment variables must be set in the ECS task definition (via Terraform `infra/terraform/environments/<env>/terraform.tfvars`) and in Vercel project settings.

| Variable | Description | Example Value | Required |
|----------|-------------|---------------|----------|
| `DATABASE_URL` | PostgreSQL connection string for the FastAPI backend | `postgresql://pricebasket:<password>@pricebasket-db.cf6ksq4yotjm.ap-south-1.rds.amazonaws.com:5432/pricebasket` | ✅ Yes |
| `REDIS_URL` | Redis connection string for caching | `redis://pricebasket-redis.hdd39f.0001.aps1.cache.amazonaws.com:6379` | ✅ Yes |
| `ENVIRONMENT` | Deployment environment identifier | `dev` or `prod` | ✅ Yes |
| `SECRET_KEY` | FastAPI JWT signing secret (min 32 chars, random) | `your-super-secret-key-min-32-chars` | ✅ Yes |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | `https://pricebasket.in,https://www.pricebasket.in` | ✅ Yes |
| `NEXT_PUBLIC_API_URL` | Frontend API base URL (set in Vercel env vars) | `http://pricebasket-alb-72968209.ap-south-1.elb.amazonaws.com` | ✅ Yes |

> **Security note**: Never commit `SECRET_KEY` or `DATABASE_URL` passwords to the repository. Use AWS Secrets Manager or Vercel encrypted environment variables.

---

## Two-Environment Strategy

PriceBasket maintains two fully isolated environments: **dev** and **prod**.

| Configuration | Dev | Prod |
|---------------|-----|------|
| **ECS CPU** | 512 vCPU units (0.5 vCPU) | 1024 vCPU units (1 vCPU) |
| **ECS Memory** | 1024 MB | 2048 MB |
| **ECS Desired Task Count** | 1 | 2 |
| **Docker Image Tag** | `:dev` | `:latest` |
| **ECS Service Name** | `pricebasket-api-dev` | `pricebasket-api-prod` |
| **RDS Instance Class** | `db.t3.micro` | `db.t3.small` |
| **RDS Multi-AZ** | No | Yes |
| **Git Branch** | `dev` | `main` |
| **Terraform Directory** | `infra/terraform/environments/dev/` | `infra/terraform/environments/prod/` |
| **CloudWatch Log Group** | `/ecs/pricebasket-api-dev` | `/ecs/pricebasket-api-prod` |

### Promotion Flow

```
Feature branch → dev branch → main branch
                     ↓               ↓
               Dev ECS service  Prod ECS service
               (test/validate)  (live traffic)
```

Always validate changes in dev before merging to main. The dev environment is intentionally under-resourced to keep costs low while still being functionally identical to prod.
