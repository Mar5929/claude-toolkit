---
work_item: "421"
status: proposed
created_at: 2026-09-26
summary: Design for a second brain driven by workflow definitions and a state machine inside Claude Code, built as a prototype beside the shipped plugins.
---

# Second brain driven by workflows (prototype design)

Work item: [#421](https://github.com/Mar5929/claude-toolkit/issues/421).
Sister item: [#419](https://github.com/Mar5929/claude-toolkit/issues/419).
Status: proposed. Mike authorized a prototype build on 2026-09-26. Nothing in
this document is approved as a requirement or as shipped behavior.

## Contents

- [Intent](#intent)
- [Design principles](#design-principles)
- [Parts](#parts)
- [Workflow definitions](#workflow-definitions)
- [The workflows](#the-workflows)
- [Session state](#session-state)
- [The flow command](#the-flow-command)
- [Hooks](#hooks)
- [Work items](#work-items)
- [Memory](#memory)
- [Onboarding mode and trusted mode](#onboarding-mode-and-trusted-mode)
- [The librarian agent](#the-librarian-agent)
- [Codex](#codex)
- [Prototype layout](#prototype-layout)
- [Tests](#tests)
- [Limits](#limits)
- [Differences from #419 and the current Toolkit](#differences-from-419-and-the-current-toolkit)
- [Notes](#notes)

## Intent

Mike's request, 2026-09-26, in summary: the current second brain gives the
agent a manual and hopes it follows it. He wants a process flow instead. The
owner sends a prompt; the agent gets its system context, the memory index, and
the current focus; it decides whether memory or work items matter; it checks
them; and so on, step by step. Each step has its own sub-process. Continuing a
work item means: read short-term working memory, read the work item, ask the
owner clarifying questions, wait until the owner agrees the understanding is
right, then continue. Refining requirements is a loop in which the agent keeps
the item's stage right, uses the right work-item template, and saves each
answer into the item as the owner gives it.

Memory changes from the current PRD in one way. A project starts in onboarding
mode, where the owner approves every memory save. When the owner trusts the
agent, the owner turns on trusted mode. From then on the agent saves on its own,
when the owner says "save this" or on its own judgment, by handing the save to a
background librarian agent so the conversation continues.

The underlying goal: the owner should not have to supervise whether the agent
followed the process. The process should hold because code holds it.

## Design principles

1. **Code owns the order; the model owns judgment.** A state machine decides
   which step is active and which step comes next. The model decides only what
   needs judgment inside a step, such as which workflow a prompt needs, what to
   ask, or what is worth remembering.
2. **Code does every step that needs no judgment.** Loading context, rendering a
   template, setting a stage, rebuilding an index, and writing the audit log are
   done by the engine. The agent is never asked to remember a file format.
3. **The agent sees one step at a time.** Each step's instructions are a few
   lines, delivered when the step starts. There is no manual to read at startup.
4. **Enforcement uses facts, never the agent's words.** Hooks check facts Claude
   Code reports: which tool ran, which command, whether the owner has replied
   since a question was asked, whether a subagent started. The one exception is
   the owner's own prompt text, which is used to detect an explicit owner
   command such as the trust switch or "save this".
5. **One writer path.** Memory and work-item files change only through the
   `flow` command. Direct edits by the agent are refused. The owner can still
   edit any file by hand; `flow doctor` reports what breaks.
6. **Git stays the record.** Memory and work items are Markdown files in the
   project repository. Session state is local and disposable.
7. **Parallel sessions are normal.** State is kept per session. Shared files are
   written under a lock.

## Parts

| Part | What it does |
| --- | --- |
| Workflow definitions | JSON files, one per workflow. Steps, instructions, exit checks, and branches. The only source of the process. |
| Engine | A Node library with no dependencies. Loads definitions, keeps session state, runs automatic steps, checks exit conditions, and owns every read and write of memory and work items. |
| `flow` command | The agent's and the owner's interface to the engine. Works the same in Claude Code and Codex. |
| Hooks | Claude Code hooks that start each turn in the right workflow, inject the current step, refuse out-of-order actions, and hold a reply that would leave a step unfinished. |
| Librarian agent | A background subagent that performs every memory write: deduplicates, merges, supersedes, updates the index and glossary, and logs the change. |
| Templates | Work-item and memory file shapes, rendered by the engine. |

## Workflow definitions

A workflow is a JSON file in `workflows/`. Example shape:

```json
{
  "id": "resume-work",
  "title": "Continue a work item",
  "start": "load",
  "steps": {
    "load": {
      "kind": "auto",
      "action": "loadItemContext",
      "next": "brief"
    },
    "brief": {
      "kind": "agent",
      "instructions": "Summarize where the item stands in five lines or fewer. Then ask the owner the clarifying questions you need. Record each with `flow item question`.",
      "exit": ["questionsRecordedOrNone"],
      "next": "await-alignment"
    },
    "await-alignment": {
      "kind": "owner",
      "next": "align"
    },
    "align": {
      "kind": "agent",
      "instructions": "Did the owner confirm your understanding? Save each answer with `flow item answer`. Then run `flow next --decision aligned` or `--decision not-aligned`.",
      "exit": ["answersSaved"],
      "branches": { "aligned": "route-by-stage", "not-aligned": "brief" }
    }
  }
}
```

Step kinds:

| Kind | Who acts | How the step ends |
| --- | --- | --- |
| `auto` | The engine runs a named action and prints its output. | Immediately, to `next`. |
| `agent` | The agent works under the step's instructions. | The agent runs `flow next`, with `--decision` when the step has branches. The engine runs the step's exit checks first and refuses to move on when one fails, printing what is missing. |
| `owner` | The agent ends its reply; the owner answers. | After the owner's next prompt, the agent routes `continue`, which moves the workflow to `next`. `continue` is refused unless an owner prompt arrived after the step started, and an owner prompt answers only the most recent waiting step. The agent may not end a reply in an `agent` step whose exit checks fail. |
| `call` | A sub-workflow runs. | When the sub-workflow finishes, the caller continues at `next`. |
| `end` | Nothing. | The workflow is finished and is removed from the stack. |

An `agent` step may set `closeOnNewTurn` (the `chat` answer and the `recall`
use steps). Such a step finishes by itself when the next owner prompt arrives.

Exit checks and automatic actions are named functions in the engine, so a
definition can only use behavior the engine knows how to verify. `flow diagram
<workflow>` prints a Mermaid diagram generated from the definition, so the
picture of the process never drifts from the process.

## The workflows

| Workflow | Starts when | Steps, in order |
| --- | --- | --- |
| `turn` | Every owner prompt (started by the prompt hook). | `orient` (auto: current step, focus summary, mode, pending proposals) → `route` (agent picks one route with `flow route`). |
| `chat` | A question or task that needs neither memory nor a work item. | `answer` → end. |
| `recall` | The answer may depend on project history. | `search` (auto: ranked hits from memory topics and work items) → `use` (agent reads the hits it needs and cites each one it relies on) → end. |
| `resume-work` | "Let's continue item X." | `load` (auto: focus, item, related memory) → `brief` (summary and clarifying questions; an open question is asked again with `--ask`, never copied) → `await-alignment` (owner) → `align` (save answers; aligned or not) → `route-by-stage` (auto: enters `refine` when the item is in discovery or refinement or has no approved requirements, otherwise `work`). |
| `new-work` | The owner describes new work. | `capture` (agent runs `flow item new` with title, goal, reason) → `refine` (call). |
| `refine` | Requirements interview. | `ask` (one to three questions, recorded; decision `asked`, or `none` straight to `decide`) → `await-answer` (owner) → `capture` (every asked question answered, deferred, or withdrawn; requirements written) → `decide` (more questions, or ready for approval) → `propose-approval` → `await-approval` (owner) → `record-approval` (engine sets the stage only when the owner replied after the proposal) → end. |
| `work` | Continuing build, test, or review work on an item. | `do` (agent works; records progress with `flow item progress`) → `checkpoint` (progress and next step recorded) → end. |
| `remember` | The owner says "save this", or the agent judges something worth keeping. | `propose` (agent runs `flow memory propose`) → `gate` (auto: branch on mode) → onboarding: `show-card` → `await-decision` (owner) → `decide` (approve, edit, or reject) → `dispatch`; trusted: `dispatch` directly. `dispatch`: the agent starts the librarian in the background; the step ends when the librarian has started. → end, and the calling workflow resumes. |
| `wrap-up` | End of a working session or before a handoff. | `refresh-focus` (auto: rebuild the focus file's item list from items) → `notes` (agent records next steps and owner to-dos) → end. |

The `route` step offers `continue` when a workflow is waiting on an owner step,
so a reply to a question lands back in the workflow that asked it.

Two routes are forced by facts. When the owner's prompt starts with "save
this", or starts with "remember that" or "remember this" and has no question
mark, the prompt hook tells the agent to route `remember`, and the gate refuses
any other route. "Remember that bug we fixed? Is it back?" is not forced; the
agent gets a hint that it may be a save or a question about the past. When a
workflow is waiting on the owner, `continue` is offered first. A new route for
a workflow and item already on the stack replaces the older copy.

A background task notification reaches the prompt hook as a prompt that starts
with `<task-notification>`. It starts a notification turn: already routed,
counted as no owner prompt, and answering no waiting step. A notification that
arrives before the owner's turn is routed only records itself, so that turn's
route rules stay in force.

## Session state

Each session has a state file at `.flow/sessions/<session id>.json`. The
`.flow/` folder is ignored by Git. State holds:

- the workflow stack (workflow id, current step, step start time, decisions);
- the current turn: its number, the time the owner prompt arrived, whether it
  was routed, and any forced route;
- the time of the last owner prompt, which the approval checks use;
- memory proposals shown in this session and librarian jobs dispatched;
- whether the Claude Code hooks run this session.

`.flow/` also holds the librarian job queue (`queue/`), the file snapshots undo
uses (`history/`), locks, and an audit log. Agents cannot write to `.flow/`.

The session start hook writes `FLOW_SESSION_ID` to Claude Code's environment
file, so every `flow` command run through Bash finds its own session. Without
that variable, `flow` uses a session named `manual`. A Bash command that sets
or clears `FLOW_SESSION_ID` or `FLOW_PROJECT_ROOT` is refused.

## The flow command

| Command | What it does |
| --- | --- |
| `flow status` | Current workflow stack, current step, its instructions, and what its exit checks still need. |
| `flow route <workflow> [--item <id>]` | Chooses this turn's route. `continue` resumes a waiting workflow. |
| `flow next [--decision <d>]` | Completes the current step after its exit checks pass, and prints the next step. |
| `flow cancel` | Drops the current workflow, and a caller waiting on it. |
| `flow turn --prompt "..."` | Starts a turn by hand for hosts without the prompt hook (Codex). Refused in any session the hooks run, and by PreToolUse, so it cannot fake an owner prompt. It does not honor the trust or undo commands. |
| `flow item new/show/list/question/answer/requirement/progress/stage/approve` | Every work-item change. The engine renders the template. Also `question --none`, `question --ask <Q id>`, `progress --next`, and `--propose` on `approve` and `stage`. |
| `flow memory recall <words>` | Ranked search across memory topics and work items. |
| `flow memory propose ...` | Creates a proposal with type, title, statement, reason, and source. |
| `flow memory approve/reject/edit <id>` | Owner decisions in onboarding mode. Each is refused unless the owner sent a prompt after the proposal was shown, in the session that showed it. |
| `flow memory pending` | This session's cards; cards of other sessions are listed as waiting in another session. |
| `flow memory log` / `flow memory undo <change id>` | What was written, when, by whom, under which mode. Undo restores the previous file content. It needs the owner command `/second-brain-flow:memory-undo <change id>` in the same turn, and is refused while a later change to the same file is not undone. |
| `flow focus todo/upcoming/remove/none` | The agent-owned sections of `FOCUS.md`. |
| `flow librarian next/apply/done` | Used only by the librarian agent. |
| `flow trust` | Shows the mode. Changing it is described under trusted mode. |
| `flow diagram <workflow>`, `flow workflows` | Mermaid diagram from the definition; the list of workflows. |
| `flow init` | Sets up `memory/` and `work/` in the current folder. |
| `flow doctor` | Checks memory and work-item files for broken structure, links, and index drift. |

Every command prints plain text written for the agent: what happened, and the
exact next command or step.

Every id the command takes (card, job, change, topic, item) is checked against
its pattern before a path is built, and each path must stay inside its folder.
A missing or unreadable time never counts as an owner reply.

## Hooks

| Event | What the hook does |
| --- | --- |
| `SessionStart` | Creates or reloads session state. Writes `FLOW_SESSION_ID` to the environment file. Injects the memory index, the focus file, the mode, and any workflow still in progress. On `compact` and `resume`, re-injects the current step. |
| `UserPromptSubmit` | Starts a new turn: records the prompt time, marks the most recent waiting `owner` step as answered, detects the owner's trust and undo commands and save phrases, pushes the `turn` workflow, and injects the `orient` output and the route instruction. A task notification starts a notification turn instead. |
| `PreToolUse` | Before the turn is routed, allows only read-only tools, `Skill`, and `flow` commands. Refuses Write, Edit, and shell writes to `memory/`, `work/`, and `.flow/` from any agent; the shell reader follows `cd`, reads `bash -c` and `eval` strings, and expands `$CLAUDE_PROJECT_DIR`, `$PWD`, `$HOME`, and `~`. Refuses `flow turn`, and commands that set or clear `FLOW_SESSION_ID` or `FLOW_PROJECT_ROOT`. Refuses `flow trust set` unless the owner typed the trust command this turn. Refuses a route other than `remember` when a save phrase forced it. Also refuses whole-tree commands that would reach a protected folder (`rm -r .`, `git checkout .`, `git restore`, `git reset --hard`, `git stash`, `git clean`, `find -delete`, `xargs rm`) and looks through `sudo`, `env`, `command`, `time`, and `nohup`. Returns `allow` for one plain command of this plugin's own `bin/flow` (a bare `flow` only when the hook's PATH resolves to it; never `flow init`), so it runs without a permission prompt. |
| `SubagentStart` | Matches `^second-brain-flow:memory-librarian$`. Marks this session's queued jobs dispatched, under the memory lock, which ends a `dispatch` step. |
| `Stop` | Holds the reply once, with the missing item named, when the turn was never routed, when the current `agent` step's exit checks fail, when a proposal card was created but its id does not appear in the reply, or when a librarian job was queued and no librarian started. On a notification turn it holds only for steps that turn started. Uses `stop_hook_active` so it never holds the same reply twice. |

Hooks are command hooks that call Node scripts. The protocol-guard plugin uses
function hooks; this prototype uses command hooks because they are simpler to
test outside Claude Code and run the same on every platform Claude Code runs on.

## Work items

A work item is `work/<id>-<slug>/ITEM.md`. Its id is a sequence number. The
engine owns its shape:

```markdown
---
id: 7
title: Customer portal login
stage: refinement
created: 2026-09-26
updated: 2026-09-26
requirements_approved: null
---

# 7 Customer portal login

## Goal
## Why
## Requirements
- **R1** (draft) Customers sign in with their email address. Source: owner, 2026-09-26.
## Open questions
- **Q2** (asked 2026-09-26) Do partners use the same login?
## Decisions
- 2026-09-26 **Q1** Which identity provider? Answer: Okta. Source: owner.
## Progress
## Next step
```

Stages: `discovery`, `refinement`, `requirements-approved`, `design`, `build`,
`testing`, `review`, `done`. The engine moves the stage when facts change it:
the first requirement moves `discovery` to `refinement`; recorded owner
approval moves `refinement` to `requirements-approved`. Other moves are made
with `flow item stage`, which refuses `done` and `requirements-approved` unless
the owner replied after the agent proposed them. `design`, `build`, `testing`,
`review`, and `done` are refused until requirements approval is recorded, and
`flow route work` is refused on such an item with the instruction to route
`refine`.

The owner may edit an item by hand. A flow write rewrites only flow's own
lines; every other line and section stays where it was, including front-matter
lines flow does not own, blank lines, and fenced code (a `## ` line inside it is
not a heading). Windows line endings are kept. Hand-written ids such as
`- R3 text` are read. `flow doctor` lists the lines in Requirements and Open
questions that flow cannot read.

The prototype stores items locally. A GitHub Issues adapter would render the
same sections into an issue body; it is out of scope here.

## Memory

```text
memory/
├── config.json        mode, and who changed it and when
├── INDEX.md           generated: one line per active topic
├── FOCUS.md           current focus: active items, owner to-dos, upcoming
├── GLOSSARY.md        generated from term topics
├── log.md             every memory write: time, change id, mode, approval
├── pending/           proposals waiting for the owner (onboarding mode)
└── topics/
    └── <type>-<slug>.md
```

A topic file:

```markdown
---
id: decision-okta-for-portal-login
type: decision
title: Okta is the identity provider for the customer portal
summary: The portal signs customers in through Okta.
status: active
source: owner, 2026-09-26, work item 7
created: 2026-09-26
updated: 2026-09-26
supersedes: []
superseded_by: null
---

Okta is the identity provider for the customer portal.

**Why.** The client already licenses Okta for staff.
```

Types: `decision`, `fact`, `preference`, `term`, `lesson`, `event`. The summary
line is what `INDEX.md` shows, so a session reads one line per topic at startup
and opens a topic only when it needs it. A superseded topic stays on disk with
`status: superseded` and a link forward; the index leaves it out.

`FOCUS.md` has an engine-owned section, the list of open items with stage and
next step, rebuilt from the item files, and agent-owned sections for owner
to-dos and upcoming dates.

## Onboarding mode and trusted mode

`memory/config.json` holds `mode`: `onboarding` (default) or `trusted`.

**Onboarding.** `flow memory propose` writes a proposal to `memory/pending/`
and prints a card: what would be saved, where, and why. The agent must show the
card (the Stop hook checks that the proposal id appears in the reply). The
owner answers. `flow memory approve <id>` is refused unless an owner prompt
arrived after the card. The approved proposal becomes a librarian job.

**Trusted.** `flow memory propose` queues a librarian job straight away and
prints the dispatch instruction. The agent starts the librarian in the
background and carries on. The owner sees a one-line note in the reply, and can
run `flow memory log` or undo any change.

**Switching.** The owner types `/second-brain-flow:trust on` or `off`. The
prompt hook sees the owner's own command in the prompt and records permission
for this turn; only then does `flow trust set` succeed. The short form `/trust
on` works too. The agent may suggest trusted mode after a run of approved
proposals, and cannot switch it. Undo works the same way, with
`/second-brain-flow:memory-undo <change id>` (`/undo` is Claude Code's own
`/rewind`).

A card belongs to the session that showed it: only an owner prompt in that
session approves or edits it.

## The librarian agent

`agents/memory-librarian.md`, background, tools Bash, Read, Grep, Glob. For
each job it runs `flow librarian next`, which prints the proposal and the
closest existing topics. It decides one action and applies it with `flow
librarian apply`:

| Action | Meaning |
| --- | --- |
| `create` | A new topic. |
| `update` | Adds to or corrects an existing topic without changing what it means. |
| `supersede` | A new topic replaces an old one; the old one is marked superseded. |
| `merge` | Two topics say the same thing; one remains. |
| `skip` | The proposal is already covered, or does not qualify; the reason is logged. |

The engine validates the result, writes the file, regenerates `INDEX.md` and
`GLOSSARY.md`, appends to `log.md`, and marks the job done. The librarian never
writes files directly; the same PreToolUse gate applies to it.

## Codex

The `flow` command is host-neutral. A Codex project gets an `AGENTS.md` section
(`codex/AGENTS-snippet.md`) telling the agent to run `flow turn --prompt "..."`
and then `flow status` at the start of every turn and follow what it prints.
Nothing enforces it in Codex. The trust and undo commands need the Claude Code
prompt hook, so in Codex the owner edits `memory/config.json` by hand and
reverses memory changes with Git.

## Prototype layout

```text
prototypes/second-brain-flow/
├── .claude-plugin/plugin.json
├── README.md
├── bin/flow                    executable, added to PATH by Claude Code
├── engine/                     library: state, workflows, items, memory, checks
├── workflows/*.json
├── templates/
├── hooks/hooks.json and *.mjs
├── agents/memory-librarian.md
├── skills/                     trust and memory-undo (owner only), flow (help)
├── codex/AGENTS-snippet.md     the Codex instructions
├── scripts/make-demo.mjs       rebuilds the demo through the engine
├── tests/                      node --test, plus real Claude Code runs (e2e.mjs)
└── demo/                       a small project to try it in
```

It is not registered in either marketplace. Try it with
`claude --plugin-dir prototypes/second-brain-flow` from inside `demo/`.

## Tests

- Engine unit tests: every workflow reaches `end` along each branch; exit checks
  refuse and accept as specified; templates render; approval and trust gates
  refuse before an owner prompt and accept after one; librarian actions produce
  valid files and indexes; undo restores content.
- Hook tests: synthetic hook input for each event and each refusal.
- End-to-end runs with `claude -p` and the plugin loaded: a save in onboarding
  mode produces a card and no write; a save in trusted mode starts the
  librarian and writes a topic; a refinement answer is saved into the item
  before the reply ends.

## Limits

- The model still does the judgment steps. The engine proves a step happened and
  its facts are present; it cannot prove the step was done well.
- The owner's reply is taken as the owner's decision. The engine checks that a
  reply came after the question; reading whether the reply meant yes is the
  agent's judgment.
- Enforcement exists only in Claude Code.
- One extra `flow route` call per turn is the cost of a deterministic start.
- The shell gate reads commands; it does not sandbox them. A write from inside
  another program (`node -e`, `python -c`, a script file), a path that starts
  with any other variable, or a command the reader cannot split gets past it.
  Each takes a deliberate attempt.
- Notifications are recognized by their `<task-notification>` text. The hooks
  reference documents no field that marks them.

## Differences from #419 and the current Toolkit

| Topic | This design | #419 model / current Toolkit |
| --- | --- | --- |
| How behavior is defined | Workflow definitions executed by an engine | Rules, skills, and manuals the agent reads |
| Memory location | Git-tracked `memory/` | #419: untracked `.memory/` |
| File formats | Rendered by the engine; the agent supplies values | The agent writes Markdown following a template |
| Memory writer | Background librarian in both modes; only the approval gate differs | #419: background curator |
| Trust switch | Owner command, verified from the prompt | #419: explicit trusted mode, shape still open |

## Notes

- 2026-09-26: Written by the agent from Mike's request in the session that
  created #421. Proposed for the prototype only.
- 2026-09-26: Updated to match the built prototype. Owner steps advance when
  the agent routes `continue` after an owner prompt. Added `closeOnNewTurn`,
  `flow cancel`, `flow turn` for Codex, `flow focus`, `flow memory pending`,
  `flow workflows`, `flow init`, and the extra item options. Librarian jobs,
  undo snapshots, and the audit log live in `.flow/`. After the independent
  review: `flow turn` is refused in hook-run sessions; item hand edits are
  kept; undo is an owner command and refuses to skip a later change; the shell
  gate covers `cd`, `bash -c`, known variables, and `.flow/`; cards belong to
  their session; later stages need approved requirements; "remember that ...?"
  is not forced; repeated routes replace older copies; plain `flow` commands
  run without a permission prompt; the librarian matcher is anchored.
- 2026-09-26: After the second review: ids are validated before any path is
  built and owner-reply checks fail closed; `reject` follows the approve rule;
  the shell gate covers `${VAR}`, whole-tree git, find, and xargs commands, and
  wrapper prefixes; item rewrites keep front-matter lines, fenced code, blank
  lines, and CRLF; "remember this ...?" is not forced; auto-allow needs the
  plugin's own `bin/flow` and skips `flow init`; a notification no longer
  replaces an unrouted owner turn.
