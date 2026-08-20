# second-brain plugin

One portable project-knowledge folder shared by Claude, Codex, Git, and an
optional Obsidian vault.

**Setup: sets up a project.** New projects install it through `project-init`.
Existing projects use `project-sync`, which begins with a read-only layout
check and shows the owner every proposed move before anything changes.

## Install

```text
/plugin install second-brain
```

The plugin keeps its established name so projects that already enable or
disable `second-brain@claude-toolkit` do not need a settings rename.

## What it installs

```text
knowledge/
  .obsidian/
    app.json
  project.md
  index.md
  specs/
  memory/
    tags.md
    context/
    decisions/
    domain/
    knowledge/
    operations/
    planning/
    references/
  brainstorms/

.claude/hooks/knowledge-session-start.mjs
.claude/hooks/save-reminder.mjs
.claude/tools/build-knowledge-index.mjs
.claude/tools/knowledge-health.mjs
.claude/tools/knowledge-layout.mjs
```

The adopting project's root instructions receive a short route to
`knowledge/project.md` and `knowledge/index.md`. Claude's `SessionStart` hook
prints those two files. Codex receives the same read instruction through the
root `AGENTS.md`; a project may also register the fail-open loader through its
native Codex hook configuration when that host supports hooks.

The project turns off Claude Code's private auto-memory. The committed Markdown
files are the one shared truth.

## Skills

- **second-brain** detects, installs, adopts, migrates, or explains the whole
  system.
- **remember** finds where persistent information belongs, shows short What,
  Where, Why, Assumptions, and Unverified bullets, then writes only the approved
  meaning.
- **recall** reads the project map and opens only the knowledge relevant to the
  task.
- **cleanup** reviews stale, repeated, conflicting, or misplaced knowledge and
  combines the read-only health report with a meaning review, then proposes
  owner-approved repairs.
- **session-search** searches existing local Claude Code CLI conversations only
  after current project files fail to answer, and treats every match as history.

## Session search boundary

The agent is the main user of session search. It reads current project files
first, then searches local Claude Code CLI history only when those files leave a
real gap or the owner asks. Raw matches remain tool context unless the owner
asks to see one or a conflict needs explaining.

The first pass searches the current project and returns at most five excerpts
of 500 characters each. It may be widened to the repository's worktrees.
Searching every project requires the owner's explicit choice and a second
command flag. A selected result may expand to its complete visible message or
adjacent conversation turn. Match time, session start, and last activity are
separate fields so a conversation spanning several days is not mislabeled.

The reader uses Claude Code's documented local transcript location. Anthropic
states that the JSONL record shape is internal and may change, so unknown
records are skipped and unreadable history fails plainly. The reader never
returns tool results or hidden thinking, changes a transcript, creates an
index, writes project knowledge, or sends session data elsewhere.

## Fixed properties and project tags

Every memory uses only six YAML properties: `source`, `source-file`, `date`,
`session`, `tags`, and `superseded-by`. The source value separates exact owner
quotes, owner paraphrases, named repository files, direct agent observations,
and unchecked agent conclusions.

Tags describe project subjects only. Each project owns its vocabulary, so a
Salesforce project never inherits this toolkit repository's tags. A normal save
checks every approved tag and its usage but shows the owner only relevant tags,
proposed tags, and concrete warnings.

The installed health tool generates four read-only views:

```text
node .claude/tools/knowledge-health.mjs health [project-root] [--json]
node .claude/tools/knowledge-health.mjs properties [project-root] [--json]
node .claude/tools/knowledge-health.mjs tags [project-root] [--json]
node .claude/tools/knowledge-health.mjs provenance [project-root] [--json]
```

Add `--focus <repository-relative-path>` after an approved save to limit
owner-facing warnings to that file while still checking the complete tag
vocabulary and its usage.

The reports are generated on demand from Markdown and are never committed.
They identify mechanical risks. The cleanup skill reviews meaning and proposes
the owner-approved repair. No tool silently changes persistent knowledge.

## What each folder owns

- `knowledge/project.md`: what the project is, why it exists, what finished
  looks like, its main workstreams and boundaries, who is involved, and where
  active work is tracked.
- `knowledge/specs/`: approved product or system behavior.
- `knowledge/memory/`: persistent context, decisions, domain language, project
  conclusions, operations, planning, and external references.
