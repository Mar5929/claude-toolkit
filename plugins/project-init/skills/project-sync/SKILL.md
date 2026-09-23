---
name: project-sync
description: >-
  Audit an EXISTING project against the claude-toolkit and set up whatever is
  missing. Use when the user points a project at the toolkit and says things
  like "make sure all the tools, rules, and systems from my toolkit are set up
  in this project", "sync this project with claude-toolkit", "audit this
  project against the toolkit", or "/project-sync". This skill inventories
  everything the toolkit currently ships (the general and Salesforce rules
  libraries, hooks, the optional System Guide, the local-folder work-tracker,
  the packaged project knowledge system, safe conversion off an older knowledge layout, the session-skills
  plugin, and any newer systems), cross-references the current project,
  reports the gaps, including rules the project has but that are behind the
  toolkit's current version, and closes each gap only with the user's approval.
---

# project-sync: bring an existing project up to the toolkit

`project-init` lays foundations in a NEW project. This skill is its sibling for
EXISTING projects: figure out what the toolkit provides, check the current
project against it, report the gaps, then close the gaps the user approves.

Run the steps in order. Do not change the project being audited before step 4.
A normal project-sync invocation includes refreshing the toolkit source in step
1 so the comparison uses the current inventory. If the owner asked for a
read-only or audit-only run, the whole invocation stays read-only: do not update
an installed plugin, pull a clone, fetch the repository, change the project,
record declines, or write the sync record. Use the best source already
available, identify it and its known freshness in the findings report, then stop
after step 3. A later explicit request to fix selected findings enters the normal
approval and recording flow in steps 4 and 5.

## Step 1: inventory the toolkit

**First, refresh the installed toolkit so this audit sees the latest.** A normal
project-sync request authorizes this source refresh; a read-only or audit-only
request follows the no-mutation exception above. This
skill reads the toolkit from the installed plugin copy (option 1 below), and
that copy does NOT update itself when the repo changes on GitHub. A merged
change sits on GitHub until each machine pulls it. So before inventorying,
update the local copy: inside a Claude Code session run
`/plugin marketplace update claude-toolkit`, or from a terminal run
`claude plugin marketplace update claude-toolkit`. Skip this for a read-only audit
or when reading from a freshly-pulled local clone (option 2). A stale plugin copy
produces a stale audit, so the project silently misses the newest rules and
systems, which is the exact failure this step guards against.

Build the list of things the toolkit currently provides. Do not hard-code
today's list; read the toolkit itself so new systems are picked up
automatically as it grows.

- Locate the toolkit files, in order of preference:
  1. They ship with this plugin. From this skill's directory, `../../library/`
     holds `rules/general/` (with its `README.md` index), `rules/salesforce/`
     (with its own index), `skills/`, `tools/`,
     `templates/`, and `guides/`. The sibling skill's
     `../project-init/references/` holds `thin-agents-md.md`,
     `folder-agents-md.md`, `toolkit-manual-delivery.md`, and `setup-flow.md`,
     and the plugin root holds `.claude-plugin/plugin.json`.
  2. A local clone of the toolkit repo, if the user has one.
  3. Fetch the repo (`Mar5929/claude-toolkit`), or ask the user where it lives.
- For a separately packaged system such as `system-guide` or `second-brain`, locate its installed
  plugin or the sibling source in the local toolkit clone. During the read-only
  audit, the marketplace manifest is enough to report availability. Install
  the system plugin only after the owner approves adoption, then use its
  canonical sources instead of maintaining copies in `project-init`.
