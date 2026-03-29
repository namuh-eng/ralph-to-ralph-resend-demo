# Create Domain

**POST** `https://api.resend.com/domains`

## Body Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | string | Required | Domain name |
| `region` | string | us-east-1 | `us-east-1`, `eu-west-1`, `sa-east-1`, `ap-northeast-1` |
| `custom_return_path` | string | send | Subdomain for Return-Path (SPF/bounce) |
| `click_tracking` | boolean | — | Enable link click tracking |
| `open_tracking` | boolean | — | Enable open rate tracking |
| `tls` | string | opportunistic | `opportunistic` or `enforced` |
| `capabilities` | object | — | At least one required |

### Capabilities
- `sending`: `enabled` | `disabled` (default: enabled)
- `receiving`: `enabled` | `disabled` (default: disabled)

## Response
```json
{
  "id": "uuid",
  "name": "example.com",
  "created_at": "ISO 8601",
  "status": "not_started",
  "region": "us-east-1",
  "capabilities": { "sending": "enabled", "receiving": "disabled" },
  "records": [
    { "record": "SPF", "type": "TXT/MX/CNAME", "name": "...", "value": "..." },
    { "record": "DKIM", "type": "CNAME", "name": "...", "value": "..." }
  ]
}
```
