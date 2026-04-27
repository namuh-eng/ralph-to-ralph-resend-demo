<p align="center">
  <h1 align="center">Namuh Send</h1>
  <p align="center">
    Open-source email infrastructure for developers.
    <br />
    Send transactional emails, manage domains, build broadcasts — all self-hosted.
  </p>
  <p align="center">
    <a href="https://github.com/namuh-eng/namuh-send/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-ELv2-blue" alt="License" /></a>
    <a href="https://github.com/namuh-eng/namuh-send/stargazers"><img src="https://img.shields.io/github/stars/namuh-eng/namuh-send?style=social" alt="GitHub Stars" /></a>
    <a href="https://github.com/namuh-eng/namuh-send/issues"><img src="https://img.shields.io/github/issues/namuh-eng/namuh-send" alt="Issues" /></a>
  </p>
</p>

<p align="center">
  <a href="#one-click-deploy">Deploy</a> ·
  <a href="#features">Features</a> ·
  <a href="#api-quickstart">API</a> ·
  <a href="#self-hosting">Self-Hosting</a> ·
  <a href="./CONTRIBUTING.md">Contributing</a>
</p>

<p align="center">
  <img src="docs/assets/screenshot-dashboard.png" alt="Namuh Send Dashboard" width="800" />
</p>

---

## What is Namuh Send?

Namuh Send is a **self-hostable email platform** that gives you the same developer experience as Resend — REST API, TypeScript SDK, React email templates, domain verification, webhooks, and a full dashboard — running on your own infrastructure.

**Use it if you want:**
- Full control over your email infrastructure
- No per-email pricing — send as much as your SES quota allows
- A drop-in Resend-compatible API for your existing code
- An admin dashboard for domains, templates, broadcasts, and analytics

## One-Click Deploy

The fastest way to get Namuh Send running:

```bash
git clone https://github.com/namuh-eng/namuh-send.git
cd namuh-send
cp .env.example .env
# Edit .env — set DASHBOARD_KEY (required); AWS credentials are only needed for real email sending
docker compose up -d
```

That's it. Open **http://localhost:3015** and enter your dashboard key.

> The `migrate` service runs database migrations automatically on first boot.

## Features

- **REST API** — Send emails via a simple POST request with API key auth
- **TypeScript SDK** — [`namuh-send`](./packages/sdk) npm package with full type safety
- **React Email Templates** — Pass React components via the SDK's `react` prop
- **Domain Verification** — DKIM, SPF, DMARC auto-configured via Cloudflare DNS
- **API Key Management** — `full_access` and `sending_access` permission scopes
- **Broadcasts** — Block editor with slash commands, audience targeting, review panel
- **Templates** — Create, edit, publish with variable substitution (`{{name}}`)
- **Audience** — Contacts, segments, topics, custom properties
- **Webhooks** — Register endpoints for 17 event types (delivered, bounced, opened, etc.)
- **Metrics** — Delivery, open, click, bounce rates with date range filtering
- **Logs** — Full send/delivery/event audit trail
- **API Docs** — Auto-generated interactive docs at `/docs`
- **Dashboard** — 10-page admin UI with dark mode

## API Quickstart

### Send an email

```bash
curl -X POST http://localhost:3015/api/emails \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "hello@yourdomain.com",
    "to": ["recipient@example.com"],
    "subject": "Hello from Namuh Send",
    "html": "<h1>It works!</h1>"
  }'
```

Open `http://localhost:3015/docs` for the full local API reference.

### TypeScript SDK

```bash
bun add namuh-send
```

```typescript
import { NamuhSend } from "namuh-send";

const client = new NamuhSend("YOUR_API_KEY", {
  baseUrl: "https://your-deployment.example.com",
});

await client.emails.send({
  from: "hello@yourdomain.com",
  to: "recipient@example.com",
  subject: "Hello from Namuh Send",
  html: "<h1>It works!</h1>",
});
```

Full SDK docs: [`packages/sdk/README.md`](./packages/sdk/README.md)

## Self-Hosting

### Requirements

- Docker & Docker Compose
- AWS account with SES access (for sending emails)
- *(Optional)* Cloudflare account (for automatic DNS record setup)

### Docker Compose (recommended)

```bash
git clone https://github.com/namuh-eng/namuh-send.git
cd namuh-send
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Required
DASHBOARD_KEY=your-secret-key          # Generate: node -e "console.log(crypto.randomUUID())"

# Required for sending emails
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1

# Optional
POSTGRES_PASSWORD=your-db-password     # Default: namuh
POSTGRES_PORT=5432                     # Change this and DATABASE_URL together if 5432 is taken
PORT=3015                              # Default: 3015
CLOUDFLARE_API_TOKEN=your-cf-token     # For auto DNS setup
CLOUDFLARE_ZONE_ID=your-zone-id
S3_BUCKET_NAME=your-bucket             # For email attachments
```

