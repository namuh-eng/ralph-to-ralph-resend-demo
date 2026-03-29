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
- `/logs/:id` — Log detail (API request/response, error explanation)

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
