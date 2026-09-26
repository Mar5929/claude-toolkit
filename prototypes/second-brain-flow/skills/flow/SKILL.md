---
name: flow
description: Explains the second-brain-flow `flow` command and shows the current workflow step. Use when unsure what step is active or which flow command to run.
allowed-tools: Bash(flow status)
---

This project runs its memory and work items through the `flow` command. The
command is on the Bash path while the second-brain-flow plugin is enabled.

- `flow status` prints the current workflow, the current step, what the step
  still needs, and the exact next command. Run it whenever you are unsure.
- `flow help` lists every command.
- `flow workflows` lists the workflows. `flow diagram <workflow>` prints one as
  a Mermaid diagram.

Rules that always hold:

- Each owner prompt starts the `turn` workflow. Choose a route with
  `flow route <route>` before using tools that change anything.
- Files under `memory/` and `work/` change only through `flow`. Direct edits
  are refused.
- Finish a step with `flow next`, adding `--decision <d>` when the step lists
  decisions. When a step waits for the owner, end your reply.

Current state:

!`flow status`
