# Flood Monitoring System — Feature Scrum Board
> Project: New Features & Enhancements (Post-FYP)
> Author: Jonathan Tang
> Last Updated: 2026-04-08
> Note: Tickets cover ONLY features not already present in the current codebase.

---

## Sprint Overview

| Ticket | Title | Sprint | Story Points | Status |
|--------|-------|--------|-------------|--------|
| SCRUM-102 | Push Notifications for Critical Flood Alerts | Sprint 1 | 8 | 🔲 To Do |
| SCRUM-103 | Community Flood Safety Awareness Page | Sprint 1 | 5 | 🔲 To Do |
| SCRUM-104 | Emergency Broadcast & Public Alert System | Sprint 2 | 8 | 🔲 To Do |
| SCRUM-105 | Flood Incident Report Submission (Mobile + CRM) | Sprint 2 | 8 | 🔲 To Do |
| SCRUM-106 | Flood Risk Zone Classification & Map Overlay | Sprint 2 | 5 | 🔲 To Do |
| SCRUM-107 | IoT Sensor Data Ingestion API | Sprint 3 | 8 | 🔲 To Do |
| SCRUM-108 | Password Reset Email Flow for CRM Web App | Sprint 3 | 3 | 🔲 To Do |
| SCRUM-109 | Mobile App Unit & Integration Testing | Sprint 4 | 8 | 🔲 To Do |
| SCRUM-110 | End-to-End Testing with Playwright (CRM) | Sprint 4 | 8 | 🔲 To Do |
| SCRUM-111 | API Performance & Security Testing | Sprint 4 | 8 | 🔲 To Do |
| SCRUM-112 | Favourite Sensor Nodes — Personal Monitoring List | Sprint 2 | 5 | 🔲 To Do |

---

## Sprint 1 — New Public Safety Features

---

### SCRUM-102 — Push Notifications for Critical Flood Alerts

> **Sprint 1 | Story Points: 8 | Priority: High**

#### Description
Send automatic push notifications to public users' mobile devices when any sensor node reaches flood Level 2 (Warning) or Level 3 (Critical). This is the core public safety feature — ensuring residents are alerted even when the app is closed.

#### Acceptance Criteria
- [ ] `expo-notifications` installed and configured for both Android and iOS
- [ ] Device push token registered on app launch and stored in `user_settings` via `PATCH /settings`
- [ ] Backend sends push notification when a new event with `new_level >= 2` is inserted into `events`
- [ ] Notification payload includes: affected area / node ID, flood level name, water level in metres, timestamp
- [ ] Tapping a notification opens the app and navigates to the relevant feed item detail screen
- [ ] Notification preference toggle — **All Warnings**, **Critical Only**, **None** — respected by notification sender
- [ ] Preferences saved to `user_settings` and honoured server-side before dispatching
- [ ] Notifications deliver when app is in foreground, background, and fully closed
- [ ] Android notification channel created with high importance for flood alerts

#### Notes
- Expo Push API is free — no cost at NGO traffic scale
- Backend must call `https://exp.host/--/api/v2/push/send` when a Level 2+ event is ingested
- Depends on IoT ingestion endpoint (SCRUM-107) for real sensor-triggered notifications; can test with manual DB inserts in Sprint 1

---

### SCRUM-103 — Community Flood Safety Awareness Page

> **Sprint 1 | Story Points: 5 | Priority: Medium**

#### Description
A new public-facing Safety Awareness section in the mobile app giving residents flood preparedness information, evacuation guides, and emergency contact numbers. This content does not currently exist anywhere in the app and is not in the backend.

#### Acceptance Criteria
- [ ] New "Safety" tab or section accessible from main navigation — no login required
- [ ] Sections: **Before a Flood**, **During a Flood**, **After a Flood** (actionable steps)
- [ ] Emergency contacts section: local fire department, civil defence, NGO hotline — tap-to-call
- [ ] Evacuation routes section: list of designated safe zones with GPS coordinates
- [ ] "Nearest safe zone" feature uses device GPS to show the closest evacuation point
- [ ] Content cached after first load — readable offline (important during network outages in floods)
- [ ] Supports Bahasa Malaysia and English — language toggle available
- [ ] New `safety_content` table added to Neon schema for NGO staff to update content
- [ ] NGO admin can update safety content text via the CRM — no code change required

#### Notes
- Content must be offline-readable — users may have poor connectivity during an actual flood
- This is entirely new — no existing safety or evacuation screen in the current mobile app

---

## Sprint 2 — NGO Operational Features

---

### SCRUM-104 — Emergency Broadcast & Public Alert System

> **Sprint 2 | Story Points: 8 | Priority: High**

