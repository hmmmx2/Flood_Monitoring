# ─────────────────────────────────────────────────────────────
# Flood Monitoring System — Terraform Infrastructure
#
# What this creates in ANY AWS account:
#   - ECR repository (stores your Docker images)
#   - App Runner service (runs your API — scales to zero)
#   - Upstash Redis (via HTTP API — no AWS ElastiCache needed)
#   - IAM roles (permissions for App Runner to pull from ECR)
#
# Usage:
#   terraform init                    # Download AWS provider
#   terraform plan                    # Preview what will be created
#   terraform apply                   # Create everything (~3 minutes)
#   terraform destroy                 # Tear down everything
#
# To use in a NEW AWS account:
#   1. Change AWS credentials (aws configure)
#   2. Run terraform apply — done
# ─────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Optional: store Terraform state in S3 so your team shares it
  # Uncomment when ready:
  # backend "s3" {
  #   bucket = "flood-monitoring-terraform-state"
  #   key    = "prod/terraform.tfstate"
  #   region = "ap-southeast-1"
  # }
}

provider "aws" {
  region = var.aws_region
  # Credentials come from:
  #   - Environment: AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY
  #   - OR: aws configure (stored in ~/.aws/credentials)
  #   - Change credentials → same config runs in a different account
}
