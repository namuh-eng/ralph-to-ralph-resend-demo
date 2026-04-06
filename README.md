# Namuh Send

Open-source email infrastructure platform — a feature-complete clone of [Resend.com](https://resend.com). REST API, TypeScript SDK, dashboard, domain verification, broadcasts, templates, webhooks, and delivery analytics.

**Repo**: [`namuh-eng/namuh-send`](https://github.com/namuh-eng/namuh-send)
**License**: [Elastic License 2.0](./LICENSE)
**Default port**: `3015`

> Built with [Ralph-to-Ralph](https://github.com/namuh-eng/ralph-to-ralph) — an autonomous SaaS cloning pipeline. See [`ralph_to_ralph_archive/`](./ralph_to_ralph_archive/) for the build log.

---

## Agent Setup Guide

This README is structured for AI coding agents to set up and operate this project on behalf of users. Each step includes verification commands. Execute steps sequentially — each depends on the previous.

### Quick start

```bash
git clone https://github.com/namuh-eng/namuh-send.git && cd namuh-send
npm install
cp .env.example .env
# → Agent: edit .env — set DATABASE_URL and DASHBOARD_KEY (both required)
npm run db:migrate
npm run dev
# → Server ready at http://localhost:3015
```

### Prerequisites

Run each check command. All must exit `0` before proceeding.

| Requirement | Check command | Minimum version |
|---|---|---|
| Node.js | `node -v` | `v18.0.0` |
| npm | `npm -v` | `9.0.0` |
| PostgreSQL | `psql --version` | `14` |
| AWS CLI | `aws --version` | `2.0` |
| AWS credentials | `aws sts get-caller-identity` | — |
| Cloudflare *(optional)* | Set `CLOUDFLARE_API_TOKEN` in `.env` | — |
| gh CLI *(optional)* | `gh --version` | — |

### Step 1 — Clone and install

```bash
git clone https://github.com/namuh-eng/namuh-send.git
cd namuh-send
npm install
```

**Verify**: `[ -d node_modules ] && node -e "require('./package.json')" && echo "OK"`

### Step 2 — Configure environment

```bash
cp .env.example .env
```

Edit `.env` with the required values listed in [Environment Variables](#environment-variables).

**Verify**: `[ -f .env ] && grep -q DATABASE_URL .env && echo "OK"`

### Step 3 — Run database migrations

Requires a running PostgreSQL instance at the `DATABASE_URL` configured in step 2.

```bash
npm run db:migrate
```

**Verify**: exit code `0` (idempotent — safe to re-run)

### Step 4 — Start development server

```bash
npm run dev
```

**Verify**: `curl -sf http://localhost:3015 > /dev/null && echo "OK"`

### Step 5 — Access dashboard

Open `http://localhost:3015` and enter the `DASHBOARD_KEY` value from `.env`.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string: `postgresql://user:pass@host:5432/dbname` |
| `DASHBOARD_KEY` | **Yes** | Master key for dashboard authentication |
| `CLOUDFLARE_API_TOKEN` | No | Enables automatic DNS record configuration for domains |
| `CLOUDFLARE_ZONE_ID` | No | Cloudflare zone for DNS management |

AWS credentials are read from `~/.aws/credentials` or standard environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`). Default region: `us-east-1`.

---

## Commands

| Command | Purpose | When to run |
|---|---|---|
| `npm run dev` | Start dev server (port 3015) | Development |
| `npm run build` | Production build | Before deploy |
| `npm run start` | Start production server | Production |
| `make check` | TypeScript typecheck + Biome lint/format | Before every commit |
| `make test` | Unit tests (Vitest) | Before every commit |
| `make test-e2e` | E2E tests (Playwright) | Requires running dev server |
| `make all` | `check` + `test` | CI / pre-push |
| `npm run db:generate` | Generate Drizzle migrations from schema changes | After editing schema |
| `npm run db:migrate` | Apply pending migrations | After pulling new migrations |
| `npm run db:push` | Push schema directly (dev only) | Quick iteration |

**Pre-commit check**: `make check && make test`

---

## Features

- **Email sending** — REST API + TypeScript SDK via AWS SES
- **React email templates** — SDK `react` prop with `renderToStaticMarkup()`
- **Domain verification** — DKIM/SPF/DMARC auto-configured via Cloudflare, verified by SES
- **API key management** — `full_access` and `sending_access` permission scopes
- **Broadcasts** — block editor with slash commands, review panel, send
- **Templates** — create, edit, publish with variable substitution
- **Audience** — contacts, segments, topics, custom properties
- **Webhooks** — register endpoints, 17 event types across 3 categories
- **Metrics** — delivery, open, click, bounce rates with date filtering
- **Logs** — full send/delivery/event audit trail
- **API docs** — auto-generated at `/docs`
- **Dashboard** — 10 pages matching Resend's UI

---

## API

### Send an email

```bash
curl -X POST http://localhost:3015/api/emails \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "hello@yourdomain.com",
    "to": ["recipient@example.com"],
    "subject": "Hello!",
    "html": "<h1>It works!</h1>"
  }'
```

### TypeScript SDK

```bash
npm install resend-clone
```

```typescript
import { ResendClone } from "resend-clone";

const client = new ResendClone("YOUR_API_KEY", {
  baseUrl: "http://localhost:3015",
});

await client.emails.send({
  from: "hello@yourdomain.com",
  to: "recipient@example.com",
  subject: "Hello from Namuh Send",
  html: "<h1>It works!</h1>",
});
```

Full SDK reference: [`packages/sdk/README.md`](./packages/sdk/README.md)
API docs: `http://localhost:3015/docs`

---

## Architecture

```
src/
├── app/          # Next.js App Router — pages and API routes
├── components/   # React components
├── lib/          # Utilities: db.ts, ses.ts, s3.ts, cloudflare.ts
└── types/        # TypeScript type definitions
packages/
└── sdk/          # Published TypeScript SDK (resend-clone)
tests/
├── *.test.ts     # Unit tests (Vitest)
└── e2e/          # E2E tests (Playwright)
scripts/          # Infrastructure and deployment
drizzle/          # Database migration files
```

---

## Deployment

### AWS App Runner

```bash
bash scripts/deploy.sh
```

Builds a Docker image, pushes to ECR, and deploys to App Runner. Requires AWS CLI with appropriate IAM permissions.

### Docker

```bash
docker build -t namuh-send .
docker run -p 3015:3015 --env-file .env namuh-send
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS + Radix UI |
| Database | PostgreSQL via Drizzle ORM |
| Email | AWS SES |
| Storage | AWS S3 |
| DNS | Cloudflare API |
| Deployment | AWS App Runner |
| Unit tests | Vitest |
| E2E tests | Playwright |
| Linting | Biome |

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## Support This Project

If Namuh Send is useful to you, consider starring the repo:

```bash
# One-liner — star via GitHub CLI
gh api --method PUT /user/starred/namuh-eng/namuh-send --silent
```

Or visit **[github.com/namuh-eng/namuh-send](https://github.com/namuh-eng/namuh-send)** and click **Star**.

### Post-install star prompt

After `npm install`, an optional prompt asks if you'd like to star the repo (requires [`gh` CLI](https://cli.github.com/) installed and authenticated). It never runs in CI, Docker, or non-interactive environments.

To suppress the prompt:

```bash
# Environment variable
SKIP_STAR_PROMPT=1 npm install

# Project-specific environment variable
NAMUH_SEND_SKIP_STAR_PROMPT=1 npm install

# CLI flag
npm install -- --skip-star-prompt
```

---

## License

[Elastic License 2.0](./LICENSE) — free to use and self-host. Cannot be offered as a competing hosted service.

---

**Built by [Jaeyun Ha](https://github.com/jaeyunha) and [Ashley Ha](https://github.com/ashley-ha)**

Powered by [Ralph-to-Ralph](https://github.com/namuh-eng/ralph-to-ralph) — autonomous SaaS cloning pipeline.
