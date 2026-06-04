terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket  = "pricebasket-terraform-state"
    key     = "dev/terraform.tfstate"
    region  = "ap-south-1"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
}

# ─── VPC ──────────────────────────────────────────────────────────────────────
module "vpc" {
  source = "../../modules/vpc"

  environment          = var.environment
  vpc_cidr             = "10.0.0.0/16"
  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24"]
  availability_zones   = ["ap-south-1a", "ap-south-1b"]
}

# ─── ECR ──────────────────────────────────────────────────────────────────────
module "ecr" {
  source = "../../modules/ecr"

  environment     = var.environment
  repository_name = "pricebasket-api"
}

# ─── ALB ──────────────────────────────────────────────────────────────────────
module "alb" {
  source = "../../modules/alb"

  environment       = var.environment
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  alb_sg_id         = module.vpc.alb_sg_id
  certificate_arn   = ""
}

# ─── RDS ──────────────────────────────────────────────────────────────────────
module "rds" {
  source = "../../modules/rds"

  environment         = var.environment
  private_subnet_ids  = module.vpc.private_subnet_ids
  rds_sg_id           = module.vpc.rds_sg_id
  instance_class      = var.rds_instance_class
  db_password         = var.db_password
  multi_az            = var.rds_multi_az
  skip_final_snapshot = var.rds_skip_final_snapshot
}

# ─── Redis ────────────────────────────────────────────────────────────────────
module "redis" {
  source = "../../modules/redis"

  environment        = var.environment
  private_subnet_ids = module.vpc.private_subnet_ids
  redis_sg_id        = module.vpc.redis_sg_id
  node_type          = var.redis_node_type
}

# ─── ECS ──────────────────────────────────────────────────────────────────────
module "ecs" {
  source = "../../modules/ecs"

  environment        = var.environment
  aws_region         = var.aws_region
  create_cluster     = false
  cpu                = var.ecs_cpu
  memory             = var.ecs_memory
  desired_count      = var.ecs_desired_count
  ecr_repository_url = module.ecr.repository_url
  database_url       = "postgresql://pricebasket_user:${var.db_password}@${module.rds.db_instance_address}:5432/pricebasket"
  redis_url          = module.redis.redis_url
  private_subnet_ids = module.vpc.private_subnet_ids
  ecs_sg_id          = module.vpc.ecs_sg_id
  target_group_arn   = module.alb.target_group_arn
}

# ─── Monitoring ───────────────────────────────────────────────────────────────
module "monitoring" {
  source = "../../modules/monitoring"

  aws_account_id      = "443414059511"
  alert_email         = "alerts@pricebasket.in"
  alb_arn_suffix_dev  = module.alb.alb_arn
  alb_arn_suffix_prod = ""
  rds_instance_id     = module.rds.db_instance_id
}
