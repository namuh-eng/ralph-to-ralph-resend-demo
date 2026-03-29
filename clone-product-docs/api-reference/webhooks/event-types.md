# Webhook Event Types

## Email Events (11)
| Event | Description |
|-------|-------------|
| `email.sent` | API request was successful |
| `email.delivered` | Successfully delivered to recipient's mail server |
| `email.delivery_delayed` | Temporary delivery issue (full inbox, transient error) |
| `email.bounced` | Permanently rejected by recipient's mail server |
| `email.complained` | Recipient marked as spam |
| `email.opened` | Recipient opened the email |
| `email.clicked` | Recipient clicked a link |
| `email.failed` | Failed to send due to error |
| `email.received` | Inbound email received |
| `email.scheduled` | Email scheduled for future send |
| `email.suppressed` | Email suppressed by Resend |

## Domain Events (3)
| Event | Description |
|-------|-------------|
| `domain.created` | Domain created |
| `domain.updated` | Domain updated |
| `domain.deleted` | Domain deleted |

## Contact Events (3)
| Event | Description |
|-------|-------------|
| `contact.created` | Contact created (not triggered by CSV import) |
| `contact.updated` | Contact updated |
| `contact.deleted` | Contact deleted |

## Payload Structure
```json
{
  "type": "email.bounced",
  "created_at": "ISO 8601",
  "data": {
    "from": "sender@example.com",
    "to": ["recipient@example.com"],
    "subject": "Hello",
    "bounce": { "message": "...", "classification": "..." }
  }
}
```
