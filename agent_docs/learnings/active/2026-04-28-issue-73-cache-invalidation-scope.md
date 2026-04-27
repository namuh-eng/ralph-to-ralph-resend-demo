---
date: 2026-04-28
issue: "#73"
type: decision
promoted_to: null
---

## Cache only reusable metadata, and invalidate on every mutation path

For issue #73, keep Redis caching scoped to metadata that already has a clear authoritative source (`api_keys`, `domains`, SES identity status), rather than introducing speculative request/result caches.

That means:

- API key auth stays cached by token hash.
- Domain DB lookups are cached by domain id.
- SES identity lookups are cached by domain name.
- Every practical API key/domain mutation route explicitly invalidates the affected cache entries right after the write.

This keeps stale-read windows short without expanding into rate limiting or analytics cache ownership.
