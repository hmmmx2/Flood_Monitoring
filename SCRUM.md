# Flood Monitoring System — Infrastructure Scrum Board
> Project: Post-FYP Production Implementation
> Author: Jonathan Tang
> Last Updated: 2026-04-08

---

## Sprint Overview

| Ticket | Title | Sprint | Story Points | Status |
|--------|-------|--------|-------------|--------|
| FLOOD-01 | Turborepo Monorepo Initialisation | Sprint 1 | 5 | 🔲 To Do |
| FLOOD-02 | Extract Shared Packages | Sprint 1 | 8 | 🔲 To Do |
| FLOOD-03 | Local Docker Development Environment | Sprint 1 | 5 | 🔲 To Do |
| FLOOD-04 | Migrate CRM Data Layer from MongoDB to Neon API | Sprint 2 | 8 | 🔲 To Do |
| FLOOD-05 | Unified JWT Authentication for CRM Web App | Sprint 2 | 8 | 🔲 To Do |
| FLOOD-06 | Redis Caching Layer for Analytics Endpoints | Sprint 2 | 5 | 🔲 To Do |
| FLOOD-07 | Terraform Infrastructure Setup (ECS Fargate + ALB + SSM) | Sprint 3 | 8 | 🔲 To Do |
| FLOOD-08 | Build & Push API Docker Image to GitHub Container Registry | Sprint 3 | 5 | 🔲 To Do |
| FLOOD-09 | Deploy CRM Web App to Vercel | Sprint 3 | 3 | 🔲 To Do |
| FLOOD-10 | Mobile EAS Production Build & Cloudflare DNS Setup | Sprint 3 | 5 | 🔲 To Do |
| FLOOD-11 | GitHub Actions CI/CD Pipeline (All Three Apps) | Sprint 4 | 8 | 🔲 To Do |
| FLOOD-12 | Cloudflare Security Configuration | Sprint 4 | 3 | 🔲 To Do |
| FLOOD-13 | Monitoring & Error Tracking (Sentry + CloudWatch) | Sprint 4 | 5 | 🔲 To Do |
| FLOOD-14 | Load Testing & Performance Validation | Sprint 4 | 5 | 🔲 To Do |

---

## Sprint 1 — Foundation

---

### FLOOD-01 — Turborepo Monorepo Initialisation

> **Sprint 1 | Story Points: 5 | Priority: High**

#### Description
Consolidate the three existing standalone projects into a single Turborepo monorepo managed by pnpm workspaces. Set up the root workspace config, pipeline definitions, and verify all three apps can be started in parallel with a single command.

#### Acceptance Criteria
- [ ] pnpm installed and `pnpm-workspace.yaml` configured at repo root
- [ ] Turborepo installed as dev dependency (`turbo@^2.0.0`)
- [ ] `apps/mobile`, `apps/web`, `apps/api` directories created
- [ ] Existing projects moved into respective `apps/` directories
- [ ] `turbo.json` configured with `dev`, `build`, `lint`, `typecheck` pipelines
- [ ] Root `package.json` scripts delegate to Turborepo (`turbo run dev`)
- [ ] `turbo run dev` starts all three apps in parallel without errors
- [ ] `turbo run build` completes successfully for all three apps

#### Notes
- Use pnpm over npm — more efficient disk usage in monorepos
- Reference `ARCHITECTURE_PLAN.md` §3 for full directory structure and config samples

---

### FLOOD-02 — Extract Shared Packages

> **Sprint 1 | Story Points: 8 | Priority: High**

#### Description
Extract all duplicated code across the three apps into dedicated workspace packages. Each package is written once and imported by any app that needs it, eliminating type drift and duplicated logic between the mobile app and CRM.

#### Acceptance Criteria
- [ ] `packages/shared-types` created — all TypeScript interfaces (`SensorNode`, `FeedItem`, `LoginResponse`, `FloodLevel`, etc.)
- [ ] `packages/api-client` created — single Axios instance with JWT interceptor and token refresh logic
- [ ] `packages/ui-tokens` created — flood level colours, status colours, dark mode palette, `floodLevelMeta` map
- [ ] `packages/utils` created — `metersFromLevel()`, `haversineDistance()`, date formatters
- [ ] All four packages export proper TypeScript types with `index.ts` barrel files
- [ ] `apps/mobile` updated to import from `@flood/shared-types`, `@flood/api-client`, `@flood/ui-tokens`
- [ ] `apps/web` updated to import from the same shared packages
- [ ] No duplicated type definitions or utility functions remain in any app
- [ ] `turbo run typecheck` passes across all apps and packages

