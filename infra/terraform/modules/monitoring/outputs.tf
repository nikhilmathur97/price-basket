output "sns_topic_arn" {
  description = "ARN of the SNS alerts topic"
  value       = aws_sns_topic.alerts.arn
}

output "s3_backup_bucket_name" {
  description = "Name of the S3 backup bucket"
  value       = aws_s3_bucket.db_backups.bucket
}

output "s3_backup_bucket_arn" {
  description = "ARN of the S3 backup bucket"
  value       = aws_s3_bucket.db_backups.arn
}

output "log_group_dev_name" {
  description = "Name of the dev ECS CloudWatch log group"
  value       = aws_cloudwatch_log_group.ecs_dev.name
}

output "log_group_prod_name" {
  description = "Name of the prod ECS CloudWatch log group"
  value       = aws_cloudwatch_log_group.ecs_prod.name
}
