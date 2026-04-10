# ─────────────────────────────────────────────────────────────
# Variables — change these per environment (dev / staging / prod)
# ─────────────────────────────────────────────────────────────

variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-southeast-1"   # Singapore — closest to Malaysia
}

variable "app_name" {
  description = "Application name prefix for all resources"
  type        = string
  default     = "flood-monitoring"
}

variable "environment" {
  description = "Environment name: dev, staging, prod"
  type        = string
  default     = "prod"
}

variable "api_port" {
  description = "Port the API container listens on"
  type        = number
  default     = 3001
}

variable "github_username" {
  description = "GitHub username for GHCR image pulls (ghcr.io/<username>/<app>)"
  type        = string
}

variable "domain_name" {
  description = "Root domain (e.g. floodmonitor.com) — ACM cert issued for api.<domain>"
  type        = string
}

variable "ecs_desired_count" {
  description = "Number of ECS tasks to run normally (1 = ~$20/month, 2 = ~$40/month)"
  type        = number
  default     = 1
}

variable "ecs_max_count" {
  description = "Maximum ECS tasks auto-scaling can scale up to"
  type        = number
  default     = 5
}

# Sensitive — pass via environment variable:
#   TF_VAR_database_url="jdbc:postgresql://..."
#   TF_VAR_jwt_secret="..."
variable "database_url" {
  description = "Neon PostgreSQL JDBC connection string"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "jwt_refresh_secret" {
  description = "JWT refresh token signing secret"
  type        = string
  sensitive   = true
}

variable "redis_url" {
  description = "Upstash Redis URL (optional)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "google_maps_api_key" {
  description = "Google Maps API key for CRM"
  type        = string
  sensitive   = true
  default     = ""
}
