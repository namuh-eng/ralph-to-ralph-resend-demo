---
date: 2026-04-28
issue: 70
type: pattern
promoted_to: null
---

## Ignore repo postinstall scripts in minimal bundle Docker builds

**What:** The standalone ingester Docker build failed when `bun install` ran the repo-level `postinstall` hook before `scripts/install-git-hooks.mjs` had been copied into the image build context.
**Why:** Small service-specific Dockerfiles often copy only the dependency manifests and package sources before install. Repo-global setup hooks can break those minimal stages even when the runtime bundle itself does not need the hook.
**Fix:** For bundle-only service images, run `bun install --ignore-scripts` in the build stage unless the image actually requires the postinstall side effects.
