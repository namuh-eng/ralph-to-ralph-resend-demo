# Contributing

## Setup

1. Clone the repo and install dependencies:
   ```bash
   git clone https://github.com/namuh-eng/ralph-to-ralph-resend-demo
   cd ralph-to-ralph-resend-demo
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```

3. Set up the database and run migrations:
   ```bash
   npm run db:migrate
   ```

4. Start the dev server:
   ```bash
   npm run dev
   # App runs at http://localhost:3015
   ```

## Development

- `make check` — typecheck + lint/format (Biome)
- `make test` — unit tests (Vitest)
- `make test-e2e` — E2E tests (Playwright, requires dev server running)
- `make all` — run everything

Run `make check && make test` before opening a PR.

## Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript strict mode — no `any` types
- **Styling:** Tailwind CSS + Radix UI
- **Database:** Postgres via Drizzle ORM
- **Email:** AWS SES
- **Storage:** AWS S3

## Code style

- Biome handles formatting — run `make check` to auto-fix
- TypeScript strict mode — no `any`, no type assertions without justification
- Every feature needs at least one unit test (Vitest) and one E2E test (Playwright)

## Pull requests

- Keep PRs focused — one feature or fix per PR
- Include tests for any new functionality
- Run `make check && make test` and confirm both pass before submitting
