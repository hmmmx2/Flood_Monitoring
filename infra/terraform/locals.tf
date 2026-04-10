# ─────────────────────────────────────────────────────────────
# Common tags — applied to every AWS resource
# Makes it easy to track costs and find resources in AWS Console
# ─────────────────────────────────────────────────────────────

locals {
  common_tags = {
    Project     = "flood-monitoring"
    Environment = var.environment
    ManagedBy   = "terraform"
    Owner       = "jonathan-tang"
  }
}
