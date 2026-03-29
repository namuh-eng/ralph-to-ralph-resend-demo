# Resend — Product Overview

Resend is an **email API for developers**. It provides a modern, developer-friendly platform for sending transactional and marketing emails.

## Core Features

### Email Sending & Management
- Send transactional and marketing emails via REST API
- Batch sending (up to 100 emails per request)
- Schedule emails using natural language ("in 1 hour") or ISO 8601
- Attachments up to 40MB total per email
- Inline images with content IDs
- Idempotency keys to prevent duplicate sends (24-hour window)
- React component rendering for email content (Node.js SDK)

### Email Receiving
- Receive inbound emails via webhooks
- Process content, attachments, forwarding, and replies
- Custom domains for receiving

### Domains
- Verify and manage sending domains
- DMARC, BIMI, SPF, DKIM authentication
- Multi-region: us-east-1, eu-west-1, sa-east-1, ap-northeast-1
- Configurable click/open tracking
- TLS enforcement options
- Capabilities: sending, receiving (per domain)

### Contacts & Segments
- Create and manage contacts with custom properties
- Organize contacts into segments (replaces deprecated Audiences)
- Subscription management via topics
- Bulk CSV import

### Broadcasts
- Create and send marketing campaigns to segments
- Draft mode, immediate send, and scheduled delivery
- Contact property templating for personalization
- Topic-scoped broadcasts
- Performance tracking (open/click rates)

### Templates
- Create reusable email templates with HTML or React
- Dynamic variables (string/number types, up to 50 per template)
- Template versioning and publishing
- Alias support for alternative identifiers

### Webhooks
- Real-time event notifications via HTTPS POST
- 17 event types across email, domain, and contact events
- Signed payloads for verification
- Automatic retry: 6 attempts (5s → 10h)
- At-least-once delivery

### API Keys
- Full access or sending-only permissions
- Domain-scoped keys
- Bearer token authentication

### Topics
- Manage subscription preferences
- Public/private visibility
- Default opt-in/opt-out per topic

## SDK (Node.js/TypeScript only for clone)
```typescript
import { Resend } from 'resend';
const resend = new Resend('re_xxxxxxxxx');

// Send email
const { data, error } = await resend.emails.send({
  from: 'Acme <hello@acme.com>',
  to: ['user@example.com'],
  subject: 'Hello',
  html: '<p>Hello world</p>',
});

// SDK methods: resend.emails, resend.domains, resend.apiKeys,
// resend.contacts, resend.segments, resend.broadcasts,
// resend.webhooks, resend.templates, resend.topics
```

## REST API Base URL
`https://api.resend.com`

## Authentication
Bearer token: `Authorization: Bearer re_xxxxxxxxx`

## Pagination
Cursor-based with `limit`, `after`, `before` parameters. Default limit: 20, max: 100.
