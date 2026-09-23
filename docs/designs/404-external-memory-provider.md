# 404: External memory provider

Build plan for [#404](https://github.com/Mar5929/claude-toolkit/issues/404).
Requirements 1 to 11 and decisions D1 to D5 were approved by Mike on
2026-09-23 and are recorded in the issue. Mike approved building it on 2026-09-23 ("build now").

## Preparation

- Discovery map of every place that assumes the second brain:
  [#404 T1 comment](https://github.com/Mar5929/claude-toolkit/issues/404#issuecomment-5788343846).
- mem0 and Hindsight research:
  [#404 T2 comment](https://github.com/Mar5929/claude-toolkit/issues/404#issuecomment-5788351994).
- Knowledge policy: `knowledge/knowledge-manual.md` sections 2 to 4.
- Required-step checks: `plugins/protocol-guard/protocols.default.json` and
  `plugins/protocol-guard/hooks/engine.ts`.
- #396 is changing the startup reads and the `protocol-guard` checks. The
  build starts from the state #396 leaves on main.

## Terms

- **Memory mode.** How a project stores working memory and lasting memory:
  `files` (today's second brain, in `knowledge/`) or `external` (a memory
  service).
- **Memory service.** mem0 or Hindsight, reached through its MCP server. An
  MCP server is a connector that gives the agent tools such as
  `add_memory` or `retain`.
- **Memory record.** One stored item in the memory service.

## Summary

The Knowledge System keeps its skills, selection rules, approval cards, and
checks (D1 option A). Only the place where memory is stored changes. One
config file declares the memory mode. Every hook, skill, tool, and check reads
it. A missing file means `files`, so existing projects do not change.

| Area | `files` mode (today) | `external` mode |
| --- | --- | --- |
| Mode declaration | None; hooks look for `knowledge/knowledge-manual.md` | `.toolkit-memory.json` at the project root |
| Working memory | `knowledge/memory/current.md` | The service's own way of holding short-term memory: one record per current-focus item, kind `working` |
| Lasting memory | Topic files in `knowledge/memory/memory-entries/` | One memory record per topic, kind `lasting` |
| Pending saves | `knowledge/memory-inbox.md` | Memory records, kind `pending` (D4) |
| Selection feedback | `knowledge/memory-self-improvement.md` | One memory record, kind `feedback` (D4) |
| Memory index | Generated `memory-index.md` | Not needed: the service lists records by kind |
| Project context | `knowledge/project.md` | `PROJECT.md` (D3) |
| Knowledge manual | `knowledge/knowledge-manual.md` | `docs/knowledge-manual.md` (Q1) |
| Toolkit manual | `knowledge/toolkit-manual.md` | `docs/toolkit-manual.md` (D3) |
| PRDs | `knowledge/prds/` | `prds/` (D3) |
| Skills, approval cards, selection rules | `knowledge-save`, `knowledge-find`, `knowledge-review`, `knowledge-setup` | Same skills and rules |
| Required-step checks | K4, CW, K5, K6, K7 watch `knowledge/` paths | Same checks, also watching calls to the memory service's write tools |

## Requirement by requirement

**R1. A project can use a memory service.** `knowledge-setup` gains an
`external` setup path. project-init asks for the mode at Gate 3.

**R2. Every place that assumes the second brain says so.** Each place in the
T1 map gets either a mode switch or wording such as "working memory (the
`current.md` file, or the memory service in `external` mode)". The file list
is in "Files touched" below.

**R3. Same kinds of memory, same rules.** Working memory holds the same
content as today: the project goal, each active item's goal, status, next
step, blocker and link, later to-dos, and session handoffs. Its shape follows
the service (Q3): one record per item, loaded in full at startup. The
5,000-character file limit does not apply; entries stay short. Lasting memory stays one record per topic with the same
fields: summary, dates, sources, auto-saved mark. Knowledge manual sections 3
and 4 do not change.

**R4. Work items and PRD requirements gathering do not change.** The
work-tracker and requirements skills already have no `knowledge/` paths. Only
the PRD folder name changes.

**R5. PRDs in a top-level folder.** In `external` mode PRDs live in `prds/`
with the same format and the generated `prds/prd-index.md`. PRD writes still
go through `knowledge-save` and still publish to Git.

**R6. Same approval rules; no provider plugins.** Memory records are written
only by `knowledge-save` after approval, using the MCP tools directly. Setup
never installs the mem0 or Hindsight Claude Code plugins, because both save
automatically. `knowledge-setup` warns when either plugin is enabled.

**R7. Text stored exactly.** mem0 writes always pass `infer=false`. A
Hindsight bank is created with `retain_extraction_mode: chunks`, which keeps
text without rewriting it. `knowledge-save` reads the record back after each
write and compares it with the approved text. A difference is a failed save.

**R8. Checks work in both modes.** See "Required-step checks" below.

**R9. Claude Code and Codex.** Both read the same config and the same skill
text. Codex receives the instructions without `protocol-guard`, as today.
project-init prints the MCP server entry for `~/.codex/config.toml`.

**R10. Chosen at project-init; changeable at project-sync.** project-sync
reads the config and audits the chosen mode. Moving an existing project
between modes is out of scope (D5). project-sync reports it as not supported
and changes nothing. This repository stays in `files` mode.

**R11. Non-memory files stay in Git.** `SOUL.md`, `PROJECT.md`, the two
manuals, and `prds/` are Git files in `external` mode. `check-knowledge`
fails when an `external` project also has `knowledge/memory/` files, so
memory has only one home (D2). It also fails on `knowledge/memory-inbox.md`,
`knowledge/memory-self-improvement.md`, and `knowledge/prds/`.

## The config file

`.toolkit-memory.json`, committed at the project root. It holds no secrets.

```json
{
  "format": 1,
  "memory": "external",
  "service": "mem0",
  "server": "mem0",
  "project": "dragonfly"
}
```

- `memory`: `files` or `external`. A missing file means `files`.
- `service`: `mem0` or `hindsight`. Picks the adapter reference, below.
- `server`: the MCP server name in the project's MCP settings. It holds only
  letters, digits, `_` and `-`, so tool names are `mcp__<server>__<tool>`
  with the name unchanged.
- Every reader applies the same rules: `"format": 1`, the values above, each
  on one line. An invalid file means `files` mode everywhere.
- `project`: the scope inside the service. mem0 uses it as `app_id` and in
  metadata. Hindsight uses it as the bank id.

The API key lives in an environment variable named in the MCP settings, never
in the repository.

## Memory records

Every record carries this metadata (mem0 `metadata`, Hindsight `tags` plus
`metadata`):

| Field | Values |
| --- | --- |
| `toolkit_kind` | `working`, `lasting`, `pending`, `feedback` |
| `toolkit_project` | the config's `project` |
| `toolkit_key` | a stable key: `working:goal`, `working:<item id>`, `working:todo`, `working:handoff:<UTC time>`, `feedback`, `lasting:<topic>`, `pending:<reference>` |
| `summary`, `created`, `updated`, `auto_saved` | lasting records only; same meaning as today's front matter |

The stable key lets the agent find one record without a search:

- mem0 assigns its own ids. The agent lists with a metadata filter on
  `toolkit_key`. A replace is `add_memory` with the new text, a read back,
  then `delete_memory` of the old id. `update_memory` is not used: it cannot
  write metadata.
- Hindsight lets the caller choose the id. The key becomes the
  `document_id`, and a `sync_retain` with the same id replaces the record.
- Each session handoff is its own `working` record, keyed
  `working:handoff:<UTC time>`. The time is the full ISO UTC timestamp with
  milliseconds, the same value as the handoff heading. An existing key is never
  overwritten; the writer takes a new timestamp.

## Provider operations

A new reference, `knowledge-setup/references/memory-providers/`, holds one
contract file and one adapter file per service. The skills name the
operation. The adapter names the exact tool and arguments.

| Operation | mem0 | Hindsight |
| --- | --- | --- |
| Load working memory in full | `get_memories`, filter kind `working` | `list_documents`, `q: "working:"` (id prefix), then `get_document` |
| Add or replace a working-memory entry | `add_memory` with `infer=false`, then `delete_memory` of the old id | `sync_retain`, `document_id` = the key, replace |
| Remove a finished working-memory entry | `delete_memory` | `delete_document` |
| Save or replace a lasting topic | As for a working entry | `sync_retain`, `document_id` `lasting:<topic>` |
| List lasting topics | `get_memories`, filter kind `lasting` | `list_documents`, `q: "lasting:"` |
| Search | `search_memories` within the project | `recall` within the bank |
| Add or remove a pending save | `add_memory` / `delete_memory` | `sync_retain` / `delete_document` |
| Read back after a write | `get_memory` | `get_document` |

## Startup

- The session-start hook reads the config. In `external` mode it tells the
  agent to read `SOUL.md` and `PROJECT.md`, then load working memory with the
  exact tool from the adapter and list pending saves.
- A command hook cannot call an MCP tool, so the load is an agent step.
  The same is true of today's file reads.
- If the MCP server is not connected, the hook text says to tell the owner.
  Work that needs memory pauses; other work continues. This matches today's
  rule for a missing startup file.
- The AGENTS.md template gets an `external` Startup block with the same
  three steps.

## Required-step checks

`protocol-guard` engine changes:

1. `appliesIf` accepts `{ "memory": "files" }` or `{ "memory": "external" }`,
   read from `.toolkit-memory.json`. A missing file means `files`.
2. A new trigger, `on.call`, names a class of memory-service tools, such as
   `memory-write`. The engine resolves the class to tool names from the
   config and the adapter.
3. A new requirement, `called`, is met by a successful call in a tool class.
   It may also require that the call's `toolkit_kind` metadata equals a given
   value. That is an exact field comparison. It is not a keyword or meaning
   match, so #396 requirement 4 still holds.
4. `helperSavePending` stops hard-coding `knowledge/` and uses the mode's
   paths and tool class.
5. An `opened` requirement may carry a `kind`. K4X uses it so a `pending`
   record needs `knowledge-save` opened this turn.
6. `appliesIf` may be a list; the check applies when any entry holds. K7 uses
   `[{exists, memory: "files"}, {memory: "external"}]`.

Check changes:

| Check | `files` mode | `external` mode |
| --- | --- | --- |
| K4 skill open before a knowledge write | Unchanged | `on.call: memory-write` plus file writes to `prds/`; pending records need the skill opened this turn |
| CW working memory after a work-item change | Unchanged | Requires `called: memory-write` with `toolkit_kind = working`, a mem0 `delete_memory` or `delete_all_memories`, or a Hindsight `delete_document` whose `document_id` starts with `working:` |
| K5 generated indexes | Unchanged | `prds/prd-index.md` and `ai-external-knowledge/README.md` |
| K6 index builder and checker after a write | Unchanged | After a `prds/` write |
| K7 save review before PR, close, merge | Unchanged | Unchanged; it depends only on `knowledge-save` |

## Files touched

- **protocol-guard:** `hooks/engine.ts`, `hooks/memory-config.mjs` (the config
  rules), `protocols.default.json`, `README.md`, engine tests and fixtures.
- **second-brain:**
  - Knowledge manual template: section 1 check list and section 2 ownership
    table gain the `external` homes. Sections 3 and 4 do not change.
  - Hooks: `knowledge-session-start`, `memory-reminder`,
    `knowledge-completion`, `save-reminder`, and `work-item-close` read the
    mode. A shared helper in `knowledge-manual.mjs` reads the config.
  - Tools: `build-knowledge-index` and `check-knowledge` handle the
    `external` layout.
  - Skills: `knowledge-save` (operations, execution and recovery, executor),
    `knowledge-find`, and `knowledge-review` gain the `external` branch.
    `knowledge-setup` gains the `external` setup path and the
    `memory-providers/` references.
- **project-init:**
  - Gates 1, 3, 4, and 5 and the protocol-guard step in `project-init`.
  - The audit and startup parity in `project-sync`.
  - `thin-agents-md.md`, `root-file-examples.md`, and
    `toolkit-manual-delivery.md`.
  - `library/hooks/toolkit-session-start.mjs`: the manual path and summary
    depend on the mode.
  - `library/templates/toolkit-manual.md`.
  - Rules: `knowledge-direct-commit.md` adds `prds/**` and `PROJECT.md`.
    Wording changes in the general rules README,
    `delivery-and-knowledge-boundary.md`, `permissions-runbook.md`, and
    `output-styles/terse.md`.
- **Other plugins:**
  - `handoff` step 2 gains an `external` branch. Each handoff is its own
    `working` record, keyed `working:handoff:<UTC time>`.
  - `spec-check` and its reminder hook use the mode's PRD folder.
  - Wording changes in `grill-me`, `solution-design`, and system-guide
    `commands-and-hosts.md`.
- **This repository:**
  - Installed copies.
  - `knowledge/toolkit-manual.md` and `docs/toolkit-map.md`.
  - `README.md` and `docs/designs/README.md`.
  - No change needed: `docs/AGENTS.md`, `brainstorms/README.md`,
    `offer-context-handoff.md`, and `.codex/hooks.json`. This repository stays
    in `files` mode, and none of them holds a memory path.
  - `knowledge/project.md`: the Git boundary gains the D2 exception.
  - `knowledge/prds/toolkit-operating-system/knowledge-system.md` at stage 14.
  - Also fix the stale `spec-index.md` name in `.claude/toolkit-sync.md`.
- **Release metadata:** plugin versions in both marketplace files.

## Tests

- **protocol-guard engine tests:**
  - `appliesIf.memory` with the config missing, set to `files`, and set to
    `external`.
  - `on.call` and `called` with recorded MCP call events for both services.
  - The `toolkit_kind` field match.
  - A refused write before `knowledge-save` is opened.
- **Knowledge checks:** `knowledge-startup-check`, `startup-budget-check`,
  `knowledge-schema.test`, `knowledge-behavior`, and `toolkit-startup.test`
  each gain an `external` fixture project. `check-knowledge` fails when
  `external` and `knowledge/memory/` both exist.
- **All repository checks** listed in `AGENTS.md`, plus
  `claude plugin validate .`.
- **Real run with a real service:** a scratch project in `external` mode
  runs startup, a working-memory update after a work-item change, a lasting
  save after approval, a pending save, and a search. The readback must match
  the approved text exactly. Mike has no service account (Q2). See Q4.
- **Regression:** this repository and one existing `files` project run
  unchanged.

## Order

1. Wait for #396 to finish on main.
2. Config reader and `protocol-guard` engine support, with tests.
3. second-brain: manual template, adapters, hooks, tools, skills.
4. project-init, project-sync, templates, rules, handoff, spec-check.
5. Wording, manuals, catalogs, installed copies, release metadata.
6. Independent review, all checks, merge, and sync.
7. Real-service run (see Q4), then Mike's acceptance.
8. Stage 14: update the knowledge-system PRD and delete this design.

## Notes

**Decisions (approved by Mike, 2026-09-23):** D1 option A; D2 to D5 as
recommended. See the issue.

**Answered by Mike, 2026-09-23:**

- **Q1 Knowledge manual location in `external` mode:** `docs/knowledge-manual.md`.
  Mike: "Hmmm alright".
- **Q2 Service for the real run:** Mike has no memory service and does not
  expect one soon.
- **Q3 Working memory shape:** "it will just be however the service handings
  working short term memory/current focus". The adapter for each service
  decides the shape. Both mem0 and Hindsight get one record per
  current-focus item.

**Answered by Mike, 2026-09-23: "build now".**

- **Q4 Build and test without a service.** Proposed: build now and test with
  recorded tool-call events. Also try a self-hosted Hindsight server inside
  the cloud session for a real run; it is open source and needs no account.
  If that cannot run, the real run waits for a service and #404 stays open
  at acceptance. The alternative is to wait to build until Mike has a
  service. That avoids building against tool names that may change before
  anyone uses them.

**Potential paths to explore:** a check that working memory was loaded at
startup. No such check exists today in `files` mode either.

**Resume point:** Build in worktree `../claude-toolkit-404`, branch
`issue-404-external-memory`, in the order above. Progress is on the issue.
