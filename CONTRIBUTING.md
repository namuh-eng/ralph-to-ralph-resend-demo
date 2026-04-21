# Contributing

Thanks for your interest in contributing to Namuh Send!

## Setup

**Quick start** (requires Docker + Node.js):

```bash
git clone https://github.com/namuh-eng/namuh-send.git
cd namuh-send
npm install
make setup    # starts Postgres, creates .env, runs migrations, seeds DB
make dev      # http://localhost:3015
```

The seed prints an API key to the console — save it. Then verify everything works:

```bash
# Check the app + database are healthy
curl http://localhost:3015/api/health

# Send a test email (replace YOUR_API_KEY with the key from seed)
curl -X POST http://localhost:3015/api/emails \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "hello@example.com",
    "to": ["test@example.com"],
    "subject": "Hello from namuh-send",
    "text": "It works!"
  }'
```

Without AWS credentials, emails are logged to the console instead of sent — the full API flow still works for development.

<details>
<summary>Manual setup (without make setup)</summary>

1. Copy `.env.example` to `.env` and set `DASHBOARD_KEY` (see the file for a generation command).
2. Start Postgres: `docker compose up -d` (or point `DATABASE_URL` at your own instance).
3. Push schema and seed: `npm run db:push && npm run db:seed`
4. Start dev server: `npm run dev`

</details>

## Development Commands

| Command | Purpose |
|---|---|
| `make check` | TypeScript typecheck + Biome lint/format |
| `make test` | Unit tests (Vitest) |
| `make test-e2e` | E2E tests (Playwright, requires dev server) |
| `make all` | Run everything |

Run `make check && make test` before opening a PR.

## Ports

- **3015** — dev server (`npm run dev`)
- **8080** — production Docker image (internal)

## AWS SES (optional for local dev)

AWS credentials are **not required** for local development — without them, emails are logged to the console and the full API flow still works. When you're ready to actually send emails, configure `~/.aws/credentials` via `aws configure`.

New AWS accounts start in SES **sandbox mode** — you can only send to verified addresses. This is an AWS limitation, not a Namuh Send bug. See [AWS SES docs](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html) to request production access.

## Code Style

- **Biome** handles formatting — `make check` auto-reports issues, `npm run lint:fix` fixes them
- **TypeScript strict mode** — no `any`, no type assertions without justification
- Every feature needs at least one unit test (Vitest) and one E2E test (Playwright)

## Pull Requests

- Keep PRs focused — one feature or fix per PR
- Include tests for any new functionality
- Run `make check && make test` before submitting
- Describe the "why" in your PR description, not just the "what"