- `knowledge/brainstorms/`: raw exploration that is not approved truth.
- `knowledge/index.md`: a generated map of specifications and memories.
- `knowledge/.obsidian/`: one portable setting that keeps links relative and
  updates Markdown links when Obsidian renames a file.

Normal relative Markdown and Git remain authoritative. Obsidian is optional.
The plugin installs no community Obsidian plugin and no Git synchronization.

## Approval boundary

Every proposal starts with short What, Where, Why, Assumptions, and Unverified
bullets. Full file text appears only when the owner asks. Approval covers only
the meaning in those bullets, and the write may add no unlisted claim, source,
assumption, or background.

Nothing writes persistent project knowledge automatically. Hooks remind and read.
Helper agents may research, but they cannot approve a save.

## Migration

The installed layout tool has four modes:

```text
node .claude/tools/knowledge-layout.mjs detect [project-root] [--json]
node .claude/tools/knowledge-layout.mjs plan [project-root] [--json]
node .claude/tools/knowledge-layout.mjs apply [project-root] --approve <plan-hash>
node .claude/tools/knowledge-layout.mjs review-retired [project-root] --output <empty-dir>
```

Detection uses system signatures, not folder names. It reports `knowledge`,
`flat-149`, `retired-v3`, `none`, `mixed`, or `unknown`.

`plan` never writes. A flat-layout plan checks targets, symlinks, and mapped
Markdown links, and emits the hash required by `apply`. Apply moves documents
without changing their bytes except for deterministic relative-link repair,
discards the old generated index, and rebuilds the new one.

Retired documents cannot be converted safely by guessing what an old `Basis:`
line means for source, date, session, source file, and tags. `review-retired`
therefore writes drafts and a manifest to a separate empty review directory.
It never changes or finalizes the project. The owner resolves every placeholder
before a later approved adoption pass.

Mixed, partial, ambiguous, colliding, escaping, or dangling layouts stop with
no project write.

## What is deliberately absent

- the retired memory verifier;
- the retired large always-loaded memory rule;
- the retired shape checker and per-folder indexes;
- a database, embeddings, or memory server;
- automatic transcript capture or background curation;
- Obsidian-only wikilinks, canvases, Bases, community plugins, or Git plugins;
- a private note store outside the repository.

## Verification

```text
node plugins/second-brain/tests/knowledge-harness.mjs
node plugins/second-brain/tests/retirement-harness.mjs
node plugins/second-brain/tests/session-search-harness.mjs
```

The knowledge harness builds temporary projects for every detector state,
checks greenfield assets, runs flat migration, tests link repair and failures,
creates retired review drafts, exercises both hooks, checks property, tag,
provenance, and health behavior, and removes every fixture.
The session-search harness builds local transcript fixtures, checks scope and
privacy boundaries, expands selected messages, verifies failure states, and
proves the transcript tree stays unchanged.

## Version 2 templates, being built

The memory system v2 build ships beside the version 1 files above. Nothing here
is installed by setup yet. The v1 template tree, hooks, and tools keep working
until the cutover.

The v2 project shape lives under
`skills/second-brain/references/templates-v2/`:

| File | What it is |
| --- | --- |
| `templates-v2/knowledge/project.md` | Project identity and the whole settings surface in YAML front matter: `schema_version`, `project_id`, `project_root`, `subroots`, `privacy`, `profiles`, and the optional `tracker` and `startup.budget_bytes`. |
| `templates-v2/knowledge/map.md` | Logical roles, their current physical paths, owners, authority, and how each is searched. Includes the reference area that keeps research-spike reports findable. Mapped areas point at folders that already exist. |
| `templates-v2/knowledge/current.md` | The authored current focus, blockers, next step, and handoff. Written only through the write coordinator. |
| `templates-v2/knowledge/specs/` | Approved project or system behavior. Empty until the first document. |
| `templates-v2/knowledge/memory/facts/` | Durable facts. Empty until the first record. |
| `templates-v2/knowledge/memory/decisions/` | Durable decisions. Empty until the first record. |
| `templates-v2/knowledge/memory/events/` | Durable events. Empty until the first record. |
| `templates-v2/knowledge/memory/patterns/` | Durable patterns. Empty until the first record. |
| `templates-v2/records/fact.md` | The starting shape of a fact record: the version 2 front matter, the H1, the one-sentence summary under it, and a note on what each field has to carry. |
| `templates-v2/records/decision.md` | The starting shape of a decision record, carrying the five required body sections: context, decision, reason, rejected options, and consequences. |
| `templates-v2/records/event.md` | The starting shape of an event record, with the `occurred_at` field and what to write there when the exact date is unknown. |
| `templates-v2/records/pattern.md` | The starting shape of a pattern record, with the non-empty `based_on` list a pattern must name and the line between a pattern and a proven cause. |
| `templates-v2/claude-settings-snippet.json` | The keys setup merges into a project's `.claude/settings.json`: `CLAUDE_CODE_DISABLE_AUTO_MEMORY` set to `1`, the plugin enabled, and the `PreToolUse` registration for `memory-write-guard.mjs`. The `SessionStart` registration for the v2 boot brief is added by the cutover work item, which swaps it for the v1 loader. |
| `templates-v2/gitignore-snippet.txt` | The `.memory/` entry setup appends to the project's root `.gitignore`. Local write state is disposable and never committed. |

