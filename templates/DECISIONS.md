# Architecture Decision Records (ADRs)

This file documents the significant architectural and technical decisions made in this project, along with the context and rationale behind each one.

## Template

Copy the block below when adding a new ADR.

```
## ADR-NNN: <Short Title>

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-NNN
**Deciders:** <!-- @username, @username -->

### Context
<!-- What is the situation that forces a decision to be made? -->

### Decision
<!-- What was decided? -->

### Consequences
<!-- What are the positive and negative outcomes of this decision? -->
```

---

## ADR-001: Use This Template Repository

**Date:** <!-- YYYY-MM-DD -->
**Status:** Accepted
**Deciders:** <!-- @username -->

### Context

Projects benefit from consistent documentation and a shared vocabulary for discussing decisions.
Using a template makes it easy to bootstrap new projects with the right scaffolding in place.

### Decision

Adopt the `claude-toolkit` templates for CLAUDE.md, BACKLOG.md, DECISIONS.md, CHANGELOG.md,
REQUIREMENTS.md, and TECHNICAL_SPEC.md as the standard starting point for new projects.

### Consequences

- **Positive:** Faster project setup, consistent documentation across repos, easier for Claude Code to understand project context.
- **Negative:** Templates must be kept up to date as conventions evolve.
