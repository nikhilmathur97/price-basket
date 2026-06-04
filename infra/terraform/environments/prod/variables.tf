variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "prod"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"
}

variable "ecs_cpu" {
  description = "CPU units for ECS task"
  type        = number
  default     = 1024
}

variable "ecs_memory" {
  description = "Memory (MB) for ECS task"
  type        = number
  default     = 2048
}

variable "ecs_desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 2
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.small"
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "rds_multi_az" {
  description = "Enable RDS Multi-AZ"
  type        = bool
  default     = false
}

variable "rds_skip_final_snapshot" {
  description = "Skip final RDS snapshot on destroy"
  type        = bool
  default     = false
}

variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}
