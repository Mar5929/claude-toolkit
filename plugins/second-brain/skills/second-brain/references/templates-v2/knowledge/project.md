---
schema_version: 2
project_id: replace-with-a-stable-project-id
project_root: .
subroots: []
privacy:
  level: standard
  external_transfer: denied
  third_party_personal: refused
profiles: []
# Optional. Delete or keep commented when the project has no work tracker.
# tracker:
#   adapter: github-project
#   project: Replace-With-The-Board-Name
# Optional. The boot brief budget defaults to 10240 bytes when this is absent.
# startup:
#   budget_bytes: 10240
---

# What this project is

Replace this draft with the owner-approved description of what the project is,
why it exists, what finished looks like, its main workstreams and boundaries,
who is involved, and where active work is tracked.

## About the front matter

These keys are the whole configuration surface. There is no separate settings
file.

- `project_id` is the stable identity used to scope pins, retrieval, and
  session-history searches. It never changes when the folder moves, and a
  machine path is never used as the identity.
- `project_root` and `subroots` set the physical scope. Only the owner changes
  them. An agent route that tries is refused.
- `privacy` records the approved boundary. A missing, unreadable, or unknown
  value is read as the most restrictive setting, which is `sensitive`,
  `denied`, and `refused`. Nothing outside this file widens the boundary.
- `profiles` lists optional domain profiles. An empty list is normal. A profile
  adds fields, routes, validation, and privacy warnings. It never weakens
  approval, provenance, authority, scope, or privacy.
- `tracker` is optional. Without it the project still works, and current state
  comes from `knowledge/current.md` alone.
- `startup.budget_bytes` is optional. Changing it runs a preflight that accepts
  the new figure only when the required boot brief still fits.
