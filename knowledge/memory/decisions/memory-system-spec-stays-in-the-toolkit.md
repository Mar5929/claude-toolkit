---
source: owner-paraphrase
date: 2026-08-14
session: unavailable
tags:
  - memory-system
---

# The memory-system spec stays in the toolkit, not in projects

`knowledge/specs/memory-system.md` is the build authority for agents changing
the second-brain plugin in this repository; adopting projects receive only the
built skills and never a copy of the spec.

On 2026-08-14 an audit found the `remember` skill pointing adopting projects
at `knowledge/specs/memory-system.md` as "the authority when the adopting
project has it," a file the toolkit never ships, so no project could ever have
it. Two fixes were possible: ship the spec as a template into every project, or
keep it toolkit-only and reword the pointer. Mike chose toolkit-only: the spec
is where building grounds itself, the skills are the built product, and copying
25 KB of policy into every project would duplicate meaning without loading it
at a useful moment. The harness now checks the six property names in both the
spec and the `remember` skill so the two necessary copies cannot drift on the
field vocabulary.
