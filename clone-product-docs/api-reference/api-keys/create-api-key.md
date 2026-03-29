# Create API Key

**POST** `https://api.resend.com/api-keys`

## Body Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Key name (max 50 chars) |
| `permission` | enum | `full_access` or `sending_access` |
| `domain_id` | string | Optional. Restrict to specific domain (sending_access only) |

## Response
```json
{
  "id": "uuid",
  "token": "re_c1tpEyD8_NKFusih9vKVQknRAQfmFcWCv"
}
```

Token starts with `re_`. Only shown once at creation time.
