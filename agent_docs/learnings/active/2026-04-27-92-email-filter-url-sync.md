---
date: 2026-04-27
issue: 92
type: decision
promoted_to: null
---

When a filter bar debounces outward updates but also needs to resync from URL-derived props, clear any pending debounce timer before applying the new prop state. Otherwise a stale delayed callback can re-emit the pre-navigation filters and push the URL back out of sync.
