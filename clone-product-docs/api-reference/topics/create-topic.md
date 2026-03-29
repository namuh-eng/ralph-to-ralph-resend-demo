# Create Topic

**POST** `https://api.resend.com/topics`

## Required Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Topic name (max 50 chars) |
| `defaultSubscription` | string | `opt_in` or `opt_out` (cannot be changed later) |

## Optional Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `description` | string | Topic description (max 200 chars) |
| `visibility` | string | `public` or `private` (default: private) |

## Response
```json
{ "object": "topic", "id": "uuid" }
```
