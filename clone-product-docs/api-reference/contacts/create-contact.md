# Create Contact

**POST** `https://api.resend.com/contacts`

## Body Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | Contact email |
| `first_name` | string | No | First name |
| `last_name` | string | No | Last name |
| `unsubscribed` | boolean | No | Global unsubscribe from all broadcasts |
| `properties` | object[] | No | Custom key-value properties |
| `segments` | object[] | No | Segment IDs to add to |
| `topics` | object[] | No | Topic subscriptions |

### Properties
```json
{ "key": "company", "value": "Acme" }
```

### Topics
```json
{ "id": "topic-uuid", "subscription": "opt_in" | "opt_out" }
```

## Response
```json
{ "object": "contact", "id": "uuid" }
```
