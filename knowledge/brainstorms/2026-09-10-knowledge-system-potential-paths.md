# Knowledge system: potential paths to explore

Date: 2026-09-10
Source: Implementation suggestions separated from the knowledge-system PRD
after the owner's approval of the scope-review corrections on 2026-09-10.

These are exploratory ideas, not requirements, verified capabilities, or an
approved solution design. The [PRD](../prds/knowledge-system.md) owns required
behavior. A builder may replace or discard these ideas. First inspect existing
toolkit functionality and the supported harness's current documentation.

| Possible approach | Related requirements | What a design would need to establish |
| --- | --- | --- |
| Track which guidance was opened for the current operation | 2, 3 | Whether existing harness context is enough; reading a file does not prove its meaning was followed. |
| Use a native hook or an operation marker to check a required precondition | 2, 3, 9 | Which actions the harness actually exposes, what can be prevented, and how task switches and parallel sessions affect the check. |
| Check a save proposal's required fields before presenting it | 3, 20 | Whether existing validation suffices; format checks do not establish factual support or approval. |
| Use message events to refresh relevant guidance | 2, 3, 9 | Whether this improves the required moments without needless processing. Fixed phrases alone cannot identify every meaningful decision. |
| Use diagnostic counts when investigating missed checks | 3 | Whether the counts help locate a failure. They do not independently count every meaningful save opportunity or prove correct behavior. |
| Complete an approved save through a helper process | 1, 3, 9, 28 | Whether it is necessary and compatible with the simple-parts constraint. It must preserve exact approval, report failures, and avoid duplicate or concurrent writes. |
| Scope glossary guidance to where it is useful | 2, 7, 26 | The documented mechanism for the harness and whether existing project guidance already provides it. |
| Keep a compact startup map with links to details | 2, 26 | The information needed for reliable orientation on each harness. A guessed character budget is not evidence that guidance is sufficient. |

Earlier drafts referred to mechanisms used in other projects without supplying
current verification. Those references are not proof that an approach works
here. Verify suitability during solution design rather than treating this note
as an implementation checklist.