#### Notes
- Package names use `@flood/` scope e.g. `@flood/shared-types`
- Reference `ARCHITECTURE_PLAN.md` §4 for full code samples of each package

---

### FLOOD-03 — Local Docker Development Environment

> **Sprint 1 | Story Points: 5 | Priority: High**

#### Description
Integrate the existing Dockerfiles into the Turborepo monorepo so the full stack (API + CRM) can run locally with a single `docker compose up` command. The mobile app continues to use Expo's development server outside Docker.

#### Acceptance Criteria
- [ ] Existing `Dockerfile` for API moved and verified inside `apps/api/`
- [ ] Existing `Dockerfile` for CRM moved and verified inside `apps/web/` (with `output: standalone`)
- [ ] `.dockerignore` files present for both apps
- [ ] `docker-compose.yml` at repo root starts API on `:3001` and CRM on `:3000`
- [ ] `docker compose up --build` runs successfully with no errors
- [ ] `.env.docker` template file documents all required variable names
- [ ] API health check (`/actuator/health`) returns 200 inside the container
- [ ] CRM loads in browser at `http://localhost:3000` connected to the local API

#### Notes
- The Dockerfiles already exist — this ticket is about monorepo integration and local compose wiring
- Mobile app is NOT containerised — it runs via `npx expo start` as before

---

## Sprint 2 — Data & Auth Unification

---

### FLOOD-04 — Migrate CRM Data Layer from MongoDB to Neon API

> **Sprint 2 | Story Points: 8 | Priority: High**

#### Description
The CRM currently fetches node and sensor data from its own MongoDB Atlas connection (`/api/nodes` Next.js route). This must be replaced with calls to the shared Java backend API which reads from Neon PostgreSQL — so both mobile and CRM always display identical, real-time data from the same source.

#### Acceptance Criteria
- [ ] `apps/web/app/api/nodes/route.ts` (MongoDB proxy route) deleted
- [ ] All CRM data fetching updated to call the shared backend API (`GET /sensors`, `GET /dashboard/nodes`, `GET /feed`, `GET /analytics`)
- [ ] MongoDB driver dependency removed from `apps/web/package.json`
- [ ] `MONGODB_URI` environment variable removed from CRM config entirely
- [ ] CRM Dashboard KPI cards display live data from Neon via the backend API
- [ ] CRM Sensors page displays real-time sensor list from `GET /sensors`
- [ ] CRM Alerts page displays the event feed from `GET /feed`
- [ ] CRM Analytics page populates charts from `GET /analytics`
- [ ] Data shown in CRM is identical to data shown in mobile app when viewed simultaneously

#### Notes
- The Neon schema and backend endpoints already exist — no new migrations or endpoints needed
- Use `@flood/api-client` for all HTTP calls once FLOOD-02 is complete

---

### FLOOD-05 — Unified JWT Authentication for CRM Web App

> **Sprint 2 | Story Points: 8 | Priority: High**

#### Description
The CRM currently uses a localStorage-based mock authentication system (`flood_registered_users`) with hardcoded users. This ticket replaces it with the real JWT-based authentication provided by the shared backend, backed by the `users` table in Neon PostgreSQL.

#### Acceptance Criteria
- [ ] CRM login page submits credentials to `POST /auth/login` via the shared backend
- [ ] JWT access token (15 min) and refresh token (7 days) stored in CRM session (httpOnly cookie or secure localStorage)
- [ ] Token refresh interceptor from `@flood/api-client` active in CRM — auto-refreshes expired tokens without user disruption
- [ ] CRM logout calls `POST /auth/logout` and clears all token storage
- [ ] `localStorage` mock user store (`flood_registered_users`) removed entirely from CRM
- [ ] Role-based navigation enforced via JWT `role` claim (`admin`, `operator`, `viewer`)
- [ ] `admin1@example.com` can log into both the mobile app and CRM with the same credentials
- [ ] Unauthenticated CRM routes redirect to `/login`
- [ ] CRM session survives browser refresh

#### Notes
- The backend JWT endpoints already exist — this is purely a CRM frontend integration change

---

