terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# ─── CloudWatch Log Groups ────────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "ecs_dev" {
  name              = "/ecs/pricebasket-api-dev"
  retention_in_days = 30

  tags = {
    Name        = "/ecs/pricebasket-api-dev"
    Environment = "dev"
  }
}

resource "aws_cloudwatch_log_group" "ecs_prod" {
  name              = "/ecs/pricebasket-api-prod"
  retention_in_days = 30

  tags = {
    Name        = "/ecs/pricebasket-api-prod"
    Environment = "prod"
  }
}

# ─── SNS Topic ────────────────────────────────────────────────────────────────
resource "aws_sns_topic" "alerts" {
  name = "pricebasket-alerts"

  tags = {
    Name = "pricebasket-alerts"
  }
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# ─── S3 Backup Bucket ─────────────────────────────────────────────────────────
resource "aws_s3_bucket" "db_backups" {
  bucket = "pricebasket-db-backups-${var.aws_account_id}"

  tags = {
    Name = "pricebasket-db-backups-${var.aws_account_id}"
  }
}

resource "aws_s3_bucket_versioning" "db_backups" {
  bucket = aws_s3_bucket.db_backups.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "db_backups" {
  bucket = aws_s3_bucket.db_backups.id

  rule {
    id     = "expire-old-backups"
    status = "Enabled"

    expiration {
      days = 30
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "db_backups" {
  bucket = aws_s3_bucket.db_backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "db_backups" {
  bucket = aws_s3_bucket.db_backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ─── ECS CPU Alarms ───────────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high_dev" {
  alarm_name          = "pricebasket-ecs-cpu-high-dev"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ECS CPU utilization > 80% for dev environment"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = "pricebasket-cluster"
    ServiceName = "pricebasket-api-dev"
  }

  tags = {
    Name        = "pricebasket-ecs-cpu-high-dev"
    Environment = "dev"
  }
}

resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high_prod" {
  alarm_name          = "pricebasket-ecs-cpu-high-prod"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ECS CPU utilization > 80% for prod environment"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = "pricebasket-cluster"
    ServiceName = "pricebasket-api-prod"
  }

  tags = {
    Name        = "pricebasket-ecs-cpu-high-prod"
    Environment = "prod"
  }
}

# ─── ECS Memory Alarms ────────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "ecs_memory_high_dev" {
  alarm_name          = "pricebasket-ecs-memory-high-dev"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ECS Memory utilization > 80% for dev environment"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = "pricebasket-cluster"
    ServiceName = "pricebasket-api-dev"
  }

  tags = {
    Name        = "pricebasket-ecs-memory-high-dev"
    Environment = "dev"
  }
}

resource "aws_cloudwatch_metric_alarm" "ecs_memory_high_prod" {
  alarm_name          = "pricebasket-ecs-memory-high-prod"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ECS Memory utilization > 80% for prod environment"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = "pricebasket-cluster"
    ServiceName = "pricebasket-api-prod"
  }

  tags = {
    Name        = "pricebasket-ecs-memory-high-prod"
    Environment = "prod"
  }
}

# ─── ALB 5xx Alarms ───────────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "alb_5xx_high_dev" {
  alarm_name          = "pricebasket-alb-5xx-high-dev"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "ALB 5xx error count > 10 in 60s for dev"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix_dev
  }

  tags = {
    Name        = "pricebasket-alb-5xx-high-dev"
    Environment = "dev"
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx_high_prod" {
  alarm_name          = "pricebasket-alb-5xx-high-prod"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "ALB 5xx error count > 10 in 60s for prod"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix_prod
  }

  tags = {
    Name        = "pricebasket-alb-5xx-high-prod"
    Environment = "prod"
  }
}

# ─── ALB Latency Alarms ───────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "alb_latency_high_dev" {
  alarm_name          = "pricebasket-alb-latency-high-dev"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Average"
  threshold           = 2
  alarm_description   = "ALB response time > 2s for dev"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix_dev
  }

  tags = {
    Name        = "pricebasket-alb-latency-high-dev"
    Environment = "dev"
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_latency_high_prod" {
  alarm_name          = "pricebasket-alb-latency-high-prod"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Average"
  threshold           = 2
  alarm_description   = "ALB response time > 2s for prod"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix_prod
  }

  tags = {
    Name        = "pricebasket-alb-latency-high-prod"
    Environment = "prod"
  }
}

# ─── RDS CPU Alarm ────────────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "pricebasket-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 70
  alarm_description   = "RDS CPU utilization > 70%"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  tags = {
    Name = "pricebasket-rds-cpu-high"
  }
}

# ─── RDS Connections Alarm ────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "rds_connections_high" {
  alarm_name          = "pricebasket-rds-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 150
  alarm_description   = "RDS connection count > 150"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  tags = {
    Name = "pricebasket-rds-connections-high"
  }
}

# ─── ECS Running Tasks = 0 Alarms ────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "ecs_tasks_zero_dev" {
  alarm_name          = "pricebasket-ecs-tasks-zero-dev"
  comparison_operator = "LessThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "RunningTaskCount"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 0
  alarm_description   = "ECS running task count = 0 for dev (service is down)"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "breaching"

  dimensions = {
    ClusterName = "pricebasket-cluster"
    ServiceName = "pricebasket-api-dev"
  }

  tags = {
    Name        = "pricebasket-ecs-tasks-zero-dev"
    Environment = "dev"
  }
}

resource "aws_cloudwatch_metric_alarm" "ecs_tasks_zero_prod" {
  alarm_name          = "pricebasket-ecs-tasks-zero-prod"
  comparison_operator = "LessThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "RunningTaskCount"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 0
  alarm_description   = "ECS running task count = 0 for prod (service is down)"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "breaching"

  dimensions = {
    ClusterName = "pricebasket-cluster"
    ServiceName = "pricebasket-api-prod"
  }

  tags = {
    Name        = "pricebasket-ecs-tasks-zero-prod"
    Environment = "prod"
  }
}
