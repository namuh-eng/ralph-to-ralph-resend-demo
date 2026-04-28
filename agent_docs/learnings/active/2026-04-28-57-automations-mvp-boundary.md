---
date: 2026-04-28
issue: "#57"
type: decision
promoted_to: null
---

## Automations MVP boundary

**What:** Chose `trigger -> delay -> send_email -> end` as the first Automations implementation slice and filed/updated child issues #116-#120 around that sequence.

**Why:** The dashboard docs require a real event-triggered workflow with runs, but implementing every documented step at once would entangle schema, API, runner semantics, dashboard canvas, and contact mutations. The linear path proves persistence, events ingestion, scheduling, email sending, and run visibility without over-scoping.

**Fix:** Keep #57 epic-only until #116-#119 demonstrate the end-to-end MVP path. Use #120 for deferred advanced steps and full parity.
