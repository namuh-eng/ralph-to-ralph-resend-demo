# Pre-configured Setup — DO NOT recreate or reinstall

Everything listed here is already installed and configured. Do NOT reinstall, reconfigure, or overwrite these.

## Tooling
- **Next.js 16** — `next.config.js` (standalone output for Docker, Turbopack)
- **TypeScript** — `tsconfig.json` (strict mode, `@/` path aliases)
- **Tailwind CSS** — `tailwind.config.ts` + `postcss.config.js` (dark mode, src paths)
- **Biome** — `biome.json` (lint + format, replaces ESLint/Prettier)
- **Vitest** — `vitest.config.ts` (jsdom, path aliases, `tests/*.test.ts`)
- **Playwright** — `playwright.config.ts` + Chromium installed (`tests/e2e/*.spec.ts`)
- **Drizzle ORM** — `drizzle.config.ts` + `src/lib/db/index.ts` + `src/lib/db/schema.ts`
- **Docker** — `Dockerfile` (multi-stage, standalone) + `.dockerignore`

## Commands (use these, don't create new ones)
- `make check` — typecheck + Biome lint/format
- `make test` — unit tests (Vitest)
- `make test-e2e` — E2E tests (Playwright, needs dev server)
- `make all` — check + test
- `make fix` — auto-fix lint/format issues
- `make db-push` — push Drizzle schema to Postgres
- `npm run dev` — dev server on port **3015**
- `npm run build` — production build

## AWS Infrastructure (already provisioned)
- **RDS Postgres** — `resend-clone-db` in us-east-1, connection string in `.env` as `DATABASE_URL`
- **AWS SES** — production mode (can send to anyone), `foreverbrowsing.com` domain verified with DKIM
- **S3** — bucket name in `.env` as `S3_BUCKET_NAME`, with prefixes: `attachments/`, `templates/`, `inbound/`
- **ECR** — `resend-clone` repository (URI in deploy script, not committed)
- **AWS CLI** — configured via `~/.aws/credentials`, use `us-east-1` for SES

## Cloudflare DNS
- **API Token** — in `.env` as `CLOUDFLARE_API_TOKEN` (Edit zone DNS permission)
- **Zone** — `foreverbrowsing.com`, zone ID in `.env` as `CLOUDFLARE_ZONE_ID`
- Use Cloudflare REST API to auto-add DNS records for domain verification

## Project Structure (already scaffolded)
```
src/app/           — Next.js App Router (layout.tsx, page.tsx, globals.css)
src/app/api/       — API routes (you create these)
src/components/    — React components (you create these)
src/lib/           — Utilities and clients
src/lib/db/        — Drizzle ORM (index.ts + schema.ts ready)
src/types/         — TypeScript types (you create these)
tests/             — Unit tests (Vitest)
tests/e2e/         — E2E tests (Playwright)
packages/sdk/      — SDK package (you create this)
screenshots/inspect/ — Original product screenshots
screenshots/build/   — Build verification screenshots
screenshots/qa/      — QA evidence screenshots
scripts/           — Infrastructure and deploy scripts
```

## .env Contents
- `DATABASE_URL` — Postgres connection string
- `CLOUDFLARE_API_TOKEN` — Cloudflare DNS API
- `CLOUDFLARE_ZONE_ID` — foreverbrowsing.com zone
- `DASHBOARD_KEY` — master key for dashboard auth (set when needed)

## Target Product Login (if session expires)
If the target product (e.g., resend.com) logs you out during inspection:
- Use Ever CLI to log back in: `ever click` on sign-in fields, `ever input` credentials, submit.

## Port
Dev server runs on **3015**. Do not change this.
