---
date: 2026-04-28
issue: "#72"
type: decision
promoted_to: null
---

## Validate domain route params at the API boundary

**What:** Added reusable Zod schemas for domain route params and used them in detail/update/delete/verify/auto-configure routes, with a `src/lib/validation/index.ts` barrel for stable contract exports.

**Why:** The issue scope is contract hardening at TypeScript boundaries, and the verify/auto-configure routes only accept path params. Treating those params as validated inputs closes the remaining boundary gap without broad route refactors.

**Fix:** Reuse `domainRouteParamsSchema` aliases for verify/auto-configure and keep SDK/domain payload types mirrored to the stabilized validation module.
