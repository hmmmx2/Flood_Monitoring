# ─────────────────────────────────────────────────────────────
# DEPRECATED — ECR removed
#
# Originally used AWS ECR (Elastic Container Registry) to store
# Docker images. Replaced with GitHub Container Registry (GHCR)
# because:
#   - GHCR is FREE for public repos (ECR costs ~$2/month storage)
#   - Images are built and pushed via GitHub Actions CI/CD
#   - ECS task definition pulls directly from GHCR:
#       ghcr.io/<github_username>/<app_name>-api:latest
#   - No AWS credentials needed for image push — GitHub token only
#
# To push images to GHCR from GitHub Actions:
#   echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin
#   docker push ghcr.io/<username>/<app>-api:latest
#
# Image reference is configured in ecs.tf → container_definitions.image
# ─────────────────────────────────────────────────────────────
