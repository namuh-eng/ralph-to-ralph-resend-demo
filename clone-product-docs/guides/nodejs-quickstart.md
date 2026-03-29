# Node.js Quickstart

## Install
```bash
npm install resend
```

## Send First Email
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const { data, error } = await resend.emails.send({
  from: 'Acme <onboarding@resend.dev>',
  to: ['delivered@resend.dev'],
  subject: 'Hello World',
  html: '<strong>It works!</strong>',
});

if (error) {
  console.error({ error });
}
console.log({ data });
```

## SDK Pattern
- All methods return `{ data, error }` — use destructuring, not try/catch
- All methods are async (use `await`)
- Parameter casing: camelCase (`replyTo`, `scheduledAt`)
- API key format: `re_xxxxxxxxx`

## SDK Surface
```typescript
resend.emails.send(params)
resend.emails.get(id)
resend.emails.list(params)
resend.batch.send(emails[])
resend.domains.create(params)
resend.domains.list()
resend.domains.get(id)
resend.domains.verify(id)
resend.domains.update(id, params)
resend.domains.remove(id)
resend.apiKeys.create(params)
resend.apiKeys.list()
resend.apiKeys.remove(id)
resend.contacts.create(params)
resend.contacts.list(params)
resend.contacts.get(params)
resend.contacts.update(params)
resend.contacts.remove(params)
resend.segments.create(params)
resend.segments.list()
resend.segments.get(id)
resend.segments.remove(id)
resend.broadcasts.create(params)
resend.broadcasts.list()
resend.broadcasts.get(id)
resend.broadcasts.send(id)
resend.broadcasts.remove(id)
resend.webhooks.create(params)
resend.webhooks.list()
resend.webhooks.get(id)
resend.webhooks.remove(id)
resend.templates.create(params)
resend.templates.list()
resend.templates.get(id)
resend.templates.update(id, params)
resend.templates.remove(id)
resend.topics.create(params)
resend.topics.list()
resend.topics.get(id)
resend.topics.update(id, params)
resend.topics.remove(id)
```
