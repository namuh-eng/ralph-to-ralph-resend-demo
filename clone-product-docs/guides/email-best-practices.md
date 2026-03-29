# Email Best Practices

## Architecture Flow
Form submission → validation → double opt-in → consent recording → suppression check → idempotent sending → webhook tracking → list hygiene

## DNS Authentication
- SPF, DKIM, DMARC required
- Gmail and Yahoo reject unauthenticated messages

## Deliverability
- Warm up new domains gradually
- Monitor bounce rates and complaint rates
- Implement suppression lists
- Handle bounces and complaints via webhooks

## Compliance
- CAN-SPAM: unsubscribe link, physical address, honest subject lines
- GDPR: explicit consent, data portability, right to erasure
- CASL: implied vs express consent

## Reliability
- Use idempotency keys to prevent duplicate sends
- Implement retry logic with exponential backoff
- Track delivery via webhook events
- Manage bounce and complaint lists automatically

## Transactional Email Patterns
- Welcome emails, password resets, order confirmations
- Always include plain text alternative
- Keep templates under 102KB
