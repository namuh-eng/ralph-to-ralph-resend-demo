# Retrieve Email

**GET** `https://api.resend.com/emails/{id}`

## Response
```json
{
  "object": "email",
  "id": "uuid",
  "to": ["recipient@example.com"],
  "from": "sender@example.com",
  "created_at": "2023-04-03T22:13:42.000000+00:00",
  "subject": "Hello",
  "html": "<p>Hello</p>",
  "text": null,
  "cc": null,
  "bcc": null,
  "reply_to": null,
  "last_event": "delivered",
  "scheduled_at": null,
  "tags": [{ "name": "tag", "value": "val" }]
}
```