Empty type folders keep a `.gitkeep` until their first document, the same way
the v1 tree does. `knowledge/memory/pins.md` and `knowledge/retrieval-gold-set.md`
are optional canonical files, so the template does not create them. A new
project has neither, and their absence is not an error.

The v2 startup path ships beside the v1 loader. Nothing below is registered in
any project yet; the cutover work item swaps the hooks.

| File | What it is |
| --- | --- |
| `tools/boot-brief.mjs` | The source resolver and boot brief assembler. It reads the startup inputs, renders the ten blocks in order, keeps them inside `startup.budget_bytes`, degrades optional detail in the fixed four-step order, and reports a missing, stale, or over-budget input as a visible warning. The current block renders the authored lines of `knowledge/current.md` and the recent block shows up to three approved updates from the last 72 hours, or the latest dated update labeled with its age. Neither writes a new statement. Read-only. Run it directly for the Codex route: `node tools/boot-brief.mjs [project-root] [--json]`. |
| `tools/tracker-adapter.mjs` | The optional tracker adapter. A project with no `tracker` block in `knowledge/project.md` runs no adapter and starts no command. Where one is configured, the `github-project` adapter reads that board through the `gh` command line and hands the brief up to three work-item lines with their live status and links. Every wait is bounded, nothing throws, and an unreachable tracker returns a short mechanical reason that never carries command output. The command runner is injectable, which is how the tests drive the success path with no network call. |
| `hooks/boot-brief-session-start.mjs` | The Claude Code `SessionStart` adapter. It runs the assembler and prints the brief as session context. Fail-open: every path exits 0, a directory outside a memory project prints nothing, and a broken memory system degrades a session rather than stopping one. |
| `tests/boot-brief-harness.mjs` | Builds temporary v2 projects from the templates above and checks block order, the exact degradation order, what is never dropped, visible overflow, missing sources, pin hash verification, the 72 hour stale window, the recent window rule with its fallback and empty cases, byte-for-byte repeatability, and the hook's fail-open paths. The tracker fixtures cover an absent adapter, a failing one, an unknown adapter name, and a reachable board driven by an injected command runner. Every fixture date is derived from a fixed injected clock, so no check depends on the wall clock. |

```text
node plugins/second-brain/tests/boot-brief-harness.mjs
```

Codex has no fail-open startup hook and reads root `AGENTS.md` and nothing
else, so its v2 route is text rather than a hook. The block, the setup step,
the sync step, and the drift rule that keeps the two host routes carrying the
same meaning are in `skills/second-brain/SKILL.md`, under "Version 2 Codex
startup route".

## Version 2 tools, being built

The v2 memory operations run through one command-line entry beside the v1
tools. Nothing here is installed by setup yet.

