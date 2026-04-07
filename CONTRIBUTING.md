# Contributing

Thanks for your interest in contributing to Namuh Send!

## Setup

1. **Clone and install:**
   ```bash
   git clone https://github.com/namuh-eng/namuh-send.git
   cd namuh-send
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   Set `DASHBOARD_KEY` — generate one with `node -e "console.log(crypto.randomUUID())"`.

3. **Start Postgres:**
   ```bash
   docker compose up postgres -d
   ```
   The default `DATABASE_URL` in `.env.example` already points to it.
   
   If you prefer your own Postgres, update `DATABASE_URL` in `.env` instead.

4. **Run migrations and seed:**
   ```bash
   npm run db:push
   npm run db:seed
   ```
   The seed creates a sample API key (printed to console), a domain, and a contact.

5. **Start the dev server:**
   ```bash
   npm run dev
   # Open http://localhost:3015
   ```

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

## AWS SES Sandbox

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
