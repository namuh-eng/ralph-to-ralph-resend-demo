---
date: 2026-04-28
issue: 88-89
type: decision
promoted_to: null
---

For the dashboard metrics API, keep preset date filtering derived from `src/lib/date-range.ts` rather than re-implementing day math in the route. The route needs both a lower and upper bound so `Yesterday` stays isolated and rolling presets stay inclusive of today with the same semantics as the UI picker.

For domain filtering, reuse the same parsed sender-domain SQL expression that powers the metrics domain breakdown instead of substring matching on `emails.from`. This keeps filter semantics aligned across grouped output and filtered queries, and avoids false positives like `notexample.com` when filtering `example.com`.
