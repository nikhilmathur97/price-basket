variable "project" {
  description = "Project name prefix for all resources"
  type        = string
  default     = "pricebasket"
}

variable "environment" {
  description = "Deployment environment (prod | staging)"
  type        = string
  default     = "prod"
}

variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "production" {
  description = "Enable production-grade settings (multi-AZ, etc.)"
  type        = bool
  default     = true
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.medium"
}

variable "redis_node_type" {
  type    = string
  default = "cache.t4g.micro"
}

variable "acm_certificate_arn" {
  description = "ARN of the ACM TLS certificate for the ALB"
  type        = string
}