```text
node plugins/second-brain/tools/memory.mjs capabilities
node plugins/second-brain/tools/memory.mjs status
node plugins/second-brain/tools/memory.mjs related --id <record-id>
node plugins/second-brain/tools/memory.mjs validate [--check MV-01,MV-03] [--fixtures]
node plugins/second-brain/tools/memory.mjs update-current --trigger handoff|focus-change|completed-work --file <staged.md> --propose
node plugins/second-brain/tools/memory.mjs update-current --trigger <same> --apply --proposal <id> --content-hash <hash>
node plugins/second-brain/tools/memory.mjs rebuild-views
node plugins/second-brain/tools/memory.mjs cancel --proposal <id>
node plugins/second-brain/tools/memory.mjs noop [--reason "<text>"]
node plugins/second-brain/tools/memory.mjs add --type fact|decision|event|pattern --file <staged.md> [--dest <path>] --propose
node plugins/second-brain/tools/memory.mjs confirm --id <record-id> --evidence <locator> [--source-type <name>] --propose
node plugins/second-brain/tools/memory.mjs correct --id <record-id> --file <corrected.md> --reason "<text>" --propose
node plugins/second-brain/tools/memory.mjs supersede --old-id <record-id> --file <successor.md> [--dest <path>] --propose
node plugins/second-brain/tools/memory.mjs retire --id <record-id> --reason "<text>" --phrase "<exact text>" [--phrase ...] [--exempt "<path>: <reason>"] --propose
node plugins/second-brain/tools/memory.mjs merge --ids <id>,<id> --survivor <id> --pin keep|drop --propose
node plugins/second-brain/tools/memory.mjs delete --id <record-id> --reason "<text>" [--privacy] --propose
node plugins/second-brain/tools/memory.mjs pin --id <record-id> [--why "<text>"] --propose
node plugins/second-brain/tools/memory.mjs unpin --id <record-id> [--why "<text>"] --propose
node plugins/second-brain/tools/memory.mjs move --id <record-id> --to <new path> [--why "<text>"] --propose
node plugins/second-brain/tools/memory.mjs search --query "<text>" [--type fact|decision|event|pattern] [--status active|superseded|retired] [--domain <v>] [--topic <v>] [--limit <n>]
node plugins/second-brain/tools/memory.mjs get --id <record-id> | --path <relative-path>
node plugins/second-brain/tools/memory.mjs timeline --entity <name> [--from <date>] [--to <date>]
node plugins/second-brain/tools/memory.mjs sources --id <record-id>
node plugins/second-brain/tools/memory.mjs spec-search --query "<text>" [--limit <n>]
node plugins/second-brain/tools/memory.mjs spec-get --id <spec-id> | --path <relative-path>
```

Every writing operation above takes the same second call as `update-current`:
`--apply --proposal <id> --content-hash <hash>`.

