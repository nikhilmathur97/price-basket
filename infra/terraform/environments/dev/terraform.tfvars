# Dev environment — Terraform variable overrides
# ⚠️  NEVER commit real passwords. Set db_password via:
#     export TF_VAR_db_password="your-dev-password"

environment    = "dev"
aws_region     = "ap-south-1"

# ECS — 0.5 vCPU / 1 GB RAM, 1 task (cost-optimised for dev)
ecs_cpu           = 512
ecs_memory        = 1024
ecs_desired_count = 1

# RDS — db.t3.micro for dev (cheapest)
rds_instance_class      = "db.t3.micro"
rds_multi_az            = false
rds_skip_final_snapshot = true   # dev DB can be destroyed without snapshot

# Redis
redis_node_type = "cache.t3.micro"

# db_password — DO NOT set here. Use environment variable:
#   export TF_VAR_db_password="CHANGE_ME_BEFORE_APPLY"
