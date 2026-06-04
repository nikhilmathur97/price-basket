terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# ─── ECS Cluster (optional — set create_cluster = false if it already exists) ─
resource "aws_ecs_cluster" "main" {
  count = var.create_cluster ? 1 : 0

  name = "pricebasket-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "pricebasket-cluster"
    Environment = var.environment
  }
}

locals {
  cluster_name = var.create_cluster ? aws_ecs_cluster.main[0].name : "pricebasket-cluster"
  image_tag    = var.environment == "prod" ? "latest" : "dev"
}

# ─── CloudWatch Log Group ─────────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/pricebasket-api-${var.environment}"
  retention_in_days = 30

  tags = {
    Name        = "/ecs/pricebasket-api-${var.environment}"
    Environment = var.environment
  }
}

# ─── IAM: ECS Task Execution Role ────────────────────────────────────────────
resource "aws_iam_role" "ecs_execution_role" {
  name = "pricebasket-ecs-execution-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "pricebasket-ecs-execution-role-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_execution_cloudwatch" {
  name = "pricebasket-ecs-cloudwatch-${var.environment}"
  role = aws_iam_role.ecs_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# ─── IAM: ECS Task Role ───────────────────────────────────────────────────────
resource "aws_iam_role" "ecs_task_role" {
  name = "pricebasket-ecs-task-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "pricebasket-ecs-task-role-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy" "ecs_task_s3_read" {
  name = "pricebasket-ecs-s3-read-${var.environment}"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::pricebasket-db-backups-*",
          "arn:aws:s3:::pricebasket-db-backups-*/*"
        ]
      }
    ]
  })
}

# ─── ECS Task Definition ──────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "api" {
  family                   = "pricebasket-api-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "pricebasket-api"
      image     = "${var.ecr_repository_url}:${local.image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = 8000
          hostPort      = 8000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "DATABASE_URL"
          value = var.database_url
        },
        {
          name  = "REDIS_URL"
          value = var.redis_url
        },
        {
          name  = "ENVIRONMENT"
          value = var.environment
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name        = "pricebasket-api-${var.environment}"
    Environment = var.environment
  }
}

# ─── ECS Service ──────────────────────────────────────────────────────────────
resource "aws_ecs_service" "api" {
  name            = "pricebasket-api-${var.environment}"
  cluster         = local.cluster_name
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_sg_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "pricebasket-api"
    container_port   = 8000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_controller {
    type = "ECS"
  }

  # Allow external changes to desired_count without Terraform drift
  lifecycle {
    ignore_changes = [desired_count]
  }

  tags = {
    Name        = "pricebasket-api-${var.environment}"
    Environment = var.environment
  }

  depends_on = [aws_iam_role_policy_attachment.ecs_execution_role_policy]
}
