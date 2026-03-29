# Send Batch Emails

**POST** `https://api.resend.com/emails/batch`

Send up to 100 emails in a single request. Each email in the array has the same parameters as Send Email.

## Limitations
- Max 100 emails per batch
- Attachments NOT supported in batch
- `scheduled_at` NOT supported in batch
- Template-based emails cannot include html/text/react

## Response
```json
{ "data": [{ "id": "email-uuid-1" }, { "id": "email-uuid-2" }] }
```
