# Automations MVP plan

Issue: #57
Base branch: `staging`
Spec pass date: 2026-04-28

## Source material

Expected behavior is grounded in the dashboard Automations docs under:

`/Users/jaeyunha/dev/namuh-send/harden-ralph/docs/dashboard/automations/`

Key docs used:

- `introduction.md` — automations are event-triggered email workflows; user flow is create automation, add trigger, define steps, send event, monitor runs.
- `trigger.md` — trigger is the first step; incoming custom events start every active automation with a matching trigger; events identify a contact by `contact_id`/`contactId` or `email`; event names cannot use the reserved `resend:` prefix.
- `delay.md` — delay pauses execution using a human-readable duration, with a documented maximum of 30 days.
- `send-email.md` — send_email uses a published template, optional variables, and optional `from`, `subject`, and `reply_to` overrides.
- `runs.md` — every trigger creates a run with status, timing, step details, and errors.
- `custom-events.md` — custom events can be defined with optional schema; if multiple enabled automations use the same event name, all should trigger.

## Current repo anchors

Automations are currently absent from the repo:

- no `src/app/api/automations/`
- no `src/app/api/events/`
- no `src/app/(dashboard)/automations/`
- no automation tables in `packages/core/src/db/schema.ts` or `src/lib/db/schema.ts`

Relevant existing patterns to reuse:

- API auth: `src/lib/api-auth.ts`
- API route style: `src/app/api/*/route.ts`
- validation style: `src/lib/validation/`
- dashboard routes: `src/app/(dashboard)/`
- sidebar navigation: `src/components/sidebar.tsx`
- list/detail UI patterns: `src/components/broadcasts-list.tsx`, `src/components/templates-list.tsx`, `src/components/webhooks-list.tsx`
- published templates: `templates` table and `src/app/api/templates/*`
- email send/template resolution: `src/app/api/emails/route.ts`, `src/lib/ses.ts`
- scheduled/background execution pattern: `src/lib/workers/scheduled-emails.ts`, `src/lib/workers/broadcast-sender.ts`, `src/app/api/internal/cron/process-scheduled/route.ts`
- SDK public client: `packages/sdk/src/index.ts`

## MVP boundary

The first sane runnable slice is deliberately linear:

```text
trigger -> delay -> send_email -> end
```

This boundary is enough to prove the core product promise without taking on the full visual builder or all advanced step semantics. It still requires real persistence, API contracts, event ingestion, a worker/runner, and enough dashboard UI to create and inspect the flow.

## Child issues and sequencing

1. #116 — `automations: schema and contract foundation`
   - Adds tables, migrations, repositories, and DTOs.
   - Must land first.
2. #117 — `automations: API and events ingestion`
   - Adds CRUD routes, runs routes, custom event routes, `POST /api/events/send`, and SDK client surface where public.
   - Depends on #116.
3. #118 — `automations: MVP runner on background jobs`
   - Executes the MVP path on the existing scheduled worker/cron pattern.
   - Depends on #116 and #117.
4. #119 — `automations: dashboard MVP and runs viewer`
   - Adds `/automations`, a linear builder, and runs/debug views.
   - Can begin after #116/#117; full E2E depends on #118.
5. #120 — `automations: post-MVP advanced step parity`
   - Tracks deferred documented behavior: condition, wait_for_event, contact_update, contact_delete, add_to_segment, richer custom event schemas, stop controls, metrics, and full canvas polish.
   - Must not block #116-#119.

## Acceptance path for closing or narrowing #57

Keep #57 epic-only until #116-#119 prove this end-to-end path:

1. API creates an enabled automation with trigger, delay, send_email, and end.
2. `POST /api/events/send` with a matching event and contact identifier persists the event and creates a run.
3. The runner records a delay without sleeping/blocking, resumes after `next_step_at`, sends the published template email, and completes the run.
4. The dashboard can create or inspect the automation and view run status/details.
5. Unit tests cover schema/API/runner behavior and Playwright covers the dashboard MVP path.

After that, #57 can be narrowed to post-MVP parity or closed in favor of #120, depending on product preference.
