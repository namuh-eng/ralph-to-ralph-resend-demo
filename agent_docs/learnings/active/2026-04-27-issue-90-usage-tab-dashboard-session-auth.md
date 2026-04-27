---
date: 2026-04-27
issue: 90
type: decision
promoted_to: null
---

## Context
The Settings Usage tab fetched `/api/usage` with the user's API key from `localStorage`, but the route only accepted dashboard auth. The client also stored any JSON response without checking `res.ok`.

## Decision
Treat `/api/usage` like the dashboard metrics endpoint: accept either the dashboard bearer key or an authenticated dashboard session, and have the client fetch without injecting an API key header. On the client, ignore non-OK or malformed payloads so the usage state stays on the last known-good/default shape.

## Why
The settings page already runs behind dashboard session protection, so same-origin session auth is the correct default. This keeps the fix small, avoids widening API-key access for an internal route, and prevents `{ error: ... }` payloads from being rendered as quota data.
