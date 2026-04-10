# Flood Monitoring System — Architecture Plan
> Author: Jonathan Tang
> Written: 2026-04-07 | Last Updated: 2026-04-09
> Status: Post-FYP Implementation Reference
> Cloud: **AWS** (ECS Fargate + ALB) + free external services — target under $50/month

---

## Table of Contents

1. [Current State (FYP)](#1-current-state-fyp)
2. [Target State (Production)](#2-target-state-production)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Shared Packages](#4-shared-packages)
5. [Docker Containerisation](#5-docker-containerisation)
6. [Infrastructure as Code — Terraform](#6-infrastructure-as-code--terraform)
7. [Full Service Stack & Cost Breakdown](#7-full-service-stack--cost-breakdown)
8. [Stage 1 — AWS ECS Fargate + ALB](#8-stage-1--aws-ecs-fargate--alb)
9. [New Feature API & Database Schema](#9-new-feature-api--database-schema)
10. [Cloudflare Configuration](#10-cloudflare-configuration)
11. [CI/CD Pipeline](#11-cicd-pipeline)
12. [Cost Summary](#12-cost-summary)
13. [Migration Plan](#13-migration-plan)
14. [Key Decisions](#14-key-decisions)
15. [References](#15-references)

---

## 1. Current State (FYP)

| App | Stack | Purpose |
|-----|-------|---------|
| `Flood-Monitoring-App` | React Native + Expo 55 | Public mobile users |
| `Flood_Management_CRM` | Next.js 16 + Tailwind | Admin / NGO web dashboard |
| `Flood-Monitoring-Backend-Java` | Java 21 + Spring Boot 3.2 | REST API |
| Database | Neon PostgreSQL (pooler) | Shared data store |
| SSL / DNS | Cloudflare | Already active ✅ |

### What Already Exists (do not re-ticket)

**Mobile App** — Login, Register, Forgot Password, Change Password, Dashboard (KPIs + map), Sensors list, Map, Analytics charts, Alerts/Feed, Blogs screen

**CRM Web** — Login, Dashboard (KPI cards + live node table + charts + activity feed), Sensors management (search, filter, CSV/Excel export), Map, Alerts, Analytics, Blog management, Settings (theme, notifications, data, security), Roles management, Admin panel

**Backend API** — Full auth (`/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/verify-reset-code`, `/auth/reset-password`), `/sensors`, `/dashboard/nodes`, `/dashboard/time-series`, `/analytics`, `/feed` (cursor pagination), `/feed/{id}`, `/blogs/featured`, `/profile`, `/settings`

### What Is New (covered by SCRUM2 tickets)

| Feature | Ticket | New DB Table | New Endpoints |
|---------|--------|-------------|---------------|
| Push notifications | SCRUM-102 | — (uses existing `user_settings`) | — (Expo Push API) |
| Safety awareness page | SCRUM-103 | `safety_content` | `GET /safety`, `PUT /safety/{id}` |
| Emergency broadcast | SCRUM-104 | `broadcasts` | `POST /broadcasts`, `GET /broadcasts` |
| Incident reports | SCRUM-105 | `reports` | `POST /reports`, `GET /reports`, `PATCH /reports/{id}/status` |
| Flood risk zones | SCRUM-106 | `zones` | `GET /zones/risk`, `GET /zones/{id}` |
| IoT data ingestion | SCRUM-107 | — (writes to existing `nodes` + `events`) | `POST /ingest` |
| CRM password reset UI | SCRUM-108 | — (uses existing `password_reset_codes`) | — (uses existing auth endpoints) |
| Favourite sensor nodes | SCRUM-112 | `user_favourite_nodes` | `GET /favourites`, `POST /favourites/{nodeId}`, `DELETE /favourites/{nodeId}` |

---

## 2. Target State (Production)

One **Turborepo monorepo** — single repository, shared packages, three apps, automated deployments, auto-scaling AWS infrastructure behind Cloudflare.

```
                         USERS
          ┌──────────────┴──────────────┐
    📱 Mobile App                  💻 CRM Web
    (iOS / Android)            (Admin / Operators)
          │                            │
          └──────────┬─────────────────┘
                     ▼
        ┌────────────────────────────────┐
        │          CLOUDFLARE            │
        │  ✅ SSL/TLS (already active)   │
        │  ✅ DDoS Protection            │
        │  ✅ CDN (static assets)        │
        │  ✅ WAF (firewall rules)        │
        │  ✅ Rate Limiting              │
        │  ✅ Edge Cache (Workers)       │
        └────────────┬───────────────────┘
                     ▼
          AWS Application Load Balancer
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
     API Pod 1    API Pod 2   API Pod 3
     [ECS Fargate — auto-scales 2 → 10 pods]
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
   Neon PostgreSQL          Redis (Upstash /
   Primary + replica        ElastiCache)
                     │
                     ▼
                 AWS SQS
          (IoT sensor write queue)
```

---

## 3. Monorepo Structure

```
flood-monitoring/                        ← Single Git Repository (Turborepo)
│
├── apps/
│   ├── mobile/                          ← React Native (Expo) — Public users
│   ├── web/                             ← Next.js — CRM Admin (desktop)
│   └── api/                             ← Java Spring Boot — Unified backend
│
├── packages/
│   ├── shared-types/                    ← TypeScript interfaces (all apps)
│   ├── api-client/                      ← Axios HTTP client (mobile + web)
│   ├── ui-tokens/                       ← Design system (colors, spacing, fonts)
│   └── utils/                           ← Shared business logic
│
├── infra/
│   └── terraform/                       ← All AWS config as code (see Section 6)
│       ├── main.tf                      ← AWS provider + region
│       ├── variables.tf                 ← Config per environment
│       ├── locals.tf                    ← Shared tags
│       ├── vpc.tf                       ← VPC, public subnets, Internet Gateway
│       ├── security_groups.tf           ← ALB SG + ECS SG
│       ├── alb.tf                       ← ALB, HTTPS listener, ACM cert
│       ├── ecs.tf                       ← ECS cluster, task definition, service
│       ├── sqs.tf                       ← IoT sensor ingestion queue + DLQ
│       ├── ssm.tf                       ← Encrypted secrets (SSM Parameter Store)
│       └── outputs.tf                   ← ALB DNS name + Cloudflare instructions
│
├── .github/
│   └── workflows/
│       ├── deploy-api.yml               ← CI/CD → GitHub GHCR + ECS force-deploy
│       ├── deploy-web.yml               ← CI/CD → Vercel
│       └── deploy-mobile.yml            ← CI/CD → EAS Build
│
├── docker-compose.yml                   ← Run all services locally
├── turbo.json                           ← Turborepo pipeline config
├── package.json                         ← Root workspace (pnpm)
└── pnpm-workspace.yaml                  ← Workspace definitions
```

### Root `package.json`
```json
{
  "name": "flood-monitoring",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev":       "turbo run dev",
    "build":     "turbo run build",
    "lint":      "turbo run lint",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

### `turbo.json`
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", "target/**"]
    },
    "dev":       { "cache": false, "persistent": true },
    "lint":      { "dependsOn": ["^lint"] },
    "typecheck": { "dependsOn": ["^typecheck"] }
  }
}
```

---

## 4. Shared Packages

### `packages/shared-types`
TypeScript types written once — used by mobile, web CRM, and API.

```typescript
// packages/shared-types/src/index.ts

// ─── Core ────────────────────────────────────────────────────────────────────

export type FloodLevel = 0 | 1 | 2 | 3;

export type UserRole = 'admin' | 'operator' | 'viewer' | 'public';

export interface SensorNode {
  id: string;
  nodeId: string;
  latitude: number;
  longitude: number;
  currentLevel: FloodLevel;
  isDead: boolean;
  lastUpdated: string;
  distanceKm: number;
}

export interface FeedItem {
  id: string;
  type: 'alert' | 'update' | 'broadcast';
  sensorId: string;
  waterLevelMeters: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
}

export interface LoginResponse {
  session: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
  };
  user: {
    id: string;
    displayName: string;
    email: string;
    role: UserRole;
    avatarUrl?: string;
  };
}

// ─── Favourite Nodes (SCRUM-112) ─────────────────────────────────────────────

export interface FavouriteNode extends SensorNode {
  favouritedAt: string;   // ISO timestamp when user bookmarked this node
}

// ─── Emergency Broadcast (SCRUM-104) ─────────────────────────────────────────

export type BroadcastSeverity = 'info' | 'warning' | 'critical';

export interface Broadcast {
  id: string;
  title: string;
  body: string;                          // max 160 chars
  targetZone: string | 'all';
  severity: BroadcastSeverity;
  sentBy: string;                        // display name of sender
  sentAt: string;
  recipientCount: number;
}

export interface SendBroadcastRequest {
  title: string;
  body: string;
  targetZone: string | 'all';
  severity: BroadcastSeverity;
}

// ─── Incident Reports (SCRUM-105) ────────────────────────────────────────────

export type ReportSeverity = 'mild' | 'moderate' | 'severe';
export type ReportStatus   = 'pending' | 'verified' | 'investigating' | 'dismissed';

export interface IncidentReport {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  severity: ReportSeverity;
  description?: string;
  photoUrl?: string;
  status: ReportStatus;
  submittedAt: string;
}

export interface SubmitReportRequest {
  latitude: number;
  longitude: number;
  severity: ReportSeverity;
  description?: string;
  photoUrl?: string;
}

// ─── Flood Risk Zones (SCRUM-106) ────────────────────────────────────────────

export type ZoneRisk = 'high' | 'medium' | 'low';

export interface FloodZone {
  id: string;
  name: string;
  riskLevel: ZoneRisk;
  boundary: GeoJsonPolygon;             // GeoJSON polygon coordinates
  activeSensorCount: number;
  lastFloodDate: string | null;
  floodFrequency12m: number;            // number of Level 2+ events in last 12 months
}

export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

// ─── Safety Content (SCRUM-103) ──────────────────────────────────────────────

export type SafetySection = 'before' | 'during' | 'after';
export type ContentLang   = 'en' | 'ms';

export interface SafetyContent {
  id: string;
  section: SafetySection;
  lang: ContentLang;
  content: string;
  updatedAt: string;
}

// ─── IoT Ingestion (SCRUM-107) ───────────────────────────────────────────────

export interface IngestPayload {
  nodeId: string;
  level: FloodLevel;
  timestamp: string;   // ISO 8601
}
```

### `packages/ui-tokens`
Shared design tokens — mobile uses via `StyleSheet`, web CRM uses via Tailwind CSS variables.

```typescript
// packages/ui-tokens/src/colors.ts
export const colors = {
  floodLevel: {
    safe:     '#56E40A',   // Level 0 — Normal
    alert:    '#FFD54F',   // Level 1 — Watch
    warning:  '#FF9F1C',   // Level 2 — Warning
    critical: '#D7263D',   // Level 3 — Critical
  },
  primary: '#ED1C24',
  dark: {
    bg:            '#1A1A2E',
    card:          '#16213E',
    border:        '#2D3A5A',
    text:          '#E8E8E8',
    textSecondary: '#A0A0A0',
  },
} as const;

export const floodLevelMeta = {
  0: { label: 'Safe',     color: colors.floodLevel.safe,     meters: 0.0 },
  1: { label: 'Alert',    color: colors.floodLevel.alert,    meters: 1.0 },
  2: { label: 'Warning',  color: colors.floodLevel.warning,  meters: 2.5 },
  3: { label: 'Critical', color: colors.floodLevel.critical, meters: 4.0 },
} as const;
```

### `packages/api-client`
Single Axios HTTP client imported by both mobile and web CRM.

```typescript
// packages/api-client/src/index.ts

// Auth
export { login, register, logout, refreshToken,
         forgotPassword, verifyResetCode, resetPassword } from './auth';

// Core data
export { getFeed, getSensors, getAnalytics,
         getDashboardNodes, getDashboardTimeSeries } from './data';

// Favourite nodes (SCRUM-112)
export { getFavourites, addFavourite, removeFavourite } from './favourites';

// Emergency broadcasts (SCRUM-104)
export { getBroadcasts, sendBroadcast } from './broadcasts';

// Community incident reports (SCRUM-105)
export { submitReport, getReports, updateReportStatus } from './reports';

// Flood risk zones (SCRUM-106)
export { getRiskZones, getZoneDetail } from './zones';

// Safety awareness content (SCRUM-103)
export { getSafetyContent } from './safety';

// Shared
export { tokenStore } from './tokenStore';
export type { ApiError } from './types';
```

### `packages/utils`
Shared pure functions — no platform-specific code.

```typescript
// packages/utils/src/flood.ts
export function metersFromLevel(level: FloodLevel): number {
  return [0.0, 1.0, 2.5, 4.0][level];
}

export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 +
            Math.cos(lat1 * Math.PI/180) *
            Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
```

---

## 5. Docker Containerisation

> Docker packages the **app**. Terraform (Section 6) packages the **AWS config**.
> Together they make the entire system portable — recreate everything in any AWS account in minutes.

### Files in This Repo

```
FYP/
├── docker-compose.yml                      ← Run all services locally
├── .env.docker                             ← Env var template
├── Flood-Monitoring-Backend-Java/
│   ├── Dockerfile                          ← Multi-stage Java 21 build
│   └── .dockerignore
└── FYP-Website/Flood_Management_CRM/
    ├── Dockerfile                          ← Multi-stage Next.js build
    └── .dockerignore

Note: Mobile app (React Native) is NOT containerised.
      It uses Expo EAS Build → .aab (Android) / .ipa (iOS)
```

### Portability

```
Same Docker image runs on:

  Local Machine     →  docker compose up                (develop)
       ↓
  GitHub GHCR       →  push ghcr.io/<user>/<app>:latest  (store image, free)
       ↓
  AWS ECS Fargate   →  pulls from GHCR, runs in cluster   (production)
```

You never rewrite the app — only **where** the image runs changes.

### Local Development Commands

```bash
# First time
cd C:\Users\whisp\Documents\FYP
copy .env.docker .env

# Start all services
docker compose up --build

# API  → http://localhost:3001
# CRM  → http://localhost:3000
# Mobile → npx expo start  (separate terminal, Expo handles this)

# Useful commands
docker compose up api          # API only
docker compose up crm          # CRM only
docker compose logs -f api     # Stream API logs
docker compose down            # Stop all
docker compose down -v         # Stop + wipe volumes
```

---

## 6. Infrastructure as Code — Terraform

> **Terraform is free (open source).** You only pay for the AWS resources it creates.
> Think of it as a remote control — the remote is free, you pay for what it switches on.

### What Terraform Does

```
Without Terraform                    With Terraform
──────────────────────────────       ──────────────────────────────
Click through AWS Console manually   Run: terraform apply
Redo everything in a new account     Run: aws configure → terraform apply
Forget what settings you used        Everything saved as .tf files in Git
Team can't see what's deployed       Full config visible in version control
```

### Install Terraform (Free)

```powershell
# Windows
winget install HashiCorp.Terraform

# Verify
terraform --version    # Terraform v1.9.x
```

### Files Location

```
infra/terraform/
├── main.tf                    ← AWS provider + region config
├── variables.tf               ← All configurable values
├── locals.tf                  ← Common resource tags
├── vpc.tf                     ← VPC, public subnets, Internet Gateway
├── security_groups.tf         ← ALB SG + ECS SG
├── alb.tf                     ← ALB, HTTPS listener, ACM cert
├── ecs.tf                     ← ECS Fargate cluster, task definition, service
├── sqs.tf                     ← IoT sensor ingestion queue + DLQ
├── ssm.tf                     ← Encrypted secrets (SSM Parameter Store)
├── outputs.tf                 ← ALB DNS name + Cloudflare DNS instructions
├── terraform.tfvars.example   ← Config template (copy → terraform.tfvars)
└── .gitignore                 ← Prevents secrets from being committed
```

### How to Use — Deploy to ANY AWS Account

```bash
# Step 1 — Point at target AWS account (change credentials = change account)
aws configure
# Enter: AWS Access Key ID, Secret Access Key, Region (ap-southeast-1)

# Step 2 — Fill in your secrets
cd infra/terraform
copy terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars — add Neon URL, JWT secrets, etc.

# Step 3 — Preview what will be created
terraform init      # Download AWS provider (one time, ~30 seconds)
terraform plan      # Show every resource that will be created

# Step 4 — Deploy everything
terraform apply     # Creates all AWS services (~5–10 minutes)

# Output example:
# alb_dns_name = "flood-monitoring-alb-123456789.ap-southeast-1.elb.amazonaws.com"
# ecs_cluster_name = "flood-monitoring-cluster"
# + Cloudflare DNS CNAME instructions

# Step 5 — Tear down (goes back to $0)
terraform destroy
```

### Terraform Cost

| Terraform Tier | Cost | Notes |
|----------------|------|-------|
| **Terraform CLI** | **$0 forever** | What we use — runs on your laptop |
| Terraform Cloud Free | $0 | Up to 5 users, team state sharing |
| Terraform Cloud Plus | $20/user/month | Enterprises only — not needed |

---

## 7. Full Service Stack & Cost Breakdown

> **Strategy:** AWS only for compute (ECS Fargate + ALB). Replace every other service with a free alternative. Target: **under $50/month**.

### Why This Combination Wins

| Service Need | Expensive AWS Option | Better Free Alternative | Saving |
|---|---|---|---|
| CRM web hosting | EC2 / Elastic Beanstalk ~$20 | **Vercel** free tier | $20 |
| Container registry | AWS ECR ~$2 | **GitHub Container Registry** free | $2 |
| Redis cache | ElastiCache ~$13 | **Upstash Redis** free (500K cmd/month) | $13 |
| Secrets storage | AWS Secrets Manager ~$2 | **AWS SSM Parameter Store** free | $2 |
| Email (password reset) | AWS SES ~$1 | **Resend** free (3K emails/month) | $1 |
| Error tracking | CloudWatch detailed ~$10 | **Sentry** free (5K errors/month) | $10 |
| CI/CD | AWS CodePipeline ~$5 | **GitHub Actions** free (2K min/month) | $5 |
| **Total saved** | | | **~$53/month** |

### Full Optimised Stack

```
                    USERS
       ┌─────────────┴─────────────┐
 📱 Mobile App               💻 CRM Web
       │                           │
       └───────────┬───────────────┘
                   ▼
           CLOUDFLARE ✅ (already have)
           SSL + CDN + WAF + DDoS — $0
                   │ HTTPS
                   ▼
     AWS Application Load Balancer   ← HTTPS termination, health checks
                   │ HTTP (internal)
         ┌─────────┼─────────┐
         ▼         ▼         ▼
     ECS Pod 1  ECS Pod 2  ECS Pod N   ← Java Spring Boot API
     (Fargate)  (Fargate)  (auto-scale up to 5 pods)
         │
         ├── Neon PostgreSQL (free 10GB, pooler)
         ├── Upstash Redis (free 500K cmd/month)
         └── AWS SQS (free 1M req/month)
```

| Service | Provider | Cost |
|---------|----------|------|
| **API hosting** | AWS ECS Fargate (1 pod) | ~$20/month |
| **Load balancer** | AWS ALB | ~$18/month |
| **CRM web** | Vercel free tier | **$0** |
| **Mobile builds** | Expo EAS free tier | **$0** |
| **Container images** | GitHub Container Registry | **$0** |
| **Database** | Neon PostgreSQL (existing) | **$0** |
| **Redis cache** | Upstash Redis | **$0** |
| **Secrets** | AWS SSM Parameter Store | **$0** |
| **Queue** | AWS SQS | **$0** |
| **Email** | Resend (3K/month free) | **$0** |
| **Error tracking** | Sentry (5K errors/month) | **$0** |
| **CI/CD** | GitHub Actions | **$0** |
| **SSL + CDN + WAF** | Cloudflare ✅ | **$0** |
| **Total** | | **~$38/month** ✅ |

> **AWS Free Tier bonus:** ALB is free for 12 months on new accounts → first year total is just **~$20/month** (ECS only).

---

## 8. Stage 1 — AWS ECS Fargate + ALB

### Architecture

```
                    USERS
       ┌─────────────┴─────────────┐
 📱 Mobile App               💻 CRM Web
       │                           │
       └───────────┬───────────────┘
                   ▼
           CLOUDFLARE ✅
           SSL + DDoS + WAF + CDN
                   │ HTTPS
                   ▼
     ┌─────────────────────────────┐
     │   AWS Application Load      │
     │   Balancer (ALB)            │
     │   - HTTPS termination       │
     │   - Health checks           │
     │   - HTTP → HTTPS redirect   │
     └──────┬───────────┬──────────┘
            ▼           ▼
     ┌─────────┐   ┌─────────┐
     │ API     │   │ API     │   ...auto-scale up to 5 pods
     │ Pod 1   │   │ Pod 2   │
     │ (Java)  │   │ (Java)  │
     └────┬────┘   └────┬────┘
          └──────┬───────┘
                 ▼
  Neon PostgreSQL (external, free)
  Upstash Redis (external, free)
  AWS SQS (IoT queue, free 1M/month)

Note: ECS tasks run in PUBLIC subnets with assign_public_ip = true.
      No NAT Gateway needed — saves $32/month.
      Security group only allows inbound from ALB SG — not exposed directly.
```

### Cost

| Resource | Config | Cost |
|----------|--------|------|
| ECS Fargate — 1 pod | 0.5 vCPU / 1 GB | ~$20/month |
| ALB (fixed) | — | ~$18/month (free yr 1) |
| **Total** | | **~$38/month** ✅ under $50 |

### Deploy

```bash
# 1. Push image to GHCR (GitHub Actions does this automatically on push to main)
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin
docker build -t ghcr.io/<username>/flood-monitoring-api:latest ./Flood-Monitoring-Backend-Java
docker push ghcr.io/<username>/flood-monitoring-api:latest

# 2. Deploy all AWS infra via Terraform (first time only, ~10 minutes)
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # fill in secrets
terraform init
terraform apply

# terraform output includes:
# alb_dns_name = "flood-monitoring-alb-xxxxx.ap-southeast-1.elb.amazonaws.com"
# cloudflare_dns_instructions = (CNAME to add)

# 3. Force new ECS deployment (after image update)
aws ecs update-service \
  --cluster flood-monitoring-cluster \
  --service flood-monitoring-api \
  --force-new-deployment
```

### Point Cloudflare DNS

```
Type   Name   Value                                            Proxy
CNAME  api    <alb-dns>.ap-southeast-1.elb.amazonaws.com      ✅ Proxied
CNAME  crm    <project>.vercel.app                            ✅ Proxied
```

---

## 9. New Feature API & Database Schema

> All new tables and endpoints added as part of the post-FYP feature sprints (SCRUM2).
> These are additions to the existing schema — no existing tables are modified.

### New Neon PostgreSQL Tables

```sql
-- ─── Safety awareness content (SCRUM-103) ───────────────────────────────────
CREATE TABLE safety_content (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section     VARCHAR(10) NOT NULL,          -- 'before' | 'during' | 'after'
  lang        VARCHAR(5)  NOT NULL DEFAULT 'en',   -- 'en' | 'ms'
  content     TEXT        NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  UUID REFERENCES users(id)
);

-- ─── Emergency broadcasts (SCRUM-104) ───────────────────────────────────────
CREATE TABLE broadcasts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            VARCHAR(255) NOT NULL,
  body             VARCHAR(160) NOT NULL,
  target_zone      VARCHAR(100) DEFAULT 'all',
  severity         VARCHAR(20)  NOT NULL,    -- 'info' | 'warning' | 'critical'
  sent_by          UUID REFERENCES users(id),
  sent_at          TIMESTAMPTZ  DEFAULT NOW(),
  recipient_count  INTEGER      DEFAULT 0
);

-- ─── Community flood incident reports (SCRUM-105) ───────────────────────────
CREATE TABLE reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id)  ON DELETE SET NULL,
  latitude     DECIMAL(9,6)  NOT NULL,
  longitude    DECIMAL(9,6)  NOT NULL,
  severity     VARCHAR(20)   NOT NULL,    -- 'mild' | 'moderate' | 'severe'
  description  TEXT,
  photo_url    TEXT,
  status       VARCHAR(20)   NOT NULL DEFAULT 'pending',
                                          -- 'pending' | 'verified' | 'investigating' | 'dismissed'
  submitted_at TIMESTAMPTZ   DEFAULT NOW()
);
CREATE INDEX reports_location_idx ON reports USING GIST (
  ll_to_earth(latitude, longitude)
);

-- ─── Flood risk zones (SCRUM-106) ───────────────────────────────────────────
CREATE TABLE zones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  boundary    JSONB        NOT NULL,      -- GeoJSON Polygon
  risk_level  VARCHAR(10)  NOT NULL,      -- 'high' | 'medium' | 'low'
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ─── User favourite sensor nodes (SCRUM-112) ────────────────────────────────
CREATE TABLE user_favourite_nodes (
  user_id    UUID REFERENCES users(id)  ON DELETE CASCADE,
  node_id    UUID REFERENCES nodes(id)  ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, node_id)
);
CREATE INDEX fav_nodes_user_idx ON user_favourite_nodes(user_id);
```

---

### New API Endpoints

| Method | Path | Auth | Ticket | Description |
|--------|------|------|--------|-------------|
| `POST` | `/ingest` | API Key (`X-API-Key`) | SCRUM-107 | IoT sensor data ingestion |
| `GET` | `/favourites` | JWT | SCRUM-112 | Get all favourited nodes with live status |
| `POST` | `/favourites/{nodeId}` | JWT | SCRUM-112 | Add node to favourites |
| `DELETE` | `/favourites/{nodeId}` | JWT | SCRUM-112 | Remove node from favourites |
| `POST` | `/broadcasts` | JWT (admin/operator) | SCRUM-104 | Send emergency broadcast |
| `GET` | `/broadcasts` | JWT | SCRUM-104 | Get broadcast history |
| `POST` | `/reports` | JWT | SCRUM-105 | Submit community flood incident report |
| `GET` | `/reports` | JWT (admin/operator) | SCRUM-105 | List all community reports |
| `PATCH` | `/reports/{id}/status` | JWT (admin/operator) | SCRUM-105 | Update report status |
| `GET` | `/zones/risk` | Public | SCRUM-106 | Get risk zone classifications |
| `GET` | `/zones/{id}` | Public | SCRUM-106 | Get zone detail + flood history |
| `GET` | `/safety` | Public | SCRUM-103 | Get safety awareness content |
| `PUT` | `/safety/{id}` | JWT (admin) | SCRUM-103 | Update safety content block |

---

### Push Notification Flow (SCRUM-102 + SCRUM-104 + SCRUM-112)

```
IoT sensor calls POST /ingest
         │
         ▼
Backend inserts event row
         │
         ├── If level >= 2 (Warning):
         │     → Fetch all users with notifications ON (global)
         │     → Fetch all users who have favourited this node (level >= 1)
         │     → Merge + deduplicate push token list
         │     → Call Expo Push API: https://exp.host/--/api/v2/push/send
         │
NGO operator sends POST /broadcasts
         │
         ▼
Backend saves broadcast row + fetches push tokens for target zone
         │
         └── Call Expo Push API for all users in zone
                    │
                    ▼
            Mobile device receives notification
            Tap → navigates to Feed or detail screen
```

---

### Notification Preference Logic

| User setting | Global level triggered | Favourited node triggered |
|-------------|----------------------|--------------------------|
| All Warnings | Level ≥ 1 | Level ≥ 1 |
| Critical Only | Level ≥ 3 | Level ≥ 1 ← override |
| Off | Never | Never |

> Favouriting a node gives users finer-grained monitoring for areas they personally care about —
> their home zone, commute route, or a family member's area.

---

## 10. Cloudflare Configuration

### SSL Mode
```
Cloudflare Dashboard → SSL/TLS → Overview → Full (Strict)
```

### Cache Rules
```
Rule 1 — Cache static assets
  Match:  *.js, *.css, *.png, *.jpg, *.woff2
  Action: Cache Everything
  TTL:    1 day (browser) / 1 week (edge)

Rule 2 — Bypass cache for auth + writes
  Match:  /auth/*, POST/PUT/DELETE requests
  Action: Bypass Cache

Rule 3 — Short-cache public read endpoints
  Match:  GET /sensors, GET /analytics
  Action: Cache (TTL: 30 seconds)
```

### Rate Limiting Rules
```
Rule 1 — Protect login
  Match:  POST api.yourdomain.com/auth/login
  Limit:  5 requests / minute / IP
  Action: Block for 10 minutes

Rule 2 — General API protection
  Match:  api.yourdomain.com/*
  Limit:  300 requests / minute / IP
  Action: JS Challenge
```

### Cloudflare Workers — Edge Cache (Optional, Free)
```javascript
// Serves /analytics from Cloudflare edge — never hits AWS
export default {
  async fetch(request, env, ctx) {
    const cache = caches.default;
    if (request.method === 'GET' &&
        new URL(request.url).pathname === '/analytics') {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      ctx.waitUntil(cache.put(request, response.clone()));
      return response;
    }
    return fetch(request);
  }
}
```

### DNS Records
```
Type   Name   Value                             Proxy
CNAME  api    <alb or apprunner url>            ✅ Proxied (orange cloud)
CNAME  crm    <vercel url>                      ✅ Proxied (orange cloud)
CNAME  app    <expo web or vercel url>          ✅ Proxied (orange cloud)
```

---

## 11. CI/CD Pipeline

### GitHub Actions — Deploy API to AWS

```yaml
# .github/workflows/deploy-api.yml
name: Deploy API

on:
  push:
    branches: [main]
    paths: ['apps/api/**', 'packages/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write    # Required for GHCR push

    steps:
      - uses: actions/checkout@v4

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}   # Automatic — no extra secret needed

      - name: Build and push image to GHCR
        run: |
          docker build -t ghcr.io/${{ github.repository_owner }}/flood-monitoring-api:latest \
            ./Flood-Monitoring-Backend-Java
          docker push ghcr.io/${{ github.repository_owner }}/flood-monitoring-api:latest

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id:     ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region:            ap-southeast-1

      - name: Force new ECS deployment
        run: |
          aws ecs update-service \
            --cluster flood-monitoring-cluster \
            --service flood-monitoring-api \
            --force-new-deployment
```

### GitHub Actions — Deploy CRM to Vercel

```yaml
# .github/workflows/deploy-web.yml
name: Deploy CRM

on:
  push:
    branches: [main]
    paths: ['apps/web/**', 'packages/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm run typecheck --filter=apps/web
      - run: npm run build --filter=apps/web
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token:   ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id:  ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### GitHub Actions — Mobile EAS Build

```yaml
# .github/workflows/deploy-mobile.yml
name: Build Mobile

on:
  push:
    tags: ['v*.*.*']    # Trigger on version tags e.g. v1.2.0

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm install -g eas-cli
      - run: npm ci
      - name: Build Android + iOS
        run: eas build --platform all --profile production --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

---

## 12. Cost Summary

> See **Section 7** for the full cost breakdown and service comparison table.

```
ECS Fargate (1 pod, 0.5 vCPU / 1 GB)   ~$20/month
ALB (Application Load Balancer)          ~$18/month  (free yr 1 on new AWS accounts)
GitHub Container Registry                $0
AWS SSM Parameter Store                  $0
AWS SQS                                  $0
Vercel (CRM)                             $0
Neon PostgreSQL                          $0
Upstash Redis                            $0  ← 500K cmd/month free
Resend (email)                           $0  ← 3K emails/month free
Sentry (monitoring)                      $0  ← 5K errors/month free
GitHub Actions (CI/CD)                   $0
Cloudflare SSL + CDN                     $0 ✅
Expo EAS (mobile)                        $0
─────────────────────────────────────────────────
Total                                    ~$38/month  ✅ well under $50

First year (ALB free tier):              ~$20/month  ✅
```

### When to Scale Up

| Signal | Action |
|--------|--------|
| API p95 latency > 500ms under load | Add a second ECS pod (~$20 more) |
| Need 99.9% uptime SLA | Run 2 pods across both AZs |
| Upstash 500K free commands exhausted | Upgrade to Upstash Pay-as-you-go (~$10/mo) |
| Neon free tier (10GB) exceeded | Upgrade to Neon Pro ($19/mo) |

---

## 13. Migration Plan

### Phase 1 — Monorepo Setup (Week 1)
- [ ] Install Turborepo and pnpm workspaces
- [ ] Move `Flood-Monitoring-Backend-Java` → `apps/api`
- [ ] Move `Flood-Monitoring-App` → `apps/mobile`
- [ ] Move `Flood_Management_CRM` → `apps/web`
- [ ] Verify all three apps still run with `turbo run dev`

### Phase 2 — Extract Shared Packages (Week 2)
- [ ] Create `packages/shared-types` — move all TypeScript types
- [ ] Create `packages/api-client` — move Axios client from mobile
- [ ] Create `packages/ui-tokens` — extract colors from both apps
- [ ] Create `packages/utils` — flood level helpers, haversine
- [ ] Update all imports to use workspace packages

### Phase 3 — Unify the Database (Week 3)
- [ ] Update CRM (`apps/web`) to connect to Neon PostgreSQL (drop MongoDB)
- [ ] Replace CRM's localStorage auth with JWT via `packages/api-client`
- [ ] Test both mobile and CRM hitting the same live data

### Phase 4 — AWS Deployment (Week 4)
- [ ] Push API Docker image to GitHub Container Registry (GHCR)
- [ ] Run `terraform init && terraform apply` (creates VPC, ALB, ECS cluster, SQS, SSM)
- [ ] ECS pulls image from GHCR and starts API pods
- [ ] Deploy CRM to Vercel
- [ ] Build mobile `.apk` preview with EAS
- [ ] Add Cloudflare CNAME: `api` → ALB DNS name (output from terraform)
- [ ] Set `EXPO_PUBLIC_API_BASE_URL` to `https://api.<yourdomain>`

### Phase 5 — Hardening (Week 5)
- [ ] Set up Upstash Redis caching for analytics endpoints
- [ ] Configure Cloudflare rate limiting rules
- [ ] Add error tracking with Sentry (mobile + API)
- [ ] Load test with k6 (simulate 1,000 concurrent users)
- [ ] Verify GitHub Actions CI/CD deploys on push to `main`

### Phase 6 — Scale Up (When Needed)
- [ ] Increase `ecs_desired_count` to 2 in `variables.tf` → `terraform apply`
- [ ] Upgrade Upstash to pay-as-you-go if 500K cmd/month is exceeded
- [ ] Upgrade Neon to Pro ($19/mo) if 10GB is exceeded

---

## 14. Key Decisions

| Decision | Why |
|----------|-----|
| **Turborepo** over Nx | Simpler config, faster builds, better pnpm support |
| **Docker** for app portability | Build once, run anywhere — local or ECS without code changes |
| **Terraform** for infra portability | Recreate entire AWS setup in any account with one command |
| **ECS Fargate + ALB** as single cloud target | Predictable cost (~$38/month), full control, no cold starts |
| **Public subnets, no NAT Gateway** | ECS in public subnets + `assign_public_ip = true` saves $32/month |
| **GitHub Container Registry** over ECR | Free image storage, integrates with GitHub Actions via `GITHUB_TOKEN` |
| **Neon** over RDS | Serverless, free 10GB tier, pooler built-in — saves $25+/month vs RDS |
| **Upstash Redis** over ElastiCache | 500K commands/month free (2026) — saves $13/month |
| **Vercel** over EC2 for CRM | Zero-config Next.js, free forever tier — saves $20/month |
| **Resend** over AWS SES | 3K emails/month free, better DX — saves $1–5/month |
| **Sentry** over CloudWatch | 5K errors/month free, better developer experience |
| **GitHub Actions** over CodePipeline | 2K min/month free — saves $5/month |
| **Cloudflare** for everything edge | Already active ✅ — replaces CloudFront, WAF, DDoS protection |
| **SSM Parameter Store** | Secrets encrypted at rest, never in Docker image or .tf state |
| **Terraform CLI** | Free open source — only pay for the AWS resources it creates |

---

## 15. References

- [Turborepo Docs](https://turbo.build/repo/docs)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Terraform — Free Download](https://developer.hashicorp.com/terraform/install)
- [AWS ECS Fargate](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html)
- [AWS ALB](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html)
- [AWS SQS](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html)
- [GitHub Container Registry (GHCR)](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Neon Serverless PostgreSQL](https://neon.tech/docs)
- [Upstash Redis](https://upstash.com/docs/redis/overall/getstarted)
- [Expo EAS Build](https://docs.expo.dev/build/introduction/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)

---

*Document maintained by: Jonathan Tang*
*Last updated: 2026-04-09*
*Next review: Before Phase 1 implementation*
