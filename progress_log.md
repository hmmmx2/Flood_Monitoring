# Flood Monitoring System - Progress Log
Author: Jonathan Tang
Last updated: 2026-04-09 (updated)

---

## Session 1 - 2026-04-09

---

### FLOOD-01 - Turborepo Monorepo Root Setup
**Status** - Done

I have done the monorepo root setup by creating four configuration files inside the FYP root folder so both the mobile app and the CRM web app can share code without copying files between projects. I wrote package.json to define shared scripts for starting both apps, pnpm-workspace.yaml to register the app folders and shared packages with pnpm, turbo.json to run build and dev tasks in the correct order, and .npmrc to enable the flat node_modules structure that Expo and React Native require to find their native modules.

---

### FLOOD-02 - Shared Packages
**Status** - Done

I have done the shared packages setup by creating four packages inside the packages/ folder that both frontends can import by name. I wrote @flood/shared-types to hold all TypeScript types for auth, nodes, feed and every new SCRUM feature. I wrote @flood/api-client as an Axios HTTP client with automatic token refresh that works in both the mobile app and the CRM. I wrote @flood/ui-tokens to store flood level colours and spacing values so both apps stay visually consistent. I wrote @flood/utils for reusable helper functions like GPS distance calculation and time formatting.

---

### SCRUM-107 / Terraform - Remove SQS IoT Queue
**Status** - Done

I have done the SQS removal by editing three Terraform files to completely delete the AWS SQS queue and all related settings. I removed the main queue and dead letter queue resource blocks from sqs.tf and replaced the file with a deprecation comment. I deleted the SQS IAM permission policy and the SQS_QUEUE_URL environment variable from ecs.tf. I also removed the sqs_queue_url output block from outputs.tf. The reason I did this is that the system only handles 111 sensors at a low frequency so direct HTTP ingest to the Java backend is enough.

---

### FLOOD-03 - Docker Compose for Local Development
**Status** - Done

I have done the Docker Compose update by rewriting docker-compose.yml to remove MongoDB and connect the CRM service to the Java backend. I set the JAVA_API_URL environment variable on the CRM service to http://api:3001 because inside Docker, containers talk to each other using the service name not localhost. I removed all MongoDB related environment variables from the CRM service because the CRM no longer connects to MongoDB directly. I also updated the CRM build arguments to pass the Java API URL at build time so Next.js server side routes can use it.

---

### FLOOD-04 - CRM Migration from MongoDB to Java API
**Status** - Done

I have done the CRM database migration by replacing the direct MongoDB connection with a BFF pattern where Next.js API routes act as a middleman between the CRM and the Java backend. I created lib/javaApi.ts as a server side fetch helper that reads JAVA_API_URL and forwards the user login token. I rewrote app/api/nodes/route.ts to call the Java /sensors endpoint and convert the response into the same NodeData shape the CRM components already use so no page component needed to change. I also added new proxy routes for broadcasts and reports.

---

### FLOOD-05 - CRM Real JWT Authentication
**Status** - Done

I have done the CRM authentication replacement by fully rewriting lib/AuthContext.tsx to use real JWT tokens from the Java backend instead of the old fake system that stored passwords in plain text inside localStorage. The new login function sends credentials to POST /auth/login on the Java backend and saves the returned access token and refresh token in localStorage. Register sends user details to POST /auth/register. Logout removes both tokens. The User type and all function signatures stayed exactly the same so every existing CRM page continued to work without any changes.

---

### Mobile - Add New API Endpoints for SCRUM Features
**Status** - Done

I have done the mobile API extension by adding new TypeScript types and API functions to the existing src/api/types.ts and src/api/client.ts files without replacing any existing code. I added types for FavouriteNodeDto, SafetyContentDto, IncidentReportDto, FloodZoneDto and IngestPayloadDto to support the upcoming SCRUM feature screens. I added eight new API functions covering favourites, safety content, incident reports, flood zones and IoT sensor data submission. I also added the three shared workspace packages as dependencies in the mobile package.json so the app can import shared types and utilities.

---

### SCRUM-107 - IoT Sensor Ingest API
**Status** - Done

