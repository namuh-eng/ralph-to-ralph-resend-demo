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

## 6. Feature Deep Dives

### 6.1 Emails — Sending Tab (`/emails`)

**Layout**: Page title "Emails" + tab bar (Sending | Receiving) + API drawer button + More actions button → filter bar → data table

**Filter Bar** (left to right):
1. **Search** (Shadow DOM input, placeholder "Search...")
2. **Date range picker** (button, default "Last 15 days") — opens popover with:
   - Preset buttons: Today, Yesterday, Last 3 days, Last 7 days, Last 15 days, Last 30 days
   - Calendar month view with selectable range (highlighted selected days)
   - Navigate months with prev/next arrows
3. **Status filter** (dropdown button, default "All Statuses") — 12 options:
   - Bounced, Canceled, Clicked, Complained, Delivered, Delivery Delayed, Failed, Opened, Scheduled, Sent, Queued, Suppressed
   - Each option has a colored dot indicator + label
4. **API Keys filter** (combobox, default "All API Keys")
5. **Export button** (right side, icon button)

**Data Table**:
- Columns: To, Status, Subject, Sent
- No checkbox column (unlike other list pages)
- **To** column: avatar icon + email address (clickable link to `/emails/:id`)
- **Status** column: status badge button (e.g., "delivered") — clickable, likely shows tooltip
- **Subject** column: plain text
- **Sent** column: relative time with tooltip for exact timestamp
- **Row actions**: three-dot "More actions" button → dropdown with "Share email"

**Header Actions**:
- **API drawer button**: Opens right-side drawer titled "Sending Email API" with:
  - Language tabs: Node.js, Ruby, PHP, Python, Go, Rust, Java, .NET, cURL
  - Code sections: Send Email, Send Batch Emails, Retrieve Email, Update Email (+ more below fold)
  - Each section has a code block with copy button
- **More actions button**: Dropdown with "Go to docs" link

**Pagination**: Not visible with 3 items (likely appears with more data — 40/80/120 items per page based on other pages)

### 6.2 Emails — Receiving Tab (`/emails/receiving`)

**Layout**: Same header/tabs as Sending, Receiving tab active

**Filter Bar**: Search + Date range picker + Export button (fewer filters than Sending)

**Empty State**:
- Title: "No received emails yet"
- Description: "Start receiving emails with a predefined address `<anything>@{subdomain}.resend.app` or set up a custom domain."
- Links to: custom domain page (`/domains`), docs
- Each workspace gets a unique subdomain for inbound email

### 6.3 Email Detail (`/emails/:id`)

**Layout**: "Email" breadcrumb label + recipient email as h1 heading

**Header Actions**: API drawer button + More actions ("Share email")

**Email Metadata** (key-value pairs):
- **From**: sender email address
- **Subject**: email subject line
- **To**: recipient email address
- **ID**: UUID with copy-to-clipboard button

**Email Events Timeline**:
- Vertical timeline of delivery events
- Each event: status badge (e.g., "sent", "delivered") + timestamp (e.g., "Mar 28, 4:14 PM")
- Status badges are clickable (likely show details on hover/click)

**Content Tabs** (4 tabs):
1. **Preview** — rendered email in iframe (default active)
2. **Plain Text** — plain text version of the email
3. **HTML** — raw HTML source of the email
4. **Insights** — deliverability analysis report:
   - **Needs attention** section: items that need fixing (e.g., "Include valid DMARC record")
   - **Doing great** section: passing checks (e.g., "Disable click tracking", "Use a subdomain", "Include plain text version", etc.)
   - Each item is an expandable accordion
   - 11 total insight checks:
     1. Include valid DMARC record
     2. Disable click tracking
     3. Disable open tracking
     4. Use a subdomain
     5. Ensure link URLs match sending domain
     6. Include plain text version
     7. Keep email body size small
     8. Don't use "no-reply"
     9. Host images on the sending domain
     10. Avoid SVG images
     11. Use full YouTube URLs
   - "Report generated on" timestamp at bottom
- Copy button next to tabs (copies content of active tab)

### 6.4 Broadcasts — List Page (`/broadcasts`)

**Layout**: Page title "Broadcasts" + "Create email" button + API drawer button → filter bar → data table → pagination

