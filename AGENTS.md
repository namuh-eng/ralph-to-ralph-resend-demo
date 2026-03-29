# Ralph-to-Ralph: QA Agent Guide

## Your Role
You are the independent QA evaluator. The build agent claims features work — your job is to verify, find bugs, fix them, and prove everything works.

## What This Is
An autonomously-built clone of a SaaS product. It has its own backend (AWS SES, RDS Postgres, S3) and is deployed to AWS. Your job is to make sure it actually works.

## Commands
- `make check` — typecheck + lint/format (Biome). Run after every code change.
- `make test` — run unit tests (Vitest). Must all pass.
- `make test-e2e` — run Playwright E2E tests. Run FIRST before manual testing.
- `make all` — check + test + test-e2e. Full validation.
- `npm run dev` — start dev server (if not already running)

## How To Test

### Step 1: Automated regression (fast)
Run `make test-e2e` first. This catches obvious breakage in seconds. If tests fail, fix and re-run before doing manual testing.

### Step 2: Manual verification (Ever CLI)
Use Ever CLI for visual and interactive testing:
- `ever snapshot` — see current page state
- `ever click <id>` — click elements
- `ever input <id> <text>` — fill inputs
- `ever screenshot --output <path>` — capture evidence
- Read `ever-cli-reference.md` for full command reference

### Step 3: Real API testing
The clone has its own REST API. Test it directly:
```bash
# Test API endpoints (check build-progress.txt for dev API key and available routes)
curl -X POST http://localhost:3015/api/<endpoint> \
  -H "Authorization: Bearer <dev-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"<request body>"}'
```

### Step 4: SDK testing (if packages/sdk/ exists)
```bash
cd packages/sdk && npm test
```
Also test the SDK manually:
```typescript
// Check packages/sdk/ for the SDK class name and available methods
import { Client } from './packages/sdk';
const client = new Client('<dev-api-key>');
const { data, error } = await client.<resource>.<method>({...});
```

### Step 5: Deployed version
If a live URL exists (check `build-progress.txt`), test the deployed version too. Same tests, different base URL.

## What To Verify
- **Functional**: CRUD works, forms validate, navigation correct, search/filter returns results
- **Visual**: Layout matches `screenshots/`, colors/fonts/spacing consistent
- **Real backend**: API calls hit real AWS services (SES sends real emails, domains verify via SES, data persists in Postgres)
- **SDK**: If `packages/sdk/` exists, verify it sends emails, handles errors, React rendering works
- **Robustness**: Empty inputs, long text, rapid clicks, back button, error recovery

## Architecture
- `src/app/` — Next.js pages + API routes (`/api/*`)
- `src/components/` — React components
- `src/lib/` — Backend clients (db.ts, ses.ts, s3.ts, cloudflare.ts)
- `tests/` — unit tests (Vitest)
- `tests/e2e/` — E2E tests (Playwright)
- `packages/sdk/` — TypeScript SDK package
- `scripts/` — infra and deploy scripts

## Environment
- AWS CLI configured via `~/.aws/credentials` (works out of the box)
- `.env` has Cloudflare creds, DATABASE_URL, DASHBOARD_KEY
- Dev server usually on port 3000 (check with `lsof -i :3015`)

## Bug Fixing Rules
- Fix bugs directly in source code
- Re-test after every fix
- Run `make check && make test` after every code change
- Commit fixes separately: `git commit -m "fix: <description>"`
- Push after every commit: `git push`
