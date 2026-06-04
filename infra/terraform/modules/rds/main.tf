terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# ─── DB Subnet Group ──────────────────────────────────────────────────────────
resource "aws_db_subnet_group" "main" {
  name       = "pricebasket-db-subnet-group-${var.environment}"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name        = "pricebasket-db-subnet-group-${var.environment}"
    Environment = var.environment
  }
}

# ─── DB Parameter Group ───────────────────────────────────────────────────────
resource "aws_db_parameter_group" "main" {
  name   = "pricebasket-pg15-${var.environment}"
  family = "postgres15"

  parameter {
    name  = "max_connections"
    value = "200"
  }

  tags = {
    Name        = "pricebasket-pg15-${var.environment}"
    Environment = var.environment
  }
}

# ─── RDS PostgreSQL Instance ──────────────────────────────────────────────────
resource "aws_db_instance" "main" {
  identifier = "pricebasket-db-${var.environment}"

  engine         = "postgres"
  engine_version = "15.7"
  instance_class = var.instance_class

  db_name  = "pricebasket"
  username = "pricebasket_user"
  password = var.db_password

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp2"
  storage_encrypted     = true

  multi_az               = var.multi_az
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.rds_sg_id]
  parameter_group_name   = aws_db_parameter_group.main.name

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "pricebasket-db-${var.environment}-final-snapshot"

  deletion_protection = var.environment == "prod" ? true : false

  performance_insights_enabled = true

  tags = {
    Name        = "pricebasket-db-${var.environment}"
    Environment = var.environment
  }
}