#### Description
Allow NGO operators to send an emergency broadcast push notification to all registered users in a specified flood-affected zone. Used for mass communication during evacuation orders, road closures, or imminent danger — none of which exists in the current system.

#### Acceptance Criteria
- [ ] New "Send Broadcast" section in the CRM Operations Dashboard (admin/operator roles only)
- [ ] Broadcast form: message title, message body (max 160 chars), target zone (All / specific area), severity level
- [ ] Preview of how the notification will appear on device before sending
- [ ] Confirmation: "This will notify X users in [Zone]. Confirm?" dialog before sending
- [ ] New `POST /broadcasts` API endpoint — saves broadcast record and triggers Expo push to targeted users
- [ ] Broadcast dispatched to all users with notifications enabled in the selected zone
- [ ] Broadcast history log visible in CRM: message, zone, sent by, timestamp, recipient count
- [ ] Broadcast pinned as a card at the top of the public Feed screen in the mobile app
- [ ] Only `admin` role can send to all zones; `operator` can send to their assigned zones only
- [ ] Rate limit: max 3 broadcasts per hour to prevent accidental spam
- [ ] New `broadcasts` table added to Neon schema

#### Notes
- This is the digital equivalent of an emergency siren — the most critical new NGO feature
- New backend endpoint, new DB table, new CRM UI, new mobile Feed card — entirely new

---

### SCRUM-105 — Flood Incident Report Submission (Mobile + CRM)

> **Sprint 2 | Story Points: 8 | Priority: Medium**

#### Description
Allow members of the public to submit a flood incident report from the mobile app when they observe flooding in their area. Reports appear in the CRM for NGO staff to review and validate against sensor readings — providing human ground-truth when sensors may be offline.

#### Acceptance Criteria

**Mobile (report submission):**
- [ ] "Report Flooding" button accessible from the Map screen and Feed screen
- [ ] Report form: location (auto-filled from GPS or picked on map), severity (mild / moderate / severe), description (optional, 200 chars max), optional photo
- [ ] `POST /reports` saves the report with user ID, coordinates, severity, and timestamp
- [ ] Submitted reports shown on the Map as a distinct marker (different icon from sensor nodes)
- [ ] Reporter receives a push notification when NGO staff updates their report status
- [ ] Duplicate prevention: same user cannot submit more than 1 report per location within 30 minutes
- [ ] Login required — unauthenticated users shown a prompt to register

**CRM (report review):**
- [ ] New "Community Reports" table in the Operations Dashboard
- [ ] NGO operators can change report status: **Verified**, **Under Investigation**, **Dismissed**
- [ ] Report table columns: reporter, location, severity, description, submitted at, status

#### Notes
- New `reports` table required in Neon schema
- New `POST /reports` endpoint required in backend
- Entirely new feature — nothing similar exists in either the mobile app or CRM

---

### SCRUM-106 — Flood Risk Zone Classification & Map Overlay

> **Sprint 2 | Story Points: 5 | Priority: Medium**

#### Description
Classify all monitored areas of Sarawak into High / Medium / Low flood risk based on historical sensor event data, and display these classifications as an overlay on the map. Users can set a "home zone" to see their local risk level on the app home screen.

#### Acceptance Criteria
- [ ] New `GET /zones/risk` API endpoint — returns risk classification per geographic zone
- [ ] Risk level calculated from `events` table: High (3+ Level 2+ events in 12 months), Medium (1–2), Low (0)
- [ ] New `zones` table in Neon schema storing zone name, boundary polygon (GeoJSON), risk classification
- [ ] New Risk Zones screen in mobile app listing all zones grouped by risk level (High / Medium / Low)
- [ ] Each zone card: area name, active sensor count, last flood event date, risk badge
- [ ] Zone detail page: risk level explanation, flood frequency, nearest sensors, safety recommendations
- [ ] Map view shows risk zones as colour-coded polygon overlays (High = red, Medium = orange, Low = green)
- [ ] "My Area" feature — user selects home zone, risk level shown as persistent card on home screen
- [ ] Content accessible without login (public information)

#### Notes
- New `zones` table, new API endpoint, new mobile screen — entirely new feature
- Risk classification can be recalculated nightly via a scheduled job or on-demand

---

## Sprint 3 — Backend & Auth Gaps

---

### SCRUM-107 — IoT Sensor Data Ingestion API

> **Sprint 3 | Story Points: 8 | Priority: High**

#### Description
Build a dedicated ingestion endpoint for physical IoT flood sensor devices to report their water level readings. The endpoint validates the payload, updates the node's current level, creates an event record, and triggers push notifications if the level rises to a warning threshold. This is the live bridge between physical hardware and the application.