I have done the IoT ingest endpoint by creating IngestController, IngestService and IngestRequest and IngestResponse records in the Java Spring Boot backend. The POST /ingest route is open to unauthenticated requests so IoT sensor nodes can send readings without a login token. IngestService looks up the node by its ID, records a new Event row every time, updates the node current level and last updated timestamp, and then fires a push notification asynchronously if the water level rose to warning or critical. The @CacheEvict annotation clears the analytics and dashboard caches so the next read always reflects the latest sensor data.

---

### SCRUM-102 - Push Notifications
**Status** - Done

I have done the push notification system by creating PushNotificationService in the Java backend and pushNotifications.ts in the mobile app. On the backend, PushNotificationService uses the Expo Push API to send alerts to up to 100 user tokens per batch over HTTPS. It fetches users who have the pushAllWarnings or pushCriticalOnly setting enabled and sends a different notification title and body depending on whether the level is warning or critical. In the mobile app, I created functions to request device permission, retrieve the Expo push token, register it with the backend, and navigate to the correct feed item when the user taps a notification.

---

### FLOOD-06 - Redis Caching for Analytics and Dashboard
**Status** - Done

I have done the Redis caching layer by adding the spring-boot-starter-data-redis dependency to pom.xml and creating RedisConfig.java with two conditional cache managers. When the REDIS_URL environment variable is set, the app uses a Redis backed cache with separate TTL values for each cache name such as five minutes for analytics and thirty seconds for sensors. When REDIS_URL is not set, which is the normal case during local development, the app falls back to an in-memory ConcurrentMapCache so the developer does not need to run Redis locally. I also applied the @Cacheable annotation to AnalyticsService.getAnalytics.

---

### SQL Migration - 002 Push Notifications and Feature Tables
**Status** - Done

I have done the second database migration by writing 002_push_notifications.sql to add all tables and columns needed by the upcoming SCRUM features. I added a push_token column to the users table to store Expo device tokens. I created user_favourite_nodes as a join table so users can bookmark sensor nodes. I created safety_content with a unique index on section and language to hold the community safety guide text. I created broadcasts for emergency messages, reports for user submitted flood incident photos, and zones to store GeoJSON flood risk area boundaries. I also seeded the five default English safety sections.

---

### SCRUM-112 - Favourite Sensor Nodes
**Status** - Done

I have done the favourite sensor nodes feature by creating the full backend and mobile implementation. On the backend I created a UserFavouriteNode entity with a composite primary key mapping to the user_favourite_nodes join table from migration 002. I wrote FavouritesService with getFavourites, addFavourite and removeFavourite methods that are all transactional, and FavouritesController exposing GET, POST and DELETE on the /favourites route using JWT authentication to identify the user. On the mobile side I created useFavourites, useAddFavourite and useRemoveFavourite hooks that invalidate the query cache on change, a dedicated Favourites screen showing bookmarked nodes with their flood level badges, and a star toggle button on the Sensors screen.

---

### SCRUM-103 - Community Flood Safety Awareness Page
**Status** - Done

I have done the safety awareness feature by creating the backend and mobile screen that serve the pre-seeded safety guide content. On the backend I created a SafetyContent entity mapping to the safety_content table from migration 002, a SafetyContentRepository with a findByLang method, a SafetyContentDto record, and a SafetyController at GET /safety that accepts a lang query parameter and returns the sections sorted by name. The endpoint is cached for sixty minutes because the content changes rarely. On the mobile side I created a SafetyScreen that fetches all sections and displays each one as a colour-coded card labelled Before, During, After, Emergency Contacts or Evacuation Centres.

---

### SCRUM-104 - Emergency Broadcast System
**Status** - Done

I have done the emergency broadcast system by creating the backend API and a CRM page so admins can send push alerts to all mobile users. I created a Broadcast entity, BroadcastRepository, BroadcastService and BroadcastController exposing GET and POST on the /broadcasts route where POST requires admin role. BroadcastService saves each record and then fires push notifications asynchronously by calling a new notifyBroadcast method added to PushNotificationService which sends to every registered device token. On the CRM I created a broadcasts page with a compose form for title, message body, severity and target zone and a broadcast history list below.

---

### SCRUM-105 - Flood Incident Reports
**Status** - Done

