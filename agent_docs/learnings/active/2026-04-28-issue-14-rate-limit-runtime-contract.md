---
date: 2026-04-28
issue: "#14"
type: decision
promoted_to: null
---

## Redis-backed rate limiting must fail explicitly, not silently downgrade

**What:** Replaced the middleware's in-process `Map` fallback with an explicit `RATE_LIMIT_BACKEND` contract. `disabled` now means no API rate limiting, while `redis` requires `REDIS_URL` and returns `503` if Redis is misconfigured or unavailable.

**Why:** A per-process fallback looks healthy in single-node dev but gives false confidence in staging/production because limits do not coordinate across instances.

**Fix:** Keep broader cache behavior unchanged, but make rate limiting opt into shared Redis with visible headers/docs so deploys can verify the backend and catch misconfiguration quickly.
