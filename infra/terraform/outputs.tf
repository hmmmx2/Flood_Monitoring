# ─────────────────────────────────────────────────────────────
# Outputs — printed after terraform apply
# Use these to configure Cloudflare DNS
# ─────────────────────────────────────────────────────────────

output "alb_dns_name" {
  description = "ALB DNS name — add as CNAME in Cloudflare for api.<domain>"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "ALB hosted zone ID — used for Route53 alias records if needed"
  value       = aws_lb.main.zone_id
}

output "ecs_cluster_name" {
  description = "ECS cluster name — use with AWS CLI to manage tasks"
  value       = aws_ecs_cluster.main.name
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group for API container logs"
  value       = aws_cloudwatch_log_group.api.name
}

output "cloudflare_dns_instructions" {
  description = "Add these records in Cloudflare to point your domain at the ALB"
  value = <<-EOT
    Cloudflare DNS records to add:
    ──────────────────────────────────────────────────────────
    Type   Name   Value                              Proxied
    CNAME  api    ${aws_lb.main.dns_name}    YES (orange ☁)
    ──────────────────────────────────────────────────────────
    Note: Cloudflare proxies HTTPS — ALB cert must cover api.<domain>.
    ACM validates automatically via Route53 (handled by Terraform).
  EOT
}
