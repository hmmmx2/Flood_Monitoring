# Flood Monitoring System — Implementation Order
> Author: Jonathan Tang
> Written: 2026-04-09
> Purpose: Exact sequence to implement all 25 tickets across SCRUM.md + SCRUM2.md

---

## TL;DR — Start Here

```
FLOOD-01 → FLOOD-02 → FLOOD-03
                    → FLOOD-04 → FLOOD-05
                    → SCRUM-107 (backend only, do in any gap)
                    → FLOOD-06  (backend only, do in any gap)
```

**Start with FLOOD-01.** It is the only ticket with zero dependencies.
Everything else in both boards traces back to it.

---

## Full Dependency Map

```
FLOOD-01 (Turborepo)
  │
  ├── FLOOD-02 (Shared packages) ──────────────────────────────────────┐
  │     │                                                               │
  │     ├── FLOOD-04 (CRM DB migration)                                │
  │     │     └── FLOOD-05 (CRM JWT auth)                              │
  │     │           ├── FLOOD-09 (Vercel CRM deploy) ──────────────┐   │
  │     │           ├── SCRUM-104 (Emergency broadcast)            │   │
  │     │           └── SCRUM-108 (CRM password reset)             │   │
  │     │                                                           │   │
  │     ├── SCRUM-102 (Push notifications) ──────────────────────┐  │   │
  │     │     └── SCRUM-104 (Emergency broadcast) ───────────────┤  │   │
  │     │     └── SCRUM-112 (Favourite nodes — notif override)   │  │   │
  │     │                                                         │  │   │
  │     ├── SCRUM-103 (Safety awareness page)                    │  │   │
  │     ├── SCRUM-105 (Incident reports)                         │  │   │
  │     ├── SCRUM-106 (Risk zones)                               │  │   │
  │     └── SCRUM-112 (Favourite nodes — base UI)               │  │   │
  │                                                              │  │   │
  ├── FLOOD-03 (Docker local dev)                               │  │   │
  │     └── FLOOD-07 (Terraform ECS + ALB)                      │  │   │
  │           └── FLOOD-08 (GHCR push + ECS deploy) ────────────┼──┘   │
  │                 ├── FLOOD-10 (EAS build + Cloudflare DNS) ──┘       │
  │                 │     ├── FLOOD-11 (CI/CD) ◄────────────────────────┘
  │                 │     ├── FLOOD-12 (Cloudflare security)
  │                 │     └── FLOOD-14 (Load testing)
  │                 ├── FLOOD-13 (Sentry + CloudWatch)
  │                 └── SCRUM-111 (API security testing)
  │
  ├── FLOOD-06 (Redis caching) ← independent, any slot
  └── SCRUM-107 (IoT ingest API) ← independent backend, any slot
        └── SCRUM-111 (API security testing)

Terminal tickets (nothing blocks them):
  FLOOD-11, FLOOD-12, FLOOD-13, FLOOD-14
  SCRUM-109 (mobile tests), SCRUM-110 (Playwright), SCRUM-111 (API perf)
```

---

## Week-by-Week Execution (Solo Developer)

> Scale: 5 pts = 1 day, 8 pts = 2 days, 3 pts = half day

---

### Week 1 — Foundation

| Day | Ticket | Points | Reason |
|-----|--------|--------|--------|
| 1–2 | **FLOOD-01** Turborepo monorepo | 5 | Only valid starting point — unblocks everything |
| 3–5 | **FLOOD-02** Extract shared packages | 8 | Highest fan-out — unlocks 6 downstream tickets immediately |

✅ End of week: monorepo structure in place, `@flood/api-client`, `@flood/shared-types`, `@flood/ui-tokens`, `@flood/utils` all created and importable.

---

### Week 2 — Local Dev + CRM Data Layer

| Day | Ticket | Points | Reason |
|-----|--------|--------|--------|
| 1 | **FLOOD-03** Docker compose | 5 | Needed before Terraform; quick win — Dockerfiles already exist |
| 2–3 | **FLOOD-04** CRM MongoDB → Neon API migration | 8 | Unlocks FLOOD-05 and FLOOD-09 |
| 4–5 | **FLOOD-05** Unified JWT auth for CRM | 8 | Unlocks CRM deploy, emergency broadcast, CRM password reset |

✅ End of week: entire stack runs locally via `docker compose up`, CRM talks to real Neon data through the Java API, and uses real JWT auth.

---

### Week 3 — Cloud Deployment

| Day | Ticket | Points | Reason |
|-----|--------|--------|--------|
| 1–2 | **FLOOD-07** Terraform ECS + ALB | 8 | All `.tf` files already written — run `terraform apply` |
| 3 | **FLOOD-08** Push API image to GHCR + ECS | 5 | API goes live — unblocks FLOOD-10, 13, SCRUM-111 |
| 4 | **FLOOD-09** Deploy CRM to Vercel | 3 | CRM goes live — depends on FLOOD-04 + FLOOD-05 (done) |
| 5 | **FLOOD-06** Redis caching | 5 | Backend-only; safe filler; no blockers; improves API perf before launch |

✅ End of week: API live on ECS Fargate, CRM live on Vercel, Redis caching active.

---

### Week 4 — Mobile Deploy + Push Notifications + IoT Ingest