### FLOOD-06 — Redis Caching Layer for Analytics Endpoints

> **Sprint 2 | Story Points: 5 | Priority: Medium**

#### Description
The analytics and dashboard endpoints run heavy aggregate SQL queries on the 200k+ events table. Add Upstash Redis caching so repeated requests within a short window are served from cache rather than hitting the database, reducing latency and Neon query load.

#### Acceptance Criteria
- [ ] Upstash Redis account created (free tier — 500K commands/month)
- [ ] `REDIS_URL` added to `.env.docker` and AWS SSM Parameter Store
- [ ] `GET /analytics` response cached in the backend with 60-second TTL
- [ ] `GET /dashboard/nodes` response cached with 30-second TTL
- [ ] `GET /sensors` response cached with 30-second TTL
- [ ] Cache invalidated automatically on TTL expiry — no manual clearing needed
- [ ] Write operations (`POST`, `PUT`, `DELETE`) bypass cache and hit DB directly
- [ ] Response time for `GET /analytics` improves from >200ms to <20ms on cache hit
- [ ] API falls back to direct DB query if Redis is unavailable (cache failure does not break the API)

#### Notes
- Upstash Redis is serverless — the free tier is sufficient at NGO traffic scale
- Reference `ARCHITECTURE_PLAN.md` §7 for cost breakdown

---

## Sprint 3 — Cloud Deployment

---

### FLOOD-07 — Terraform Infrastructure Setup (ECS Fargate + ALB + SSM)

> **Sprint 3 | Story Points: 8 | Priority: High**

#### Description
Use the existing Terraform configuration in `infra/terraform/` to provision all required AWS infrastructure with a single command: VPC, public subnets, Application Load Balancer, ECS Fargate cluster, SQS queue, and encrypted secrets in SSM Parameter Store.

#### Acceptance Criteria
- [ ] AWS account configured locally (`aws configure` with valid Access Key + Secret)
- [ ] `infra/terraform/terraform.tfvars` created from the example template with real values
- [ ] `terraform init` completes — AWS provider downloaded
- [ ] `terraform plan` shows all expected resources with no errors
- [ ] `terraform apply` completes (~5–10 minutes) and outputs the ALB DNS name
- [ ] VPC with 2 public subnets created across 2 AZs
- [ ] ALB created and accessible; HTTPS listener configured with ACM certificate
- [ ] ECS cluster created; service starts with 1 Fargate task (0.5 vCPU / 1 GB)
- [ ] SSM Parameter Store entries created: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET` (type: SecureString)
- [ ] SQS sensor ingestion queue and DLQ created
- [ ] `terraform.tfvars` added to `.gitignore` — secrets never committed to Git

#### Notes
- All Terraform files (`vpc.tf`, `security_groups.tf`, `alb.tf`, `ecs.tf`, `sqs.tf`, `ssm.tf`) already written
- ECS pulls from GHCR (not ECR) — no ECR repository needed
- Reference `ARCHITECTURE_PLAN.md` §6 for full Terraform walkthrough

---

### FLOOD-08 — Build & Push API Docker Image to GitHub Container Registry

> **Sprint 3 | Story Points: 5 | Priority: High**

#### Description
Build the production Docker image for the Java Spring Boot API, push it to GitHub Container Registry (GHCR — free), and trigger an ECS force-redeployment so the Fargate task picks up the new image.

#### Acceptance Criteria
- [ ] Docker logged in to GHCR (`echo $GITHUB_TOKEN | docker login ghcr.io -u <username> --password-stdin`)
- [ ] API Docker image builds successfully from `apps/api/Dockerfile`
- [ ] Image tagged as `ghcr.io/<username>/flood-monitoring-api:latest`
- [ ] Image pushed to GHCR successfully and visible in GitHub Packages
- [ ] ECS service force-redeployed (`aws ecs update-service --force-new-deployment`)
- [ ] ECS task reaches RUNNING state and passes health check (`/actuator/health` → 200)
- [ ] `GET /sensors` returns live Neon data when called against the ALB DNS URL
- [ ] `POST /auth/login` with `admin1@example.com` returns a valid JWT token
- [ ] API logs visible in CloudWatch log group `/ecs/flood-monitoring-api`

#### Notes
- GHCR is free — no AWS ECR cost (~$2/month) incurred
- ECS task definition already configured in `ecs.tf` to pull from `ghcr.io/<username>/...`

---

### FLOOD-09 — Deploy CRM Web App to Vercel

> **Sprint 3 | Story Points: 3 | Priority: High**

#### Description
Deploy the Next.js CRM web app to Vercel and connect it to the live backend API running on ECS. Configure environment variables so all CRM data fetches point to the production backend URL.

#### Acceptance Criteria
- [ ] Vercel CLI installed and logged in (`vercel login`)
- [ ] `apps/web` deployed to Vercel production (`vercel --prod`)
- [ ] `NEXT_PUBLIC_API_URL` set to the ALB / Cloudflare API URL in Vercel dashboard
- [ ] Vercel deployment URL accessible and loads the login page
- [ ] Login with `admin1@example.com` succeeds and redirects to dashboard
- [ ] CRM Dashboard shows live data from Neon PostgreSQL (via backend API)
- [ ] CRM Sensors and Alerts pages load real data — no MongoDB references remain
- [ ] Vercel preview deployments enabled — every PR gets its own preview URL

#### Notes
- Vercel free tier is sufficient — no upgrade needed
- `NEXT_PUBLIC_*` variables are baked in at build time — must be set before deploying

---

### FLOOD-10 — Mobile EAS Production Build & Cloudflare DNS Setup

> **Sprint 3 | Story Points: 5 | Priority: High**

#### Description
Update the mobile app to point to the live production API URL, build a production-ready Android App Bundle (.aab) and iOS package (.ipa) via Expo EAS, and configure Cloudflare DNS so `api.<domain>` routes traffic to the ALB.

#### Acceptance Criteria
- [ ] `EXPO_PUBLIC_API_BASE_URL` updated in `apps/mobile/.env` to `https://api.<yourdomain>`
- [ ] `eas build --platform android --profile production` completes → `.aab` file generated
- [ ] `eas build --platform ios --profile production` completes → `.ipa` file generated
- [ ] Both builds install and connect to the live API successfully
- [ ] Mobile app login with `admin1@example.com` hits live API and returns real data
- [ ] Feed, Map, Sensors, and Analytics screens all show live Neon data
- [ ] Cloudflare DNS CNAME: `api` → ALB DNS name (Proxied ✅)
- [ ] Cloudflare DNS CNAME: `crm` → Vercel URL (Proxied ✅)
- [ ] `https://api.<yourdomain>/actuator/health` returns 200 via Cloudflare

