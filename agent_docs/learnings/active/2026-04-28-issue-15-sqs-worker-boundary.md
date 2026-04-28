---
date: 2026-04-28
issue: "#15"
type: decision
promoted_to: null
---

## SQS owns delivery retries; Postgres remains the source of truth

**What:** The background job baseline persists email/webhook intent in Postgres first, then publishes small SQS jobs (`email.send`, `webhook.dispatch`, scan jobs) consumed by the ingester worker.
**Why:** This keeps the request path fast while avoiding a homegrown Postgres queue. SQS redrive/DLQ owns retry exhaustion; Postgres status/delivery rows remain the source of truth for UI/API state.
**Fix:** Keep future send-path changes queue-first. Do not reintroduce direct SES sends in API routes; add worker job types or EventBridge scan jobs instead.
