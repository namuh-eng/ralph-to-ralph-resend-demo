# Create Broadcast

**POST** `https://api.resend.com/broadcasts`

## Required Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `segment_id` | string | Target segment ID |
| `from` | string | Sender email. Format: `"Name <sender@domain.com>"` |
| `subject` | string | Email subject |

## Optional Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `reply_to` | string \| string[] | Reply-to address(es) |
| `html` | string | HTML body (supports Contact Properties templating) |
| `text` | string | Plain text (auto-generated from HTML if omitted) |
| `react` | React.ReactNode | React component (Node.js SDK only) |
| `name` | string | Internal reference name |
| `topic_id` | string | Scope to specific topic |
| `send` | boolean | Send immediately (default: false = draft) |
| `scheduled_at` | string | Schedule delivery (requires `send: true`) |

## Contact Property Templating
- `{{{FIRST_NAME|there}}}` — with fallback
- `{{{RESEND_UNSUBSCRIBE_URL}}}` — auto unsubscribe link

## Response
```json
{ "id": "broadcast-uuid" }
```
