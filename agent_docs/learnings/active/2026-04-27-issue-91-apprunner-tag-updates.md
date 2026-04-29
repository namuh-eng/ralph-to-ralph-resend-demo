---
date: 2026-04-27
issue: 91
type: decision
promoted_to: null
---

`scripts/deploy.sh` had been previously introduced but was no longer tracked because `.gitignore` ignored most of `scripts/`.

For App Runner services that already exist, the minimal safe fix was to read the current `Service.SourceConfiguration`, replace only `ImageRepository.ImageIdentifier`, and send that JSON back through `aws apprunner update-service`.

This avoids re-hardcoding the entire existing service source configuration during updates while still making tag-based deployments effective.
