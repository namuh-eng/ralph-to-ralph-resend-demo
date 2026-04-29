---
date: 2026-04-28
issue: 69
type: decision
promoted_to: null
---

For the first mergeable webhook-dispatcher slice, persist a `pending` delivery row before any outbound POST, then immediately hand that row to the dispatcher for the first attempt.

Why: this keeps current customer-visible webhook behavior alive while introducing the durable delivery record and retry metadata needed for a later cron/worker-driven retry loop. If ingestion switches to queue-only before a dispatcher trigger exists in production, webhooks silently stop delivering. The safe incremental path is queue-first persistence plus best-effort immediate dispatch, with retries left pending for a later scheduler pass.
