variable "aws_account_id" {
  description = "AWS account ID (used for S3 bucket naming)"
  type        = string
  default     = "443414059511"
}

variable "alert_email" {
  description = "Email address to receive CloudWatch alarm notifications"
  type        = string
  default     = "alerts@pricebasket.in"
}

variable "alb_arn_suffix_dev" {
  description = "ARN suffix of the dev ALB (used as CloudWatch dimension). Format: app/name/id"
  type        = string
  default     = ""
}

variable "alb_arn_suffix_prod" {
  description = "ARN suffix of the prod ALB (used as CloudWatch dimension). Format: app/name/id"
  type        = string
  default     = ""
}

variable "rds_instance_id" {
  description = "RDS DB instance identifier for CloudWatch alarms"
  type        = string
  default     = ""
}
