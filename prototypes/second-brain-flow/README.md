# second-brain-flow (prototype)

A second brain run by workflow definitions and a state machine inside Claude
Code. Each owner prompt starts a `turn` workflow. The agent picks a route, and
the engine then gives it one step at a time: load the item, ask the questions,
wait for the owner, save the answers, propose approval. The `flow` command owns
every write to `memory/` and `work/`, so the agent never has to remember a file
format. Hooks refuse actions taken out of order and hold a reply that would
leave a step unfinished. A background librarian agent does every memory write.
Work item: [#421](https://github.com/Mar5929/claude-toolkit/issues/421). Design:
[docs/designs/421-second-brain-flow.md](../../docs/designs/421-second-brain-flow.md).
Nothing here is shipped or registered in a marketplace.

## Try it

```bash
cd prototypes/second-brain-flow/demo
claude --plugin-dir ..
```

Then say "let's continue item 1". The demo is a fictional billing project,
Northwind Invoicing, with one work item in refinement (two requirements, one
open question) and three memory topics, one of them a `term`.

Run in place, the session also loads this repository's own `CLAUDE.md` and
rules, because Claude Code reads instruction files from parent folders. For a
clean trial, copy the demo out first:

```bash
cp -r prototypes/second-brain-flow/demo /tmp/northwind && cd /tmp/northwind
git init -q && claude --plugin-dir /path/to/claude-toolkit/prototypes/second-brain-flow
```

Things to try: "save this: the client's fiscal year starts in April", then
"yes, approve it"; `/second-brain-flow:trust on` (or `/trust on`), then
"remember that invoices are sent on the 5th of each month"; asking the agent to
edit `memory/FOCUS.md` with the Edit tool.

`node scripts/make-demo.mjs` rebuilds `demo/memory/` and `demo/work/` through
the engine. The demo's `.flow/` folder is Git-ignored.

## Workflows

| Workflow | Starts when |
| --- | --- |
| `turn` | Every owner prompt. Ends when the agent runs `flow route <route>`. |
| `chat` | A question or task that needs neither memory nor a work item. |
| `recall` | The answer depends on project history. |
| `resume-work` | The owner asks to continue an item. |
| `new-work` | The owner describes new work. |
| `refine` | Requirements interview for an item. |
| `work` | Build, test, or review work on an item. |
| `remember` | "save this", "remember this", "remember that", or the agent's own judgment. |
| `wrap-up` | End of a working session. |

The diagrams below come from `flow diagram resume-work` and `flow diagram
refine`, so they match the definitions in `workflows/`.

`resume-work`:

```mermaid
flowchart TD
  %% Continue a work item. Generated from workflows/resume-work.json
  begin((start)) --> s_load
  s_load["load<br/>auto: loadItemContext"]
  s_brief("brief<br/>agent")
  s_await_alignment[/"await-alignment<br/>owner answers"/]
  s_align("align<br/>agent")
  s_route_by_stage["route-by-stage<br/>auto: routeByStage"]
  s_refine[["refine<br/>runs refine"]]
  s_work[["work<br/>runs work"]]
  s_done((end))
  s_load --> s_brief
  s_brief --> s_await_alignment
  s_await_alignment --> s_align
  s_align -- aligned --> s_route_by_stage
  s_align -- not-aligned --> s_brief
  s_route_by_stage -- refine --> s_refine
  s_route_by_stage -- work --> s_work
  s_refine --> s_done
  s_work --> s_done
```

`refine`:

```mermaid
flowchart TD
  %% Requirements interview. Generated from workflows/refine.json
  begin((start)) --> s_ask
  s_ask("ask<br/>agent")
  s_await_answer[/"await-answer<br/>owner answers"/]
  s_capture("capture<br/>agent")
  s_decide("decide<br/>agent")
  s_propose_approval("propose-approval<br/>agent")
  s_await_approval[/"await-approval<br/>owner answers"/]
  s_record_approval("record-approval<br/>agent")
  s_done((end))
  s_ask -- asked --> s_await_answer
  s_ask -- none --> s_decide
  s_await_answer --> s_capture
  s_capture --> s_decide
  s_decide -- more --> s_ask
  s_decide -- ready --> s_propose_approval
  s_propose_approval --> s_await_approval
  s_await_approval --> s_record_approval
  s_record_approval -- approved --> s_done
  s_record_approval -- changes --> s_capture
```

Step kinds: `auto` (the engine runs a named action), `agent` (the agent works
and ends the step with `flow next`, which runs the step's exit checks first),
`owner` (the agent ends its reply; the owner's next prompt, routed `continue`,
moves it on), `call` (runs another workflow), `end`.

## Commands

| Command | What it does |
| --- | --- |
| `flow status` | Current workflow, step, instructions, and what the exit checks still need. |
| `flow route <route> [--item N]` | Chooses this turn's route. `continue` resumes a waiting workflow, and only after the owner has answered. |
| `flow next [--decision <d>]` | Finishes the current step after its exit checks pass. |
| `flow cancel` | Drops the current workflow. |
| `flow turn --prompt "..."` | Starts a turn by hand, for hosts without the prompt hook (Codex). |
| `flow item new/show/list/question/answer/requirement/progress/stage/approve` | Every work-item change. `question --ask Q2` asks an open question again; the same words never add a second question. |
| `flow memory recall/propose/pending/approve/reject/edit/log/undo` | Memory search, proposals, owner decisions, the change log, and undo. |
| `flow focus todo/upcoming/remove/none` | The agent-owned parts of `memory/FOCUS.md`. |
| `flow librarian next/apply/done` | Used by the memory-librarian agent. |
| `flow trust [set on/off]` | Shows the mode. `set` works only in a turn where the owner typed the trust command. |
| `flow diagram <workflow>`, `flow workflows` | Mermaid diagram of a workflow; the list of workflows. |
| `flow doctor [--fix]`, `flow init` | Checks memory and item files; sets up `memory/` and `work/` in the current folder. |

Claude Code puts `bin/` on the Bash path, so the agent runs `flow` as a bare
command. The `/second-brain-flow:flow` skill explains the command and prints
`flow status`.

## Onboarding mode and trusted mode

`memory/config.json` holds the mode. A project starts in onboarding mode: `flow
memory propose` writes a card to `memory/pending/`, the agent must show the
card's id in its reply, and `flow memory approve` is refused until the owner
sends a prompt after the card. The approved card becomes a librarian job.

In trusted mode, `flow memory propose` queues the librarian job at once, and
the agent starts the `memory-librarian` agent in the background and carries on.
`flow memory log` shows every write; `flow memory undo <change id>` reverses one.

Only the owner switches the mode, by typing `/second-brain-flow:trust on` or
`off`. The short form `/trust on` works too. The prompt hook sees the owner's
own text and allows `flow trust set` for that turn only.

## What is enforced and what is not

Enforced in Claude Code, by hooks and the engine:

- Before a turn is routed, only read-only tools, `Skill`, and `flow` commands run.
- Write, Edit, and shell writes to `memory/` and `work/` are refused for the
  main agent and every subagent. The refusal names the `flow` command to use.
- A prompt that starts with a save phrase must route `remember`.
- `flow trust set` needs the owner's trust command in the same turn.
- Memory approval, item approval, and the `done` stage need an owner prompt
  after the proposal. `continue` on a waiting owner step needs an owner prompt
  after the step started.
- A background task notification (a user message that starts with
  `<task-notification>`) is not treated as an owner prompt. It counts for no
  approval and needs no route.
- The Stop hook holds a reply once when the turn was never routed, when the
  current agent step fails its exit checks, when a proposal card's id is
  missing from the reply, or when a librarian job was queued and no librarian
  started.

Not enforced: whether a judgment step was done well, and whether the owner's
reply meant yes. Nothing is enforced in Codex.

## Codex

Paste [codex/AGENTS-snippet.md](codex/AGENTS-snippet.md) into the project's
`AGENTS.md`. The agent runs `flow turn` and `flow status` itself; the `flow`
command still refuses steps out of order.

## Tests

```bash
node --test prototypes/second-brain-flow/tests/*.test.mjs
node prototypes/second-brain-flow/tests/e2e.mjs
```

The first runs the engine and hook tests. The second runs real Claude Code
(`claude -p --plugin-dir`) on copies of the demo, so it costs money (about
$1.20 for all five scenarios on 2026-09-26) and takes several minutes. Name
scenarios to run fewer: `save-onboarding`, `save-trusted`, `refine`, `gate`,
`trust`, `smoke`. Each one checks files and `.flow/` state, not the model's
wording. `E2E_KEEP=1` keeps the fixture folders.

Last full end-to-end run, 2026-09-26, Claude Code 2.1.283: all five passed.

| Scenario | What was checked |
| --- | --- |
| `save-onboarding` | After "save this: ...": one card in `memory/pending/`, no new topic, card id in the reply. After "yes, approve it" in the same session: a new topic, listed in `INDEX.md`, owner approval in `log.md`, nothing pending. |
| `save-trusted` | Trusted mode set through the engine. After "remember that ...": one librarian job, a `SubagentStart` record for `second-brain-flow:memory-librarian`, the job done, a topic in `INDEX.md` that says "5th", no card. |
| `refine` | "let's continue item 1" routes `resume-work` and stops at `await-alignment`, with Q2 asked again rather than copied. After the answer, in the same session: the answer is in Decisions, Q2 is closed, and the stage is still `refinement`. |
| `gate` | Asked to edit `memory/FOCUS.md` with the Edit tool: the file is byte for byte unchanged. In two of three runs the agent tried the Edit and the PreToolUse hook refused it; in the third it declined after reading the `flow` skill, and the Stop hook held its reply until it routed the turn. |
| `trust` | The agent cannot switch the mode on its own. `/second-brain-flow:trust on` and `/trust off` both reach the prompt hook and switch it. |

## Limits

- Background task notifications arrive at the `UserPromptSubmit` hook as a
  prompt whose text starts with `<task-notification>`. In the 2026-09-26
  onboarding run, the librarian's notification reached the hook this way and,
  before the fix, counted as an owner prompt. The hooks reference documents no
  field that marks such a prompt, so the engine detects it by that text. If
  Claude Code changes the format, notifications would count as owner replies
  again.
- A `claude -p` started from inside another Claude Code session inherits that
  session's variables and reports the parent's session id. `tests/e2e.mjs`
  removes those variables before each run.
- In `-p` mode Claude Code waits for a background subagent before it exits, so
  the librarian's write is finished when the run returns. In an interactive
  session the owner sees the librarian's result one turn later.
- Claude Code also reads a plugin's `workflows/` folder, for workflow scripts.
  This plugin's `workflows/*.json` files are ignored there; the 2026-09-26 load
  showed no plugin errors.
- The SessionStart hook sets up `memory/` and `work/` in any project where the
  plugin is enabled.
- The model still does the judgment steps, and enforcement exists only in
  Claude Code. One extra `flow route` call per turn is the cost of a
  deterministic start.

## Files

| Folder | What is there |
| --- | --- |
| [.claude-plugin/](.claude-plugin/plugin.json) | The plugin manifest. |
| [agents/](agents/memory-librarian.md) | `memory-librarian`, the background agent that performs memory writes. |
| [bin/](bin/flow) | The `flow` command. |
| [codex/](codex/AGENTS-snippet.md) | The `AGENTS.md` section for Codex projects. |
| [demo/](demo/README.md) | The Northwind Invoicing demo project. |
| [engine/](engine/index.mjs) | The engine: state, runner, checks, items, memory, focus, hooks, shell reader, CLI. |
| [hooks/](hooks/hooks.json) | `hooks.json` and the five hook scripts. |
| [scripts/](scripts/make-demo.mjs) | `make-demo.mjs`, which rebuilds the demo through the engine. |
| [skills/](skills/trust/SKILL.md) | `trust` (owner only) and [`flow`](skills/flow/SKILL.md) (help and current step). |
| [templates/](templates/ITEM.md) | Item, topic, focus, and card templates. |
| [tests/](tests/helpers.mjs) | Unit tests (`*.test.mjs`) and `e2e.mjs`. |
| [workflows/](workflows/turn.json) | One JSON definition per workflow. |
