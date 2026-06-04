output "vpc_id" {
  description = "ID of the dev VPC"
  value       = module.vpc.vpc_id
}

output "alb_dns_name" {
  description = "DNS name of the dev ALB"
  value       = module.alb.alb_dns_name
}

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = module.ecr.repository_url
}

output "rds_endpoint" {
  description = "Endpoint of the dev RDS instance"
  value       = module.rds.db_instance_endpoint
}

output "redis_endpoint" {
  description = "Endpoint of the dev Redis cluster"
  value       = module.redis.redis_endpoint
}

output "ecs_service_name" {
  description = "Name of the dev ECS service"
  value       = module.ecs.ecs_service_name
}

output "sns_alerts_arn" {
  description = "ARN of the SNS alerts topic"
  value       = module.monitoring.sns_topic_arn
}

output "s3_backup_bucket" {
  description = "Name of the S3 backup bucket"
  value       = module.monitoring.s3_backup_bucket_name
}