#### Acceptance Criteria
- [ ] `POST /ingest` endpoint accepts: `{ nodeId, level, timestamp }`
- [ ] Secured with API key header (`X-API-Key`) — IoT devices use API keys, not JWTs
- [ ] Payload validated: `nodeId` must exist in `nodes`, `level` must be 0–3, `timestamp` must be valid ISO date
- [ ] `current_level` updated in `nodes` table for the given `nodeId`
- [ ] New record inserted into `events` table with `event_type = 'update'`
- [ ] If `level >= 2`, additional alert event inserted and push notifications triggered (SCRUM-102)
- [ ] `last_updated` on the node updated to the ingestion timestamp
- [ ] Invalid `nodeId` → `404 Node not found`
- [ ] Invalid or missing API key → `401 Unauthorized`
- [ ] Rate limited: max 1 request per node per 10 seconds (prevents faulty sensor flooding)
- [ ] Returns `202 Accepted` immediately — writes processed asynchronously via SQS where possible
- [ ] API key stored in AWS SSM Parameter Store — never hardcoded

#### Notes
- No ingestion endpoint currently exists in the backend — this is entirely new
- SQS queue is already provisioned in Terraform (`sqs.tf`) for async write buffering

---

### SCRUM-108 — Password Reset Email Flow for CRM Web App

> **Sprint 3 | Story Points: 3 | Priority: Low**

#### Description
The mobile app already has forgot password, email verification, and change password screens. The CRM web app has no password reset flow. This ticket adds a complete forgot-password flow to the CRM login page using the backend endpoints that are already implemented.

#### Acceptance Criteria
- [ ] "Forgot Password?" link added to the CRM `/login` page
- [ ] Forgot Password page: email input → calls `POST /auth/forgot-password`
- [ ] Verify Code page: 6-digit code input → calls `POST /auth/verify-reset-code`
- [ ] Expired or invalid code shows: "Code expired or invalid — please request a new one"
- [ ] Resend code button available after 60-second cooldown
- [ ] New Password page: new password + confirm → calls `POST /auth/reset-password`
- [ ] Success redirects to `/login` with a success toast notification
- [ ] Email sent via Resend (or equivalent transactional email provider)
- [ ] `RESEND_API_KEY` added to Vercel environment variables and SSM

#### Notes
- All three backend endpoints already implemented — this is purely a CRM frontend task
- Mobile app already has this flow — replicate the same UX in Next.js for the CRM

---

## Sprint 4 — Testing

---

### SCRUM-109 — Mobile App Unit & Integration Testing

> **Sprint 4 | Story Points: 8 | Priority: Medium**

#### Description
Write a comprehensive test suite for the mobile app covering shared utility functions, API client behaviour, and the new feature screens added in Sprints 1–3. Tests run via Jest and React Native Testing Library, integrated into CI/CD.

#### Acceptance Criteria
- [ ] Unit tests for all `packages/utils` functions: `metersFromLevel`, `haversineDistance`, date formatters
- [ ] Unit tests for `packages/ui-tokens`: flood level colour mapping, `floodLevelMeta` lookups
- [ ] Integration tests for `packages/api-client`: login, token refresh, error handling (using `axios-mock-adapter`)
- [ ] Component tests for **Safety Awareness** screen (SCRUM-103): renders all sections, emergency contacts are tappable
- [ ] Component tests for **Incident Report** form (SCRUM-105): field validation, GPS auto-fill, submit success/error
- [ ] Component tests for **Risk Zones** screen (SCRUM-106): zone list renders, risk badge colours correct
- [ ] Component tests for push notification permission flow (SCRUM-102): prompt shown, preference saved
- [ ] Test coverage ≥ 70% across `packages/` and new Sprint 1–3 screens
- [ ] All tests pass in GitHub Actions CI on every push to `main`

#### Notes
- Focus coverage on the NEW screens added in this project — existing screens are out of scope for this ticket
- `jest.config.js` and `jest.setup.ts` already configured in the mobile app

---

### SCRUM-110 — End-to-End Testing with Playwright (CRM)

> **Sprint 4 | Story Points: 8 | Priority: Medium**

#### Description
Write end-to-end tests for the CRM web app covering the new NGO operational flows added in Sprints 2–3: emergency broadcasts, community report review, and the password reset flow. Tests run headlessly in CI on every pull request.

