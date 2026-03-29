# Create Audience (DEPRECATED)

> Audiences are deprecated in favor of Segments. These endpoints still work but will be removed.

**POST** `https://api.resend.com/audiences`

## Body Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Audience name |

## Response
```json
{ "object": "audience", "id": "uuid", "name": "Registered Users" }
```
