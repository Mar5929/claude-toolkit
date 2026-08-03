Follow and adhere to @CLAUDE.md

## Log every piece of work on the GitHub board

**Work tracking.** Work items for this repo live on the `Claude-Toolkit-Project`
board on GitHub, which is connected to this repository. Every piece of work is
logged there as an issue before it is built, and nothing is built until a
refinement session has filled in the six-part spec.

Those rules are stated once, in
`plugins/project-init/skills/project-init/references/general-rules/spec-before-you-build.md`.
Read it. It is the canonical statement and it governs this repo as well as every
project the toolkit sets up. Do not restate the six parts here; if they need to
change, change them there.

What is specific to this repo, on top of that rule:

- Move the issue to `Refining` when the refinement session starts.
- When the session ends and the spec is agreed, add the `refined` label and move
  the issue to `Ready`. Work may start then, and not before.
- The spec is written into the GitHub issue body, since the board holds the work
  and this repo has no `work-items/` folder.
