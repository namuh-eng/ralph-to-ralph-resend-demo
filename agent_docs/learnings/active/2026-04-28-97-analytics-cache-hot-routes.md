---
date: 2026-04-28
issue: 97
type: decision
promoted_to: null
---

For the first analytics cache slice, limit scope to the two highest-leverage dashboard aggregate reads that already exist on staging:

1. `/api/metrics` keyed by `range + domain + event_type` with a 60 second TTL, because the dashboard page fan-outs into five aggregate queries per refresh and the UI already presents the data as near-real-time rather than transactional.
2. `/api/broadcasts/[id]/metrics` keyed by `broadcast_id` with a 120 second TTL, because it is a single broadcast-specific rollup that is safe to reuse briefly across repeated detail-page reads.

Keep Postgres as the source of truth by only caching successful JSON payloads, serving uncached DB results on cache miss/error, and exposing an `x-namuh-cache` response header so follow-up measurement can compare hit/miss behavior without widening the implementation into warehouse or vendor work.
