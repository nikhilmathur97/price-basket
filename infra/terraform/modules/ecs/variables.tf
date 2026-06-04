variable "environment" {
  description = "Deployment environment (dev or prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"
}

variable "create_cluster" {
  description = "Whether to create a new ECS cluster (false = use existing pricebasket-cluster)"
  type        = bool
  default     = false
}

variable "cpu" {
  description = "CPU units for the ECS task (256, 512, 1024, 2048, 4096)"
  type        = number
  default     = 512
}

variable "memory" {
  description = "Memory (MB) for the ECS task"
  type        = number
  default     = 1024
}

variable "desired_count" {
  description = "Desired number of ECS task instances"
  type        = number
  default     = 1
}

variable "ecr_repository_url" {
  description = "URL of the ECR repository (without tag)"
  type        = string
}

variable "database_url" {
  description = "PostgreSQL connection URL for the application"
  type        = string
  sensitive   = true
}

variable "redis_url" {
  description = "Redis connection URL for the application"
  type        = string
  sensitive   = true
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "ecs_sg_id" {
  description = "Security group ID for ECS tasks"
  type        = string
}

variable "target_group_arn" {
  description = "ARN of the ALB target group to attach the ECS service to"
  type        = string
}
