# Create Template

**POST** `https://api.resend.com/templates`

## Required Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Template name |
| `html` | string | HTML content |

## Optional Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `alias` | string | Alternative identifier |
| `from` | string | Default sender address |
| `subject` | string | Default subject line |
| `reply_to` | string \| string[] | Default reply-to |
| `text` | string | Plain text version |
| `react` | React.ReactNode | React component (Node.js SDK only) |
| `variables` | array | Dynamic placeholders (max 50) |

### Variables
```json
{
  "key": "PRODUCT_NAME",
  "type": "string",
  "fallback_value": "Our Product"
}
```
Reserved keys: `FIRST_NAME`, `LAST_NAME`, `EMAIL`, `RESEND_UNSUBSCRIBE_URL`, `contact`, `this`

## Response
```json
{ "id": "uuid", "object": "template" }
```

Templates must be published before use (via dashboard or publish API).
