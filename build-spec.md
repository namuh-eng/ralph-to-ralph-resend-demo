# Build Spec — Resend Clone

> Status: PARTIAL — Docs extracted, UI inspection pending

## 1. Product Overview

**Resend** is an email API platform for developers. It provides:
- REST API for sending transactional and marketing emails
- Dashboard for managing domains, contacts, templates, broadcasts, webhooks, and API keys
- Node.js SDK with `{ data, error }` pattern
- React Email integration for component-based templates

**Target users:** Developers who need to send emails from their applications.

**Core value prop:** Simple, developer-friendly email API with modern dashboard.

## 2. Tech Stack (for clone)

- **Frontend:** Next.js 16 (App Router), Tailwind CSS, Radix UI
- **Backend:** Next.js API routes (TypeScript)
- **Database:** RDS Postgres via Drizzle ORM
- **Email sending:** AWS SES (`@aws-sdk/client-sesv2`)
- **DNS management:** Cloudflare API (auto-configure SPF/DKIM/DMARC records)
- **Storage:** AWS S3 (email attachments)
- **Auth:** API key-based (no login/signup)
- **SDK:** TypeScript npm package (`packages/sdk/`)

## 3. API Resources (from docs)

### Emails
- `POST /emails` — Send email (from, to, subject, html/text/react, attachments, tags, scheduled_at, idempotency)
- `POST /emails/batch` — Send up to 100 emails (no attachments, no scheduling)
- `GET /emails` — List sent emails (cursor pagination)
- `GET /emails/{id}` — Get email details + last_event status

### Domains
- `POST /domains` — Create domain (region, capabilities, tracking, TLS)
- `GET /domains` — List domains
- `GET /domains/{id}` — Get domain with DNS records
- `PATCH /domains/{id}` — Update domain
- `DELETE /domains/{id}` — Remove domain
- `POST /domains/{id}/verify` — Trigger verification

### API Keys
- `POST /api-keys` — Create key (full_access or sending_access, optional domain scope)
- `GET /api-keys` — List keys
- `DELETE /api-keys/{id}` — Remove key

### Contacts
- `POST /contacts` — Create contact (email, name, properties, segments, topics)
- `GET /contacts` — List contacts
- `GET /contacts/{id}` — Get contact
- `PATCH /contacts/{id}` — Update contact
- `DELETE /contacts/{id}` — Remove contact

### Segments (replaces Audiences)
- `POST /segments` — Create segment
- `GET /segments` — List segments
- `GET /segments/{id}` — Get segment
- `DELETE /segments/{id}` — Remove segment

### Broadcasts
- `POST /broadcasts` — Create broadcast (draft or immediate, scheduled)
- `GET /broadcasts` — List broadcasts
- `GET /broadcasts/{id}` — Get broadcast
- `POST /broadcasts/{id}/send` — Send broadcast
- `DELETE /broadcasts/{id}` — Remove broadcast

### Webhooks
- `POST /webhooks` — Create webhook (endpoint, events) → returns signing_secret
- `GET /webhooks` — List webhooks
- `GET /webhooks/{id}` — Get webhook
- `DELETE /webhooks/{id}` — Remove webhook

### Templates
- `POST /templates` — Create template (html, variables up to 50)
- `GET /templates` — List templates
- `GET /templates/{id}` — Get template
- `PATCH /templates/{id}` — Update template
- `DELETE /templates/{id}` — Remove template
- `POST /templates/{id}/publish` — Publish template

### Topics
- `POST /topics` — Create topic (name, defaultSubscription, visibility)
- `GET /topics` — List topics
- `GET /topics/{id}` — Get topic
- `PATCH /topics/{id}` — Update topic
- `DELETE /topics/{id}` — Remove topic

## 4. Webhook Events (17 total)

### Email Events (11)
email.sent, email.delivered, email.delivery_delayed, email.bounced, email.complained, email.opened, email.clicked, email.failed, email.received, email.scheduled, email.suppressed

### Domain Events (3)
domain.created, domain.updated, domain.deleted

### Contact Events (3)
contact.created, contact.updated, contact.deleted

## 5. Data Models (from API — partial, needs UI inspection)

### Email
- id, from, to[], cc[], bcc[], reply_to, subject, html, text, tags[], created_at, last_event, scheduled_at

### Domain
- id, name, status, region, created_at, capabilities{sending, receiving}, records[], click_tracking, open_tracking, tls, custom_return_path

### API Key
- id, name, token (re_xxx), permission (full_access|sending_access), domain_id, created_at

### Contact
- id, email, first_name, last_name, unsubscribed, properties[], segments[], topics[]

### Segment
- id, name

### Broadcast
- id, name, segment_id, from, subject, html, text, topic_id, status, scheduled_at

### Webhook
- id, endpoint, events[], signing_secret

### Template
- id, name, alias, from, subject, reply_to, html, text, variables[]

### Topic
- id, name, description, defaultSubscription (opt_in|opt_out), visibility (public|private)

## 6. Design System — PENDING (needs UI inspection)

## 7. Site Map — PENDING (needs UI inspection)

## 8. Build Order — PENDING (needs full inspection)

## 9. Backend Architecture

| Feature | AWS Service |
|---------|-------------|
| Email sending | AWS SES (us-east-1) |
| Domain DNS verification | Cloudflare API |
| Database | RDS Postgres (Drizzle ORM) |
| File storage (attachments) | AWS S3 |
| Webhook delivery | HTTP POST with retry queue |
| API authentication | Bearer token (API keys in DB) |
