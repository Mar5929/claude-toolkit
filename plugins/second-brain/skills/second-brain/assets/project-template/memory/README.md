# Durable project memory

This folder routes durable knowledge that is not authoritative product
behavior.

- `context/`: bounded current context and stable background
- `decisions/`: architectural and product decisions
- `knowledge/`: verified implementation knowledge and recurring failure modes
- `references/`: stable pointers to approved source material
- `domain/`: terminology and source-authority rules
- `operations/`: deployment, recovery, environment, and safety knowledge

Task status and temporary investigation notes do not belong here. Git files are
canonical. `memory/.cache/` contains only disposable generated artifacts.

Secret-pattern checks are limited guardrails, not complete detection. A passing
scan never makes this folder an approved place for credentials or tokens.
