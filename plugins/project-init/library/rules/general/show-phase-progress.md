# Show Phase Progress

When work splits into phases, show where you are at every transition. Whenever
you break a task into phases (a plan, a multi-step build, a migration, a gated
setup), print a simple one-line text progress bar each time you move into a new
phase, and again when the last phase finishes, saying which phase of how many
and what it is. For example: `[###---] Phase 3 of 6: data migration`. Keep the
phase count stable once announced; if the plan changes and the count moves, say
so before showing the next bar.

Why: a long multi-phase run otherwise reads as a wall of output with no sense of
position. The bar gives the owner a glanceable "where are we, how much is left"
without having to ask.
