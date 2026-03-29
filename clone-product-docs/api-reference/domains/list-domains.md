# List Domains

**GET** `https://api.resend.com/domains`

## Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | 1-100 |
| `after` | string | — | Cursor pagination |
| `before` | string | — | Cursor pagination |

## Response
```json
{
  "object": "list",
  "has_more": false,
  "data": [
    {
      "id": "uuid",
      "name": "example.com",
      "status": "verified",
      "created_at": "ISO 8601",
      "region": "us-east-1",
      "capabilities": { "sending": "enabled", "receiving": "disabled" }
    }
  ]
}
```