| File | What it is |
| --- | --- |
| `tools/memory.mjs` | The one entry for every v2 memory operation. It prints one JSON envelope and nothing else. This build carries `capabilities`, `status`, the retrieval router (`search`, `get`, `timeline`, `related`, `sources`, `spec-search`, and `spec-get`), `validate`, `update-current`, `rebuild-views`, the seven writing lifecycle operations, `pin`, `unpin`, and the `noop`, `cancel`, and `move` plumbing; the rest of the surface is reported as unavailable rather than stubbed. `move` stays plumbing rather than a twenty-fourth operation, because the stable surface is closed and a move creates no meaning. |
| `tools/lib/scope.mjs` | Physical scope resolution, member-path testing, and the recorded privacy boundary. One home, because every entry point needs the same answer. A missing or unknown privacy value reads as the most restrictive setting. |
| `tools/lib/result.mjs` | The result envelope with its fixed field order, the closed reason-code list, and the exit mapping: 0 ran, 1 refused, 2 could not be evaluated. |
| `tools/lib/record-schema.mjs` | Record schema 2.0 and project settings schema 2.0: the four types, the allowed values, the required fields, the decision sections, the required project core, and the judgment of one record against all of it. It reads no file it was not handed and writes nothing. |
| `tests/capabilities-harness.mjs` | Builds temporary projects and runs the real command line: the capabilities payload, the status payload, the envelope shape, exit codes, the restrictive privacy fallback, the 72-hour stale rule, and byte-for-byte determinism. |
| `tests/schema-harness.mjs` | Builds temporary projects and validates real records: every required field, every refusal the schema owns, the legacy warning that never fails a run, the shipped record templates, the check catalog with its skipped entries, the call-shape errors, and byte-for-byte determinism. |
| `tools/memory-write.mjs` | The write coordinator and canonical store. It is the only file that changes canonical Markdown. Every write runs in two calls: `--propose` writes the whole proposal to `.memory/review/<proposal-id>.md` and changes nothing, and `--apply` rechecks the proposal hash, the destination, the record id, the pin statement, and every cited source hash before running one transaction: lock, journal with preimages, staged contents, legacy upgrades, view rebuild, focused validation, and either a clean finish or a full restore. It also holds the view generator and the `knowledge/current.md` update. There is no force flag and no non-interactive approval mode. |
| `tests/coordinator-harness.mjs` | Builds temporary projects and drives the real coordinator: a proposal that changes nothing, every bound input that sends the review back, the Edit action with its re-validation, the four required `current.md` sections, the legacy touch upgrade, generated views with their fingerprints, a failed transaction that restores every preimage, and a child process killed mid-transaction that is recovered from the journal at the next call. It also drives the pre-write guard as its own process: a direct edit, a helper agent, and a script are each refused and leave every canonical file unchanged, while Git, a coordinator call, and a read are untouched. |
| `hooks/memory-write-guard.mjs` | The Claude Code `PreToolUse` guard. It refuses `Edit`, `Write`, `MultiEdit`, `NotebookEdit`, and `Bash` writes into `knowledge/memory/`, `knowledge/specs/`, and `knowledge/current.md` from any route other than the coordinator, and refuses any change to `project_root`, `subroots`, or the `privacy` block in `knowledge/project.md`. No model sits in its path. It exits 0 on every path and refuses through the `permissionDecision` payload, naming the `memory.mjs` operation that should have been used. Fail-closed: a call it cannot evaluate that names a guarded path is denied. `git` commands and calls that invoke `memory.mjs` or `memory-write.mjs` are allowed, and it says nothing at all about anything else. |
| `tools/memory-write.mjs` (lifecycle engine) | The seven writing operations of architecture section 14 live beside the coordinator, because each one only builds a request and hands it to the same two-phase review: ADD refuses a used id and a meaning the project already carries, CONFIRM appends evidence and a confirmation without touching the summary, CORRECT records the reason and requires evidence the record did not already carry, SUPERSEDE writes both links and both effective dates in one transaction, RETIRE hunts the exact phrases across tracked Markdown, MERGE allows only identical meaning with compatible truth status and dates, and DELETE shows the whole record as a visible diff and reports the Git-history boundary. NOOP is the default outcome: a call that would change no byte stores nothing and says so. |
| `tests/lifecycle-harness.mjs` | Builds temporary projects and runs the real lifecycle operations end to end: each of the seven, the NOOP outcome, and every refusal each one owns. It also runs PIN and UNPIN end to end and proves AT-05 (a cold session receives the exact approved statement with its link), AT-07 (unpin removes startup visibility and nothing else), AT-08 (supersede, retire, correct, and delete drop the old pin in their own transaction and never pin a successor), AT-09 (a pin that would break the startup budget is refused with the byte count and the current pin set), and MV-06 in both directions. It proves AT-10 (two sources stay two evidence entries on one record), AT-11 (a superseded record leaves current truth, keeps both links and both dates, and stays on disk for the timeline), AT-12 (the retirement phrase hunt finds surviving current uses, honors quotations and exemptions, and MV-08 repeats it), and AT-23 (two conflicting meanings stay separate, linked, and independently evidenced). |
| `tools/lib/pins.mjs` | The pin registry format, in one place: the path of `knowledge/memory/pins.md`, its four columns (record id, link, approval date, summary hash), the pin statement limit, the summary hash, and the reader that turns a row into an entry. The pin manager writes it, the boot brief renders from it, and validator check MV-06 judges it, so none of the three carries a second copy of the format. It reads no file it was not handed except to resolve a link target, and it writes nothing. |
| `tools/memory-write.mjs` (pin manager) | PIN and UNPIN of architecture section 11, beside the coordinator because both go through the same two-phase review. PIN runs every eligibility check of section 11.1 in order, then the budget preflight that renders the brief the project would actually assemble with the candidate set and refuses rather than letting startup discover the overflow later. The entry it writes holds only the record id, a relative link, the approval date, and the hash of the exact approved summary; the summary itself is never copied. UNPIN removes startup visibility and nothing else, and removing the last entry removes the file. Section 11.4 lives here too: supersede, retire, and delete drop the old pin in their own transaction, correct drops it unless `--keep-pin` re-approves the corrected wording, merge requires an explicit choice, and a successor is never pinned automatically. |
| `tools/lib/links.mjs` | Ordinary relative Markdown links, in one place: what counts as one, where it points inside the scope, the link text one file uses to reach another, and the rewriter that changes a target and no other byte. Fenced blocks and code spans are examples rather than links, so nothing reads or repairs them. `related`, validator checks MV-21 and MV-22, and the move transaction all read the same answer, because two link parsers is how a repair and a check start disagreeing about the same line. It writes nothing and needs no `.memory/`. |
| `tools/memory.mjs` (`related`) | The links a record carries and the project records that link back to it. Backlinks are derived on request by reading the current files, so there is no backlink registry, graph, database, index, or cache, and the whole operation works with `.memory/` absent. A front matter relation comes back under its own field name, a body link comes back as `links_to`, a file that names the record without linking to it comes back as `mentions`, and a candidate in another scope is dropped rather than returned. |
| `tools/memory-write.mjs` (move and rename) | MOVE of architecture section 12.4. One record changes its canonical path, every tracked project Markdown file that links to it is repaired, the record's own outgoing links are retargeted, and all of it lands in one approved transaction. A link this project may not write, such as one inside a declared subroot, refuses the whole move and names the exact path instead of leaving half of it behind. The transaction checks the repository again after staging, so a link that appeared after the review restores every preimage. The outcome is recorded in `.memory/last-move.json`, which is local and disposable, and which is what validator check MV-22 inspects. |
| `tests/links-harness.mjs` | Builds temporary projects and runs the real command line: an unknown id, the outgoing and incoming shape of `related`, AT-21 with `.memory/` absent and no local state left behind, MV-21 on resolvable and broken links, and AT-22 as one approved move that repairs a specification, a record, and a `README.md` outside `knowledge/` while leaving code spans and fenced examples alone. Two failing-repair fixtures change nothing: one refuses at the proposal, and one refuses inside the transaction after a new link appears, restoring every preimage. |
| `tools/memory.mjs` (retrieval router) | The read side of architecture section 15: `search`, `get`, `timeline`, `sources`, `spec-search`, and `spec-get`, beside `related`. It reads canonical Markdown on every call, so there is no index, cache, working set, or metrics file to keep in step, and every operation works with `.memory/` absent. Each result carries the section 15.2 minimum contract: the project that answered, the authority layer, the record id or path, the status, the one-sentence summary, the provenance, the match reason, and a degraded-state warning where one applies. Relevance is how many of the question's terms a candidate answers, and equally relevant candidates rank by the section 15.2 authority order, so a current specification comes before a derived memory. A superseded or retired record stays out of a current answer until `--status` asks for it. The envelope's `searched` field names the layers, the tracker, and the session-history scope the call actually covered, which is what an honest failure reports. An empty answer stays empty at exit 0, and a query or filter that will not parse is an error at exit 2 rather than no evidence. |
| `tests/retrieval-harness.mjs` | Builds temporary projects and runs the real command line across all six retrieval operations: the result contract, the authority order, the filters, the line between current truth and history, the exact-lookup refusals, and the two specification operations. It proves AT-13 (a search locates the record, `get` opens the whole record, and `sources` reaches the original evidence file in full), AT-15 (an unanswerable question comes back empty with the searched scope named), and AT-17 (every operation answers with no `.memory/` folder present, and the project holds exactly the same files and the same bytes afterwards). A candidate inside a declared subroot is dropped before ranking and reported as a warning. |

