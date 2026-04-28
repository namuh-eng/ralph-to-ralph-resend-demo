---
date: 2026-04-28
issue: "#16"
type: mistake
promoted_to: null
---

## Email Playwright checks are blocked by middleware's Edge bundle importing Node modules

**What:** Targeted email Playwright checks reached `/emails` but the Next runtime overlay failed before the page rendered: `Cannot find module 'node:crypto': Unsupported external type Url for commonjs reference` from `.next/server/edge/...`.
**Why:** `src/middleware.ts` statically imports the Redis cache module; that module pulls in the Node Redis client and Node crypto transitively, which cannot evaluate in the Edge middleware bundle even when `RATE_LIMIT_BACKEND=disabled`.
**Fix:** Keep middleware Edge-safe: do not statically import Node-only cache/Redis modules from middleware. Use an Edge-compatible backend boundary or lazy Node-only loading that cannot enter the default disabled path.
