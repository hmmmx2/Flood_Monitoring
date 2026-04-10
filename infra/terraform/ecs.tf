# ─────────────────────────────────────────────────────────────
# ECS Fargate — API Service
#
# Cost breakdown (ap-southeast-1, always running):
#   0.5 vCPU  × $0.04506/hr × 730hrs = ~$16.45/month
#   1.0 GB    × $0.00493/hr × 730hrs = ~$3.60/month
#   Per pod total:                     ~$20/month
#
#   1 pod (NGO scale):  ~$20/month  ✅ budget safe
#   2 pods (HA):        ~$40/month  ✅ still under $50 with free ALB tier
#
# No NAT Gateway: tasks run in PUBLIC subnets with public IPs
#   → saves $32/month vs using private subnets + NAT Gateway
#   → still secure: ECS security group only allows ALB inbound
# ─────────────────────────────────────────────────────────────

# ── IAM Roles ──────────────────────────────────────────────────

# Execution role — allows ECS to pull images and read SSM secrets
resource "aws_iam_role" "ecs_execution" {
  name = "${var.app_name}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "ecs_execution_policy" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Extra policy — allows execution role to read SSM SecureString secrets
resource "aws_iam_role_policy" "ecs_ssm_access" {
  name = "${var.app_name}-ecs-ssm-policy"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ssm:GetParameters",
        "ssm:GetParameter",
        "kms:Decrypt"
      ]
      Resource = [
        aws_ssm_parameter.database_url.arn,
        aws_ssm_parameter.jwt_secret.arn,
        aws_ssm_parameter.jwt_refresh_secret.arn,
        aws_ssm_parameter.google_maps_api_key.arn
      ]
    }]
  })
}

# Task role — permissions the running container has at runtime
# SQS access removed — IoT ingest is now synchronous (see sqs.tf)
resource "aws_iam_role" "ecs_task" {
  name = "${var.app_name}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = local.common_tags
}

# ── CloudWatch Log Group ────────────────────────────────────────
resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${var.app_name}-api"
  retention_in_days = 30    # Keep logs 30 days — free up to 5GB/month

  tags = local.common_tags
}

# ── ECS Cluster ────────────────────────────────────────────────
resource "aws_ecs_cluster" "main" {
  name = "${var.app_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "disabled"    # Save cost — enable only when debugging
  }

  tags = local.common_tags
}

# ── Task Definition — what container to run and how ────────────
resource "aws_ecs_task_definition" "api" {
  family                   = "${var.app_name}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512      # 0.5 vCPU
  memory                   = 1024     # 1 GB — minimum recommended for Spring Boot
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "flood-api"

    # Image from GitHub Container Registry (free) — no ECR cost
    # Format: ghcr.io/<github-username>/<repo-name>:latest
    image     = "ghcr.io/${var.github_username}/${var.app_name}-api:latest"

    essential = true

    portMappings = [{
      containerPort = var.api_port
      protocol      = "tcp"
    }]

    # Non-sensitive environment variables
    environment = [
      { name = "NODE_ENV",    value = var.environment },
      { name = "SERVER_PORT", value = tostring(var.api_port) }
    ]

    # Sensitive values pulled from SSM Parameter Store at startup
    # Never stored in task definition — encrypted in AWS
    secrets = [
      { name = "DATABASE_URL",       valueFrom = aws_ssm_parameter.database_url.arn },
      { name = "JWT_SECRET",         valueFrom = aws_ssm_parameter.jwt_secret.arn },
      { name = "JWT_REFRESH_SECRET", valueFrom = aws_ssm_parameter.jwt_refresh_secret.arn }
    ]

    # JVM tuning for 1GB container — prevents OutOfMemoryError
    command = [
      "java",
      "-Xmx768m",       # Max heap: 768MB (leaves 256MB for OS + JVM overhead)
      "-Xms256m",       # Initial heap: 256MB
      "-XX:+UseG1GC",   # G1GC — best for containerized Java
      "-jar", "app.jar"
    ]

    healthCheck = {
      command     = ["CMD-SHELL", "wget -qO- http://localhost:${var.api_port}/actuator/health || exit 1"]
      interval    = 30
      timeout     = 10
      retries     = 3
      startPeriod = 60    # Spring Boot needs ~40s to start
    }

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.api.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = local.common_tags
}

# ── ECS Service ─────────────────────────────────────────────────
resource "aws_ecs_service" "api" {
  name            = "${var.app_name}-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.ecs_desired_count   # 1 = ~$20/month, 2 = ~$40/month
  launch_type     = "FARGATE"

  network_configuration {
    # PUBLIC subnets + public IP = no NAT Gateway needed = saves $32/month
    subnets          = [aws_subnet.public_a.id, aws_subnet.public_b.id]
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true    # Required when no NAT Gateway
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "flood-api"
    container_port   = var.api_port
  }

  deployment_controller {
    type = "ECS"    # Rolling deploy — zero downtime
  }

  # Minimum 50% healthy during deploy, max 200% (new tasks spin up before old stop)
  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  depends_on = [
    aws_lb_listener.https,
    aws_iam_role_policy_attachment.ecs_execution_policy
  ]

  tags = local.common_tags
}

# ── Auto Scaling ────────────────────────────────────────────────
resource "aws_appautoscaling_target" "api" {
  max_capacity       = var.ecs_max_count
  min_capacity       = var.ecs_desired_count
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Scale up when CPU > 70% for 2 consecutive minutes
resource "aws_appautoscaling_policy" "api_cpu" {
  name               = "${var.app_name}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api.resource_id
  scalable_dimension = aws_appautoscaling_target.api.scalable_dimension
  service_namespace  = aws_appautoscaling_target.api.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300    # Wait 5 min before scaling down
    scale_out_cooldown = 60     # Scale up fast (1 min)
  }
}
