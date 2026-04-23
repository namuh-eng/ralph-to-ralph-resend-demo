# Learnings

This directory captures decisions, mistakes, and patterns as they happen.

## Structure

- `active/` — unprocessed entries (the inbox). Created by agents mid-flight, `/shipit`, or `/retro`.
- `archived/` — processed entries. Graduated to agent_docs/ or CLAUDE.md, moved here for history.

## Entry Format

One file per learning: `YYYY-MM-DD-{issue}-{short-title}.md`

```markdown
---
date: YYYY-MM-DD
issue: "#140"
type: decision | mistake | pattern
promoted_to: null
---

## Short title

**What:** What happened
**Why:** Why it matters (or root cause)
**Fix:** What to do about it (if applicable)
```

## Types

- **decision** — "we chose A over B because X" → promotes to relevant agent_docs/ file
- **mistake** — "we did Y and it broke because Z" → promotes to CLAUDE.md/AGENTS.md as a behavior rule
- **pattern** — "approach X works well for this kind of problem" → promotes to relevant agent_docs/ file
