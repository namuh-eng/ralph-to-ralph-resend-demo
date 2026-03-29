# Create Webhook

**POST** `https://api.resend.com/webhooks`

## Required Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `endpoint` | string | URL where events will be sent |
| `events` | string[] | Event types to subscribe to |

## Response
```json
{
  "object": "webhook",
  "id": "uuid",
  "signing_secret": "whsec_xxxxxxxxxx"
}
```

## Delivery
- At-least-once delivery (use `svix-id` header for dedup)
- No ordering guarantees (use `created_at` to sort)
- Retry schedule: 5s, 5m, 30m, 2h, 5h, 10h (6 attempts)
