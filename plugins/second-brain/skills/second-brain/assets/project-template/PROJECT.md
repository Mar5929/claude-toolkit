# Project knowledge router

Read this file first on every agent surface.

- Desired product and system behavior: `specs/`
- Current briefing: `memory/context/current.md`
- Architecture decisions: `memory/decisions/`
- Implementation knowledge: `memory/knowledge/`
- Source references: `memory/references/`
- Domain terms and authority rules: `memory/domain/`
- Operational knowledge: `memory/operations/`
- Configuration and path authorities: `memory/config.yaml`

Use `node tools/memory/validate.mjs` before relying on project knowledge.
Use `node tools/memory/search.mjs "query"` for bounded, pointer-first search.
Git files are authoritative. Generated indexes are disposable.

Secret-pattern checks are limited guardrails, not complete detection. Never
store credentials, private keys, access tokens, or connection secrets here.