`capabilities` answers what this project's memory can do, so an agent reads the
build state instead of guessing: the operations it carries, the approval mode,
the search mode, pin support and count, the startup budget, the project id and
privacy boundary, whether data may leave the machine, the tracker adapter, the
session-history scope, and every degraded feature with its reason.

`status` answers what this project's memory holds right now: record counts by
type, pin count, whether `knowledge/current.md` is present and how old its
latest update is, whether a recovery journal is waiting, where the gold set
lives, and the date the staleness comparison used.

`validate` runs the twenty-two versioned checks, `MV-01` through `MV-22`, and
prints one entry per check with its id, version, verdict, and findings. This
build carries the required-files half of `MV-01`, the record schema in `MV-03`,
the inference basis in `MV-04`, the record links in `MV-05`, the pin registry in
`MV-06`, the retired phrases in `MV-08`, the relative links in `MV-21`, and the
move repair in `MV-22`. Every other check reports `skipped` with the component
it is waiting on, so nothing reads as a pass that was never run. `MV-22` reports
`skipped` too in a project that has never moved a record, because it has nothing
to inspect. A
migrated record missing version 2 metadata is a `record/legacy-gap` warning
naming the gaps, never a failure: migration does not invent metadata, and the
record is upgraded on its next approved touch.

`update-current` is the only route that writes `knowledge/current.md`, on the
three triggers the design allows: an explicit handoff, an approved change of
current focus, and an approved completed-work event that changes current state.
The staged file has to carry all four headings, current focus, blockers, next
step, and handoff, and the coordinator stamps the `updated` date on every write
so startup can judge staleness. An approved completed-work event that changes
current state writes the event and `current.md` in one transaction, and the
owner sees both in one review.

