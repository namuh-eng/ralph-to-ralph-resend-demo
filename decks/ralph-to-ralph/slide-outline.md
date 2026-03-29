# Ralph-to-Ralph — Ralphthon Seoul Mid-Presentation Outline

## Slide 1: Title
- **Ralph-to-Ralph** — Autonomous Product Cloning Loop
- Team: Jaeyun Ha & Ashley Ha
- GitHub: github.com/jaeyunha/ralph-to-ralph-prod

## Slide 2: Problem
- **Who:** Non-technical founders who want to build/clone a SaaS product
- **What:** They know exactly what to build — but can't build and launch it at production quality themselves
- **Pain:** Getting to production typically takes months or years, requires entire engineering teams, and costs significant money
- **Story:** A solo founder sees a product like Resend, knows customers want it, knows exactly which features to copy — but gets stuck because frontend, backend, infra, APIs, auth, deployment, and ops are too much for one person

## Slide 3: Solution
- **One sentence:** Ralph-to-Ralph clones real products end-to-end — from browser analysis to deployed production software you own
- **Key workflow (4 phases):**
  1. **Inspect** (Ralph Loop #1) — Ever CLI + Claude Opus analyzes the target URL → PRD.json + build-spec.md + sitemap + screenshots
  2. **Plan** — PRD.json + spec.md derived from the Inspect loop
  3. **Build** (Ralph Loop #2) — Claude Agent (Opus) → API Routes + Components, Tests (Vitest), AWS Infra (SES, RDS, S3)
  4. **QA / Verify** (Ralph Loop #3) — Codex Agents (parallel) → E2E via Ever CLI, Bug Fixes + Screenshots, Regression Tests
- **Include architecture diagram screenshot**

## Slide 4: Ralph Setup / Capability
- **AI agents & tools:**
  - Ever CLI (custom browser agent — foreverbrowsing.com) for inspection & E2E
  - Claude Opus powering Inspect + Build loops
  - Codex running parallel QA agents
- **Operating discipline:** Strict Watchdog Orchestrator — continuously monitors all Ralph loops, auto-restarts on failure, git commit+push, cron backup. Like keeping a train on the tracks.
- **Bug fix loop:** Bugs Found → Fix → Retest (up to 5 cycles)

## Slide 5: Current Progress
- Working Resend clone deployed to production
- Full end-to-end pipeline operational: URL in → deployed product out
