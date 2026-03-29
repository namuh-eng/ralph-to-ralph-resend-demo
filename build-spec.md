# Build Spec — Resend Clone

> Status: COMPLETE — All pages inspected, all features documented

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

### 6.6 Templates — List Page (`/templates`)

**Layout**: Page title "Templates" + "Create template" button + API drawer button → filter bar → card grid

**Filter Bar** (left to right):
1. **Search** (Shadow DOM input, placeholder "Search...")
2. **Status filter** (combobox, default "All Statuses") — 3 options:
   - All Statuses, Draft, Published

**Card Grid** (not a table — card layout):
- Each card: preview image thumbnail (auto-generated screenshot of email content), template name, alias (slug in monospace/code style, e.g., `untitled-template`)
- Clicking card image/name navigates to `/templates/:id/editor`
- **Card actions**: three-dot "More actions" button → dropdown with:
  - View details
  - Edit template
  - Rename template
  - Duplicate template
  - *(separator)*
  - Remove template

**Create template**: Button creates a new template and navigates to the editor

### 6.7 Templates — Editor (`/templates/:id/editor`)

**Layout**: Very similar to Broadcast editor — header bar → form fields + content editor (center) + style sidebar (right). Shares the same block-based editor component.

**Header**:
- Back arrow → "Templates" breadcrumb link
- Editable title button (default "Untitled Template")
- "Publish" button (disabled until content is ready) — NOT a "Review" button like broadcasts
- More actions menu (see below)

**More Actions** (in editor):
- Test email
- Version history
- View details
- Duplicate
- *(separator)*
- Delete