`rebuild-views` regenerates whatever derived artifact a project has separately
approved. A default project has none, so the operation reports NOOP rather than
failing. A view names itself with `generated: true`, lists its inputs, and
carries a deterministic input fingerprint, so an unchanged rebuild produces an
unchanged file and creates no Git diff.

`cancel` removes a review file after a skip. It touches nothing canonical and
is not part of the reported operation surface.

Approval is never something the tool invents. The skill layer shows the five
bullets and collects the owner's keep, change, edit, or skip. The apply call
carries the proposal id and the hash of the exact review file, and any bound
input that moved between the two calls sends the review back. The owner may
edit the review file directly; the coordinator validates the edited contents
again before it writes, and a confirmation approves them without the owner
describing the edits a second time.

## Version 2 skill drafts, being built

A rewritten skill text would drive the v2 workflow while every installed project
still runs v1, so each rewrite ships as a draft beside its live `SKILL.md`. The
live files keep working until the cutover work item swaps the drafts in.

| File | What it is |
| --- | --- |
| `skills/remember/SKILL-v2.md` | Draft rewrite of the `remember` skill for memory system v2, swapped in at cutover. It runs the save pipeline end to end: check what this build can do, search the tracker and every current owner, route work state, rules, skills, specs, and source material out first, run the durable-information and future-agent interpretation tests, choose NOOP or a record type, fix provenance and scope, search duplicate meaning and the entity timeline, choose the lifecycle operation, stage the file, propose, show the five bullets, wait for the owner, apply against the reviewed hash, and report only what actually changed. It carries the completed-work event shape with its proposal splitting, required `occurred_at`, exact tool names beside their aliases, evidence links instead of transcripts, and the rule that no automatic route may ever start it. It also carries the three `knowledge/current.md` triggers with the four required sections, and the approval path for promoting unreviewed research. The live `skills/remember/SKILL.md` is untouched. |
| `skills/recall/SKILL-v2.md` | Draft rewrite of the `recall` skill for memory system v2, swapped in at cutover. It is the read path: route the question to its first owner, then widen one tier at a time from loaded context, to exact lookup with `get` and `spec-get`, to curated search with `search` and `spec-search`, to relationship and timeline expansion with `related`, `timeline`, and `sources`, to active work and the tracker, to gated session history, and finally to an honest failure that names the searched scope. It teaches the section 15.2 result contract, the authority order at equal relevance, the four record types with `domain` and `topics` in place of the old seven memory folders, what each `epistemic_status` value permits, and the consequential-recall rule that a consequential answer opens the complete record and follows provenance to the original evidence. Reading creates no local state. The live `skills/recall/SKILL.md` is untouched. |
| `skills/session-search/SKILL-v2.md` | Draft rewrite of the `session-search` skill for memory system v2, swapped in at cutover. It puts the section 15.5 gate first: history opens only when the owner asks in this session, or when the agent names which current owners it searched and what they were missing, and in a project marked sensitive only the owner request opens it. The reason travels with the call as `--reason`, so a blank or one-word reason is refused with `history/gate-closed` and reads nothing. It keeps every existing scope flag, adds the locator route, and requires the original message to be opened before its wording is quoted. A missing or unreadable store is a scoped `history/unavailable` warning naming the machine, host, project, and dates covered, never a claim that the subject was never discussed. The live `skills/session-search/SKILL.md` is untouched. |

`skills/session-search/scripts/search-sessions.mjs` gained the v2 additions in
the same change, all of them compatible with the v1 script every installed
project still runs. Existing calls keep their fields, flags, and exit codes, and
each match now also carries the host, the machine, the message date, and a
message locator naming the session, the message, and the transcript line
(FR-107). The new `searchSessionsGated` entry point, reached with `--reason`,
runs the gate and returns the contracts section 2.21 shape: `host`,
`session_id`, `date`, `role`, `message_locator`, and a short excerpt per entry.
It copies nothing, indexes nothing, and writes nothing.

## Maintaining this plugin

A content change updates both plugin manifests and the marketplace metadata.
Keep the three consuming workflows aligned: `project-init`, `project-sync`, and
this plugin. The project specification is the behavior authority; the package
is its portable implementation.