#### Acceptance Criteria
- [ ] E2E test: **Emergency Broadcast** — operator fills form, confirms send, broadcast appears in history log
- [ ] E2E test: **Community Reports** — operator views report list, changes status to "Verified", status persists after refresh
- [ ] E2E test: **Password Reset** — submit email, verify 6-digit code, set new password, login with new password succeeds
- [ ] E2E test: **Safety Content Management** — admin updates safety awareness text, changes visible in mobile API response
- [ ] E2E test: Broadcast access control — `viewer` role cannot see the "Send Broadcast" button
- [ ] All tests run headlessly in GitHub Actions using Playwright Chromium
- [ ] Playwright HTML report uploaded as GitHub Actions artifact on failure

#### Notes
- Run against the Vercel preview deployment URL via `PLAYWRIGHT_BASE_URL` env var
- `playwright.config.ts` already configured in the CRM project

---

### SCRUM-111 — API Performance & Security Testing

> **Sprint 4 | Story Points: 8 | Priority: High**

#### Description
Validate the live ECS Fargate API against realistic load and common security vulnerabilities. Covers all new endpoints added in this project (ingest, broadcasts, reports, zones) in addition to the core endpoints.

#### Acceptance Criteria
- [ ] k6 load test covers: `POST /ingest`, `POST /broadcasts`, `POST /reports`, `GET /zones/risk`, `GET /feed`, `GET /sensors`, `GET /analytics`
- [ ] Load test ramps 0 → 500 concurrent users over 2 minutes, holds 3 minutes, ramps down
- [ ] p95 response time < 500ms for all endpoints under 500 concurrent users
- [ ] Error rate < 0.1% across all endpoints
- [ ] Load test results documented: requests/sec, p50/p95/p99, peak throughput
- [ ] Security: all responses include `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`
- [ ] Security: `POST /auth/login` blocked after 5 failed attempts per IP (Cloudflare rate limit verified)
- [ ] Security: tampered JWT tokens rejected with 401
- [ ] Security: SQL injection on query params returns 400/422 — not a data leak or 500
- [ ] Security: CORS allows only `app.<domain>` and `crm.<domain>`
- [ ] Security: `POST /ingest` rejects requests without valid API key (`X-API-Key`)
- [ ] Security: `POST /broadcasts` rejects requests from `viewer` role — returns 403
- [ ] All critical findings documented and fixes applied before launch

#### Notes
- Run against the live ALB DNS URL via Cloudflare — not localhost
- k6 is free and open source — install from `k6.io`

---

### SCRUM-112 — Favourite Sensor Nodes — Personal Monitoring List

> **Sprint 2 | Story Points: 5 | Priority: Medium**

#### Description
Allow public users to bookmark specific sensor nodes they care about — for example, the node nearest their home, workplace, or a frequently travelled route. Favourited nodes appear in a dedicated "My Nodes" screen and trigger personalised push notifications regardless of the user's global alert preference level.

#### Acceptance Criteria

**Mobile (user-facing):**
- [ ] Star/bookmark icon shown on the Map marker bottom sheet — tap to add/remove from favourites
- [ ] Star/bookmark icon shown on each item in the Sensors list — tap to toggle
- [ ] New **"My Nodes"** screen (accessible from the main navigation) listing only the user's favourited nodes
- [ ] Each "My Nodes" card shows: node ID, location name, current flood level badge, water level in metres, last updated time
- [ ] Favourited nodes visually distinguished on the map (e.g. filled star marker vs. hollow)
- [ ] Favourite state persists across sessions — stored server-side, not only in local storage
- [ ] Push notification sent for a favourited node at **any** alert level ≥ 1 (Watch), overriding the user's global "Critical Only" preference
- [ ] Empty state on "My Nodes" screen: "You haven't favourited any nodes yet. Tap ☆ on any sensor to get started."

**Backend:**
- [ ] New `user_favourite_nodes` table: `(user_id, node_id, created_at)` — unique constraint on `(user_id, node_id)`
- [ ] `POST /favourites/{nodeId}` — add node to authenticated user's favourites; returns 409 if already added
- [ ] `DELETE /favourites/{nodeId}` — remove node from authenticated user's favourites
- [ ] `GET /favourites` — returns full node details (current level, location, last updated) for all favourited nodes
- [ ] All three endpoints require JWT authentication — unauthenticated calls return 401
- [ ] Node notification logic in SCRUM-102 checks `user_favourite_nodes` before dispatch — sends to favouriting users at level ≥ 1 even if global preference is "Critical Only"

#### Notes
- Favourite nodes give users a personalised view of only the areas they care about — useful for residents monitoring their neighbourhood or commute route
- `user_favourite_nodes` is a new join table — minimal schema change
- Depends on SCRUM-102 (push notifications) for the personalised alert override behaviour; the favouriting UI can ship independently

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
*Last updated: 2026-04-08 — added SCRUM-112 Favourite Sensor Nodes*
