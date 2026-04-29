---
date: 2026-04-28
issue: "#18"
type: decision
promoted_to: null
---

## Keep the first observability slice AWS-native and trace-context compatible

**What:** The observability baseline emits structured JSON logs plus CloudWatch EMF metrics from the API, queue publisher, worker, and SES ingester paths, and carries W3C/OpenTelemetry-compatible `traceparent`/`x-correlation-id` through background job payloads and SQS attributes.

**Why:** The immediate production need is AWS-visible request-to-worker debugging without adding a collector or non-AWS vendor dependency. CloudWatch can derive metrics from EMF stdout logs today, while the W3C trace carrier leaves room for a later OpenTelemetry SDK/exporter when the deployment has a collector destination.

**Fix:** Keep telemetry helpers centralized in `packages/core/src/observability/telemetry.ts`, use low-cardinality dimensions only, and route every log/metric through the sanitizer so email addresses/content are redacted or hashed by default.
