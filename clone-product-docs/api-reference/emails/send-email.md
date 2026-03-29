# Send Email

**POST** `https://api.resend.com/emails`

## Required Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | string | Sender email. Format: `"Name <sender@domain.com>"` |
| `to` | string \| string[] | Recipient(s). Max 50 |
| `subject` | string | Email subject line |

## Optional Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `cc` | string \| string[] | Carbon copy recipients |
| `bcc` | string \| string[] | Blind carbon copy recipients |
| `html` | string | HTML body |
| `text` | string | Plain text body (auto-generated from HTML if omitted) |
| `react` | React.ReactNode | React component (Node.js SDK only) |
| `reply_to` | string \| string[] | Reply-to address(es) |
| `headers` | object | Custom email headers |
| `scheduled_at` | string | Delay: natural language ("in 1 min") or ISO 8601 |
| `topic_id` | string | Topic ID for subscription preferences |
| `attachments` | array | Files up to 40MB total. Each: `{filename, content (base64)}` |
| `tags` | array | Key-value metadata (256 chars max each) |
| `template` | object | Template `{id, variables}`. Cannot combine with html/text/react |

## Headers
| Header | Description |
|--------|-------------|
| `Idempotency-Key` | Prevent duplicate sends (max 256 chars, 24h window) |

## Response
```json
{ "id": "email-uuid" }
```

## Node.js Example
```typescript
import { Resend } from 'resend';
const resend = new Resend('re_xxxxxxxxx');

const { data, error } = await resend.emails.send({
  from: 'Acme <onboarding@resend.dev>',
  to: ['delivered@resend.dev'],
  subject: 'Hello World',
  html: '<strong>It works!</strong>',
});
```
