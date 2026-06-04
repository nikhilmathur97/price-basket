variable "environment" {
  description = "Deployment environment (dev or prod)"
  type        = string
}

variable "repository_name" {
  description = "Name of the ECR repository"
  type        = string
  default     = "pricebasket-api"
}