I have done the flood incident report feature by creating a mobile submission form and a CRM review page backed by a Java API. I created a Report entity, ReportRepository, ReportService and ReportController where GET all reports and PATCH status are admin-only while POST is open to any authenticated user. The mobile report screen has latitude and longitude inputs, a three-option severity picker and an optional description field with coordinate validation before submitting. The CRM reports page shows all submissions in a table with a status filter dropdown and inline Review and Resolve buttons for each pending report.

---

### SCRUM-106 - Flood Risk Zones
**Status** - Done

I have done the flood risk zones feature by creating a backend zones API and a mobile zones screen. I created a Zone entity where the GeoJSON boundary polygon is stored as a JSONB column, a ZoneRepository, a ZoneService with a sixty-minute cache and a ZoneController at GET /zones and GET /zones/{id}. I added a CRM proxy route for zones and registered the zones cache name in both the Redis and in-memory cache managers. On the mobile side I created a zones screen that groups areas by risk level from extreme to low and shows each as a colour-coded card. I also fixed a wrong AppException constructor call in IngestService and FavouritesService that would have caused compile failures.

---

### FLOOD-07 - Security Audit & CRM User Management
**Status** - Done

I have done the security audit and CRM user management rebuild by removing all hardcoded credentials from the frontend, seeding the single authorised admin account in the database, building full admin CRUD endpoints in the backend, and rewriting the CRM roles page to read and write directly to the real database.

On the security side I removed the hardcoded email and password hint block from the CRM login page that was visible to any visitor. I also replaced the defaultUsers array and all localStorage logic in the roles page, which previously stored six fake email addresses that had never been authenticated. I seeded admin@floodmanagement.com with a bcrypt-hashed password directly in Neon PostgreSQL and deleted all other test users so the database has exactly one admin account.

On the backend I created AdminUserDto, CreateAdminUserRequest and UpdateAdminUserRequest records to represent the admin user management contract. I created AdminUserService with listAllUsers, createUser, updateUser and deleteUser, each transactional and using BCrypt for password hashing on create. I created AdminUserController with GET, POST, PATCH and DELETE mapped to /admin/users, with @PreAuthorize("hasRole('ADMIN')") protecting every route so only authenticated admins can reach it.

On the CRM I created two Next.js API proxy routes: app/api/admin/users/route.ts for GET list and POST create, and app/api/admin/users/[id]/route.ts for PATCH edit and DELETE, both forwarding the Bearer token to the Java API. I rewrote the roles page as a fully real-data page that fetches users on mount, shows a stats bar with total, admin, customer and active-today counts, and provides Add User, Edit and Delete modals. The delete button is blocked for the currently signed-in user to prevent self-deletion. All operations persist immediately to the Neon PostgreSQL database.

---

### FLOOD-08 - MongoDB to Neon PostgreSQL Full Data Import
**Status** - Done

I have done the full MongoDB export data import into Neon PostgreSQL by writing a Node.js import script and a SQL migration that together load all eight JSON export files into the existing Neon database used by both the mobile app and the CRM.

I created apps/api/migrations/003_import_tables.sql to add CREATE TABLE IF NOT EXISTS statements for the four tables not covered by existing Spring Boot JPA entities: commands, heartbeats, data_updates and master_logs. Each table includes an indexed timestamp and node_id for time-series and join queries. I also added user_registered_nodes as a many-to-many join table between users and nodes.

I created scripts/import.js as a standalone Node.js script that connects to Neon, runs the migration, then imports each collection in order. It upserts 111 nodes from nodes.json on conflict so re-runs are safe and the node coordinates are always up to date. It skips the 200,500 events and all other tables if they already contain rows to avoid duplicates and to preserve the fast re-run behaviour. The final row counts confirmed: 1 user, 111 nodes, 200,500 events, 2 commands, 2 heartbeats, 2 data_updates, 2 master_logs, 2 blogs, 5 safety_content rows — all matching the source JSON files.

The schema is compatible with both platforms. The Spring Boot API entities define the JPA-managed tables that the mobile app and CRM use for auth, feed, analytics, sensors, favourites, safety, broadcasts, reports and zones. The raw IoT tables (commands, data_updates, heartbeats, master_logs) are available for direct SQL queries from any future reporting feature on either platform.

---

