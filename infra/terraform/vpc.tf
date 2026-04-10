# ─────────────────────────────────────────────────────────────
# VPC — Virtual Private Cloud
#
# Cost optimisation: ECS tasks run in PUBLIC subnets with
# assignPublicIp = ENABLED so they can reach the internet
# (GitHub Container Registry, Neon, Upstash) WITHOUT a
# NAT Gateway. NAT Gateway costs ~$32/month — skipping it
# keeps the entire stack under $50/month.
#
# Security: ECS security group only allows inbound traffic
# FROM the ALB security group — tasks are not publicly
# accessible directly even though they have public IPs.
# ─────────────────────────────────────────────────────────────

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = merge(local.common_tags, { Name = "${var.app_name}-vpc" })
}

# Internet Gateway — allows public subnets to reach the internet
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = merge(local.common_tags, { Name = "${var.app_name}-igw" })
}

# ── Public Subnets (ALB + ECS tasks) ──────────────────────────
# Two subnets in different AZs — ALB requires at least 2 AZs

resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = false   # We control this per resource
  tags = merge(local.common_tags, { Name = "${var.app_name}-public-a" })
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = false
  tags = merge(local.common_tags, { Name = "${var.app_name}-public-b" })
}

# Route table — send all internet traffic via IGW
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(local.common_tags, { Name = "${var.app_name}-public-rt" })
}

resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_b" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public.id
}
