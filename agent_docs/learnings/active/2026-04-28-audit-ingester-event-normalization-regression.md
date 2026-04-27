---
date: 2026-04-28
issue: audit
type: mistake
promoted_to: null
---

Ashley's core/ingester extraction split SES ingestion and email-event persistence, but the exported `packages/core/src/db/repositories/emailEventRepo.ts` dropped the prior transactional email-status update and the ingester route stored raw SES event names (`delivery`, `bounce`, `complaint`) instead of the app's delivered/bounced/complained taxonomy.

Pattern: when extracting package code, compare the new exported implementation against any older in-repo copy before deleting or bypassing behavior; otherwise event/status side effects can silently disappear while tests still pass outside the package tree.
