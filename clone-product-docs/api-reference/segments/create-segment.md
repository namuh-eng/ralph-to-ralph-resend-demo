# Create Segment

**POST** `https://api.resend.com/segments`

Replaces deprecated Audiences API.

## Body Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Segment name |

## Response
```json
{ "object": "segment", "id": "uuid", "name": "Registered Users" }
```