#### Notes
- Cloudflare SSL mode must be **Full (Strict)** before adding CNAME records
- Reference `ARCHITECTURE_PLAN.md` §10 for DNS record configuration

---

## Sprint 4 — CI/CD, Security & Production Readiness

---

### FLOOD-11 — GitHub Actions CI/CD Pipeline (All Three Apps)

> **Sprint 4 | Story Points: 8 | Priority: High**

#### Description
Automate build and deployment for all three apps using GitHub Actions. Every merge to `main` automatically rebuilds and redeploys the affected app — no manual Docker builds, GHCR pushes, or Vercel deploys required.

#### Acceptance Criteria
- [ ] `.github/workflows/deploy-api.yml` — triggers on push to `main` for `apps/api/**` or `packages/**`; logs in to GHCR, builds and pushes image, forces ECS redeployment
- [ ] `.github/workflows/deploy-web.yml` — triggers on push to `main` for `apps/web/**` or `packages/**`; runs typecheck + build, deploys to Vercel production
- [ ] `.github/workflows/deploy-mobile.yml` — triggers on version tags (`v*.*.*`); runs `eas build --platform all --profile production`
- [ ] AWS credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) and `VERCEL_TOKEN` stored in GitHub Actions secrets
- [ ] GHCR login uses `GITHUB_TOKEN` (automatic — no extra secret)
- [ ] Workflows only trigger for their relevant app paths — no unnecessary rebuilds
- [ ] All three workflow files pass syntax validation

#### Notes
- GitHub Actions is free for public repos; 2,000 minutes/month free for private repos
- Reference `ARCHITECTURE_PLAN.md` §11 for full workflow YAML samples

---

### FLOOD-12 — Cloudflare Security Configuration

> **Sprint 4 | Story Points: 3 | Priority: Medium**

#### Description
Configure Cloudflare security rules to protect the API from brute-force, abusive bots, and DDoS traffic. Set cache rules to reduce backend load for public read endpoints.