### SQL Migration - 004 Schema Hardening
**Status** - Done

I have done the schema hardening migration by writing 004_schema_hardening.sql to tighten the existing Neon PostgreSQL schema. I added CHECK constraints to every enum-like column across eight tables including users.role, events.event_type, broadcasts.severity, reports.severity and status, zones.risk_level, safety_content.section and lang, data_updates physical sensor bounds, and heartbeats.status. I widened broadcasts.body from VARCHAR(160) to TEXT to match the JPA entity. I added NOT NULL constraints to broadcasts.sent_at and reports.submitted_at. I added explicit defaults to prevent NULL surprises on inserts. I added updated_at audit timestamps to reports, blogs and user_settings. I created fourteen CONCURRENTLY indexes outside the transaction block covering every hot query path including a composite idx_events_node_created for the most critical time-series query and partial indexes for alert events, active nodes, featured blogs, and active password reset codes.

---

### FLOOD-09 - CRM Live Data Integration (Remove MongoDB References)
**Status** - Done

I have done the CRM live data integration by rewriting the analytics page to fetch real data from the Java API and removing all MongoDB text references from every CRM page.

On the analytics page I replaced all static mock data imports from lib/data with a useEffect that calls GET /api/analytics with the Bearer token from useAuth. The page now renders real event trend charts using the seven-day chartData and five-month yearlyChartData arrays, a colour-coded water level bar chart from waterLevelByNode, a flood by state horizontal bar from floodByState, a live KPI card row from the stats array, and a recent events list from recentEvents.

On the dashboard page I removed the alertRecords, floodTotalsByState, recentActivity and trendSeriesMonthly imports from lib/data. I added a separate analytics fetch using the access token and replaced the static monthly chart with live yearlyChartData, the static flood-by-state chart with live floodByState, and the static recent activity list with live recentEvents from the analytics API.

I replaced all MongoDB text references across six pages and one component. In dashboard I changed "From MongoDB" to "Live Data", "Nodes from MongoDB" to "Sensor Nodes", "Real-time readings from MongoDB" to "Real-time readings", and "Live situational awareness from MongoDB" to the correct label. In the map page I fixed "Real-time sensor locations from MongoDB" and "IoT Nodes from MongoDB". In sensors I removed "from MongoDB" from the subtitle. In alerts I fixed the loading message and subtitle. In NodeMap I changed "from MongoDB" to "online". In settings I replaced the MongoDB Database integration card with a Java API card and replaced mongoDbUri with apiUrl in both the type definition and default settings.

---

## Summary Table

| Ticket | Title | Status |
|--------|-------|--------|
| FLOOD-01 | Turborepo Monorepo Root Setup | Done |
| FLOOD-02 | Shared Packages | Done |
| FLOOD-03 | Docker Compose for Local Development | Done |
| FLOOD-04 | CRM Migration from MongoDB to Java API | Done |
| FLOOD-05 | CRM Real JWT Authentication | Done |
| SCRUM-107 | Remove SQS IoT Queue from Terraform | Done |
| Mobile | Add New API Endpoints for SCRUM Features | Done |
| SCRUM-107 | IoT Sensor Ingest API | Done |
| SCRUM-102 | Push Notifications | Done |
| FLOOD-06 | Redis Caching for Analytics and Dashboard | Done |
| SQL-002 | Push Notifications and Feature Tables Migration | Done |
| SCRUM-112 | Favourite Sensor Nodes | Done |
| SCRUM-103 | Community Flood Safety Awareness Page | Done |
| SCRUM-104 | Emergency Broadcast System | Done |
| SCRUM-105 | Flood Incident Reports | Done |
| SCRUM-106 | Flood Risk Zones | Done |
| FLOOD-07 | Security Audit & CRM User Management | Done |
| FLOOD-08 | MongoDB to Neon PostgreSQL Full Data Import | Done |
| SQL-004 | Schema Hardening Migration | Done |
| FLOOD-09 | CRM Live Data Integration (Remove MongoDB References) | Done |

**Next up** - SCRUM-108 (CRM password reset email), then deployment tickets FLOOD-10 through FLOOD-14 (Terraform ECS, GHCR, Vercel, EAS, GitHub Actions CI/CD, Cloudflare, Sentry).
