# Resend — Site Map

## Layout Pattern
- **Sidebar navigation** (left) + **Content area** (right)
- Sidebar: team switcher at top, main nav links, user menu at bottom
- Content area: page title + action buttons at top, filters/search bar, then main content (usually a table/list)
- Footer links: Feedback, Help, Docs

## Navigation Structure

### 1. Emails (`/emails`)
- **Sending** tab (`/emails`) — DEFAULT
  - Type: List/table view
  - Columns: To, Status, Subject, Sent
  - Features: Search, date range filter, status filter, API key filter, row actions, API drawer button
- **Receiving** tab (`/emails/receiving`)
  - Type: List/table view (email inbound)

### 2. Broadcasts (`/broadcasts`)
- Type: List view with checkboxes
- Features: Search, filters (combobox, select), pagination (40/80/120 items per page), bulk actions, row-level more actions menu

### 3. Templates (`/templates`)
- Type: List/card view
- Features: Search, filters (combobox), row actions

### 4. Audience (`/audience`)
- **Contacts** tab (`/audience/`) — DEFAULT
  - Type: List/table view with checkboxes
  - Features: Search (by name, email, or multiple emails), import button, add contact button, filters, pagination, bulk actions, row actions
- **Properties** tab (`/audience/properties`)
  - Type: List view (custom contact properties)
- **Segments** tab (`/audience/segments`)
  - Type: List view (audience segments with filter rules)
- **Topics** tab (`/audience/topics`)
  - Type: List view (unsubscribe topics)

### 5. Metrics (`/metrics`)
- Type: Analytics/charts view
- Features: Combobox filter, date range, expandable sections

### 6. Domains (`/domains`)
- Type: List view with checkboxes
- Features: Search, filters (2 comboboxes), pagination, add domain button, API drawer, row actions, domain status badges

### 7. Logs (`/logs`)
- Type: List/table view
- Features: Search, expandable filter, date range, combobox filters (2), pagination

### 8. API Keys (`/api-keys`)
- Type: List view with checkboxes
- Features: Search, filters, create button, API drawer, pagination, row actions

### 9. Webhooks (`/webhooks`)
- Type: List/card view
- Features: Add endpoint button, API drawer, expandable sections

### 10. Settings (`/settings`)
- **Usage** tab (`/settings/usage`) — DEFAULT
  - Type: Dashboard with metrics (email sends, limits)
  - Features: Open tracking toggle
- **Billing** tab (`/settings/billing`) — OUT OF SCOPE
- **Team** tab (`/settings/team`) — OUT OF SCOPE
- **SMTP** tab (`/settings/smtp`)
  - Type: Info/config page (SMTP credentials)
- **Integrations** tab (`/settings/integrations`)
  - Type: List/card view (third-party integrations)
- **Unsubscribe page** tab (`/settings/unsubscribe-page`)
  - Type: Config/preview (customize unsubscribe page)
- **Documents** tab (`/settings/documents`)
  - Type: List view (compliance documents)

## Common UI Patterns
- **List pages**: Header with title + action buttons → filter bar (search + dropdowns) → table/list with checkboxes → pagination
- **Pagination**: Select dropdown with 40/80/120 items per page
- **Row actions**: "More actions" button (three dots) on each row
- **API drawer**: Button to show API code examples for the current resource
- **Search**: Shadow DOM input with placeholder text
- **Filters**: Combination of date range pickers, status dropdowns, and combobox selects
- **Bulk actions**: Checkbox selection on list items for bulk operations
- **Status badges**: Colored badges for delivery status, domain verification status, etc.

## Detail Pages (accessed from list items)
- `/emails/:id` — Email detail (delivery status, headers, body preview)
- `/broadcasts/:id` — Broadcast detail/editor
- `/audience/:id` — Contact detail
- `/domains/:id` — Domain detail (DNS records, verification)
- `/templates/:id` — Template editor

## Shared Components
- Team/workspace switcher (top of sidebar)
- User menu (bottom of sidebar)
- API code drawer (slides in from right)
- Date range picker
- Status filter dropdowns
- Search input (shadow DOM)
- Pagination control
- Toast notifications
- Modal dialogs (for create/edit forms)
