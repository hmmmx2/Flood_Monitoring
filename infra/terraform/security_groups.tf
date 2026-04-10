# ─────────────────────────────────────────────────────────────
# Security Groups
#
# ALB SG:  accepts HTTPS (443) and HTTP (80) from the internet
#          (Cloudflare proxied IPs in production)
#
# ECS SG:  accepts traffic ONLY from the ALB security group
#          on the API port — not directly from the internet
#          even though ECS tasks have public IPs
# ─────────────────────────────────────────────────────────────

# ── ALB Security Group ─────────────────────────────────────────
resource "aws_security_group" "alb" {
  name        = "${var.app_name}-alb-sg"
  description = "Allow HTTPS and HTTP inbound to ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTPS from internet (via Cloudflare)"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP from internet (redirected to HTTPS)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, { Name = "${var.app_name}-alb-sg" })
}

# ── ECS Tasks Security Group ───────────────────────────────────
resource "aws_security_group" "ecs_tasks" {
  name        = "${var.app_name}-ecs-sg"
  description = "Allow inbound from ALB only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "API port — from ALB only"
    from_port       = var.api_port
    to_port         = var.api_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]   # Only ALB can reach tasks
  }

  egress {
    description = "Allow all outbound (reach Neon, Upstash, GitHub Registry)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, { Name = "${var.app_name}-ecs-sg" })
}
