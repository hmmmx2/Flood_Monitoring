# ─────────────────────────────────────────────────────────────
# Application Load Balancer
#
# Cost: ~$18–22/month (fixed regardless of traffic)
# Note: FREE for 12 months on new AWS accounts (free tier)
#
# Handles:
#   - HTTPS termination (Cloudflare → ALB → ECS over HTTP)
#   - HTTP → HTTPS redirect
#   - Health checks on ECS tasks
#   - Routes /api/* and /* to ECS API target group
# ─────────────────────────────────────────────────────────────

resource "aws_lb" "main" {
  name               = "${var.app_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public_a.id, aws_subnet.public_b.id]

  # Access logs — optional, enable if you want request-level logging
  # access_logs {
  #   bucket  = aws_s3_bucket.logs.bucket
  #   enabled = true
  # }

  tags = local.common_tags
}

# ── Target Group — ECS API tasks ──────────────────────────────
resource "aws_lb_target_group" "api" {
  name        = "${var.app_name}-api-tg"
  port        = var.api_port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"    # Required for Fargate

  health_check {
    enabled             = true
    path                = "/actuator/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 10
    interval            = 30
    matcher             = "200"
  }

  # Deregistration delay — how long ALB waits before removing a task
  # Reduce from default 300s to 30s for faster deployments
  deregistration_delay = 30

  tags = local.common_tags
}

# ── HTTPS Listener (port 443) ──────────────────────────────────
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.api.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

# ── HTTP Listener — redirect to HTTPS ─────────────────────────
resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ── ACM Certificate (HTTPS) ────────────────────────────────────
# Free SSL certificate from AWS Certificate Manager
# Cloudflare proxies traffic, ALB terminates TLS

resource "aws_acm_certificate" "api" {
  domain_name       = "api.${var.domain_name}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = local.common_tags
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# DNS validation record (if using Route53)
# If using Cloudflare for DNS, add the CNAME record manually from:
# aws_acm_certificate.api.domain_validation_options
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}
