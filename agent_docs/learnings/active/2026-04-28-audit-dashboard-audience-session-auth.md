---
date: 2026-04-28
issue: audit
type: decision
promoted_to: null
---

Dashboard audience management list/create routes were calling same-origin `/api/contacts`, `/api/segments`, `/api/topics`, and `/api/properties` without Authorization headers, while those routes only accepted API-key auth.

For internal dashboard-managed resources, the minimal safe fix was to share the metrics/usage auth model: allow either API key, dashboard master key, or authenticated dashboard session. This restores dashboard behavior without widening public API access beyond existing dashboard session permissions.