| Day | Ticket | Points | Reason |
|-----|--------|--------|--------|
| 1 | **FLOOD-10** EAS build + Cloudflare DNS | 5 | Completes deployment triad; completes DNS wiring |
| 2–3 | **SCRUM-102** Push notifications | 8 | Highest fan-out feature — unlocks SCRUM-104 and SCRUM-112 notification override |
| 4–5 | **SCRUM-107** IoT sensor data ingestion API | 8 | Backend-only; ingest triggers SCRUM-102 push on level ≥ 2; completes notification chain |

✅ End of week: all three apps deployed and running in production, push notifications fire on real sensor level changes.

---

### Week 5 — New Mobile Feature Screens

| Day | Ticket | Points | Reason |
|-----|--------|--------|--------|
| 1 | **SCRUM-103** Safety awareness page | 5 | New `safety_content` table + API + mobile screen |
| 2–3 | **SCRUM-105** Flood incident reports | 8 | New `reports` table + API + mobile form + CRM review table |
| 4 | **SCRUM-106** Flood risk zones | 5 | New `zones` table + API + mobile screen + map overlay |
| 5 | **SCRUM-112** Favourite sensor nodes | 5 | New `user_favourite_nodes` table + API + star UI + notification override (SCRUM-102 done) |

✅ End of week: 4 new mobile features shipped — safety content, incident reports, risk zones, and favourite nodes.

---

### Week 6 — NGO Operations + CRM Auth Gap + CI/CD

| Day | Ticket | Points | Reason |
|-----|--------|--------|--------|
| 1–2 | **SCRUM-104** Emergency broadcast system | 8 | Requires SCRUM-102 + FLOOD-05 (both done); most critical NGO feature |
| 3 | **SCRUM-108** CRM password reset UI | 3 | Requires FLOOD-05 (done); small ticket; backend endpoints already exist |
| 4–5 | **FLOOD-11** GitHub Actions CI/CD | 8 | All 3 manual deploys work (FLOOD-08, 09, 10) — now automate them |

✅ End of week: NGO operators can send emergency broadcasts, CRM has full auth flow, every `git push` to `main` auto-deploys all three apps.

---

### Week 7 — Production Hardening + Performance

| Day | Ticket | Points | Reason |
|-----|--------|--------|--------|
| 1 | **FLOOD-12** Cloudflare security rules | 3 | DNS already configured (FLOOD-10 done); lightweight config |
| 2 | **FLOOD-13** Sentry + CloudWatch monitoring | 5 | Requires FLOOD-08 (done Week 3); set up before load test so errors are visible |
| 3–4 | **FLOOD-14** Load testing | 5 | All deploys live + Redis + Sentry watching — safe to hammer it |
| 5 | **SCRUM-111** API performance + security testing | 8 | Requires SCRUM-107 + FLOOD-08 (both done); covers all new endpoints |

✅ End of week: system hardened, rate-limited, monitored, and load-validated.

---

### Week 8 — Test Suites

| Day | Ticket | Points | Reason |
|-----|--------|--------|--------|
| 1–2 | **SCRUM-109** Mobile unit + integration tests | 8 | All new screens (102, 103, 105, 106, 112) done — test them |
| 3–4 | **SCRUM-110** Playwright E2E for CRM | 8 | All new CRM features (104, 105, 108) done — test them |
| 5 | 🐛 Buffer / fix day | — | Address failures from SCRUM-109, 110, FLOOD-14 |

✅ End of week: full test coverage on new features, system production-ready.

---

## Parallel Opportunities (If Working in a Team)

| Track | Who | Weeks |
|-------|-----|-------|
| Infrastructure: FLOOD-07 → 08 → 10 → 11 | Dev A | Week 3–6 |
| CRM Data + Auth: FLOOD-04 → 05 → 09 → 108 | Dev B | Week 2–6 |
| Backend features: SCRUM-107, 103, 105, 106, 112 | Dev C | Week 4–5 |
| Mobile features: SCRUM-102, 104, 112 UI | Dev D | Week 4–6 |

Tracks A and B can run **fully in parallel** from Week 2 onward — they only converge at FLOOD-11 (CI/CD) and FLOOD-14 (load testing).

---

## Two Tickets You Can Do Any Time (No Blockers)

| Ticket | Why it's flexible |
|--------|------------------|
| **FLOOD-06** Redis caching | Depends only on FLOOD-01 (done Week 1). Backend-only. Drop it into any free afternoon. |
| **SCRUM-107** IoT ingest API | Depends only on FLOOD-01 (done Week 1). Backend-only. Drop it into any free afternoon. |

Both are placed in Week 3–4 above, but can be pulled forward into Week 1–2 if you have spare time.

---

## Summary

| Week | Theme | Tickets |
|------|-------|---------|
| 1 | Foundation | FLOOD-01, FLOOD-02 |
| 2 | Local dev + CRM | FLOOD-03, FLOOD-04, FLOOD-05 |
| 3 | Cloud live | FLOOD-07, FLOOD-08, FLOOD-09, FLOOD-06 |
| 4 | Mobile deploy + notifications | FLOOD-10, SCRUM-102, SCRUM-107 |
| 5 | New mobile features | SCRUM-103, SCRUM-105, SCRUM-106, SCRUM-112 |
| 6 | NGO ops + CI/CD | SCRUM-104, SCRUM-108, FLOOD-11 |
| 7 | Hardening | FLOOD-12, FLOOD-13, FLOOD-14, SCRUM-111 |
| 8 | Tests | SCRUM-109, SCRUM-110 |

**Total: ~8 weeks solo, ~4–5 weeks with a 4-person team.**

---

*Document maintained by: Jonathan Tang*
*Written: 2026-04-09*
