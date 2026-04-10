# ─────────────────────────────────────────────────────────────
# SSM Parameter Store — encrypted secret storage
# Secrets are never stored in Terraform state as plain text
# App Runner reads them directly at runtime
# ─────────────────────────────────────────────────────────────

resource "aws_ssm_parameter" "database_url" {
  name        = "/${var.app_name}/${var.environment}/DATABASE_URL"
  description = "Neon PostgreSQL JDBC connection string"
  type        = "SecureString"    # Encrypted with AWS KMS
  value       = var.database_url

  tags = local.common_tags
}

resource "aws_ssm_parameter" "jwt_secret" {
  name        = "/${var.app_name}/${var.environment}/JWT_SECRET"
  description = "JWT access token signing secret"
  type        = "SecureString"
  value       = var.jwt_secret

  tags = local.common_tags
}

resource "aws_ssm_parameter" "jwt_refresh_secret" {
  name        = "/${var.app_name}/${var.environment}/JWT_REFRESH_SECRET"
  description = "JWT refresh token signing secret"
  type        = "SecureString"
  value       = var.jwt_refresh_secret

  tags = local.common_tags
}

resource "aws_ssm_parameter" "google_maps_api_key" {
  name        = "/${var.app_name}/${var.environment}/GOOGLE_MAPS_API_KEY"
  description = "Google Maps API key"
  type        = "SecureString"
  value       = var.google_maps_api_key == "" ? "placeholder" : var.google_maps_api_key

  tags = local.common_tags
}
