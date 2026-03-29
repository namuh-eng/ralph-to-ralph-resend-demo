# List Sent Emails

**GET** `https://api.resend.com/emails`

Returns sent emails only. For received emails, use List Received Emails.

## Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | 1-100 |
| `after` | string | — | Cursor: get emails after this ID |
| `before` | string | — | Cursor: get emails before this ID |

Only one of `after`/`before` at a time.

## Response
```json
{
  "object": "list",
  "has_more": true,
  "data": [
    {
      "id": "uuid",
      "to": ["user@example.com"],
      "from": "sender@example.com",
      "created_at": "ISO 8601",
      "subject": "Hello",
      "bcc": null,
      "cc": null,
      "reply_to": null,
      "last_event": "delivered",
      "scheduled_at": null
    }
  ]
}
```
