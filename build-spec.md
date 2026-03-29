# Build Spec — Resend Clone

> Status: PARTIAL — Docs extracted, site mapped, feature deep-dives pending

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

## 6. Design System — PARTIAL (needs feature deep-dives)

### Layout
- **Sidebar**: ~240px, dark/neutral background, fixed left
- **Content area**: White background, max-width container
- **Page header**: Title (h1) + action buttons (right-aligned)
- **Filter bar**: Search input + dropdown filters + date range picker

### Common Components
- **Data tables**: Sortable columns, checkbox selection, row actions (three-dot menu)
- **Pagination**: Items per page selector (40/80/120), cursor-based
- **Search**: Shadow DOM text input with placeholder
- **Status badges**: Colored pills (delivered, bounced, complained, etc.)
- **API drawer**: Slide-in panel from right showing code examples
- **Modals**: For create/edit forms
- **Toast notifications**: Success/error feedback
- **Date range picker**: Preset ranges (Last 15 days, etc.) + custom
- **Tabs**: Horizontal tab bar for sub-pages (e.g., Emails: Sending/Receiving, Audience: 4 tabs, Settings: 7 tabs)

### Colors — *To be captured during deep dives*
### Typography — *To be captured during deep dives*

## 7. Site Map

**Layout**: Sidebar (left, 10 nav items) + Content area (right)

| # | Page | URL | Type | Sub-tabs |
|---|------|-----|------|----------|
| 1 | Emails | `/emails` | List/table | Sending (`/emails`), Receiving (`/emails/receiving`) |
| 2 | Broadcasts | `/broadcasts` | List | — |
| 3 | Templates | `/templates` | List/card | — |
| 4 | Audience | `/audience` | List/table | Contacts (`/audience/`), Properties (`/audience/properties`), Segments (`/audience/segments`), Topics (`/audience/topics`) |
| 5 | Metrics | `/metrics` | Charts | — |
| 6 | Domains | `/domains` | List | — |
| 7 | Logs | `/logs` | List/table | — |
| 8 | API Keys | `/api-keys` | List | — |
| 9 | Webhooks | `/webhooks` | List/card | — |
| 10 | Settings | `/settings` | Config | Usage, ~~Billing~~, ~~Team~~, SMTP, Integrations, Unsubscribe page, Documents |

**Detail pages** (accessed from list items):
- `/emails/:id` — Email detail (delivery status, headers, body preview)
- `/broadcasts/:id` — Broadcast detail/editor
- `/audience/:id` — Contact detail
- `/domains/:id` — Domain detail (DNS records, verification)
- `/templates/:id` — Template editor

## 8. Build Order

**Core features** (what makes Resend valuable):
1. Send emails via API
2. View email delivery status/logs
3. Manage domains + DNS verification
4. API key management

**Priority order:**
1. Project scaffolding (done — Next.js, Drizzle, Playwright, Biome)
2. Core layout shell (sidebar nav, content area, routing)
3. Design system foundations (colors, typography, shared table/filter components)
4. Database schema (all models via Drizzle)
5. **CORE: Email sending API** (`POST /api/emails`) + SES integration
6. **CORE: Emails list page** (table, filters, search, status badges)
7. **CORE: Email detail page** (delivery timeline, headers, body preview)
8. **CORE: Domains** (add, verify via SES + Cloudflare, DNS records)
9. **CORE: API Keys** (create, list, delete, permission scoping)
10. Audience — Contacts (CRUD, search, import)
11. Audience — Properties, Segments, Topics
12. Templates (CRUD, variables, preview)
13. Broadcasts (create, schedule, send to segment)
14. Webhooks (create, manage, event types, signing)
15. Logs (event log viewer with filters)
16. Metrics (charts, aggregation queries)
17. Settings — Usage, SMTP, Integrations, Unsubscribe page, Documents
18. TypeScript SDK (`packages/sdk/`)
19. Deployment (AWS App Runner + RDS)

## 9. Backend Architecture

| Feature | AWS Service |
|---------|-------------|
| Email sending | AWS SES (us-east-1) |
| Domain DNS verification | Cloudflare API |
| Database | RDS Postgres (Drizzle ORM) |
| File storage (attachments) | AWS S3 |
| Webhook delivery | HTTP POST with retry queue |
| API authentication | Bearer token (API keys in DB) |
