# ─────────────────────────────────────────────────────────────
# DEPRECATED — App Runner removed
#
# Originally used AWS App Runner for zero-config container hosting.
# Replaced with ECS Fargate + ALB (see ecs.tf + alb.tf) because:
#   - ALB gives full control over routing, health checks, TLS
#   - ECS Fargate costs are predictable (~$20/month for 1 task)
#   - App Runner charges per request at scale — less predictable
#   - App Runner does not support VPC egress without extra cost
#
# All resources moved to:
#   ecs.tf          — ECS cluster, task definition, service, auto-scaling
#   alb.tf          — ALB, HTTPS listener, ACM cert, Route53 DNS validation
#   vpc.tf          — VPC, public subnets, Internet Gateway
#   security_groups.tf — ALB SG + ECS SG
# ─────────────────────────────────────────────────────────────
