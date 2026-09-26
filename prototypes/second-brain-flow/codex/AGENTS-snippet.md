# Codex: AGENTS.md section for second-brain-flow

Paste the section below into the project's `AGENTS.md`. Replace
`<plugin>` with the absolute path of the `second-brain-flow` folder. Codex runs
no hooks, so nothing enforces these steps. The `flow` command still refuses
steps out of order and still owns every memory and work-item write.

```markdown
## Second brain: the flow command

This project keeps memory in `memory/` and work items in `work/`. Both change
only through the flow command: `node <plugin>/bin/flow`. Never edit those
files directly.

At the start of every turn:

1. Run `node <plugin>/bin/flow turn --prompt "<the owner's message>"`.
2. Follow what it prints. Choose a route with `flow route <route>`.
3. After each step, run `flow status` and do what it says. Finish a step with
   `flow next`, adding `--decision <d>` when the step lists decisions.
4. When a step waits for the owner, end your reply.

Memory saves wait for the owner's approval (onboarding mode). To turn on
trusted mode, the owner sets `"mode": "trusted"` in `memory/config.json` by
hand. Do not change that file yourself. `flow memory undo` needs an owner
command that only the Claude Code hooks can check, so in Codex the owner
reverses a memory change with Git.

Codex has no background librarian agent. At the remember workflow's
`dispatch` step, do the librarian's work yourself: run `flow librarian next`,
then the `flow librarian apply ...` command it suggests, until no jobs are
waiting. Then run `flow next`.
