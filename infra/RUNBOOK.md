# PriceBasket Operations Runbook

Day-to-day operations reference for the PriceBasket infrastructure. Use this document when responding to alerts, performing deployments, scaling the service, or recovering from incidents.

---

## Table of Contents

1. [How to Scale Up/Down](#how-to-scale-updown)
2. [How to Roll Back a Deployment](#how-to-roll-back-a-deployment)
3. [How to Restore DB from S3 Backup](#how-to-restore-db-from-s3-backup)
4. [How to Check Logs](#how-to-check-logs)
5. [How to Handle Alerts](#how-to-handle-alerts)
6. [Health Check URLs](#health-check-urls)
7. [Useful AWS CLI Commands (Quick Reference)](#useful-aws-cli-commands-quick-reference)

---

## How to Scale Up/Down

### Scale ECS Service via AWS CLI

Use this for immediate scaling without a code change or Terraform apply.

```bash
# Scale up to 3 tasks (e.g., during a traffic spike)
aws ecs update-service \
  --cluster pricebasket-cluster \
  --service pricebasket-api-prod \
  --desired-count 3 \
  --region ap-south-1

# Scale down to 1 task (e.g., after traffic normalises)
aws ecs update-service \
  --cluster pricebasket-cluster \
  --service pricebasket-api-prod \
  --desired-count 1 \
  --region ap-south-1

# Scale dev service down to 0 (stop it entirely, e.g., overnight)
aws ecs update-service \
  --cluster pricebasket-cluster \
  --service pricebasket-api-dev \
  --desired-count 0 \
  --region ap-south-1
```

Wait for the scaling action to complete:
```bash
aws ecs wait services-stable \
  --cluster pricebasket-cluster \
  --services pricebasket-api-prod \
  --region ap-south-1
echo "Scaling complete"
```

### Scale via Terraform (Permanent Change)

For a permanent change that survives future `terraform apply` runs, update the Terraform variable:

1. Open `infra/terraform/environments/prod/terraform.tfvars`
2. Update the `ecs_desired_count` value:
   ```hcl
   ecs_desired_count = 3   # change to desired number
   ```
3. Apply the change:
   ```bash
   cd infra/terraform/environments/prod
   terraform apply
   ```

> **Rule of thumb**: Use the AWS CLI for temporary scaling (incident response). Use Terraform for permanent changes (capacity planning).

---

## How to Roll Back a Deployment

Three options are available, ordered from fastest to slowest.

### Option 1: Force Re-Deploy a Previous ECS Task Definition Revision

Each GitHub Actions deployment registers a new ECS task definition revision. You can roll back to any previous revision instantly.

```bash
# List all task definition revisions for the prod service
aws ecs list-task-definitions \
  --family-prefix pricebasket-api-prod \
  --region ap-south-1 \
  --sort DESC

# Example output:
# "taskDefinitionArns": [
#   "arn:aws:ecs:ap-south-1:443414059511:task-definition/pricebasket-api-prod:5",
#   "arn:aws:ecs:ap-south-1:443414059511:task-definition/pricebasket-api-prod:4",
#   "arn:aws:ecs:ap-south-1:443414059511:task-definition/pricebasket-api-prod:3",
#   ...
# ]

# Roll back to revision 4 (the previous deployment)
aws ecs update-service \
  --cluster pricebasket-cluster \
  --service pricebasket-api-prod \
  --task-definition pricebasket-api-prod:4 \
  --region ap-south-1

# Wait for rollback to complete
aws ecs wait services-stable \
  --cluster pricebasket-cluster \
  --services pricebasket-api-prod \
  --region ap-south-1
```

### Option 2: Re-Tag a Previous Docker Image and Redeploy

Each production build is tagged with both `:latest` and `:prod-<git-sha>`. You can re-promote any previous image.

```bash
# Step 1: Authenticate Docker with ECR
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin \
  443414059511.dkr.ecr.ap-south-1.amazonaws.com

# Step 2: List available images to find the previous SHA
aws ecr list-images \
  --repository-name pricebasket-api \
  --region ap-south-1 \
  --query 'imageIds[?starts_with(imageTag, `prod-`)]' \
  --output table

# Step 3: Pull the previous image (replace <previous-sha> with the actual git SHA)
docker pull 443414059511.dkr.ecr.ap-south-1.amazonaws.com/pricebasket-api:prod-<previous-sha>

# Step 4: Re-tag it as :latest
docker tag \
  443414059511.dkr.ecr.ap-south-1.amazonaws.com/pricebasket-api:prod-<previous-sha> \
  443414059511.dkr.ecr.ap-south-1.amazonaws.com/pricebasket-api:latest

# Step 5: Push the re-tagged image
docker push 443414059511.dkr.ecr.ap-south-1.amazonaws.com/pricebasket-api:latest

# Step 6: Force a new deployment to pick up the re-tagged image
aws ecs update-service \
  --cluster pricebasket-cluster \
  --service pricebasket-api-prod \
  --force-new-deployment \
  --region ap-south-1

# Step 7: Wait for stable
aws ecs wait services-stable \
  --cluster pricebasket-cluster \
  --services pricebasket-api-prod \
  --region ap-south-1
```

### Option 3: Git Revert and Push to `main`

Use this when the bad code is in the repository and you want a clean audit trail.

```bash
# Find the commit to revert to
git log --oneline -10

# Revert the bad commit (creates a new revert commit)
git revert <bad-commit-sha>

# Push to main — this triggers deploy-prod.yml automatically
git push origin main
```

Monitor the GitHub Actions workflow to confirm the revert deployment succeeds.

---

## How to Restore DB from S3 Backup

The monitoring module creates automated database backups to S3 bucket `pricebasket-db-backups-443414059511`. Additionally, RDS automated backups are retained for 7 days.

### Restore from S3 Backup

#### Step 1: List Available Backups

```bash
aws s3 ls s3://pricebasket-db-backups-443414059511/ \
  --region ap-south-1 \
  --human-readable \
  --summarize
```

#### Step 2: Download the Backup File

```bash
# Replace <backup-file> with the filename from Step 1 (e.g., backup-2025-06-01T02:00:00.sql.gz)
aws s3 cp \
  s3://pricebasket-db-backups-443414059511/<backup-file> \
  ./backup.sql.gz \
  --region ap-south-1
```

#### Step 3: Decompress the Backup

```bash
gunzip backup.sql.gz
# This produces backup.sql in the current directory
```

#### Step 4: Connect to RDS and Restore

> ⚠️ **Warning**: Restoring overwrites existing data. Ensure you are restoring to the correct database and that you have taken a snapshot of the current state if needed.

```bash
# Restore to the RDS instance
# Replace <password> with the actual RDS master password
psql \
  --host=pricebasket-db.cf6ksq4yotjm.ap-south-1.rds.amazonaws.com \
  --port=5432 \
  --username=pricebasket \
  --dbname=pricebasket \
  --file=backup.sql
```

If you need to drop and recreate the database first:
```bash
psql \
  --host=pricebasket-db.cf6ksq4yotjm.ap-south-1.rds.amazonaws.com \
  --port=5432 \
  --username=pricebasket \
  --dbname=postgres \
  --command="DROP DATABASE IF EXISTS pricebasket; CREATE DATABASE pricebasket;"

psql \
  --host=pricebasket-db.cf6ksq4yotjm.ap-south-1.rds.amazonaws.com \
  --port=5432 \
  --username=pricebasket \
  --dbname=pricebasket \
  --file=backup.sql
```

#### Step 5: Verify Data Integrity

```bash
psql \
  --host=pricebasket-db.cf6ksq4yotjm.ap-south-1.rds.amazonaws.com \
  --port=5432 \
  --username=pricebasket \
  --dbname=pricebasket \
  --command="\dt"   # list all tables

# Check row counts on key tables
psql \
  --host=pricebasket-db.cf6ksq4yotjm.ap-south-1.rds.amazonaws.com \
  --port=5432 \
  --username=pricebasket \
  --dbname=pricebasket \
  --command="SELECT schemaname, tablename, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;"
```

### Restore from RDS Automated Backup (Point-in-Time)

RDS automated backups are retained for **7 days** and support point-in-time recovery to any second within that window.

1. Go to **AWS Console → RDS → Databases**
2. Select `pricebasket-db`
3. Click **Actions → Restore to point in time**
4. Choose the target date and time
5. Set a new DB instance identifier (e.g., `pricebasket-db-restored`)
6. Click **Restore DB Instance**
7. Once the restored instance is available, update `DATABASE_URL` in the ECS task definition to point to the new endpoint
8. Force a new ECS deployment to pick up the new `DATABASE_URL`

---

## How to Check Logs

### ECS Task Logs via AWS CLI (CloudWatch)

```bash
# Stream live logs for the prod service (Ctrl+C to stop)
aws logs tail /ecs/pricebasket-api-prod \
  --follow \
  --region ap-south-1

# Stream live logs for the dev service
aws logs tail /ecs/pricebasket-api-dev \
  --follow \
  --region ap-south-1

# Get the last 100 log lines without following
aws logs tail /ecs/pricebasket-api-prod \
  --since 1h \
  --region ap-south-1

# Filter for ERROR lines only
aws logs filter-log-events \
  --log-group-name /ecs/pricebasket-api-prod \
  --filter-pattern "ERROR" \
  --region ap-south-1 \
  --query 'events[*].{Time:timestamp,Message:message}' \
  --output table

# Filter for a specific time window (Unix timestamps)
aws logs filter-log-events \
  --log-group-name /ecs/pricebasket-api-prod \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s000) \
  --end-time $(date +%s000) \
  --region ap-south-1
```

### ECS Task Logs via AWS Console

1. Go to **AWS Console → CloudWatch → Log groups**
2. Search for `/ecs/pricebasket-api-prod` (or `-dev`)
3. Click on the log group
4. Select the most recent log stream (named by task ID)
5. Use the filter bar to search for `ERROR`, `Exception`, or any keyword

### ECS Task Status

```bash
# List running tasks for the prod service
aws ecs list-tasks \
  --cluster pricebasket-cluster \
  --service-name pricebasket-api-prod \
  --region ap-south-1

# Describe a specific task (replace <task-arn> with output from above)
aws ecs describe-tasks \
  --cluster pricebasket-cluster \
  --tasks <task-arn> \
  --region ap-south-1 \
  --query 'tasks[0].{Status:lastStatus,Health:healthStatus,StoppedReason:stoppedReason,Containers:containers[*].{Name:name,Status:lastStatus,ExitCode:exitCode,Reason:reason}}'

# List stopped tasks (useful for diagnosing crash loops)
aws ecs list-tasks \
  --cluster pricebasket-cluster \
  --service-name pricebasket-api-prod \
  --desired-status STOPPED \
  --region ap-south-1
```

---

## How to Handle Alerts

All alerts are sent to the SNS topic `pricebasket-alerts` and delivered to `alerts@pricebasket.in`. Below is the response procedure for each alarm.

---

### 1. `pricebasket-ecs-cpu-high-prod`

**Condition**: ECS CPU utilisation > 80% for 2 consecutive 5-minute periods

**What it means**: The backend tasks are under heavy CPU load. This can be caused by a traffic spike, an expensive endpoint (e.g., a slow scraping job), or a CPU-bound bug.

**Immediate action**:
```bash
# Scale up to 3 tasks immediately
aws ecs update-service \
  --cluster pricebasket-cluster \
  --service pricebasket-api-prod \
  --desired-count 3 \
  --region ap-south-1
```

**Resolution steps**:
1. Check CloudWatch metrics for the specific time CPU spiked: **CloudWatch → Metrics → ECS → ClusterName/ServiceName → CPUUtilization**
2. Check logs for slow or repeated requests:
   ```bash
   aws logs filter-log-events \
     --log-group-name /ecs/pricebasket-api-prod \
     --filter-pattern "slow" \
     --region ap-south-1
   ```
3. Identify the slow endpoint using API access logs or APM tooling
4. Optimise the endpoint (add caching, reduce DB queries, add indexes)
5. Once resolved, scale back down via Terraform (`ecs_desired_count` in `terraform.tfvars`)

---

### 2. `pricebasket-ecs-memory-high-prod`

**Condition**: ECS memory utilisation > 80% for 2 consecutive 5-minute periods

**What it means**: Tasks are consuming most of their allocated 2048 MB. This can indicate a memory leak, large in-memory data structures, or insufficient allocation.

**Immediate action**:
```bash
# Force a new deployment to restart tasks and clear memory
aws ecs update-service \
  --cluster pricebasket-cluster \
  --service pricebasket-api-prod \
  --force-new-deployment \
  --region ap-south-1
```

**Resolution steps**:
1. Check if memory grows over time (leak) or spikes suddenly (large request)
2. Review recent code changes for unbounded lists, large file reads, or missing `del` / garbage collection
3. If memory is consistently high but not leaking, increase the task memory in Terraform:
   ```hcl
   # infra/terraform/environments/prod/terraform.tfvars
   ecs_memory = 4096   # increase from 2048
   ```
   Then run `terraform apply`
4. Consider adding Redis caching to reduce in-memory data processing

---

### 3. `pricebasket-alb-5xx-high-prod`

**Condition**: ALB HTTP 5xx error rate > 1% over a 5-minute window

**What it means**: The backend is returning server errors. This typically indicates an application crash, unhandled exception, or a broken deployment.

**Immediate action**:
```bash
# Check logs immediately for exceptions
aws logs filter-log-events \
  --log-group-name /ecs/pricebasket-api-prod \
  --filter-pattern "ERROR" \
  --region ap-south-1 \
  --limit 50

# Check if tasks are running
aws ecs describe-services \
  --cluster pricebasket-cluster \
  --services pricebasket-api-prod \
  --region ap-south-1 \
  --query 'services[0].{Running:runningCount,Desired:desiredCount}'
```

**Resolution steps**:
1. If the error started after a recent deployment → **roll back immediately** (see [Roll Back a Deployment](#how-to-roll-back-a-deployment))
2. If tasks are crashing (running count < desired count) → check stopped task reasons:
   ```bash
   aws ecs list-tasks \
     --cluster pricebasket-cluster \
     --service-name pricebasket-api-prod \
     --desired-status STOPPED \
     --region ap-south-1
   ```
3. Check ALB target group health:
   ```bash
   aws elbv2 describe-target-health \
     --target-group-arn $(aws elbv2 describe-target-groups \
       --names pricebasket-tg-prod \
       --region ap-south-1 \
       --query 'TargetGroups[0].TargetGroupArn' \
       --output text) \
     --region ap-south-1
   ```
4. Fix the root cause and redeploy

---

### 4. `pricebasket-alb-latency-high-prod`

**Condition**: ALB target response time > 2 seconds (p99) over a 5-minute window

**What it means**: Requests are taking too long to process. This can be caused by slow database queries, Redis cache misses, or an overloaded service.

**Immediate action**: Scale up ECS tasks to distribute load:
```bash
aws ecs update-service \
  --cluster pricebasket-cluster \
  --service pricebasket-api-prod \
  --desired-count 3 \
  --region ap-south-1
```

**Resolution steps**:
1. Check RDS CPU and connection metrics — if RDS CPU is also high, the bottleneck is the database
2. Check Redis cache hit rate in CloudWatch: **ElastiCache → Metrics → CacheHits / CacheMisses**
3. Identify slow queries using RDS Performance Insights:
   - **AWS Console → RDS → pricebasket-db → Performance Insights**
   - Look for queries with high `db load` or long average execution time
4. Add database indexes for frequently queried columns (see `backend/migrations/versions/002_performance_indexes.py`)
5. Increase cache TTL for expensive queries in the FastAPI service
6. If latency is caused by cold starts (tasks just scaled up), it will self-resolve within 1–2 minutes

---

### 5. `pricebasket-rds-cpu-high`

**Condition**: RDS CPU utilisation > 70% for 2 consecutive 5-minute periods

**What it means**: The database is under heavy load. Common causes: missing indexes, N+1 query patterns, a large batch job, or a traffic spike.

**Immediate action**: Check for long-running queries:
```bash
psql \
  --host=pricebasket-db.cf6ksq4yotjm.ap-south-1.rds.amazonaws.com \
  --port=5432 \
  --username=pricebasket \
  --dbname=pricebasket \
  --command="SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC LIMIT 10;"
```

**Resolution steps**:
1. Kill any runaway queries:
   ```sql
   SELECT pg_terminate_backend(<pid>);
   ```
2. Use RDS Performance Insights to identify the top SQL statements by load
3. Add missing indexes via a new Alembic migration
4. If load is sustained and legitimate, upgrade the RDS instance class:
   ```hcl
   # infra/terraform/environments/prod/terraform.tfvars
   rds_instance_class = "db.t3.medium"   # upgrade from db.t3.small
   ```
   Then run `terraform apply` (this causes a brief RDS restart — schedule during low-traffic hours)

---

### 6. `pricebasket-rds-connections-high`

**Condition**: RDS database connections > 150

**What it means**: The connection pool is nearly exhausted. `db.t3.small` supports ~170 max connections. If this limit is hit, new requests will fail with `too many connections`.

**Immediate action**: Check current connections:
```bash
psql \
  --host=pricebasket-db.cf6ksq4yotjm.ap-south-1.rds.amazonaws.com \
  --port=5432 \
  --username=pricebasket \
  --dbname=pricebasket \
  --command="SELECT count(*), state, wait_event_type, wait_event FROM pg_stat_activity GROUP BY state, wait_event_type, wait_event ORDER BY count DESC;"
```

**Resolution steps**:
1. If many connections are in `idle` state, the application is not releasing connections properly — check SQLAlchemy pool settings in `backend/app/database.py`
2. Reduce `pool_size` and `max_overflow` in the SQLAlchemy engine configuration
3. Consider deploying **PgBouncer** as a connection pooler in front of RDS:
   - PgBouncer can multiplex hundreds of application connections into a small number of actual DB connections
   - Add a PgBouncer ECS task or use AWS RDS Proxy (managed connection pooler)
4. If connections are from legitimate traffic growth, scale up the RDS instance class (more vCPUs = more allowed connections)

---

### 7. `pricebasket-ecs-tasks-zero-prod` ⚠️ CRITICAL

**Condition**: ECS running task count = 0 for the prod service

**What it means**: **The production backend is completely down.** No tasks are running, meaning all API requests are failing. This is the highest-severity alert.

**Immediate action** (do this first, investigate second):
```bash
# Force a new deployment immediately
aws ecs update-service \
  --cluster pricebasket-cluster \
  --service pricebasket-api-prod \
  --desired-count 2 \
  --force-new-deployment \
  --region ap-south-1

# Watch for tasks to start
watch -n 5 "aws ecs describe-services \
  --cluster pricebasket-cluster \
  --services pricebasket-api-prod \
  --region ap-south-1 \
  --query 'services[0].{Running:runningCount,Desired:desiredCount,Pending:pendingCount}'"
```

**Investigation steps**:
1. Check ECS service events for the reason tasks stopped:
   ```bash
   aws ecs describe-services \
     --cluster pricebasket-cluster \
     --services pricebasket-api-prod \
     --region ap-south-1 \
     --query 'services[0].events[:10]'
   ```
2. Check stopped task details:
   ```bash
   # Get stopped task ARNs
   aws ecs list-tasks \
     --cluster pricebasket-cluster \
     --service-name pricebasket-api-prod \
     --desired-status STOPPED \
     --region ap-south-1

   # Describe the stopped task
   aws ecs describe-tasks \
     --cluster pricebasket-cluster \
     --tasks <stopped-task-arn> \
     --region ap-south-1 \
     --query 'tasks[0].{StoppedReason:stoppedReason,StopCode:stopCode,Containers:containers[*].{Name:name,ExitCode:exitCode,Reason:reason}}'
   ```
3. Common causes and fixes:
   - **Exit code 1 / OOMKilled**: Memory limit too low → increase `ecs_memory` in Terraform
   - **Exit code 137**: Container killed (OOM) → same as above
   - **CannotPullContainerError**: ECR authentication issue → check IAM role permissions
   - **ResourceInitializationError**: Fargate networking issue → check VPC/subnet/security group config
   - **Health check failures**: App not starting → check logs for startup errors
4. If tasks keep crashing after restart → roll back to the previous task definition revision (see [Roll Back a Deployment](#how-to-roll-back-a-deployment))

---

## Health Check URLs

| Endpoint | URL | Expected Response |
|----------|-----|-------------------|
| **Backend health** | `http://pricebasket-alb-72968209.ap-south-1.elb.amazonaws.com/health` | `{"status": "ok"}` |
| **API documentation** | `http://pricebasket-alb-72968209.ap-south-1.elb.amazonaws.com/docs` | Swagger UI (200 OK) |
| **Frontend** | `https://pricebasket.in` | HTML page (200 OK) |

Quick health check script:
```bash
#!/bin/bash
echo "=== Backend Health ==="
curl -s -o /dev/null -w "HTTP %{http_code} in %{time_total}s\n" \
  http://pricebasket-alb-72968209.ap-south-1.elb.amazonaws.com/health

echo "=== Frontend Health ==="
curl -s -o /dev/null -w "HTTP %{http_code} in %{time_total}s\n" \
  https://pricebasket.in
```

---

## Useful AWS CLI Commands (Quick Reference)

### ECS

```bash
# List all services in the cluster
aws ecs list-services \
  --cluster pricebasket-cluster \
  --region ap-south-1

# Describe a specific service (running count, desired count, status)
aws ecs describe-services \
  --cluster pricebasket-cluster \
  --services pricebasket-api-prod \
  --region ap-south-1 \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Pending:pendingCount,TaskDef:taskDefinition}'

# Force a new deployment (rolling restart)
aws ecs update-service \
  --cluster pricebasket-cluster \
  --service pricebasket-api-prod \
  --force-new-deployment \
  --region ap-south-1

# List running tasks
aws ecs list-tasks \
  --cluster pricebasket-cluster \
  --service-name pricebasket-api-prod \
  --region ap-south-1

# Describe a task (get container details, exit codes, stop reason)
aws ecs describe-tasks \
  --cluster pricebasket-cluster \
  --tasks <task-arn> \
  --region ap-south-1
```

### ECR

```bash
# List all images in the repository (sorted by push date)
aws ecr describe-images \
  --repository-name pricebasket-api \
  --region ap-south-1 \
  --query 'sort_by(imageDetails, &imagePushedAt)[-10:].{Tag:imageTags[0],Pushed:imagePushedAt,Size:imageSizeInBytes}' \
  --output table

# List images with a specific tag prefix
aws ecr list-images \
  --repository-name pricebasket-api \
  --region ap-south-1 \
  --filter tagStatus=TAGGED \
  --query 'imageIds[?starts_with(imageTag, `prod-`)]'

# Get ECR login token (for docker push/pull)
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin \
  443414059511.dkr.ecr.ap-south-1.amazonaws.com
```

### ALB

```bash
# Check ALB target group health (are ECS tasks passing health checks?)
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups \
    --region ap-south-1 \
    --query 'TargetGroups[?contains(TargetGroupName, `pricebasket`)].TargetGroupArn' \
    --output text | head -1) \
  --region ap-south-1 \
  --query 'TargetHealthDescriptions[*].{Target:Target.Id,Port:Target.Port,State:TargetHealth.State,Reason:TargetHealth.Reason}'

# Describe the ALB
aws elbv2 describe-load-balancers \
  --names pricebasket-alb \
  --region ap-south-1 \
  --query 'LoadBalancers[0].{DNS:DNSName,State:State.Code,AZs:AvailabilityZones[*].ZoneName}'
```

### RDS

```bash
# Describe the RDS instance (status, endpoint, storage)
aws rds describe-db-instances \
  --db-instance-identifier pricebasket-db \
  --region ap-south-1 \
  --query 'DBInstances[0].{Status:DBInstanceStatus,Endpoint:Endpoint.Address,Class:DBInstanceClass,MultiAZ:MultiAZ,Storage:AllocatedStorage}'

# List available automated snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier pricebasket-db \
  --snapshot-type automated \
  --region ap-south-1 \
  --query 'DBSnapshots[*].{ID:DBSnapshotIdentifier,Time:SnapshotCreateTime,Status:Status}' \
  --output table

# Create a manual snapshot before risky operations
aws rds create-db-snapshot \
  --db-instance-identifier pricebasket-db \
  --db-snapshot-identifier pricebasket-db-manual-$(date +%Y%m%d%H%M) \
  --region ap-south-1
```

### ElastiCache Redis

```bash
# Check Redis cluster status
aws elasticache describe-cache-clusters \
  --cache-cluster-id pricebasket-redis \
  --region ap-south-1 \
  --query 'CacheClusters[0].{Status:CacheClusterStatus,Engine:Engine,EngineVersion:EngineVersion,Endpoint:RedisConfiguration.PrimaryEndpoint}'

# Describe replication group (if using cluster mode)
aws elasticache describe-replication-groups \
  --region ap-south-1 \
  --query 'ReplicationGroups[?contains(ReplicationGroupId, `pricebasket`)].{ID:ReplicationGroupId,Status:Status,Endpoint:NodeGroups[0].PrimaryEndpoint}'
```

### CloudWatch Alarms

```bash
# List all PriceBasket alarms and their current state
aws cloudwatch describe-alarms \
  --alarm-name-prefix pricebasket \
  --region ap-south-1 \
  --query 'MetricAlarms[*].{Name:AlarmName,State:StateValue,Reason:StateReason}' \
  --output table

# Get alarm history (useful during incident investigation)
aws cloudwatch describe-alarm-history \
  --alarm-name pricebasket-ecs-tasks-zero-prod \
  --region ap-south-1 \
  --query 'AlarmHistoryItems[*].{Time:Timestamp,Type:HistoryItemType,Summary:HistorySummary}' \
  --output table
```
