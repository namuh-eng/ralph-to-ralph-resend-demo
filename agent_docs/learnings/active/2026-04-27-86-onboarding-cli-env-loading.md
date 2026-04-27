---
date: 2026-04-27
issue: "#86"
type: pattern
promoted_to: null
---

## Host-run seed scripts need explicit `.env` loading

**What:** `tsx scripts/seed.ts` did not automatically read `.env`, so contributor onboarding could fail even after copying `.env.example`.

**Why:** Next.js loads `.env` for the app runtime, but standalone host-run scripts do not inherit that behavior automatically.

**Fix:** Load `.env` explicitly inside the script entry point (`process.loadEnvFile?.(".env")`) or export the variables before invoking the script.