**Filter Bar** (left to right):
1. **Search** (Shadow DOM input, placeholder "Search...")
2. **Status filter** (dropdown button, default "All Statuses") — 5 options:
   - Draft, Scheduled, Queued, Sent, Failed
3. **Audiences filter** (combobox, default "All Audiences") — lists audience/segment names (e.g., "General")
4. **Export button** (right side, icon button)

**Data Table**:
- Columns: Name, Status, Created
- Checkbox column for bulk selection (header + per row)
- **Name** column: clickable link to `/broadcasts/:id/editor`
- **Status** column: text badge (e.g., "Draft")
- **Created** column: relative time (e.g., "about 19 hours ago")
- **Row actions**: three-dot "More actions" button → dropdown with:
  - Edit broadcast
  - Duplicate broadcast
  - Clone as template
  - *(separator)*
  - Remove broadcast

**Pagination**: Page indicator + items per page selector (40/80/120)

### 6.5 Broadcasts — Editor (`/broadcasts/:id/editor`)

**Layout**: Full-page editor. Header bar → form fields (left panel) + content editor (center) + style sidebar (right)

**Header**:
- Back arrow → "Broadcasts" breadcrumb link
- Editable title button (default "Untitled")
- Draft status badge
- "Test email" button (validates From + Content required before sending)
- "Review" button → opens bottom panel with "Ready to send?" + "Slide to send" slider control
- Two additional action buttons (settings/more)

**Form Fields** (left side, above editor):
- **From**: text input with autocomplete (placeholder "Acme <acme@example.com>")
- **Reply-To**: text input (toggleable, hidden by default — "Reply-To" button to show)
- **To**: autocomplete contenteditable input (for selecting audiences/segments)
- **When**: date/time combobox input (placeholder "Enter a date or time..." — toggleable, "When" button to show)
- **Subscribe to**: combobox to select a topic (default "Select a topic")
- **Subject**: text input (placeholder "Subject")
- **Preview text**: text input (maxlength 150 — toggleable, "Preview text" button to show)

**Content Editor** (block-based rich text editor):
- Contenteditable div with '/' slash command menu
- "Press '/' for commands" hint text
- **Slash command blocks** organized in 4 categories:
  - **Text**: Text, Title, Subtitle, Heading, Bullet list, Numbered list, Quote, Code block
  - **Media**: Image, YouTube, X (former Twitter)
  - **Layout**: Button, Divider, Section, 2 columns, 3 columns, 4 columns, Social Links, Unsubscribe Footer
  - **Utility**: HTML, Variable
- "Pick a template" button (loads from saved templates)
- "Upload HTML" button (accepts .html files)
- Image upload (accepts image/*)

**Editor Toolbar Tabs** (bottom of editor area):
1. **Text**: Typography presets (Title, Subtitle, Heading, Body), formatting (Bold, Italic, Underline, Strikethrough, Code, Uppercase), alignment (left, center, right), lists (bullet, ordered), blockquote, link, spacing, padding (T/R/B/L), background, border
2. **Image**: Image-specific controls
3. **Components**: Button, Divider, Section, 2/3/4 columns, Social Links, Unsubscribe Footer, HTML, Code
4. **Variables**:
   - Contact properties: `{{{contact.first_name}}}`, `{{{contact.last_name}}}`, `{{{contact.email}}}`, `{{{contact.company_name}}}`
   - System: `{{{RESEND_UNSUBSCRIBE_URL}}}`
   - "Create property" link

**Right Sidebar** (3 panels):
1. **Page style**:
   - Background: color picker, padding (px)
   - Body: 3 layout radio options, color, width (default 600px), height, padding, rounded corners, border (width + color)
   - "Edit theme" button, "Global CSS" button
2. **Theme**:
   - Presets: minimal, basic
   - Text styles for 4 levels: Text (14px Regular), Title (31px Semi Bold), Subtitle (25px Semi Bold), Heading (19px Semi Bold)
   - Each level: color, font size, weight, line height, letter spacing, decoration (None, Underline, Strikethrough)
3. **Global CSS**:
   - CSS code editor (contenteditable) with syntax highlighting
   - Quick-insert buttons: `@media (prefers-color-scheme: dark)`, `@media screen and (max-width: 480px)`, `.button`

## 7. Design System — PARTIAL (needs more deep dives)

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
