---
date: 2026-04-28
issue: 68
type: decision
promoted_to: null
---

For SES SNS ingestion, idempotency is anchored on the SNS envelope `MessageId`, not the SES `mail.messageId`.

Why: Amazon SNS retries reuse the original SNS `MessageId`, while the SES mail message ID identifies the email itself and can legitimately appear across multiple different notifications (delivery, open, click). A dedicated nullable `email_events.source_id` unique index lets the ingester drop exact SNS redeliveries without collapsing distinct lifecycle events for the same email.
