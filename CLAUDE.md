# Ralph-to-Ralph: Autonomous Product Cloner

## What This Is
A three-phase autonomous system that clones any SaaS product from just a URL.
Phase 1: Inspect (Claude + Ever CLI) → Phase 2: Build (Claude + Playwright E2E) → Phase 3: QA (Codex + Ever CLI)

## Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack) — pre-installed, do not change
- **Language**: TypeScript strict mode, no `any` types
- **Styling**: Tailwind CSS
- **UI Primitives**: Radix UI (or whatever matches the target product)
- **Database**: RDS Postgres via Drizzle ORM
- **Email**: AWS SES (`@aws-sdk/client-sesv2`)
- **Storage**: AWS S3
- **DNS**: Cloudflare API (auto-configure DNS records)
- **Deployment**: AWS App Runner
- **Unit Tests**: Vitest
- **E2E Tests**: Playwright (pre-configured)
- **Linting**: Biome (pre-configured)

## Commands
- `make check` — typecheck + lint/format (Biome)
- `make test` — run unit tests (Vitest)
- `make test-e2e` — run E2E tests (Playwright, requires dev server)
- `make all` — check + test + test-e2e
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run db:generate` — generate Drizzle migrations
- `npm run db:migrate` — run Drizzle migrations

## Quality Standards
- TypeScript strict mode, no `any` types
- Every feature must have at least one unit test AND one Playwright E2E test
- Run `make check && make test` before every commit
- Small, focused commits — one feature per commit

## Architecture
- `src/` — source code
- `src/app/` — Next.js App Router pages and API routes
- `src/components/` — React components
- `src/lib/` — utilities, helpers, API clients (db.ts, ses.ts, s3.ts, cloudflare.ts)
- `src/types/` — TypeScript types
- `tests/` — unit tests (Vitest)
- `tests/e2e/` — E2E tests (Playwright)
- `packages/sdk/` — TypeScript SDK npm package
- `scripts/` — infrastructure and deployment scripts

## Pre-configured (DO NOT reinstall or recreate)
- **Playwright** — `playwright.config.ts`, `tests/e2e/`, `npm run test:e2e`
- **Biome** — `biome.json`, fast lint + format
- **Makefile** — `make check`, `make test`, `make test-e2e`, `make all`
- **Drizzle** — `drizzle.config.ts`, `npm run db:generate`, `npm run db:migrate`

## Environment
- **AWS CLI** — pre-configured via `~/.aws/credentials`. `aws` commands and `@aws-sdk/*` packages work out of the box. Use `us-east-1` for SES.
- **`.env`** contains:
  - `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ZONE_ID` — Cloudflare DNS management
  - `DATABASE_URL` — Postgres connection string (set by preflight script)
  - `DASHBOARD_KEY` — master key for dashboard access
  - Target product API keys (for testing/comparing only, not for the clone's backend)

## Security — Secrets Management
- **NEVER hardcode passwords, tokens, or API keys** in scripts or source code
- **RDS master password** is stored in AWS Secrets Manager: `resend-clone/db/master-password` (region: `us-east-1`)
- To retrieve the DB password at runtime:
  ```bash
  aws secretsmanager get-secret-value --secret-id resend-clone/db/master-password --region us-east-1 --query SecretString --output text
  ```
- When provisioning or updating infrastructure, always pull secrets from Secrets Manager — never use inline defaults
- **`scripts/`** directory is gitignored (except `start.sh`) because it contains infra scripts with environment-specific values. These files live locally only — do not re-commit them

## Out of Scope — DO NOT build
- Login / signup / authentication (use API key auth wall instead)
- Paywalls, billing, subscription management
- Account settings, profile management
- OAuth / SSO integrations
- Payment processing