**Form Fields** (simpler than broadcasts — no recipients):
- **From**: text input with autocomplete (placeholder "Acme <acme@example.com>")
- **Reply-To**: text input (toggleable, hidden by default — "Reply-To" button to show)
- **Subject**: text input (placeholder "Subject")
- **Preview text**: text input (maxlength 150 — toggleable, "Preview text" button to show)
- **NO** To, When, or Subscribe to fields (unlike broadcasts — templates don't have recipients)

**Content Editor**: Identical to Broadcast editor — same block-based rich text editor with '/' slash commands, same 4 toolbar tabs (Text, Image, Components, Variables), same file upload.

**Right Sidebar**: Identical to Broadcast editor — Page style, Theme (minimal/basic presets, 4 text levels), Global CSS with quick-insert buttons.

**Version History**: Available in right sidebar — tracks template revisions.

**Key Differences from Broadcast Editor**:
| Aspect | Template Editor | Broadcast Editor |
|--------|----------------|-----------------|
| Publish action | "Publish" button | "Review" → slide-to-send |
| Recipients | No To field | To (audience/segment) |
| Scheduling | No When field | When (date/time) |
| Topics | No Subscribe to | Subscribe to (topic) |
| Status flow | Draft → Published | Draft → Scheduled/Queued → Sent |
| Version history | In sidebar | Not observed |
| More actions | Test email, Version history, View details, Duplicate, Delete | (via header buttons) |

### 6.8 Templates — Detail Page (`/templates/:id`)

**Layout**: "Template" breadcrumb label + template name as h1 heading + API drawer button + More actions button

**Metadata** (horizontal key-value pairs):
- **Status**: badge (e.g., "published")
- **Variables**: count or "No variables"
- **Alias**: slug with copy-to-clipboard button (e.g., `untitled-template`)
- **Created**: relative timestamp
- **Creator**: email address of who created it

**More Actions** (on details page):
- Edit template
- Rename template
- Duplicate template
- *(separator)*
- Remove template

**Content Tabs** (3 tabs — NOT 4 like email detail):
1. **Preview** — rendered template in iframe (default active)
2. **HTML** — raw HTML source
3. **Plain Text** — plain text version
- Copy button next to tabs (copies content of active tab)
- **No Insights tab** (unlike email detail)

### 6.9 Audience — Contacts Tab (`/audience`)

**Layout**: Page title "Audience" + tab bar (Contacts | Properties | Segments | Topics) + "Add contacts" dropdown + API drawer button

**Summary Stats** (above filter bar):
- All Contacts (count), Subscribers (count), Unsubscribers (count), Metrics (expandable)

**Filter Bar** (left to right):
1. **Search** (Shadow DOM input, placeholder "Search by name, email, or multiple emails...")
2. **Contacts filter** (dropdown, default "All contacts") — filters by segment
3. **Subscriptions filter** (dropdown, default "All subscriptions") — filters by subscription status
4. **Export button** (right side)

**Data Table**:
- Columns: Email, Segments, Status, Added
- Checkbox column for bulk selection (header + per row)
- **Email** column: avatar + email + name (link to `/audience/contacts/:id`)
- **Segments** column: segment names (empty if none)
- **Status** column: "Subscribed" badge (green)
- **Added** column: relative time
- **Row actions**: three-dot "More actions" button (shows on hover — hidden by default, zero dimensions until row hover)

**Add Contacts** (dropdown button → 2 options):
1. **Add manually** → modal:
   - Email addresses: textarea (placeholder "foo@gmail.com, bar@gmail.com", comma or line-break separated)
   - Segments: autocomplete input for segment assignment
   - Add + Cancel buttons
2. **Import CSV** → navigates to import page

**Pagination**: Standard 40/80/120 items per page

### 6.10 Audience — Contact Detail (`/audience/contacts/:id`)

**Layout**: "Contact" label + email as h1 heading + API drawer button + More actions button

**Metadata** (key-value pairs):
- **Email Address**: email string
- **Created**: relative timestamp
- **Status**: "Subscribed" badge
- **ID**: UUID with copy-to-clipboard button
- **Segments**: list of segments or "No segments"
- **Topics**: list of topics or "No topics"

**Properties Section**:
- Displays all contact properties with labels and values
- Default properties: First Name, Last Name, company_name
- Missing values shown as "-"

**Activity Section**:
- Vertical timeline of contact events (e.g., "Contact created about 19 hours ago")
- Note: "Activity data may take a few seconds to update."

**More Actions**:
- Edit contact
- *(separator)*
- Delete contact

### 6.11 Audience — Properties Tab (`/audience/properties`)

**Layout**: Same tab bar, Properties tab active + "Add property" button + API drawer button

**Filter Bar**:
1. **Search** (Shadow DOM input, placeholder "Search...")
2. **Type filter** (combobox, default "All Types")

**Data Table**:
- Columns: Name, Type, Fallback value, Created
- Checkbox column for bulk selection
- Row actions (three-dot button)
- Name shown in monospace/code style

**Add Property** (button → modal):
- **Name**: text input (placeholder "e.g., company_name", maxlength 100, required)
- **Type**: combobox with 2 options: **String**, **Number**
- **Fallback Value**: optional text input (placeholder "Value to use when property is empty")
- Add + Cancel buttons

**Pagination**: Standard 40/80/120 items per page

### 6.12 Audience — Segments Tab (`/audience/segments`)

**Layout**: Same tab bar, Segments tab active + "Create segment" button + API drawer button

**Filter Bar**:
1. **Search** (Shadow DOM input, placeholder "Search...")

**Data Table**:
- Columns: Name, Contacts, Unsubscribed, Created
- Checkbox column for bulk selection
- **Name** column: link to `/audience?segmentId=:id` (navigates to Contacts tab filtered by segment)
- Row actions (three-dot button)

**Create Segment** (button → modal):
- **Name**: text input (placeholder "Your segment name")
- Add + Cancel buttons

**Pagination**: Standard 40/80/120 items per page

### 6.13 Audience — Topics Tab (`/audience/topics`)

**Layout**: Same tab bar, Topics tab active + "Create topic" button + "Edit Unsubscribe Page" link + API drawer button

**Filter Bar**:
1. **Search** (Shadow DOM input, placeholder "Search...")
2. **Default filter** (combobox, default "Any Default") — filters by opt-in/opt-out

**Empty State**:
- Title: "No topics yet"
- Description: "Use Topics with Unsubscribe Page to let users choose the content they want to receive."
- "Create topic" button + "Customize page" link
- **Unsubscribe page preview**: Embedded preview showing the customizable unsubscribe page with heading "Do you want to unsubscribe?", "Confirm your email preferences:" text, "Unsubscribe" button, "Powered by Resend" footer

**Create Topic** (button → modal):
- **Name**: text input (placeholder "Public display name", maxlength 50, required)
- **Description**: textarea (placeholder "Optional public description", maxlength 200)
- **Defaults to**: combobox with **Opt-in** / **Opt-out** (with info tooltip). Note: "This value cannot be changed later."
- **Visibility**: combobox with **Private** / **Public** (with info tooltip)
- Add + Cancel buttons

**Edit Unsubscribe Page**: Link to `/audience/topics/unsubscribe-page/edit`

### 6.14 Domains — List Page (`/domains`)

**Layout**: Page title "Domains" + "Add domain" button + API drawer button → filter bar → data table → pagination

**Filter Bar** (left to right):
1. **Search** (Shadow DOM input, placeholder "Search...")
2. **Status filter** (combobox, default "All Statuses") — 4 options:
   - Pending, Verified, Failed, Not Started
3. **Region filter** (combobox, default "All Regions") — 4 options:
   - North Virginia (us-east-1), Ireland (eu-west-1), São Paulo (sa-east-1), Tokyo (ap-northeast-1)
4. **Export button** (right side, icon button)

**Data Table**:
- Columns: Domain, Status, Region, Created
- Checkbox column for bulk selection (header + per row)
- **Domain** column: domain name as clickable link to `/domains/:id`
- **Status** column: status badge button (e.g., "verified") — clickable tooltip
- **Region** column: display name + region code (e.g., "North Virginia us-east-1")
- **Created** column: relative time with tooltip for exact timestamp
- **Row actions**: three-dot "More actions" button → dropdown with:
  - Delete domain (only action)

**Add Domain**: Button opens upgrade/paywall modal on free plan. On paid plans, opens add domain form.

**Pagination**: Page indicator + items per page selector (40/80/120)

### 6.15 Domain Detail Page (`/domains/:id`)

**Layout**: "Domain" breadcrumb label + domain name as h1 heading + API drawer button + More actions button

**Metadata** (key-value pairs):
- **Created**: relative timestamp with tooltip
- **Status**: text badge (e.g., "verified")
- **Provider**: link (e.g., "Cloudflare") — auto-detected DNS provider
- **Region**: display name + code (e.g., "North Virginia us-east-1")

**Domain Events Timeline** (left sidebar area):
- Header: "Domain verified: Your domain is ready to send emails"
- Vertical timeline of domain events:
  - "Domain added" + timestamp (e.g., "Mar 28, 4:06 PM")
  - "DNS verified" + timestamp
  - "Domain verified" + timestamp
- Each event is a clickable button (likely expandable)

**More Actions**:
- Restart (re-trigger verification)
- Go to docs
- *(separator)*
- Delete domain

**Content Tabs** (2 tabs):

#### Tab 1: Records
- **"Auto configure" button** — form with hidden domainId, auto-configures DNS via detected provider (e.g., Cloudflare)
- **Tutorial button** — shows setup tutorial
- **Forward instructions button** — share DNS setup instructions

**DNS Records** organized in 3 sections:
1. **Domain Verification (DKIM)**:
   - Link to DKIM docs
   - Table: Type, Name, Content, TTL, Priority, Status
   - TXT record: `resend._domainkey.<subdomain>` → DKIM public key
   - Status badge: "verified"

2. **Enable Sending (SPF)** — toggle switch (on/off):
   - Link to SPF docs
   - MX record: `send.<subdomain>` → `feedback-smtp.us-east-1.amazonses.com` (priority 10)
   - TXT record: `send.<subdomain>` → `v=spf1 include:amazonses.com ~all`
   - Both with status badges

3. **Enable Receiving** — toggle switch (on/off):
   - Additional DNS records for inbound email (MX records pointing to Resend's inbound servers)

**DNS Record Table Columns**: Type, Name, Content, TTL, Priority, Status
- Name and Content columns use truncation with `[…]` for long values (expandable via tooltip)
- TTL shows "Auto"
- Status shows verified/pending badges

#### Tab 2: Configuration
3 settings:
1. **Click Tracking** — toggle switch (default off)
   - Description: modifies links for click tracking, redirects through Resend server
2. **Open Tracking** — toggle switch (default off), labeled "Not Recommended"
   - Description: inserts 1x1 pixel transparent GIF, can decrease deliverability
   - Link: "if open tracking is right for you"
3. **TLS (Transport Layer Security)** — combobox with 2 options:
   - **Opportunistic** (default) — attempts secure connection, falls back to unencrypted
   - **Enforced** — requires TLS, no fallback

**API Drawer** (Domains API):
- Same 9 language tabs as Emails API drawer
- 6 code sections:
  1. Add domain (`resend.domains.create({ name: '...' })`)
  2. Retrieve Domain (`resend.domains.get('id')`)
  3. Verify Domain (`resend.domains.verify('id')`)
  4. Update Domain (`resend.domains.update({ id, openTracking, clickTracking })`)
  5. List Domains (`resend.domains.list()`)
  6. Delete Domain

### 6.16 Logs — List Page (`/logs`)

**Layout**: Page title "Logs" → filter bar → data table → pagination. No API drawer button. No "Add" action button.

**Filter Bar** (left to right):
1. **Search** (Shadow DOM input, placeholder "Search...")
2. **Status filter** (dropdown button, default "All Statuses") — grouped options:
   - **Groups**: All Statuses, Successes, Errors
   - *(separator)*
   - **Individual HTTP codes** (10 options):
     - 200 Ok, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable Content, 429 Too Many Requests, 451 Unavailable For Legal Reasons, 500 Internal Server Error
   - Each code shows: status code number + description label
3. **Date range picker** (button, default "Last 15 days") — same shared date range picker component
4. **User agents filter** (combobox, default "All user agents") — 12 options:
   - All user agents, SMTP, Node.js, Ruby, PHP, Python, GO, Rust, Java, .NET, cURL, CLI
5. **API Keys filter** (combobox, default "All API Keys") — filters by API key used
6. **Export button** (right side, icon button)

**Data Table**:
- Columns: Endpoint, Status, Method, Created
- **No checkbox column** (read-only log data, no bulk actions)
- **No row actions** (no three-dot menu — unlike most other list pages)
- **Endpoint** column: avatar icon + API path as clickable link to `/logs/:id` (e.g., "/emails")
- **Status** column: HTTP status code button (e.g., "200", "403") — clickable, shows tooltip
- **Method** column: HTTP method text (e.g., "POST")
- **Created** column: relative time with tooltip for exact timestamp

**Pagination**: Page indicator + items per page selector (40/80/120)

### 6.17 Log Detail Page — Success (`/logs/:id`)

**Layout**: "Log" breadcrumb label + HTTP method badge + endpoint path as heading + More actions button

**Metadata** (key-value pairs):
- **Endpoint**: API path (e.g., "/emails")
- **Date**: relative timestamp with tooltip
- **Status**: HTTP status code (e.g., "200")
- **Method**: HTTP method (e.g., "POST")
- **User-Agent**: client identifier (e.g., "curl/8.7.1")
- **ID**: UUID with copy-to-clipboard button

**More Actions**: "View email" — links to the associated email resource (`/emails/:id`)

**Response Body**:
- JSON code block with copy-to-clipboard button
- Shows the API response (e.g., `{ "id": "..." }`)

**Request Body**:
- JSON code block with copy-to-clipboard button
- Shows the full API request payload (from, to, subject, html, text, bcc, cc, replyTo fields)

### 6.18 Log Detail Page — Error (`/logs/:id`)

**Layout**: Same as success log detail, but with "Copy for AI" button instead of "More actions"

**Metadata**: Same fields as success log detail (Endpoint, Date, Status, Method, User-Agent, ID)

**Error Section** (appears between metadata and request body):
- **Error title** (bold): descriptive error name (e.g., "Testing domain restriction")
- **Error description**: explanation of the error with actionable guidance
- **"Help me fix" button**: opens AI-assisted troubleshooting

**Request Body**:
- JSON code block with copy-to-clipboard button
- **Error-causing values highlighted**: offending parts of the request are visually highlighted (e.g., `resend.dev` domain in a span)

**No Response Body section** — error logs only show the error explanation + request body

**Key Differences: Success vs Error Log Detail**:
| Aspect | Success Log | Error Log |
|--------|------------|-----------|
| Header action | "More actions" → "View email" | "Copy for AI" button |
| Response Body | Shown (JSON) | Not shown |
| Error section | Not present | Error title + description + "Help me fix" |
| Request highlighting | None | Error-causing values highlighted |

### 6.19 API Keys — List Page (`/api-keys`)

**Layout**: Page title "API Keys" + "Create API Key" button + API drawer button → filter bar → data table → pagination

**Filter Bar** (left to right):
1. **Search** (Shadow DOM input, placeholder "Search...")
2. **Permissions filter** (combobox, default "All Permissions") — 3 options:
   - All Permissions, Full access, Sending access
3. **Export button** (right side, icon button)

**Data Table**:
- Columns: Name, Token, Permission, Last Used, Created
- Checkbox column for bulk selection (header + per row)
- **Name** column: clickable link to `/api-keys/:id` (detail page)
- **Token** column: truncated token with tooltip (e.g., "re_jQPfsTWu...") — button shows full token on click/hover
- **Permission** column: text (e.g., "Full access")
- **Last Used** column: relative time as link to the log entry (e.g., links to `/logs/:id`)
- **Created** column: relative time with tooltip for exact timestamp
- **Row actions**: three-dot "More actions" button → dropdown (actions not captured — likely: Edit API key, Delete API key based on detail page actions)

**Create API Key** (button → modal "Add API Key"):
- **Name**: text input (placeholder "Your API Key name", required)
- **Permission**: combobox with info tooltip — 2 options:
  - **Full access** (`full_access`) — default
  - **Sending access** (`sending_access`)
- **Domain**: combobox (default "All Domains") — **disabled when Full access selected**, enabled for Sending access
  - Options: All Domains + list of verified domains (with region flag icon)
- **Add** button (disabled until name filled) + Cancel button (Esc shortcut)

**Pagination**: Page indicator + items per page selector (40/80/120)

### 6.20 API Key Detail Page (`/api-keys/:id`)

**Layout**: "API Key" breadcrumb label + key name as h1 heading + API drawer button + More actions button

**Metadata** (key-value pairs):
- **Permission**: text (e.g., "Full access")
- **Domain**: text (e.g., "All domains")
- **Total uses**: count as link to logs filtered by this API key (e.g., links to `/logs?api_key=:id`)
- **Token**: truncated token with tooltip/copy (e.g., "re_jQPfsTWu...")
- **Last used**: relative timestamp as link to the last log entry
- **Created**: relative timestamp
- **Creator**: email address

**More Actions**:
- Edit API key → opens Edit modal (same fields as Create: Name, Permission, Domain + Save button)
- Go to docs
- *(separator)*
- Delete API key

**Edit API Key** (modal):
- Same fields as Create modal: Name (pre-filled), Permission, Domain
- **Save** button instead of Add
- Cancel button (Esc shortcut)

**Key observations**:
- No content tabs (unlike email/domain detail pages) — just metadata
- Token is never fully shown — always truncated with "..."
- "Total uses" and "Last used" both link to the Logs page, providing cross-resource navigation
- API key detail is the only resource with a direct "Edit" action in More actions menu (other resources use separate edit pages/modals)

### 6.21 Webhooks — List Page (`/webhooks`)

**Layout**: Page title "Webhooks" + "Add webhook" button (header) + API drawer button

**Table** (when webhooks exist):
| Column | Description |
|--------|-------------|
| Endpoint | Webhook URL |
| Status | Active/disabled status |
| Created | Timestamp |
| (actions) | Row actions column |

**Empty state** (no webhooks):
- "No webhooks yet" heading
- "Configure a webhook to receive real-time updates about email events." description
- "Add webhook" button (centered in empty state)

**"Add webhook" modal**:
- **Endpoint URL**: Text input, placeholder "https://", required
- **Event types**: Multi-select combobox with search
  - "All Events" option (selects everything)
  - **Contacts** category header (with "Select all" toggle):
    - `contact.created`
    - `contact.deleted`
    - `contact.updated`
  - **Domains** category header (with "Select all" toggle):
    - `domain.created`
    - `domain.deleted`
    - `domain.updated`
  - **Email** category header (with "Select all" toggle):
    - `email.bounced`
    - `email.clicked` (has info icon)
    - `email.complained`
    - `email.delivered`
    - `email.delivery_delayed`
    - `email.failed`
    - `email.opened` (has info icon — "Not Recommended")
    - `email.received`
    - `email.scheduled`
    - `email.sent`
    - `email.suppressed`
- **Add** button (submit)
- **Cancel** button (with Esc shortcut)

**Total: 17 event types** in 3 categories (Contacts: 3, Domains: 3, Email: 11)

**API drawer**: Same shared API drawer component — shows webhook CRUD code examples (Create Webhook, List Webhooks, Remove Webhook)

**Key observations**:
- Event types combobox has searchable input with "Search events..." placeholder
- Category-level "Select all" toggles expand/collapse and select all events in that category
- `email.clicked` and `email.opened` have warning/info icons (tracking-related, similar to domain config "Not Recommended" for open tracking)
- No search or filter bar on the list page (unlike most other list pages)
- No detail page for webhooks — management is done inline from the list
- No checkboxes on the table (unlike Emails, Broadcasts, Domains, API Keys)

### 6.22 Metrics Page (`/metrics`)

**Layout**: Page title "Metrics" + domain combobox + date range picker → 3 collapsible metric sections, each with summary stat + chart + breakdown table

**Header Filters** (top of page, right of title):
1. **Domain filter** (combobox, default "All Domains") — options:
   - All Domains (with generic icon)
   - Individual verified domains (with region flag icon, e.g., `us-east-1`)
2. **Date range picker** (button, default "Last 15 days") — same shared component:
   - 6 presets: Today, Yesterday, Last 3 days, Last 7 days, Last 15 days, Last 30 days
   - Calendar month view with range selection

**Section 1: Deliverability Rate**
- **Summary row**: "Emails" label + total count (e.g., "3") | "Deliverability Rate" label + percentage (e.g., "100%")
- **Event type filter** (dropdown menu button, default "All Events") — `aria-haspopup="menu"`, 10 options:
  - All Events (with checkmark when selected) + separator
  - Received, Delivered, Opened, Clicked, Bounced, Complained, Unsubscribed, Delivery Delayed, Failed, Suppressed
- **Chart**: SVG bar/line chart with date axis (daily granularity, e.g., "Mar, 15", "Mar, 16"...)
- **Domain breakdown table**: domain name + deliverability percentage button (expandable tooltip)

**Section 2: Bounce Rate**
- **Header**: "Bounce rate" label + percentage (e.g., "0%") + info chevron (expandable)
- **Info panel** (opens on chevron click — slide-in dialog):
  - Title: "How Bounce Rate Works"
  - Close button (X)
  - Explanation: types of bounces (Permanent/hard, Transient/soft, Undetermined)
  - Risk level: >4% bounce rate may pause sending
  - Formula: `Bounce Rate = (Permanent + Transient + Undetermined Bounces) / Emails Sent x 100`
  - Useful articles links: "Tips to reduce bounces", "Email Bounces"
- **Chart**: SVG chart with 0-8% Y-axis scale
- **Breakdown table**: 3 rows — Transient, Permanent, Undetermined
  - Each label is a link to `/emails?statuses=bounced&startDate=...&endDate=...` (filtered emails view)
  - Each with percentage value

**Section 3: Complain Rate**
- **Header**: "Complain rate" label + percentage (e.g., "0%") + info chevron (expandable, similar to bounce rate)
- **Chart**: SVG chart with 0-0.2% Y-axis scale
- **Breakdown table**: 1 row — Complained
  - Link to `/emails?statuses=complained&startDate=...&endDate=...`

**Footer**: "Data is updated every 15 minutes. Last updated [time]."

**Key observations**:
- No search bar, no table, no pagination — this is a charts/analytics page, not a list page
- No API drawer button (unlike most other resource pages)
- Charts use SVG `<svg role="application">` with responsive scaling
- Bounce/complain rate sections have expandable info panels explaining the metric, risk levels, formulas
- Breakdown rows link to the Emails page with pre-applied status + date filters
- 10 deliverability event types (fewer than the 17 webhook event types — these are display-only metrics events, not webhook subscriptions)
- Data refreshes every 15 minutes (not real-time)

### 6.23 Settings — Usage Tab (`/settings/usage`)

**Layout**: Page title "Settings" + horizontal tab bar (7 tabs: Usage, ~~Billing~~, ~~Team~~, SMTP, Integrations, Unsubscribe page, Documents) → usage dashboard with 3 quota sections + extras section

**Section 1: Transactional**
- Description: "Integrate email into your app using the Resend API or SMTP interface."
- "Upgrade" button (opens paywall — out of scope)
- Plan badge: "Free"
- Quota table (2 rows):
  - Monthly limit: `{used} / 3,000` (with progress indicator)
  - Daily limit: `{used} / 100` (with progress indicator)

**Section 2: Marketing**
- Description: "Design and send marketing emails using Broadcasts and Audiences."
- "Upgrade" button
- Plan badge: "Free"
- Quota table (3 rows):
  - Contacts limit: `{used} / 1,000`
  - Segments limit: `{used} / 3`
  - Broadcasts limit: Unlimited

**Section 3: Team**
- Description: "Understand the quotas and limits for your team."
- Plan badge: "Free"
- Quota table (2 rows):
  - Domains: `{used} / 1`
  - Rate limit: `5 req/s`

**Section 4: Extras** (below main sections)
- **Pay-as-you-go**: description + pricing ($0.90 / per 1,000 emails)
- **Add-ons — Dedicated IPs**: $30/mo, description + "Check if a dedicated IP would be right for you" link + "View pricing" link

**Key observations**:
- Usage is a read-only dashboard — no forms, no create/edit actions
- Quota tables show `{used} / {limit}` with progress indicators (colored SVG icons)
- Out of scope: Billing tab, Team tab, Upgrade buttons, pricing links
- No API drawer, no search, no pagination

### 6.24 Settings — SMTP Tab (`/settings/smtp`)

**Layout**: Tab heading "SMTP" + description + documentation link → 4 read-only credential fields

**Description**: "Send emails using SMTP instead of the REST API." + "See documentation" link

**Credential fields** (all read-only with copy-to-clipboard button):
1. **Host**: `smtp.resend.com` (text input, `data-state=read-only`)
2. **Port**: `465` (text input, read-only)
   - Helper text: "For encrypted/TLS connections use `2465`, `587` or `2587`" — each port number is a clickable button (copies to clipboard)
3. **User**: `resend` (text input, read-only)
4. **Password**: `YOUR_API_KEY` (text input, read-only)

**Key observations**:
- Purely informational page — all fields read-only, no save/edit actions
- Shadow DOM inputs used for credential display
- Copy-to-clipboard buttons on each field
- Alternative port numbers displayed as clickable copy buttons in helper text
- Password is a placeholder string pointing to API Keys page

### 6.25 Settings — Integrations Tab (`/settings/integrations`)

**Layout**: Tab heading (implicit) → 2 integration cards stacked vertically

**Integration 1: Supabase**
- Description: "Integrate your Supabase account to send emails from Supabase Auth via SMTP."
- Button: "Connect to Supabase"

**Integration 2: Vercel**
- Description: "Integrate your Resend API keys with Vercel environment variables."
- Button: "Go to Vercel Integration"

**Key observations**:
- Simple card layout, no table/list
- Only 2 integrations shown (Supabase + Vercel)
- Both are external redirect buttons, not in-app configuration
- Out of scope for clone — these integrate with third-party services
- Could be replicated as static cards with external links

### 6.26 Settings — Unsubscribe Page (`/settings/unsubscribe-page`)

**Layout**: Two views — preview mode and editor mode

**Preview Mode**:
- 2 tabs (Radix tabs): **Preferences** (default, active) and **Success**
- Action links: "Edit" → opens editor, "Topics" → navigates to `/audience/topics`
- **Preferences tab preview**: Embedded page showing:
  - Company logo placeholder (SVG)
  - Heading: "Do you want to unsubscribe?"
  - Subheading: "Confirm your email preferences:"
  - "Unsubscribe" button
  - Footer: "Powered by Resend"
- **Success tab preview**: "Your email preferences were updated." + "Powered by Resend"

**Editor Mode** (accessed via Edit button — separate route):
- **Header**: Back arrow (returns to preview) + "Unsubscribe page" breadcrumb + "Edit" label + "Reset" button + "Save" button
- **Page selector**: 2 buttons — "Unsubscribe page" and "Success page" (switch which page content you're editing)
- **Content area**: `contenteditable` rich text editor
  - Unsubscribe page: H1 heading + P paragraph (editable text)
  - Success page: H1 heading + P paragraph (editable text)
- **Right sidebar settings**:
  - **Logo**: File upload button (accepts image/jpeg, image/png, image/gif, image/svg+xml)
  - **Colors** (3 color pickers):
    - Background: hex input + color swatch button (default: `#05050A`)
    - Text: hex input + color swatch button (default: `#EDEEF0`)
    - Accent: hex input + color swatch button (default: `#363A3F`)
  - **Footer**: "Hide branding" toggle switch (default: off/closed)

**Key observations**:
- Unsubscribe page is a hosted page that recipients see when clicking unsubscribe links
- Editor is a simple rich text editor (not the full block editor from broadcasts/templates)
- Customization options: logo upload, 3 colors (background, text, accent), branding toggle
- Two pages to customize: the confirmation page and the success page
- "Reset" button presumably restores defaults
- Topics link connects to Audience > Topics tab

### 6.27 Settings — Documents Tab (`/settings/documents`)

**Layout**: 4 document sections stacked vertically, each with title, description, and download link

**Document 1: Penetration test**
- Description: "Penetration testing is performed at least annually by third-party cybersecurity company, Oneleet. You can download the Letter of Attestation below."
- Download link: `/static/documents/resend-pen-test-letter-of-attestation.pdf`

**Document 2: SOC 2**
- Description: "Resend is SOC 2 Type II compliant, a compliance framework developed by AICPA. This audit was completed by Vanta & Advantage Partners and covers the period of February 1, 2024 to February 1, 2025."
- Download link: `/static/documents/resend-soc-2-type-ii-report.pdf`

**Document 3: DPA**
- Description: "Data Processing Agreement (DPA) is a contract that regulates data processing conducted for business purposes. The attached DPA is a version signed by us, and is considered fully executed once you signup to Resend."
- Download link: `/static/documents/resend-dpa-signed.pdf`

**Document 4: Form W-9**
- Description: "Form W-9 is a document used in the United States by individuals and entities to provide their taxpayer identification number (TIN) to a person or business that will pay them income. You can download the signed Form W-9 below."
- Download link: `/static/documents/resend-w9-signed.pdf`

**Key observations**:
- Purely static/informational page — no interactive elements beyond download links
- 4 compliance documents with descriptions and PDF download links
- Low priority for clone — could be replicated as static page with placeholder PDFs
- No API drawer, no forms, no dynamic content

## 7. Design System — COMPLETE

### Theme
- **Mode**: Dark theme (black background, light text)
- **Overall feel**: Minimal, developer-focused, high contrast dark UI

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| Background (body) | `#000000` / `rgb(0, 0, 0)` | Page background |
| Text primary | `#F0F0F0` / `rgb(240, 240, 240)` | Headings, active nav, table cell text |
| Text secondary | `#A1A4A5` / `rgb(161, 164, 165)` | Inactive nav, labels, table headers, muted text |
| Text tertiary | `rgba(253, 254, 255, 0.65)` | Icons, subtle elements |
| Surface | `rgba(24, 25, 28, 0.88)` | Buttons, filter dropdowns, active nav item bg, cards |
| Border primary | `rgba(176, 199, 217, 0.145)` | Table borders, button borders, dividers |
| Border secondary | `rgb(33, 38, 41)` | Sidebar borders, subtle separators |
| Border hover | `rgb(41, 48, 52)` | Hover state borders |
| Unsubscribe page bg | `#05050A` | Unsubscribe page background |
| Unsubscribe text | `#EDEEF0` | Unsubscribe page text |
| Unsubscribe accent | `#363A3F` | Unsubscribe page accent/button |

### Typography
| Element | Font Family | Size | Weight | Line Height | Letter Spacing |
|---------|-------------|------|--------|-------------|----------------|
| Page title (h1) | `aBCFavorit` | 28px | 500 | 34px | -0.72px |
| Body text | `Inter` | 14px | 400 | — | — |
| Table headers | `Inter` | 12px | 400 | — | — |
| Nav items | `Inter` | 14px | 400 | — | — |
| Sidebar buttons | `Inter` | 14px | 600 | — | — |
| Base (body) | `Inter` | 16px | 400 | — | — |

**Font stack**: `inter, ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`
**Display font**: `aBCFavorit` (h1 headings only)

### Layout
- **Sidebar**: 250px width, fixed left, transparent/dark background
- **Content area**: Fills remaining width, dark background
- **Page header**: Title (h1, aBCFavorit) + action buttons (right-aligned)
- **Filter bar**: Below header, left-to-right: search + filter dropdowns + export button
- **Border radius**: 12px (buttons, cards, nav items), 6px (smaller elements)
- **Padding**: Buttons `0px 6px 0px 12px` (with icon), table cells `0px 12px`

### Common Components
- **Data tables**: Column headers (12px, secondary color), cell text (14px, primary), bottom border on cells, checkbox selection, row actions (three-dot menu)
- **Pagination**: Items per page selector (40/80/120), cursor-based navigation
- **Search**: Shadow DOM text input with placeholder
- **Status badges**: Text-based buttons with contextual meaning (no background fill, uses text color)
- **API drawer**: Slide-in panel from right with language tabs (9 languages) and code examples
- **Modals**: Centered dialog with form fields, Add/Cancel buttons, Esc keyboard shortcut
- **Toast notifications**: Success/error feedback
- **Date range picker**: 6 presets (Today, Yesterday, Last 3/7/15/30 days) + calendar month view with range selection
- **Tabs**: Horizontal tab bar with Radix `data-state=active/inactive`, underline indicator for active
- **Combobox**: Searchable dropdown with multi-select support (used for event types, domains, segments)
- **Toggle switches**: Binary on/off controls (used in domain config, unsubscribe settings)
- **Copy-to-clipboard**: Button next to IDs, tokens, DNS records — copies value, shows feedback
- **Empty states**: Centered heading + description + action button (used on Webhooks, Receiving, Topics)
- **Vertical timeline**: Status badge + timestamp pairs for event history (Email events, Domain events, Contact activity)

## 8. Site Map

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
- `/logs/:id` — Log detail (API request/response, error explanation)
- `/api-keys/:id` — API key detail (permission, domain, usage stats)

## 9. Build Order

### What Makes Resend Valuable (Core Features)
1. **Send emails via API** — the #1 use case, REST API + SES integration
2. **View email delivery logs** — see what was sent, delivery status, events
3. **Manage domains + DNS verification** — DKIM/SPF setup via SES + Cloudflare
4. **API key management** — create/scope keys for authentication
5. **Contacts & segments** — audience management for broadcasts

### Implementation Priority

| Priority | Phase | What to Build | PRD Items |
|----------|-------|---------------|-----------|
| 1 | Infrastructure | Database schema (all models via Drizzle), SES client, S3 client, Cloudflare client | infra-001 through infra-004 |
| 2 | Shell | Core layout: sidebar nav (10 items), content area, routing for all pages | layout-001 |
| 3 | Foundations | Design system: dark theme, colors, typography, shared components (table, filters, pagination, modals, badges, date picker, search, tabs, toasts) | design-001 through design-003 |
| 4 | Auth | API key auth middleware (Bearer token), API key CRUD | feature-030, feature-031, feature-032 |
| 5 | **CORE** | Email sending API (`POST /api/emails`, `POST /api/emails/batch`, `GET /api/emails`, `GET /api/emails/:id`) + SES integration | api-001 |
| 6 | **CORE** | Emails list page (table, filters, search, status badges, date range, pagination) | feature-001, feature-002, feature-003 |
| 7 | **CORE** | Email detail page (metadata, event timeline, content tabs: Preview/Plain Text/HTML/Insights) | feature-004, feature-005 |
| 8 | **CORE** | Domains API + list page (add, verify via SES + Cloudflare DNS, status tracking) | feature-023, feature-024, feature-025 |
| 9 | Secondary | Domain configuration (click/open tracking, TLS settings) | feature-026 |
| 10 | Secondary | API drawer (shared component — slide-in panel with code examples, 9 language tabs) | feature-006 |
| 11 | Secondary | Audience — Contacts (list, add manually, import CSV, detail page with activity timeline) | feature-016, feature-017, feature-018, feature-019 |
| 12 | Secondary | Audience — Properties, Segments, Topics (CRUD for each) | feature-020, feature-021, feature-022 |
| 13 | Secondary | Broadcasts (list, editor with block-based content, slash commands, theme, review/send) | feature-008, feature-009, feature-010, feature-011, feature-012 |
| 14 | Secondary | Templates (card grid list, editor sharing broadcast editor, detail page, publish flow) | feature-013, feature-014, feature-015 |
| 15 | Secondary | Webhooks (list, add modal with 17 event types, event delivery via HTTP POST) | feature-033, feature-034, feature-035 |
| 16 | Supporting | Logs (API request log table, success/error detail pages, HTTP status filters) | feature-027, feature-028, feature-029 |
| 17 | Supporting | Metrics (deliverability/bounce/complain rate charts, SVG charts, breakdown tables) | feature-036, feature-037, feature-038, feature-039 |
| 18 | Supporting | Emails Receiving tab (inbound email via subdomain) | feature-007 |
| 19 | Settings | Settings — Usage quotas, SMTP credentials, Integrations, Unsubscribe page editor, Documents | feature-040, feature-041, feature-042, feature-043, feature-044 |
| 20 | SDK | TypeScript SDK (`packages/sdk/`) — `{ data, error }` pattern, all API resources | sdk-001 |
| 21 | Deploy | AWS App Runner + RDS Postgres deployment | deploy-001 |

## 10. Backend Architecture

| Feature | AWS Service | Details |
|---------|-------------|---------|
| Email sending | AWS SES (`@aws-sdk/client-sesv2`) | us-east-1 region, SendEmail API |
| Domain verification | AWS SES + Cloudflare API | SES for DKIM/SPF identity, Cloudflare for DNS record auto-configuration |
| Database | RDS Postgres (Drizzle ORM) | All data models, cursor-based pagination |
| File storage | AWS S3 | Email attachments, template images, logo uploads |
| Webhook delivery | HTTP POST | Registered endpoint URLs, signing secret for verification, 17 event types |
| API authentication | Bearer token | `Authorization: Bearer re_xxx` header, API keys stored hashed in DB |
| Email receiving | AWS SES inbound | MX records → SES → S3 → notification → process |
| Metrics aggregation | Postgres queries | Deliverability/bounce/complain rates, daily aggregation, 15-min refresh |
| SMTP relay | Node.js SMTP server | Alternative to REST API, same SES backend |

## 11. SDK / Developer Experience

**Package**: `packages/sdk/` — TypeScript npm package

**Pattern**: All methods return `{ data, error }` — no exceptions thrown

**API Surface**:
```typescript
import { Resend } from 'resend';
const resend = new Resend('re_xxx');

// Emails
const { data, error } = await resend.emails.send({ from, to, subject, html });
await resend.emails.get(id);
await resend.emails.list();

// Domains
await resend.domains.create({ name, region });
await resend.domains.list();
await resend.domains.get(id);
await resend.domains.verify(id);
await resend.domains.update({ id, openTracking, clickTracking });
await resend.domains.remove(id);

// API Keys
await resend.apiKeys.create({ name, permission, domain });
await resend.apiKeys.list();
await resend.apiKeys.remove(id);

// Contacts
await resend.contacts.create({ email, firstName, lastName, segments });
await resend.contacts.list();
await resend.contacts.get(id);
await resend.contacts.update({ id, firstName });
await resend.contacts.remove(id);

// Segments
await resend.segments.create({ name });
await resend.segments.list();
await resend.segments.get(id);
await resend.segments.remove(id);

// Broadcasts
await resend.broadcasts.create({ name, from, subject, html, segmentId });
await resend.broadcasts.list();
await resend.broadcasts.get(id);
await resend.broadcasts.send(id);
await resend.broadcasts.remove(id);

// Webhooks
await resend.webhooks.create({ endpoint, events });
await resend.webhooks.list();
await resend.webhooks.get(id);
await resend.webhooks.remove(id);

// Templates
await resend.templates.create({ name, html, variables });
await resend.templates.list();
await resend.templates.get(id);
await resend.templates.update({ id, html });
await resend.templates.publish(id);
await resend.templates.remove(id);

// Topics
await resend.topics.create({ name, defaultSubscription, visibility });
await resend.topics.list();
await resend.topics.get(id);
await resend.topics.update({ id, name });
await resend.topics.remove(id);
```

**Auth**: Bearer token via `Authorization` header
**Regions**: us-east-1 (default), eu-west-1, sa-east-1, ap-northeast-1
**Pagination**: Cursor-based (`{ limit, after, before }`)

## 12. Deployment

**Target**: AWS App Runner + RDS Postgres

**Infrastructure**:
- **App Runner**: Next.js app (builds from source, auto-deploy from git)
- **RDS Postgres**: Managed database (Drizzle ORM migrations via `npm run db:migrate`)
- **SES**: Email sending (pre-configured via `~/.aws/credentials`)
- **S3**: File storage for attachments and images
- **Cloudflare**: DNS management via API token in `.env`

**Environment Variables** (`.env`):
- `DATABASE_URL` — Postgres connection string
- `DASHBOARD_KEY` — Master key for dashboard access
- `CLOUDFLARE_API_TOKEN` — DNS record management
- `CLOUDFLARE_ZONE_ID` — DNS zone
- AWS credentials via `~/.aws/credentials` (no env vars needed)

**Scripts** (`scripts/`):
- `setup-rds.sh` — Create RDS instance
- `setup-app-runner.sh` — Deploy to App Runner
- `setup-ses.sh` — Configure SES identities
