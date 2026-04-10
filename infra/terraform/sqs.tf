# ─────────────────────────────────────────────────────────────
# DEPRECATED — SQS removed
#
# IoT sensor ingestion no longer uses SQS queuing.
# The Java API handles ingest synchronously via POST /ingest:
#   1. Validates IngestPayload (nodeId, level, timestamp)
#   2. Updates nodes.current_level in Neon PostgreSQL
#   3. Inserts row into events table
#   4. Fires push notification if level >= 2 (or >= 1 for favourited nodes)
#
# Why removed:
#   - SQS adds operational complexity (DLQ monitoring, visibility timeout tuning)
#   - At NGO scale (<111 nodes, <1 reading/minute each) synchronous ingest
#     handles the load trivially (< 10 writes/second peak)
#   - Neon PostgreSQL connection pooler handles burst writes without queuing
#   - Removes IAM sqs:* permissions from ECS task role (smaller attack surface)
#
# If future scale requires async processing, re-add SQS with this pattern:
#   POST /ingest → SQS → Lambda consumer → Neon + push notification
# ─────────────────────────────────────────────────────────────
