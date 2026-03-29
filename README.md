# Ralph-to-Ralph

**Autonomous Product Cloning Loop**

Give it any URL → It inspects, builds, tests, and deploys a working clone.

![Ralph-to-Ralph Architecture](docs/assets/architecture-diagram.png)

## What Is This?

Ralph-to-Ralph clones real products end-to-end — from browser analysis to deployed production software. Real, working products that you now own.

**The problem:** Non-technical founders know exactly what product they want to build or clone, but can't build and launch it at production quality themselves. Getting to production typically takes months or years, requires entire engineering teams, and costs significant money.

**The solution:** Ralph-to-Ralph automates the entire process. Point it at any SaaS product URL and it autonomously inspects, plans, builds, tests, and deploys a fully working clone.

## How It Works

Ralph-to-Ralph runs a three-phase autonomous pipeline:

### Phase 1: Inspect (Ralph Loop #1)

**Ever CLI + Claude Opus** analyzes the target URL and produces:
- `PRD.json` — structured product requirements
- `build-spec.md` — technical build specification
- Sitemap + screenshots of every page

### Phase 2: Build (Ralph Loop #2)

**Claude Agent (Opus)** builds the full stack:
- API routes + React components
- Unit tests (Vitest)
- AWS infrastructure (SES, RDS, S3)

### Phase 3: QA (Ralph Loop #3)

**Codex Agents (parallel)** verify everything works:
- E2E testing via Ever CLI
- Bug fixes + visual regression screenshots
- Regression test suite

A **bug fix loop** (Bug Found → Fix → Retest, up to 5 cycles) runs between Build and QA until the product passes all checks.

## Watchdog Orchestrator

A strict watchdog wraps the entire pipeline, ensuring all Ralph loops stay stable and keep shipping:

- **Auto-restart on failure** — if any loop crashes, it restarts automatically
- **Git commit + push** — every milestone is committed and pushed
- **Cron backup** — periodic backups for safety

## AI Agents & Tools

| Agent | Role |
|-------|------|
| **[Ever CLI](https://foreverbrowsing.com)** | Custom browser agent for site inspection and E2E testing |
| **Claude Opus** | Powers the Inspect and Build loops — architecture, code generation, infra setup |
| **Codex** | Runs parallel QA agents for fast, thorough verification |

## Demo Results: Resend.com Clone

We ran Ralph-to-Ralph against [resend.com](https://resend.com) — an email API platform for developers.

**Live deployed clone:** [zjucbjapsn.us-east-1.awsapprunner.com](https://zjucbjapsn.us-east-1.awsapprunner.com)

> Request an API key from the team to access the dashboard and send emails.

### By the Numbers

| Metric | Value |
|--------|-------|
| Features built | 52 |
| Lines of code | 24,000+ |
| Unit tests | 388 passing |
| Test files | 35 |
| Dashboard pages | 10 |
| API endpoints | 16+ |
| Build time | ~4 hours (fully autonomous) |

### What Actually Works

- **Real email sending** — Send emails via REST API or TypeScript SDK. Emails arrive in your inbox via AWS SES (production mode, not sandbox)
- **React email templates** — SDK supports `react` prop with `renderToStaticMarkup()`. Write emails as React components
- **Domain verification** — Add a domain, DNS records (DKIM/SPF/DMARC) auto-configured via Cloudflare API, SES verifies
- **API key management** — Create, list, delete API keys with permission levels (full access / sending only)
- **Full dashboard** — 10 pages matching Resend's UI: Emails, Domains, API Keys, Broadcasts, Templates, Audience, Webhooks, Metrics, Logs, Settings
- **Broadcast editor** — Block-based rich text editor with slash commands, styling sidebar, review panel
- **Template editor** — Create, edit, publish templates with variable substitution
- **Contact management** — CRUD contacts with segments, topics, properties
- **Webhooks** — Register endpoints, select from 17 event types across 3 categories
- **API docs page** — Auto-generated endpoint documentation at `/docs`
- **Auth wall** — API key unlocks both dashboard and API access
- **Deployed to AWS** — App Runner with RDS Postgres, real cloud infrastructure

### Send an Email (Try It)

```bash
curl -X POST https://zjucbjapsn.us-east-1.awsapprunner.com/api/emails \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"hello@foreverbrowsing.com","to":["your@email.com"],"subject":"Hello!","html":"<h1>It works!</h1>"}'
```

Or with the TypeScript SDK:

```typescript
import { ResendClone } from "resend-clone";

const resend = new ResendClone("YOUR_API_KEY", {
  baseUrl: "https://zjucbjapsn.us-east-1.awsapprunner.com",
});

await resend.emails.send({
  from: "hello@foreverbrowsing.com",
  to: "your@email.com",
  subject: "Built by AI",
  react: <WelcomeEmail name="World" />,
});

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **UI:** Radix UI
- **Database:** RDS Postgres via Drizzle ORM
- **Email:** AWS SES
- **Storage:** AWS S3
- **Deployment:** AWS App Runner

## Team

- **Jaeyun Ha** — [github.com/jaeyunha](https://github.com/jaeyunha)
- **Ashley Ha** — [github.com/ashley-ha](https://github.com/ashley-ha)

## Presentation

[View the pitch deck (PDF)](ralph-to-ralph.pdf)

## Ralphthon Seoul 2026

This project was built for [Ralphthon Seoul 2026](https://ralphthon.com) — a hackathon focused on building real products with AI agents.