- Enumerate, at minimum:
  - every rule file in `library/rules/general/`, noting from its `README.md`
    which are default ON and which are conditional, and what each rule currently
    says, so step 2 can tell a project copy that is merely worded differently
    from one that is genuinely behind; Salesforce projects also get the
    `library/rules/salesforce/` files
  - every project skill in `library/skills/` (today `library/skills/salesforce/`),
    and which rule opens each one, from `library/rules/salesforce/README.md`
  - the `Plain English` output style file and setting. This is the toolkit's
    default for project setup; the toolkit also ships `Terse`, which the owner
    may select instead. Check the installed file against
    `library/output-styles/plain-english.md` and check the selected name
    separately. Preserve an owner's deliberate choice of another style,
    including `Terse`
  - the per-server MCP tool rules in `../../library/guides/mcp-best-practices.md`;
    these are conditional, so only audit the servers this project connects
  - each system from the setup gates: hooks, System Guide, project knowledge,
    knowledge layer
  - the document folder Gate 1 offers every project, `docs/designs/`. It is the
    folder plus a short `README.md` plus its own line in the codemap, and a
    folder with no codemap line is a folder no agent opens, so check all three
    parts. `../project-init/references/setup-flow.md` has what it holds and how
    long a file in it lives. It only applies where work items are tracked
    outside the repository; a project on the Git-ignored `.work-items/` tracker
    keeps each design with its own item, so the folder is not a gap there. A
    project that was offered it and declined is not missing it; record the
    decline so this audit stops raising it
  - the multi-part kits, which are a tool plus a rule plus a hook rather than a
    single file, so a partial install looks like a pass unless you check each
    part: the Salesforce permission set kit
    (`salesforce-permissions-retrieval.md`), the Salesforce dependency graph
    (`salesforce-dependency-graph.md`, whose tool is `../../library/tools/kb/`),
    and, for every other stack, the graphify code graph
    (`graphify-dependency-graph.md`, whose rule is
    `library/rules/general/dependency-graph.md`)
  - the `work-tracker` plugin, root `.work-items/`, and any older
    `delivery/work-items/`, `engagement/work-items/`, or root `work-items/` tree
  - the work-item lifecycle rule in `.claude/rules/`, the declared tracker,
    and its stage markers (a local `stage` field or GitHub stage labels).
    Local mode also needs the current work skill and CLI for active-item
    selection, progress, validation, and completion events. Missing optional
    fields on legacy items are valid; never backfill them.
  - the root `AGENTS.md` quick-save table and its matching rules. Expect a
    documentation-publication pointer and unscoped `knowledge-direct-commit.md`
    even without knowledge, unless explicitly declined. Report a legacy
    `knowledge/**` frontmatter restriction as stale. Expect a
    `knowledge/` row only for configured project knowledge and a `.work-items/`
    row only for configured local tracking. Each row points to the canonical
    manual, rule, or skill and does not repeat the full procedure. Report a
    missing or stale row, a row for an absent system, and a configured quick-save
    system whose owning instructions are missing or outdated
  - the `hooks-library` plugin. Audit `spec-check-reminder` under
    `PostToolUse` only where `session-skills` is installed. Check its settings
    entry and copied script. Report any retired `work-item-stage-reminder`
    script or registration for removal, preserving all other hooks. Also
    report the retired `memory-pr-hook` plus `wrap-up-ritual.md` route for
    removal after the current knowledge package is installed.
  - a project still carrying the retired voice rules (`writing-and-language.md`,
    `how-to-reply.md`, `treat-owner-as-non-technical.md`,
    `define-your-terms.md`). All four were removed from the toolkit in favor of
    an output style. Report them, but see step 4 before touching any
  - a project still carrying the retired style hooks (`style-reminder` under
    `UserPromptSubmit`, `writing-guard` under `Stop`, or their scripts and
    `.claude/style-reminder.json` and `.claude/writing-guard.json` config
    files). Both were removed from the toolkit in August 2026 as per-message
    overhead. Report them for removal:
    delete the settings entry, the script, and the config file, leaving every
    other hook entry alone
  - a project still carrying `explain-simply-reminder` under `UserPromptSubmit`.
    The toolkit shipped it in September 2026 and removed it in issue #271, where
    the `plain-english` output style replaced it. Report it for removal, and
    offer the style in its place rather than a bare deletion. Match on the
    script name, never on the event: `memory-reminder.mjs` sits under the same
    event, belongs to project knowledge, and stays
  - a project still carrying a `.claude/output-styles/plain-language.md` file,
    at any vintage. The toolkit removed that style in issue #245. Offer to
    replace it with the current `plain-english.md` and select `Plain English`,
    unless the owner deliberately chose another style
  - the short instruction-file pair the toolkit now writes inside each major
    folder: an `AGENTS.md` holding the folder content and a `CLAUDE.md` beside
    it holding the single line `@AGENTS.md`, per
    `../project-init/references/folder-agents-md.md`. Read that file so step 2
    can tell a missing one from a folder the toolkit deliberately skips (the
    five kinds in that file's "Which folders are skipped")
  - each conversation skill and helper agent offered by the setup flow, which
    ship in the `session-skills` plugin
  - anything newer listed in the toolkit README under "What's here now"
  - skip roadmap items; they are not built and cannot be audited. The current
    project-knowledge package is shipped and must be inventoried from its
    plugin. Existing retired v1 integration remains a separate local finding
- Note the toolkit version (from `plugin.json` or `marketplace.json`) for the
  sync record in step 5.

## Step 2: audit the current project

For each inventory item, look for evidence in the project. Judge by intent, not
exact wording: an AGENTS.md that says "work on your own branch and land by pull
request" satisfies `parallel-agent-sessions.md` even if the prose differs.
Typical checks:

- **AGENTS.md and `.claude/rules/`**: does AGENTS.md exist and point at
  `.claude/rules/`, and does that folder carry each default-ON general rule (a
  file, or the rule's intent folded into AGENTS.md)? Judge by intent, not exact
  wording or file name.
- **Project skills (both copies)**: for each installed rule that opens a
  skill, check `.claude/skills/<name>/` and `.agents/skills/<name>/`. Report
  **missing** when either copy is absent, **partial** when the two copies are
  not byte-identical or either is a symlink, and **outdated** when they match
  each other but not `library/skills/<stack>/<name>/`. Compare every file in
  the folder, not only `SKILL.md`. Report host-specific frontmatter beyond
  `name` and `description` in either copy.
- **Rules index location**: the index of copied rules belongs in
  `.claude/RULES.md`. Report a `.claude/rules/README.md` as a gap: Claude Code
  loads it as a rule in every session. The fix is to move it, not delete it.
- **`paths:` rules for Codex**: for each rule in `.claude/rules/` with
  `paths:` frontmatter, `AGENTS.md` should carry one line naming the path
  pattern and the rule file. Report each missing or stale line.
- **Output style**: does the project have `.claude/output-styles/plain-english.md`
  and select `"outputStyle": "Plain English"` in its committed settings? Check
  `.claude/settings.local.json` for an override too. The setting must match the
  file's `name`, and the installed guidance should match the current shipped
  meaning. Report a missing file, stale guidance, or mismatched selection as a
  gap. A deliberate owner choice of another style is an exception to preserve,
  not a gap to overwrite. Concise is a Claude Code built-in, not a toolkit
  default. A leftover `plain-language` selection needs migration.
- **AGENTS.md health** (presence is not enough, see below).
- **Is the instruction-file pair in the current layout?** (see below). A project
  can hold every rule and still be writing them into a file Codex never reads.
- **Hooks**: are guard and orientation hooks configured (the project's
  `.claude/` settings and hook scripts)?
- **Salesforce dependency graph** (Salesforce projects only): does `tools/kb/`
  exist with every file the toolkit ships, is
  `.claude/rules/dependency-graph.md` present, are the graph and freshness
  artifacts gitignored, and is the freshness Stop hook wired in
  `.claude/settings.json`? Classify it **partial** when the tool is there but
  the rule or the hook is not, because that is the state where the graph
  quietly ages and nobody is told to use it. A project that has the older
  wording (a `structural-layer` rule, or a `tools/kb/` copy predating the
  toolkit's) is present-but-behind, not missing: report the differences and
  offer to bring it in line. Never run a Salesforce CLI command during this
  check; the tool reads local files only.
- **Graphify code graph** (non-Salesforce projects): is the `graphify` command
  available, is `graphify-out/` gitignored, is
  `.claude/rules/dependency-graph.md` present, and are the auto-rebuild git
  hooks installed in THIS clone? Check the last one by looking for graphify's
  `post-commit` and `post-checkout` hooks in the repository's hidden git hooks
  folder, or wherever `core.hooksPath` points. Classify **partial** when the
  tool is present but the rule or the hooks are not, and say which. Two findings
  are worth calling out because nothing else makes them visible:
  - **Hooks missing in this clone.** Git hooks are never committed, so a clone
    made after setup has none, and its graph stops updating while still
    answering questions confidently. The fix is `graphify hook install`, run
    once, here.
  - **A hand-written rule.** A `.claude/rules/dependency-graph.md` that does not
    match the library file is behind: report the differences and offer the
    current version, same as any other drifted rule.

  A project that deliberately rebuilds by hand with `graphify update .` instead
  of using hooks is not missing anything. Record that choice so a later sync
  does not re-raise it.
- **System Guide:** report exactly `on`, `off`, or `needs repair`, and name the
  configured guide path whenever one is available. Read the previous sync
  record, project-root `.system-guide.json`, the required guide files, and the
  project's active plugin selection. A plugin present in a marketplace, cache,
  or checkout is only available; it does not prove the project enabled it.
  - **off:** `.system-guide.json` is absent or has `enabled: false`. Preserve a
    recorded decline and do not raise it again. An enabled plugin or an existing
    folder alone does not change this state.
  - **on:** the config is valid and enabled, its relative in-project
    `guidePath` exists, the required entry, tour, section indexes, and layer
    folders are present, and `system-guide@claude-toolkit` is enabled at project
    scope for each supported host the project uses.
  - **needs repair:** an enabled config is malformed or unsafe, a required guide
    part is missing, the plugin is unavailable or inactive for a host that uses
    it, or the System Guide check reports a problem. Name every problem; do not
    collapse this into off.

  When the System Guide tool is available, run both read-only inspection paths
  from the canonical plugin source:

  ```text
  node <system-guide-plugin>/tools/system-guide.mjs status --root <project-root> --json
  node <system-guide-plugin>/tools/system-guide.mjs check --root <project-root> --json
  ```

  `status` cheaply reports base configuration, guide-path, and build-record
  health without scanning configured sources. `check` scans those sources and
  the guide, so it catches `source_changed` and other drift that status cannot.
  Read the check's JSON even when it exits 1: that exit means the guide needs a
  refresh or repair and is an audit result, not permission to change anything.
  Use its state and every issue when deciding whether to report the guide as on
  or needing repair.
  Neither command writes project, source, settings, or sync-record files.

  Also inspect project activation because these commands report config and guide
  health, not whether a static plugin copy is selected in this project. When the
  tool is unavailable, read the config and required paths directly and report
  that source-drift validation is unavailable. Do not install, set up, or refresh
  anything during the audit. A suitable existing guide without config remains
  off and is an adoption candidate, never an automatic adoption; preserve its
  established location and ask the owner in step 4.
- **Project knowledge layout and runtime:** use the installed `knowledge-setup`
  procedure's detection and migration references. A fresh setup with no saved
  files can be current when all required records, tools and hooks are present.
  The `<!-- claude-toolkit:knowledge-manual -->` marker identifies the managed
  manual; schema:2 selects the new record contract. Neither proves equipped
  behavior. Distinguish legacy, partial and conflicting installations. Ignore
  `.system-guide.json` and its configured tree as Knowledge signatures.
  Audit the four current skills, managed manual/checksum, copied tools/hooks,
  ordered startup/recovery route, prompt reminder and bounded completion on each
  claimed host. Preserve owner content and settings; conflicting policy or an
  unknown layout needs a specific decision, not a guessed conversion.

  When the checker is present, run it during every read-only audit of a current
  layout, even when the runtime is otherwise complete:

  ```text
  node .claude/tools/check-knowledge.mjs
  ```

  Report every problem it names and offer to fix only those files. If the tool
  itself is missing, report the runtime gap first and use the packaged copy only
  to inspect, never to write.
- **Obsidian boundary:** check that only `knowledge/.obsidian/app.json` is
  shared, that it creates relative Markdown links and automatic link updates,
  and that `.gitignore` excludes every other `.obsidian` file. A shared core
  plugin list, workspace, hotkeys, appearance, plugin, theme, or device file is
  an optional cleanup finding, not required project knowledge.
- **Knowledge document map:** inventory existing specifications, brainstorms, ADRs,
  architecture and system maps, roadmaps, project overviews, runbooks,
  glossaries, references, and raw artifact folders. Report likely canonical
  homes, duplicates, contradictions, missing indexes, broken routes, and live
  work state copied into persistent documents. Distinguish observed facts,
  inference, owner-confirmed intent, and unknowns when the difference matters.
- **Retired v1 status:** v1 is the old Neon/MCP architecture and is not a v3
  migration source. Identify only its local integration surface:
  `.mcp.json`, `.claude/settings.json`, `.codex/config.toml`, hook
  registrations and wrappers, curator agents, v1 rules, outbox scaffolding,
  and any local `brain/` or `memories/` path. Do not call the Worker, read Neon,
  open token files, or inspect legacy memory content.
- **V1 activity:** report whether automatic digest, recall, capture,
  session-end curation, curator reminders, or MCP connections are still wired
  for Claude or Codex. A flag in `.claude/settings.json` is not enough when a
  Codex wrapper supplies its own environment, so trace each committed hook
  entry to the command it runs.
- **Retirement choices:** recommend reversible local deactivation first:
  disable every automatic v1 hook and remove the v1 MCP connection from
  committed Claude and Codex configuration. Also offer removal of specifically
  listed committed v1 files after separate approval. Never bundle deletion of a
  non-empty outbox, cache, ignored file, token, connector, database, or cloud
  resource into ordinary project sync.
- **Knowledge layer:** `knowledge/memory/` is the persistent knowledge layer. Do
  not create a second store. Existing v1 curator files, `know-*` nodes, SHA
  pins, and drift reports remain retired and are never refreshed, reconciled,
  imported, or used as current truth.
- **Standalone toolkit skills:** check the previous sync record and the
  available host plugins. The conversation skills ship together in the
  `session-skills` plugin, so classify it as available to invoke, previously
  declined, or not applicable. A project that declined an individual plugin
  before the merge has that recorded under the old name; treat the record as
  applying to the skill, not the package.
  Include `work-guide`, `requirements-helper`, and `solution-design`, plus the
  packaged `delivery-researcher`, `delivery-reviewer`, and design agents. Compare the
  installed version and host-visible capabilities with the current package;
  source files alone do not establish that this session can invoke them.
  Offer a refresh when these methods are missing from an accepted installation.
  They use the existing tracker and project guidance, including work-item
  variations. Do not require local work items, copy specialist instructions,
  create a separate guidance file, or configure a default team.
  Do not look for a copied `SKILL.md` inside the project because the canonical
  skill stays in its plugin. `handoff` is the one to recommend rather than
  merely list: it works with no output style, no project knowledge system, and no hooks,
  and the moment it covers, a session about to clear its context, is the one
  nothing else can catch. It also makes every handoff prompt open with the goal
  of the work and puts a second agent between the draft and the owner, so facts
  do not get less accurate each time work is handed on. A project already
  running `handoff` at version 0.2.0 or earlier has neither; say so, because
  refreshing the plugin is what closes it. Report it as a gap alongside
  `.claude/rules/offer-context-handoff.md`, since the rule is what covers the
  owner asking for a handoff in their own words.
- **Where work items are tracked:** read the root instructions for a structural
  pointer naming a tracker, and for a recorded decline. Classify as one of:
  answered and set up, answered and declined, or never asked. A project that has
  `.work-items/` or an older `work-items/` tree but no pointer counts as never
  asked. Never-asked is a gap to offer in step 4; a recorded decline is
  respected and not raised again.
- **Quick saves:** read the root `AGENTS.md` and the project's recorded choices.
  Confirm the documentation-publication pointer and unscoped
  `knowledge-direct-commit.md` regardless of knowledge activation. Respect an
  explicit policy opt-out; declining knowledge alone is not that opt-out.
  For configured project knowledge, confirm that `knowledge/` is named and
  points to `knowledge/knowledge-manual.md` plus the installed knowledge direct-commit
  rule. For configured local tracking, confirm that `.work-items/` is named and
  points to the local tracker instructions. Report rows for systems that are
  absent, declined, external, or no longer selected. The documentation row
  names actual configured paths but does not make every file in them eligible;
  the publication rule owns that distinction.
- **Work-item stages:** check the unscoped `work-item-stages.md` rule and
  the tracker it names. Local mode uses the current work CLI; GitHub mode uses
  stage labels. Report the retired stage-reminder script and registration for
  removal, not installation. If the tracker question was never answered, ask
  that first. Do not add guessed stages to existing items.

- **PRD and design continuity:** compare installed work-item rules, root
  instructions, manuals, and session-skills with the current sources. Flag
  guidance that requires separate prep/interview files or duplicates document
  refinement in the tracker. Reconcile approved instruction changes together:
  document text and bottom Notes own that refinement; other work stays in the
  item. Preserve project-specific choices and active drafts. Do not bulk-migrate
  their content. Check that orientation resolves the exact current documents,
  open questions name who must answer, and saves update and verify the actual
  document. Flag missing `work-item-stages.md` even when broad root reminders
  say to keep work current. A plugin refresh alone does not update copied rules.

- **Agent-led delivery:** compare the installed `work` method, `work-guide`,
  and copied work-item rule. Preserve existing accepted, declined, or revoked choices
  and their goal scope. Offer the work plugin's method when wanted, including
  for external trackers; installing it does not choose local tracking or accept
  delegation. Never run `work init` or create a mirror for an external tracker.
  Keep existing tracker files and pending storage migrations unchanged.

- **Rules the toolkit dropped on 2026-08-31:** `spec-before-you-build.md` and
  `track-open-topics.md`. The toolkit no longer ships either one. When a project
  still carries one in `.claude/rules/`, report it as a rule the toolkit has
  dropped, say in one line what it used to do, and offer to delete it. Never
  delete it without approval. A project may have come to depend on it, and that
  is the owner's call.
- **Work tracker:** detect root `.work-items/` first. If it contains
  `.work-tracker.yaml` and per-item `WORK-ITEM.md` or legacy `ITEM.yaml` records,
  run `work validate` and
  classify the system as present or partial from its output. Confirm that
  `.gitignore` ignores the whole folder and Git tracks none of its contents.
  Separately detect older `delivery/work-items/`, `engagement/work-items/`, and
  root `work-items/` trees. Classify those as ready for preview-first conversion,
  not as a competing tracker. Never move, copy, delete, or stop tracking them
  during the read-only audit.
- **Old GitHub mirror settings:** when an older `.work-tracker.json` exists,
  report whether it contains GitHub settings and say they will not be carried
  into local-folder mode. Do not create, link, sync, or modify GitHub during the
  audit. If the owner wants shared GitHub tracking, offer the separate GitHub
  Projects board answer instead.
- **Previous sync record**: read it if present (step 5 format) so deliberate
  opt-outs are respected.

Classify every item: **present**, **outdated** (present, but behind the
toolkit's current version, see below), **partial**, **missing**, **retired** (a
v1 integration that should be deactivated or removed), **declined** (the owner
previously opted out), or **not applicable** (say why).

System Guide uses its user-facing states `on`, `off`, and `needs repair` in this
same report. Keep a prior decline beside `off` so the state is clear without
turning a respected choice back into a gap.

### Rule drift

A rule the project already has can still be out of date. The toolkit's rules get
amended, and an amendment reaches a project only when something goes looking for
it. Checking that a rule is present will never find one, so a project can pass
every check above and still be running a rule as it was written six months ago.

For each rule the project carries, read the toolkit's current version alongside
the project's copy and ask what the toolkit version says that the project's copy
does not cover. Compare the points made, not the words used. Projects are told
in step 4 to fold rules into their own voice, so different wording is expected
and is not drift.

Three outcomes:

- **The same points in different words.** Not drift. Leave it and say nothing.
- **The toolkit makes a point the project's copy does not.** This is drift.
  Report the specific missing point in plain language, not a text diff, and
  classify the item **outdated**.
- **The project makes a point the toolkit's version does not.** The project is
  ahead. Never overwrite it. Flag it for port-back in the wrap-up.

The previous sync record names the toolkit version last synced against. When
that is behind the current toolkit version, rules are the first place to look.
When there is no sync record, check them all.

The same drift question applies to any toolkit text a project copies, not only
`.claude/rules/`. Startup routes and copied hooks are checked against their
current packaged sources rather than paraphrased from memory.

### The instruction-file pair: AGENTS.md and CLAUDE.md

Every check above asks whether a rule EXISTS. None asks whether the agent
actually receives it. Those are different questions, and they have different
answers for the two programs.

- **Claude Code loads `.claude/rules/` automatically.** Every `.md` file there
  without `paths:` frontmatter is in context at session start. No import needed,
  and the instruction file does not have to mention the folder for it to work.
- **Codex reads `AGENTS.md` files and no Claude file.** At startup it assembles
  one instruction chain from the repository root down to the directory the
  session starts in, at most one file per folder, joined root first. It never
  reads `CLAUDE.md`. It expands no import syntax, so an `@` line reaches the
  model as literal text. The whole chain shares one 32 KiB budget, so a large
  root file can push the folder files below it out.
- **Codex still does not load `.claude/rules/` on its own.** The sentence
  `Read .claude/rules first.` inside `AGENTS.md` is the one instruction that
  carries the rules to Codex. Since `AGENTS.md` holds the content itself, that
  is now one hop instead of two. It remains an instruction the agent chooses to
  follow, not native loading of Claude rule files.

The toolkit's current layout is a pair of files in each place that has
instructions: `AGENTS.md` holds all the content, and `CLAUDE.md` beside it is
exactly the one line `@AGENTS.md`, which Claude Code expands. Report:

- **The root `AGENTS.md` carries the content.** Confirm it holds
  `Read .claude/rules first.`, the Toolkit operating-manual route, the project
  knowledge route when that system is installed, the codemap, the tools
  section, the quick saves table, and where work is tracked. A missing part is
  a gap in the file Codex reads at startup.
- **The root `CLAUDE.md` is exactly the one line `@AGENTS.md`.** Anything else
  in it is a second copy of the instructions that will drift. Report every
  extra section, and say what in `AGENTS.md` already covers it.
- **No import line inside `AGENTS.md`.** Grep it for lines starting with `@`.
  Codex shows such a line as literal text, so it instructs nobody. Report each
  one. A backticked mention such as `` `@AGENTS.md` `` inside prose is safe and
  is not a finding.
- **Dead imports.** The one import in `CLAUDE.md` must resolve to the
  `AGENTS.md` beside it, and there must be exactly one. Report any other `@`
  line, especially a wildcard such as `@.claude/rules/**`, which looks
  load-bearing and expands to nothing in either program.
- **No `AGENTS.override.md` and no `AGENTS.local.md`.** Claude Code reads
  neither. Codex prefers `AGENTS.override.md` over `AGENTS.md` and silently
  drops `AGENTS.md` in that folder, so an override file hides the real
  instructions. Report either one for removal, with its content moved into
  `AGENTS.md` first.
- **Each folder that has a folder instruction file has the pair.** The folder
  content is in `<folder>/AGENTS.md` and `<folder>/CLAUDE.md` is the same one
  line. A folder `AGENTS.md` loads for Codex only when a session starts inside
  that folder's subtree; a root-started session still opens it by following the
  codemap line, which is the agent choosing to follow an instruction.
- **Host limits.** Report when local Codex settings prevent that route or the
  startup hook from reaching the session. Do not assume Claude settings apply.
- **Whether a guard hook covers the gap.** Claude Code `PreToolUse` hooks do not
  fire for Codex, and `~/.codex/config.toml` usually registers none. A rule
  Codex cannot see, backed by a hook that never runs for Codex, is unenforced in
  both directions at once. Flag that combination explicitly; it is the worst
  state a project can be in and it is invisible to every other check.

#### A project still in the old layout

The toolkit used to put the content in `CLAUDE.md` and make `AGENTS.md` a
one-line pointer reading `Read CLAUDE.md in this folder and follow it.` Report
it this way:

| Finding | Reported as |
| --- | --- |
| The root has a content-bearing `CLAUDE.md` and a one-line pointer `AGENTS.md` | One gap: "instruction files in the old layout" |
| A folder holds a content-bearing `CLAUDE.md` | One more gap, per folder |
| The project's `AGENTS.md` holds anything besides that old pointer line | Show the owner that text and ask where it goes |

Do not count the extra text in a project's `AGENTS.md` as part of the layout
gap. It is the owner's writing, it has no home yet, and only the owner can say
whether it belongs in `AGENTS.md`, in a rule, or nowhere.

A `CLAUDE.local.md` keeps working and is not a gap. Claude Code reads it as
before, and the one-line `CLAUDE.md` still brings in `AGENTS.md` through the
import. Say so in the report rather than asking the owner to move it.

The fix, when the owner approves it, is the per-file move in step 4, against
the finished pair in `../project-init/references/root-file-examples.md`.

The pair itself is checked in every project, because the one-line `CLAUDE.md` is
what keeps the content loading in Claude Code sessions that cannot read
`AGENTS.md` directly. Skip only the Codex-specific findings when the owner
confirms Codex never runs in the project.

### AGENTS.md health

A project can pass every check above and still have an AGENTS.md nobody reads.
The file only ratchets: sessions add to it and nothing tells a session to
subtract. So audit its shape, not just its presence. `AGENTS.md` is a router and
a map, answering five questions and nothing else: what is this project, what is
in each folder and file and when do I open it, what tools does this project run
on, which configured folders use quick saves, and where is work tracked. Read
the file and report:

- **Size.** How many lines? Anthropic targets under 200 lines, because the file
  loads into every session and a bloated one makes agents ignore the
  instructions that matter. Past that, flag it and say which sections account
  for the bulk. Size now costs twice. Codex gives the whole instruction chain,
  the root `AGENTS.md` plus every folder `AGENTS.md` above the starting
  directory, one shared 32 KiB budget, and drops the later files once it runs
  out. So a long root file does not only crowd Claude's context, it can push a
  folder file out of a Codex session entirely.
- **Duplication against `.claude/rules/`.** For each rule file in that folder,
  is the same rule also spelled out in AGENTS.md? Restating it is worse than
  moving it, because the two copies drift and neither wins. List every rule that
  is said twice.
- **A communication section.** How to talk to the owner lives once, in the
  owner's own `~/.claude/`, and is in force in every project. A copy here is
  duplication. Flag it for removal.
- **Multi-step procedures.** Anything reading as a numbered sequence of steps
  belongs in a skill, which loads on demand instead of in every session. Name
  each one and propose where it goes.
- **A codemap that became a changelog.** Codemap entries should be one line per
  folder or module, saying what is in it and when to open it. Flag entries
  carrying dated history ("2026-07-17 changed X, decision #17"); that history
  belongs in Git and the applicable specification or persistent memory.
- **A missing tools section.** Name the MCP servers, generated graphs or
  indexes, and build, test, and deploy commands the project actually runs.
  Any the file does not name is a tool a session will not reach for. Propose the
  row, naming the command and where the detail lives.
- **The fixed lines above the title.** `AGENTS.md` should open with the SOUL
  route (only where `SOUL.md` exists and project knowledge was declined), then
  the owner's verbatim continuity instruction.
  `../project-init/references/thin-agents-md.md` has the exact wording. Report
  any missing, and report any reworded copy, since the wording is the owner's
  and is not to be edited. The toolkit used to ship a second fixed line, the
  self-check instruction that begins "After you generate your response". The
  owner removed it on 2026-09-22. A project still carrying it is not missing
  anything; report it as a line the toolkit no longer ships and offer to drop
  it.
- **Toolkit operating-manual route.** Confirm
  `knowledge/toolkit-manual.md` exists and `AGENTS.md` carries the exact
  three-read Startup section from `thin-agents-md.md`. Report an older
  complete-read route or acknowledgment request as stale. Audit the packaged
  template, installed project-init-owned hook, and each host registration
  separately by following `../project-init/references/toolkit-manual-delivery.md`.
  Report a `toolkit-session-start` entry under `UserPromptSubmit` for removal:
  the hook now runs at SessionStart only. This route applies even when project
  knowledge and System Guide are disabled.
- **Lines an agent never needed.** For each line ask whether removing it would
  make an agent get something wrong. Flag every line where the answer is no,
  starting with: what a session could find in one command (a folder is
  Git-ignored, a file is generated, a directory is empty), and where something
  came from or when it arrived ("this folder came in with the latest toolkit
  sync"). These arrive one at a time, usually from a sub-agent tidying up at the
  end of a task, and in an old file they are most of the bulk.
- **Context sources the codemap does not name.** Look for folders holding
  context an agent should pull in on demand: `ai-external-knowledge/`,
  `docs/designs/`, `knowledge/prds/`, captured reference data. Any one the
  codemap does not name is a folder no agent will open, however good what is in
  it. Propose the line, saying what is inside and when to open it. For those two
  also say how long a file in each lives, since that is the part a session gets
  wrong: a design is deleted once that area's PRD is current, and a PRD is kept
  for the life of the area.
- **Live state that belongs in the tracker.** Current phase, next action, and
  open TODOs drift the moment they are written here.
- **Project-knowledge startup parity.** When the current layout is installed,
  confirm both hosts register the same loader and that it asks for three
  reads: `SOUL.md`, `knowledge/project.md`, and `knowledge/memory/current.md`,
  plus a check of `knowledge/memory-inbox.md`. Confirm it emits no file bodies,
  asks for no manual read and no acknowledgment, and fails open when a file is
  absent. `AGENTS.md` carries only the Startup section, and `CLAUDE.md` stays
  the one-line import that brings it in. Any copied policy is stale
  duplication.
- **Stale content.** Anything the code, paths, or decisions have since
  contradicted.

Report this as findings with a recommended trim, not as a pass or fail, and
treat the trim as one more item the owner opts into at step 4. One constraint on
any trim you propose:

- **Check cross-references before renumbering.** Grep the repo for references to
  AGENTS.md section or rule numbers. If a trim would renumber sections other
  files point at, say exactly which, and let the owner choose between
  renumbering with the fixes and keeping the numbering stable.

### Folder AGENTS.md files

The toolkit now writes a short `AGENTS.md` inside each major folder, with a
`CLAUDE.md` beside it holding the single line `@AGENTS.md`. Claude Code loads
the pair only when an agent reads a file in that folder, which is what lets the
root file stay short without losing the detail. Codex loads the folder
`AGENTS.md` when a session starts inside that folder's subtree. Read
`../project-init/references/folder-agents-md.md` first, then walk the project's
folders and report each one as:

- **Present.** The folder already has its own `AGENTS.md` and the one-line
  `CLAUDE.md` beside it. Leave the content alone. Do not rewrite it into the
  toolkit's wording; the project wrote it on purpose.
- **Present but old layout.** The folder has a content-bearing `CLAUDE.md` and
  no `AGENTS.md`. This is a gap, and the fix is the move in step 4, not a
  rewrite. The wording stays the owner's.
- **Missing.** A major folder the toolkit recognizes, with no instruction file
  at all and no `README.md` index. This is a gap.
- **Skipped by design.** One of the five kinds in `folder-agents-md.md`: a
  folder with a `README.md` index, anything under `.claude/`, the complete
  `knowledge/` tree, a folder another plugin creates and indexes, or a folder
  with an obvious name and no conventions to state. Not a gap. Say so rather than leaving it off the list, so it does
  not get raised again next run.
- **Not recognized.** A folder the toolkit did not create and whose purpose you
  cannot tell from the repository. Do not propose a file for it and do not guess
  what it is for. List it and ask the owner in step 4.

Two things this check never does. It never reports a folder `AGENTS.md` without
its one-line `CLAUDE.md` as fine: report the missing `CLAUDE.md`, because
without it a Claude Code session that cannot read `AGENTS.md` directly gets
nothing for that folder. And it never proposes moving a behavior rule out of
`.claude/rules/` into a folder file, because a file that loads only sometimes
cannot carry a rule that applies always.

## Step 3: report before touching anything

Show one table: item, status, and what specifically is missing or drifted. Make
no changes in this step. For a read-only audit, report source freshness and any
limits, then finish without entering the repair or record steps. Otherwise let
the user pick what to fix, and recommend an order:
resolve mixed signatures, install or migrate project knowledge, retire duplicate
local wiring as a separate choice, then update rules and other systems.
Existing v1 wiring does not block the new knowledge layout.

## Step 4: close the approved gaps, one at a time

Work the way project-init does: explain what the item is for, recommend how it
should look in THIS project, confirm, act, summarize. Ground rules:

- Opt-in per item. A "no" gets recorded, not argued with.
- Adapt to the project. Fold rules into the existing AGENTS.md's voice and
  structure; don't paste toolkit text verbatim over a file that has its own
  style.
- Never weaken something the project already does better than the toolkit
  version. If the project's variant is an improvement, leave it and flag it
  for port-back instead (see wrap-up).
- For an approved **outdated** rule, add only the missing points, written in the
  project's existing voice. Never replace the file wholesale with the toolkit's
  text: that throws away every local adaptation the project made on purpose, and
  those adaptations are the reason the wording differs in the first place.
- For an approved output style gap, install or update
  `.claude/output-styles/plain-english.md` from `library/output-styles/plain-english.md`
  and set `"outputStyle": "Plain English"` in the committed `.claude/settings.json`.
  Preserve local wording that deliberately adapts the style; reconcile missing
  guidance instead of discarding it. Offer to remove the retired
  `.claude/output-styles/plain-language.md` after the replacement is in place.
  The selected value must match the style's `name`. Resolve a local settings
  override with the owner rather than silently leaving conflicting selections.
  Preserve deliberate choices of another style. The new voice starts in the
  next session.
- **For an approved Toolkit operating-manual gap,** follow
  `../project-init/references/toolkit-manual-delivery.md`. Reconcile
  `library/templates/toolkit-manual.md` into `knowledge/toolkit-manual.md`,
  install the project-init-owned hook and supported host registrations, and
  write the three-read Startup section. Remove the old `toolkit-session-start`
  entry under `UserPromptSubmit` in `.claude/settings.json` and
  `.codex/hooks.json`, leaving every other hook entry alone. Preserve
  deliberate local meaning. Apply updates already covered by this sync; ask
  only when meaning or scope is unresolved or local changes conflict. Verify
  copied content, direct hook output, and host configuration as separate
  facts.
- **For the retired voice rules, propose the swap, never a bare deletion.** A
  project on the old setup has working guidance; removing it before the style
  is in leaves the project with neither. Install and verify `Plain English` first,
  then offer to delete `.claude/rules/writing-and-language.md`,
  `how-to-reply.md`, `treat-owner-as-non-technical.md`, and
  `define-your-terms.md`. Say the remaining cost out loud so the owner is
  choosing with it in view: a helper agent never receives an output style at
  all, so writing plainly is all a helper agent gets.
- **For an approved old-layout gap, move one file at a time.** The content is
  the owner's and does not get rewritten. For each file the owner says yes to,
  at the root or in a folder:
  1. `git mv CLAUDE.md AGENTS.md`. The content moves byte for byte. Doing it
     with `git mv` is what lets Git record a rename instead of a delete and an
     add, so the file's history stays readable.
  2. Edit only two things. The title line `# CLAUDE.md: ...` becomes
     `# AGENTS.md: ...`, and any sentence describing the old design, where
     `AGENTS.md` was a pointer to `CLAUDE.md`, is removed. Change nothing else,
     including wording the toolkit would write differently.
  3. Write the new `CLAUDE.md` beside it, holding exactly the one line
     `@AGENTS.md` and nothing else.
  4. Record the move in `.claude/toolkit-sync.md` in step 5, naming each file
     that moved.

  Where the project's old one-line `AGENTS.md` still exists, delete it before
  the `git mv`, so Git follows the content across. Text the owner added to that
  `AGENTS.md` is not deleted with it: show it and ask where it goes, as step 2
  says. A `CLAUDE.local.md` is left exactly as it is; it keeps working and does
  not move.
- **For an approved folder instruction-file gap, do one folder at a time, and
  offer the move with it.** Adding the folder file alone leaves the root
  `AGENTS.md` exactly as long as it was, which is the whole thing this is meant
  to fix. So for each folder the owner approves:
  1. Show the draft folder file: what the folder holds, how to work in it, and
     where the detail lives.
  2. Show the lines in the root `AGENTS.md` that are about that folder, and
     offer to move them into the folder file, leaving one line in the codemap
     pointing at it.
  3. Never move a behavior rule out of the root file or out of
     `.claude/rules/`. Four other things never move either: how to talk to the
     owner, the pointers to the most dangerous rules, the project-knowledge
     startup route, and the codemap lines themselves. They are named in
     `../project-init/references/thin-agents-md.md` under "What goes in it, in
     this order" and "What never goes in it".
  4. Write both files in the folder: `<folder>/AGENTS.md` with the content, and
     `<folder>/CLAUDE.md` holding exactly the one line `@AGENTS.md`. That import
     is relative to the file that holds it, so the folder `CLAUDE.md` brings in
     the `AGENTS.md` beside it.
  5. Keep the folder detail in one place. Do not copy it back into the root
     `AGENTS.md`. Codex loads a folder `AGENTS.md` only when a session starts
     inside that folder's subtree, so the root codemap line is still what sends
     a root-started session to open it.
- For a folder listed as **not recognized** in step 2, ask the owner what it is
  for in plain words, then either write the file from their answer or record the
  skip. Do not infer a purpose from the folder name.
- For a retired `memory-pr-hook` plus `wrap-up-ritual.md` finding, first confirm
  the current packaged pull-request reminder and `knowledge-save` skill are installed.
  Then offer removal of the obsolete hook registration, copied script, config,
  and rule as one reversible cleanup. Never leave two pull-request reminders
  active.
- For an approved System Guide change, use the canonical `system-guide` plugin
  and its CLI rather than copying its setup or maintenance rules here.
  - To turn an off project on, first install and enable
    `system-guide@claude-toolkit` at project scope. Then run `setup --root` with
    the owner-approved relative `--guide-path` and one `--source
    kind:completeness:relative/path` per source. A new guide normally uses
    `knowledge/system/`. This creates no second-brain files.
  - For an existing suitable guide, show the location and what setup would add.
    Pass `--adopt` only after the owner explicitly chooses adoption. Never move
    the guide merely to use the plugin, and never overwrite existing bytes.
  - For `needs repair`, run `status` and `check`, repair only the named config,
    activation, or required-file gaps, then rerun both. Preserve all meaning and
    unrelated guide content. A repair does not approve a meaning change.
  - To disable the guide, run its `disable` command. Keep its config and content
    so it can be re-enabled. Do not remove second-brain files. Removing or
    disabling second-brain likewise leaves an enabled guide and its plugin
    behavior intact.
  - When enabled, add the exact shared root fallback from
    `../project-init/references/thin-agents-md.md` once in `AGENTS.md`. Do not
    repeat it anywhere else; `CLAUDE.md` stays the one-line import and needs no
    copy of it. The System Guide plugin owns configured Claude
    startup status; the second brain reports only the off case.
- For an approved project-knowledge gap, refresh the `second-brain` plugin,
  then follow `knowledge-setup` and its delivery/migration references as one
  coherent operation. Reuse already-given opt-in/update authority. Preserve an
  existing System Guide and unrelated hooks/settings. Do not flatten the new
  topic layout or copy old templates over owner records. Already-approved
  conversions retain source and approval and are shown afterwards; ambiguous
  conversions remain unchanged. Preserve current-work Session handoffs.
  Deliver the three startup reads (SOUL, project, current memory) and the inbox
  check, with the Knowledge manual and indexes as reference; install its four
  procedures, templates, copied tools/hooks and
  exact managed manual/checksum together. Inspect native-memory conflicts rather
  than silently disabling/importing/deleting existing data. A plugin refresh is
  not project activation. Run file checks and actual fresh/recovered host proofs,
  record configured/tested/unavailable results separately, and leave failed or
  partial setup explicitly incomplete. The Knowledge setup procedure applies
  and verifies the exact Claude and Codex hook definitions while preserving
  unrelated configuration; Codex trust and authentication remain in the normal
  owner `/hooks` flow. The procedure owns exact file moves and registration
  details; this skill owns project-level coordination.

- Do not install second-brain v1 or import its content. For an existing v1
  project, offer the following separately after reporting the exact local
  scope:
  1. **Deactivate:** remove v1 MCP entries and automatic hook registrations
     from committed Claude and Codex configuration. Preserve old scripts and
     agents temporarily.
  2. **Remove local integration:** delete only the committed v1 files and
     settings the owner explicitly approves.
  Neither option contacts the Worker or Neon, reads legacy memory, imports
  anything into project knowledge, or deletes cloud infrastructure. Installing the current system does not
  imply either v1 choice. Account-level connectors, local token cleanup, and
  cloud deletion are separate owner-approved work.
- For an approved project skill gap, copy the library skill folder to both
  `.claude/skills/<name>/` and `.agents/skills/<name>/`. Make the two copies
  byte-identical. Never use a symlink. When the project changed its copy on
  purpose, show the differences and flag it for port-back instead of
  overwriting; then apply the same bytes to both copies.
- For an approved rules index gap, `git mv .claude/rules/README.md
  .claude/RULES.md`, then update each path in it that pointed at a sibling rule
  (`x.md` becomes `rules/x.md`). Change nothing else.
- For an approved `paths:` line gap, add one line per `paths:` rule to
  `AGENTS.md`, using the wording in `../project-init/references/thin-agents-md.md`.
- For an approved Salesforce dependency graph gap, install the whole kit from
  `../../library/guides/salesforce-dependency-graph.md`: the `tools/kb/`
  folder, the gitignore entries, the rule, and the freshness Stop hook. Never
  install the rule alone. Run the verify steps in that file before calling it
  done. If the project already has its own copy of the tool, show the
  differences and let the owner choose which side wins rather than overwriting
  edits they made.
- For an approved graphify gap, install the whole kit from
  `../../library/guides/graphify-dependency-graph.md`: the tool, the
  gitignore entry, `library/rules/general/dependency-graph.md` into `.claude/rules/`,
  and the auto-rebuild hooks. Never install the rule alone, and never install
  it on a Salesforce project, which uses the bundled metadata graph and its own
  rule of the same name instead.
- When the project was never asked where work items are tracked, ask the Gate 1
  question from `../project-init/references/work-tracking-choice.md` and follow
  that file for whichever answer comes back. Add the one-line pointer to
  `AGENTS.md`, unless the answer is "somewhere else, or nothing yet", in which
  case record the decline instead.
- **For an approved work-item stages gap, the tracker choice comes first.**
  A stage standard with no tracker to hold it is advice nobody can follow, so if
  the Gate 1 question was never answered, ask it and finish that answer before
  installing any part of this. Then update the rule and tracker and remove the
  retired hook if present:
  1. Copy `library/rules/general/work-item-stages.md` into `.claude/rules/`.
  2. Set up the stage marker the chosen tracker needs. For the local tracker
     that is already there, since `stage` is a field `work update --stage`
     writes. For a GitHub Projects board, create the fourteen labels on the
     repository, in order, so they sort:

     ```bash
     for stage in 01-discovery 02-refinement 03-requirements-approved        04-solution-design 05-breakdown 06-implementation-plan 07-tracking-setup        08-build 09-testing 10-bug-fixing 11-user-approval 12-pr-and-push        13-deployment 14-spec-update; do
       gh label create "$stage" --description "Work-item stage $stage" || true
     done
     ```

     Show the owner the list and wait for a yes before creating anything on
     GitHub, the same as every other board change. A label that already exists
     is left exactly as it is.
  3. Remove the retired `work-item-stage-reminder` registration and copied
     script after the owner approves the sync. Keep other hooks in the same
     matcher. The lifecycle rule handles orientation before substantial work;
     there is no replacement hook.

  Then retire any label that now means the same thing as a stage, so the project
  has one vocabulary instead of two. A board set up before this has a `refined`
  label, which is `03-requirements-approved` under another name: point the root
  instructions at the stage label, and offer to delete the old one. Never
  relabel existing issues in bulk. They carry no stage until someone sets one.
- When the owner names a different tracker than the one already recorded, rewrite
  the pointer. Never delete tickets, issues, or boards from the
  tracker they are leaving; moving existing work across is theirs to do by hand.
- For an approved quick-save gap, preserve the project's selected systems and
  existing root-file voice. Add or update only the applicable rows from
  `../project-init/references/thin-agents-md.md`. Install or refresh the unscoped
  `knowledge-direct-commit.md` independently of knowledge activation; remove
  legacy path frontmatter when replacing a managed copy. Reconcile local edits
  and explicit opt-outs rather than overwriting them. Refresh the paired
  `parallel-agent-sessions.md` exception and installed rule catalog together.
  The rows go in `AGENTS.md`, whose rules route serves Codex as well as Claude.
  Keep it a short pointer, and leave `CLAUDE.md` as the one-line import. Verify the
  documentation route in a knowledge-off project, and confirm that it does not
  require a second-brain hook or plugin. The `.work-items/` row uses the
  existing shared, Git-ignored local store with no worktree, commit, or push.
  Remove a misleading row when its system is no longer configured. Do not add a
  local path for an external tracker or a recorded no-tracker choice.
- For an approved new local work-tracker gap, install the plugin and run
  `work init`. It creates YAML work items under Git-ignored `.work-items/`.
  Say plainly that these records stay in the current checkout.
- For an approved older-tracker conversion, run `work migrate --from <path>`
  first and show the preview. Run it again with `--apply` only after approval.
  Validate the copied tracker and show every `REQUIREMENTS.md` still in
  `refining`. Leave the old tracker unchanged until the owner verifies the copy
  and separately approves removing it.
- Local-folder mode has no GitHub mirror. When the owner wants shared GitHub
  tracking, return to the Gate 1 choice and set up a GitHub Projects board as
  the tracker instead.

## Step 5: record the sync

Skip this step entirely for a read-only or audit-only invocation.

Write a short sync record so future runs know where things stand. Default
location: `.claude/toolkit-sync.md`, with at most a one-line structural pointer
from AGENTS.md when useful. Do not turn the root file into a sync changelog.
Record:

- the toolkit version synced against, and the date. The next run reads this to
  decide whether the project's rules may have fallen behind, so record it even
  when nothing changed
- items set up or already present
- items brought up to date, naming what was added to each
- items the owner deliberately declined, so future syncs never re-nag about a
  considered "no"
- System Guide state and its actual configured path, or the owner's recorded
  decline. Record this independently from the second-brain choice.
- each instruction file moved from the old layout, naming the file and the
  folder it sits in, so a later run can tell a finished move from one the owner
  declined

## Wrap-up

1. **Summarize**: fixed, already present, declined, deferred.
2. **Note follow-ups** for anything deferred, including separate connector,
   token, or cloud cleanup for a retired v1 integration.
3. **Port-back reminder**: if the project had a better version of a toolkit
   item, or this sync surfaced an improvement, offer to draft a PR back to the
   `claude-toolkit` repo so every other project benefits.