`.env.example` keeps `DATABASE_URL` on `localhost` for host-run commands like `bun run dev` and `bun run db:push`. Docker Compose injects its own internal `postgres` hostname for the containerized app and migration services.

Start everything:

```bash
docker compose up -d
```

This starts PostgreSQL, runs migrations, and launches the app. Open **http://localhost:3015**.

### Manual Setup

If you prefer running without Docker (requires [Bun](https://bun.sh)):

```bash
git clone https://github.com/namuh-eng/namuh-send.git
cd namuh-send
bun install
cp .env.example .env
# Edit .env — set DASHBOARD_KEY (required). Leave DATABASE_URL as localhost unless you're using another Postgres instance.
bun run db:push
bun run db:seed          # Optional: creates sample data
bun run dev              # Development (port 3015)
# or
bun run build && bun start  # Production
```

To suppress the optional GitHub star prompt during install, use `SKIP_STAR_PROMPT=1 bun install`.

### AWS SES Sandbox

New AWS accounts start in SES **sandbox mode** — emails can only be sent to verified addresses. To send to anyone:

1. Verify a sender domain in the Namuh Send dashboard
2. Request production access in [AWS SES Console](https://console.aws.amazon.com/ses/) → Account dashboard → Request production access

### Production Deployment

For production, we recommend:

- **Database**: Use a managed PostgreSQL (AWS RDS, Supabase, Neon, etc.) instead of the Docker Compose Postgres
- **Reverse proxy**: Put Nginx or Caddy in front for TLS termination
- **Secrets**: Store credentials in your cloud provider's secrets manager

The included `Dockerfile` produces an optimized multi-stage build suitable for any container platform (AWS App Runner, Google Cloud Run, Fly.io, Railway, etc.):

```bash
docker build -t namuh-send .
docker run -p 3015:8080 --env-file .env namuh-send
```

## Architecture

```
src/
├── app/          # Next.js App Router — pages and API routes
├── components/   # React components (dashboard UI)
├── lib/          # Core services: db, ses, s3, cloudflare
└── types/        # TypeScript type definitions
packages/
└── sdk/          # Published TypeScript SDK (namuh-send)
tests/
├── *.test.ts     # Unit tests (Vitest)
└── e2e/          # E2E tests (Playwright)
drizzle/          # Database migration files
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS + Radix UI |
| Database | PostgreSQL + Drizzle ORM |
| Email | AWS SES |
| Storage | AWS S3 |
| DNS | Cloudflare API |
| Tests | Vitest + Playwright |
| Linting | Biome |

## Development

For local contributor onboarding, use the same Docker-backed path as [CONTRIBUTING.md](./CONTRIBUTING.md):

```bash
cp .env.example .env
make setup    # ensures DASHBOARD_KEY exists, starts Postgres, installs deps, pushes schema, seeds DB
make dev      # http://localhost:3015
```

`make setup` uses the host-machine `DATABASE_URL` from `.env` (`localhost` by default). Docker Compose app and migration containers use their own internal `postgres` hostname automatically.
`bun install` also installs the repo's versioned Git hooks automatically by setting `core.hooksPath` to `.githooks`.

```bash
bun run hooks:install  # optional manual reinstall if you used --ignore-scripts
bun run check          # runs the same change-scoped push guardrail used on pre-push
make check             # full repo typecheck + lint
make test              # Unit tests
make test-e2e          # E2E tests (requires dev server)
make all               # Everything
```

Local guardrails:

- `pre-commit` runs Biome on staged JS/TS/JSON/CSS/Markdown files for quick feedback.
- `pre-push` runs `bun run check`, which checks only the files changed from `origin/main` and blocks the push if those changed files fail lint or typecheck.

`make check` still runs the full repo validation. The push hook stays change-scoped because the current upstream branch still has unrelated legacy lint/typecheck failures outside this PR's scope.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full development guide.

## Roadmap

- [ ] SMTP relay support (send without AWS SES)
- [ ] Webhook signature verification
- [ ] Email scheduling
- [ ] Multi-user / team support
- [ ] Built-in analytics (opens, clicks) without external dependencies

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions and guidelines.

## License

[Elastic License 2.0](./LICENSE) — free to use, modify, and self-host. The only restriction: you cannot offer Namuh Send as a hosted email service to third parties.

---

<p align="center">
  Built by <a href="https://github.com/jaeyunha">Jaeyun Ha</a> and <a href="https://github.com/ashley-ha">Ashley Ha</a>
</p>
