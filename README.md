# Ralph-to-Ralph

**Autonomous Product Cloning Loop**

Give it any URL. It inspects, builds, tests, and deploys a working clone.

![Architecture](docs/architecture-diagram.png)

## What It Does

Ralph-to-Ralph is a three-phase autonomous system that clones any SaaS product from just a URL:

1. **Inspect** (Claude Opus + Ever CLI) — Browses the target product, extracts docs, captures screenshots, generates a detailed PRD with 50+ features
2. **Build** (Claude Opus) — Implements each feature one by one with TDD, real cloud infrastructure (AWS SES, RDS Postgres, S3), and commits after every feature
3. **QA** (Codex + Ever CLI) — Independent evaluator that tests every feature, finds bugs, fixes them, and verifies against the original product

The watchdog orchestrator manages the entire pipeline with auto-restart on failure, git commit+push after every iteration, and a build-QA-fix loop (up to 5 cycles).

## Live Demo

**Deployed clone of Resend.com:** [https://zjucbjapsn.us-east-1.awsapprunner.com](https://zjucbjapsn.us-east-1.awsapprunner.com)

> To access the dashboard, you need an API key. Please request one from the team.

### Try Sending a Real Email

```typescript
// Using the TypeScript SDK (packages/sdk/)
import { ResendClone } from "resend-clone";

const resend = new ResendClone("YOUR_API_KEY", {
  baseUrl: "https://zjucbjapsn.us-east-1.awsapprunner.com",
});

const { data, error } = await resend.emails.send({
  from: "hello@foreverbrowsing.com",
  to: "your@email.com",
  subject: "Hello from the clone!",
  react: <WelcomeEmail name="World" />,
});
```

Or with curl:

```bash
curl -X POST https://zjucbjapsn.us-east-1.awsapprunner.com/api/emails \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"hello@foreverbrowsing.com","to":["your@email.com"],"subject":"Hello!","html":"<h1>It works!</h1>"}'
```

## How to Run

```bash
# 1. Pre-provision infrastructure
bash scripts/preflight.sh

# 2. Start the cloning loop
./scripts/start.sh https://resend.com
```

The loop runs autonomously — inspect, build, test, deploy. Monitor progress via git log.

## What Gets Built

For the Resend.com demo, the loop produced:

- **52 features** across 10 dashboard pages
- **24,000+ lines** of TypeScript
- **388 unit tests** passing
- **Real email delivery** via AWS SES (production mode)
- **Real domain verification** with auto-configured DNS via Cloudflare API
- **TypeScript SDK** with React email rendering support
- **REST API** with 16+ endpoints, Bearer token auth
- **Deployed to AWS** App Runner with RDS Postgres

### Pages Built
Emails (sending/receiving/detail) | Domains (list/detail/DNS records) | API Keys (list/create/detail) | Broadcasts (list/editor with block content/styling/review) | Templates (list/editor/detail) | Audience (contacts/properties/segments/topics) | Webhooks | Metrics | Logs | Settings | API Docs

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS |
| UI Components | Radix UI |
| Database | RDS Postgres + Drizzle ORM |
| Email | AWS SES (production mode) |
| Storage | AWS S3 |
| DNS | Cloudflare API (auto-configure DKIM/SPF/DMARC) |
| Deployment | AWS App Runner |
| Unit Tests | Vitest |
| E2E Tests | Playwright |
| Linting | Biome |
| Build Agent | Claude Opus |
| QA Agent | Codex |
| Browser Automation | Ever CLI |

## Architecture

```
./scripts/start.sh https://resend.com
         |
    Watchdog Orchestrator
         |
    Phase 1: INSPECT (Claude + Ever CLI)
         |  -> PRD with 50+ features
         |  -> build-spec.md
         |  -> screenshots + docs
         |
    Phase 2: BUILD (Claude Opus)
         |  -> 1 feature per iteration
         |  -> TDD: write tests first
         |  -> make check && make test
         |  -> git commit + push each feature
         |
    Phase 3: QA (Codex + Ever CLI)
         |  -> Playwright regression first
         |  -> Ever CLI manual verification
         |  -> Fix bugs, re-test
         |  -> Compare against original product
         |
    Deploy to AWS App Runner
         -> Live URL with real email delivery
```

## API Reference

Full API documentation available at `/docs` on the deployed app.

Key endpoints:
- `POST /api/emails` — Send email (supports html, text, react, template)
- `POST /api/emails/batch` — Send batch emails
- `GET /api/emails` — List sent emails
- `POST /api/domains` — Add domain with DNS verification
- `POST /api/api-keys` — Create API key
- `POST /api/contacts` — Create contacts
- `POST /api/broadcasts` — Create broadcast campaign
- `POST /api/templates` — Create email template
- `POST /api/webhooks` — Register webhook endpoint

## Project Structure

```
src/app/           — Next.js pages + API routes
src/components/    — React components (34 files)
src/lib/           — Backend clients (SES, S3, Cloudflare, Drizzle)
tests/             — Unit tests (Vitest)
tests/e2e/         — E2E tests (Playwright)
packages/sdk/      — TypeScript SDK with React email support
scripts/           — Start, preflight, demo scripts
```

---

Built at Ralphthon 2026