#### Acceptance Criteria
- [ ] SSL/TLS mode set to **Full (Strict)** in Cloudflare dashboard
- [ ] Rate limiting: `POST /auth/login` — max 5 req/min/IP → block for 10 minutes
- [ ] Rate limiting: `api.*/*` — max 300 req/min/IP → JS Challenge
- [ ] Cache rule: static assets (`*.js`, `*.css`, `*.png`, `*.woff2`) → Cache Everything, TTL 1 day
- [ ] Cache rule: auth and write endpoints → Bypass Cache
- [ ] Cache rule: `GET /sensors`, `GET /analytics` → Cache 30 seconds
- [ ] Bot Fight Mode enabled in Cloudflare dashboard
- [ ] Brute-force test: login blocked after 5 failed attempts in 1 minute

#### Notes
- All features used are on the Cloudflare **free plan** — no upgrade needed
- Reference `ARCHITECTURE_PLAN.md` §10 for full rule configuration

---

### FLOOD-13 — Monitoring & Error Tracking (Sentry + CloudWatch)

> **Sprint 4 | Story Points: 5 | Priority: Medium**

#### Description
Integrate Sentry error tracking across all three apps and set up CloudWatch alarms for the ECS API, so runtime exceptions and infrastructure anomalies are visible in dashboards before users report them.

#### Acceptance Criteria
- [ ] Sentry project created (free tier — 5K errors/month)
- [ ] Sentry SDK integrated in `apps/api` (Spring Boot) — unhandled exceptions automatically reported
- [ ] Sentry SDK integrated in `apps/web` (Next.js) — client and server errors reported
- [ ] Sentry SDK integrated in `apps/mobile` (Expo React Native) — JS crashes reported
- [ ] `SENTRY_DSN` added to SSM Parameter Store (API), Vercel env (CRM), and EAS secrets (mobile)
- [ ] CloudWatch log group `/ecs/flood-monitoring-api` retaining logs with 30-day retention
- [ ] CloudWatch alarm: triggers if ECS health check fails 3 times in 5 minutes
- [ ] CloudWatch alarm: triggers if API average response time exceeds 1 second
- [ ] Alarm notifications sent via email (AWS SNS → email subscription)

#### Notes
- Sentry free tier is sufficient for NGO scale
- CloudWatch basic monitoring is included in the AWS free tier

---

### FLOOD-14 — Load Testing & Performance Validation

> **Sprint 4 | Story Points: 5 | Priority: Medium**

#### Description
Validate the live ECS Fargate API can handle realistic public traffic by running a k6 load test simulating 500 concurrent users. Use results to identify and fix any bottlenecks before launch.

#### Acceptance Criteria
- [ ] k6 load test script written covering: `POST /auth/login`, `GET /feed`, `GET /sensors`, `GET /analytics`, `POST /ingest`
- [ ] Load test ramps 0 → 500 concurrent users over 2 minutes, holds 3 minutes, ramps down
- [ ] p95 response time < 500ms for all endpoints under 500 concurrent users
- [ ] Error rate < 0.1% (fewer than 1 in 1,000 requests returns 5xx)
- [ ] Load test results documented: requests/sec, p50/p95/p99 latency, peak throughput
- [ ] Any bottlenecks identified and resolved (e.g. missing DB index, uncached query)
- [ ] ECS auto-scaling observed during test — additional tasks launched as CPU > 70%
- [ ] Final results confirm system is production-ready for NGO-scale traffic

#### Notes
- Run against the live ALB URL (via Cloudflare) — not localhost
- k6 is free and open source — install from `k6.io`
- ECS is already configured to scale up to 5 pods — observe scaling in CloudWatch during test

---

## Story Point Reference

| Points | Effort | Typical Duration |
|--------|--------|-----------------|
| 1 | Trivial | < 1 hour |
| 2 | Simple | 1–2 hours |
| 3 | Small | Half a day |
| 5 | Medium | 1 day |
| 8 | Large | 1–2 days |
| 13 | Very large — consider splitting | 3+ days |

## Status Legend

| Icon | Status |
|------|--------|
| 🔲 | To Do |
| 🔄 | In Progress |
| 👀 | In Review |
| ✅ | Done |
| 🚫 | Blocked |

---

*Document maintained by: Jonathan Tang*
*Last updated: 2026-04-08*
