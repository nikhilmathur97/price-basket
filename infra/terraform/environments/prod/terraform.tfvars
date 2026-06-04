# Production environment — Terraform variable overrides
# ⚠️  NEVER commit real passwords. Set db_password via:
#     export TF_VAR_db_password="your-secure-password"
# OR use AWS Secrets Manager and reference it in the ECS task definition.

environment    = "prod"
aws_region     = "ap-south-1"

# ECS — 1 vCPU / 2 GB RAM, 2 tasks for HA
ecs_cpu           = 1024
ecs_memory        = 2048
ecs_desired_count = 2

# RDS — db.t3.small for prod (more connections than micro)
rds_instance_class      = "db.t3.small"
rds_multi_az            = false   # set true for full HA (costs 2x)
rds_skip_final_snapshot = false   # always keep final snapshot in prod

# Redis
redis_node_type = "cache.t3.micro"

# db_password — DO NOT set here. Use environment variable:
#   export TF_VAR_db_password="CHANGE_ME_BEFORE_APPLY"
