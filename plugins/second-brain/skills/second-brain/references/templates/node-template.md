---
id: TYPE-XXXX-short-slug          # STABLE unique id. dec-/know-/pref-/ses-/ent- prefix. Never reuse or rename.
type: decision                    # decision | knowledge | preference | session | entity
title: One-line human title
status: active                    # active | proposed | superseded | deprecated
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: []
confidence: high                  # high | medium | low
source: ""                        # where this came from (file, PR, conversation); optional but preferred
links:                            # typed edges to other node ids. Prefer specific types over relates-to.
  - relates-to: some-other-id
---

<!-- Body. Keep ONE node about ONE thing. Suggested shapes:

DECISION:
  **Context**: what forced the choice.
  **Decision**: what we chose (imperative, unambiguous).
  **Consequences**: what this makes true / forbids downstream.

KNOWLEDGE:
  How the thing works, where it lives in the code, the non-obvious parts,
  and above all WHY it exists. Knowledge nodes tied to specific files may
  add a covers: block (see the spec) so drift can be detected.

PREFERENCE:
  The owner's/project's standing preference and the reason behind it.

SESSION:
  What happened, what changed, what's next. Link the nodes it touched.
-->
