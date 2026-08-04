# Show Phase Progress

When work splits into phases, show where you are at every transition. Whenever
you break a task into phases (a plan, a multi-step build, a migration, a gated
setup), print a simple one-line text progress bar each time you move into a new
phase, and again when the last phase finishes, saying which phase of how many
and what it is. Keep the phase count stable once announced; if the plan changes
and the count moves, say so before showing the next bar.

## Two shapes

**The one-line bar.** Use this at every transition. It is the minimum.

```
Phase 3 of 6  [███░░░]  now: data migration
```

**The full list.** Use this when you first lay the phases out, and any time the
owner asks where things stand. It shows the whole shape at once, which the
one-line bar cannot.

```
Progress: 2 of 6 done  [██░░░░]

✓ 1. Retrieve the metadata      (done)
✓ 2. Build the field inventory  (done)
▶ 3. Data migration             (we are here)
· 4. Cutover rehearsal
· 5. Cutover
· 6. Hypercare
```

Markers: `✓` done, `▶` current, `·` not started. One filled block per finished
phase.

Give each phase a short plain name saying what it does, never just "Phase 3".
Always show the current number and the total, so the finish line is visible.

## When not to

Single-step tasks, quick answers, and short back-and-forth. A bar for two steps
is noise.

## Why

A long multi-phase run otherwise reads as a wall of output with no sense of
position. The bar answers "where are we, how much is left" without the owner
having to ask, and the list form answers it for the whole job rather than the
current step.
