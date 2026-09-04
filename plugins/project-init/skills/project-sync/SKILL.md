---
name: project-sync
description: >-
  Audit an EXISTING project against the claude-toolkit and set up whatever is
  missing. Use when the user points a project at the toolkit and says things
  like "make sure all the tools, rules, and systems from my toolkit are set up
  in this project", "sync this project with claude-toolkit", "audit this
  project against the toolkit", or "/project-sync". This skill inventories
  everything the toolkit currently ships (the general and Salesforce rules
  libraries, hooks, the local-folder work-tracker, the packaged project knowledge
  system, safe conversion off an older knowledge layout, the session-skills
  plugin, and any newer systems), cross-references the current project,
  reports the gaps, including rules the project has but that are behind the
  toolkit's current version, and closes each gap only with the user's approval.
---

# project-sync: bring an existing project up to the toolkit

`project-init` lays foundations in a NEW project. This skill is its sibling for
EXISTING projects: figure out what the toolkit provides, check the current
project against it, report the gaps, then close the gaps the user approves.

Run the steps in order. Never change anything before step 4.

## Step 1: inventory the toolkit

**First, refresh the installed toolkit so this audit sees the latest.** This
skill reads the toolkit from the installed plugin copy (option 1 below), and
that copy does NOT update itself when the repo changes on GitHub. A merged
change sits on GitHub until each machine pulls it. So before inventorying,
update the local copy: inside a Claude Code session run
`/plugin marketplace update claude-toolkit`, or from a terminal run
`claude plugin marketplace update claude-toolkit`. Skip this only when you are
reading from a freshly-pulled local clone (option 2). A stale plugin copy
produces a stale audit, so the project silently misses the newest rules and
systems, which is the exact failure this step guards against.

Build the list of things the toolkit currently provides. Do not hard-code
today's list; read the toolkit itself so new systems are picked up
automatically as it grows.

- Locate the toolkit files, in order of preference:
  1. They ship with this plugin. From this skill's directory, `../../library/`
     holds `rules/general/` (with its `README.md` index), `rules/salesforce/`
     (with its own index), `tools/`,
     `templates/`, and `guides/`. The sibling skill's
     `../project-init/references/` holds `thin-claudemd.md` and `setup-flow.md`,
     and the plugin root holds `.claude-plugin/plugin.json`.
  2. A local clone of the toolkit repo, if the user has one.
  3. Fetch the repo (`Mar5929/claude-toolkit`), or ask the user where it lives.
- For a separately packaged system such as `second-brain`, locate its installed
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
  - the output style setting. Every project should select Claude Code's
    built-in `Concise`, which is not a file, unless its owner chose
    `plain-english` from `library/output-styles/`, which is. A project that
    carries every rule can still have the wrong style selected, so check it
    separately
  - the per-server MCP tool rules in `../../library/guides/mcp-best-practices.md`;
    these are conditional, so only audit the servers this project connects
  - each system from the setup gates: hooks, project knowledge, knowledge layer
  - the two document folders Gate 1 offers every project, `docs/designs/` and
    `docs/PRDs/`. Each is the folder plus a short `README.md` plus its own line
    in the codemap, and a folder with no codemap line is a folder no agent
    opens, so check all three parts. `../project-init/references/setup-flow.md`
    has what each holds and how long a file in it lives. A project that was
    offered them and declined is not missing them; record the decline so this
    audit stops raising it
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
  - the work-item stage standard, which is three parts and looks present when
    only one is there: `library/rules/general/work-item-stages.md` in
    `.claude/rules/`, the `work-item-stage-reminder` hook, and the stage markers
    the project's chosen tracker needs (a `stage` field for the local tracker,
    fourteen labels for a GitHub board). It depends on the Gate 1 tracker
    question having an answer, so a project that was never asked is not missing
    the standard, it is missing the question
  - the `hooks-library` plugin and its three general hooks. For
    `spec-check-reminder` (PostToolUse): check `.claude/settings.json` for a
    registered entry and `.claude/hooks/` for the copied script. It points at
    the `spec-check` skill from `session-skills`, so only audit it where that
    plugin is installed. For `work-item-stage-reminder` (PostToolUse, the same
    `Edit|Write|NotebookEdit` matcher): audit it only where the tracker question
    is answered and `work-item-stages.md` is present, since without both there
    is no stage to set. If the retired `memory-pr-hook` plus `wrap-up-ritual.md`
    path remains, report it for removal after the current project-knowledge
    package is installed
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
    delete the file and select `Concise`, or `plain-english` if the owner wants
    the simpler voice
  - the short `CLAUDE.md` the toolkit now writes inside each major folder, per
    `../project-init/references/folder-claudemd.md`. Read that file so step 2
    can tell a missing one from a folder the toolkit deliberately skips (any
    folder with a `README.md` index, and everything under `.claude/`)
  - each standalone skill offered by the setup flow, all five of which now ship
    in the `session-skills` plugin
  - anything newer listed in the toolkit README under "What's here now"
  - skip roadmap items; they are not built and cannot be audited. The current
    project-knowledge package is shipped and must be inventoried from its
    plugin. Existing retired v1 integration remains a separate local finding
- Note the toolkit version (from `plugin.json` or `marketplace.json`) for the
  sync record in step 5.

## Step 2: audit the current project

For each inventory item, look for evidence in the project. Judge by intent, not
exact wording: a CLAUDE.md that says "stop and ask when a request could mean two
things" satisfies `ask-before-assuming.md` even if the prose differs. Typical
checks:

- **CLAUDE.md and `.claude/rules/`**: does CLAUDE.md exist and point at
  `.claude/rules/`, and does that folder carry each default-ON general rule (a
  file, or the rule's intent folded into CLAUDE.md)? Judge by intent, not exact
  wording or file name.
- **Output style**: does a settings file select `Concise` (`outputStyle` in
  `.claude/settings.json` or `.claude/settings.local.json`)? `Concise` is the
  default and is built in, so it needs no file. `plain-english` is the one
  alternative the toolkit ships, it is a file, and a project only has it if its
  owner asked for it, so its absence is never a gap. A selected style whose file
  is missing silently falls back to the default, which is the state a project is
  left in if it still names the deleted `plain-language`. Judge any leftover
  file by intent, not exact wording, the same as a rule.
- **CLAUDE.md health** (presence is not enough, see below).
- **Can a Codex session actually reach the rules?** (see below). A project can
  hold every rule and still deliver almost none of them to Codex.
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
- **Project knowledge layout:** read the folder, never go by folder names
  alone. There is no detector script. Classify exactly one state:
  - **current layout:** `knowledge/README.md` starts with
    `<!-- claude-toolkit:knowledge-manual -->`, the flat memory and specification
    folders and their indexes exist, and any saved files use current YAML
    frontmatter. A fresh setup with no saved files is current;
  - **partial current layout:** the flat folders and indexes have current
    signatures, but the managed manual is missing. Offer to restore it and do
    not convert approved files;
  - **older layout:** `knowledge/memory/` has subfolders by type
    (`context/`, `decisions/`, `domain/`, and the rest), or
    `knowledge/memory/tags.md` exists, or frontmatter carries
    `source: owner-paraphrase` and `session:`;
  - **none:** no knowledge-system signatures are present; or
  - **mixed or unknown:** signatures conflict, are partial, or an ordinary
    folder could be mistaken for the system.

  Mixed or unknown stops adoption and conversion: name exactly what you found
  and ask. Never move an ordinary folder called `memory`, `specs`, or
  `knowledge` on its name alone.
- **Packaged runtime:** for a current layout, also check the installed
  managed `knowledge/README.md` against the packaged template byte for byte;
  `remember`, `recall`, `retire`, `reflect`, `second-brain`, and
  `session-search` skills; `.claude/tools/build-knowledge-index.mjs`,
  `check-knowledge.mjs`, and `frontmatter.mjs`;
  `.claude/hooks/knowledge-session-start.mjs` registered under Claude
  `SessionStart`; the pull-request and work-item reminders registered under
  `PreToolUse` with the `Bash` matcher; `SOUL.md`; the short root routes in
  `CLAUDE.md` and `AGENTS.md`; and the equivalent `.codex/hooks.json` loader
  where native Codex hooks are supported. A missing manual is **partial**. A
  changed manual is **outdated**: show the diff and ask before restoring the
  managed copy. Neither finding is a reason to rewrite approved knowledge.

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
  available host plugins. All five (`explain-simply`, `grill-me`, `handoff`,
  `session-summary`, `track-tasks`) ship together in the `session-skills`
  plugin, so classify that one plugin as available to invoke, previously
  declined, or not applicable. A project that declined an individual plugin
  before the merge has that recorded under the old name; treat the record as
  applying to the skill, not the package.
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
- **Work-item stages:** classify the three parts separately, because one of
  them present makes the whole thing look installed. Is
  `.claude/rules/work-item-stages.md` there? Is `work-item-stage-reminder`
  registered under `PostToolUse` with the script copied into `.claude/hooks/`?
  And does the project's tracker actually hold a stage: a `stage` field in
  `ITEM.yaml` for the local tracker, or the fourteen stage labels on the
  repository for a GitHub board (`gh label list`)? **A project that has never
  answered the tracker question is not missing this.** It is missing the
  question, so raise that first and this after. Never backfill a stage onto an
  existing work item or issue; items from before the standard carry none, and
  that is normal.
- **Rules the toolkit dropped on 2026-08-31:** `spec-before-you-build.md` and
  `track-open-topics.md`. The toolkit no longer ships either one. When a project
  still carries one in `.claude/rules/`, report it as a rule the toolkit has
  dropped, say in one line what it used to do, and offer to delete it. Never
  delete it without approval. A project may have come to depend on it, and that
  is the owner's call.
- **Work tracker:** detect root `.work-items/` first. If it contains
  `.work-tracker.yaml` and per-item `ITEM.yaml` records, run `work validate` and
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

### Codex reachability: can AGENTS.md deliver the rules?

Every check above asks whether a rule EXISTS. None asks whether the agent
actually receives it. Those are different questions, and they have different
answers for the two programs.

- **Claude Code loads `.claude/rules/` automatically.** Every `.md` file there
  without `paths:` frontmatter is in context at session start. No import needed,
  and CLAUDE.md does not have to mention the folder for it to work.
- **Codex discovers `AGENTS.md` files, not Claude rule files.** It expands no
  import syntax, so an `@` line is not a load instruction, but it does follow a
  plain instruction to open a file. The toolkit's `AGENTS.md` is one line:
  `Read CLAUDE.md in this folder and follow it.` Everything else reaches Codex
  through `CLAUDE.md`, which opens with `Read .claude/rules first.`

So a project can pass every file check while that two-hop route is broken.
Report:

- **`AGENTS.md` is the one line and nothing else.** Anything more is a
  hand-maintained second copy of `CLAUDE.md` that drifts. Report every extra
  section as a trim, and say what in `CLAUDE.md` already covers it.
- **The second hop.** Confirm `CLAUDE.md` still carries `Read .claude/rules
  first.` Without it the chain stops at `CLAUDE.md` and Codex never reaches the
  rules.
- **Nested `AGENTS.md` files.** The toolkit keeps one root file. Report any
  other, and propose deleting it.
- **Dead imports.** Grep both root files for `@` lines. Report any that resolve
  to nothing, especially wildcards such as `@.claude/rules/**`, which look
  load-bearing and expand to nothing in either program.
- **Host limits.** Report when local Codex settings prevent that route or the
  startup hook from reaching the session. Do not assume Claude settings apply.
- **Whether a guard hook covers the gap.** Claude Code `PreToolUse` hooks do not
  fire for Codex, and `~/.codex/config.toml` usually registers none. A rule
  Codex cannot see, backed by a hook that never runs for Codex, is unenforced in
  both directions at once. Flag that combination explicitly; it is the worst
  state a project can be in and it is invisible to every other check.

The fix, when the owner approves it, is the one-line `AGENTS.md` written out in
`../project-init/references/root-file-examples.md`.

Skip this check only when the owner confirms Codex never runs in the project.

### CLAUDE.md health

A project can pass every check above and still have a CLAUDE.md nobody reads.
The file only ratchets: sessions add to it and nothing tells a session to
subtract. So audit its shape, not just its presence. `CLAUDE.md` is a router and
a map, answering four questions and nothing else: what is this project, what is
in each folder and file and when do I open it, what tools does this project run
on, and where is work tracked. Read the file and report:

- **Size.** How many lines? Anthropic targets under 200 lines, because the file
  loads into every session and a bloated one makes agents ignore the
  instructions that matter. Past that, flag it and say which sections account
  for the bulk.
- **Duplication against `.claude/rules/`.** For each rule file in that folder,
  is the same rule also spelled out in CLAUDE.md? Restating it is worse than
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
- **The fixed lines above the title.** `CLAUDE.md` should open with the SOUL
  route (only where `SOUL.md` exists and project knowledge was declined), then
  the owner's verbatim self-check instruction, then the owner's verbatim
  continuity instruction. `../project-init/references/thin-claudemd.md` has the
  exact wording. Report any missing, and report any reworded copy, since the
  wording is the owner's and is not to be edited.
- **Lines an agent never needed.** For each line ask whether removing it would
  make an agent get something wrong. Flag every line where the answer is no,
  starting with: what a session could find in one command (a folder is
  Git-ignored, a file is generated, a directory is empty), and where something
  came from or when it arrived ("this folder came in with the latest toolkit
  sync"). These arrive one at a time, usually from a sub-agent tidying up at the
  end of a task, and in an old file they are most of the bulk.
- **Context sources the codemap does not name.** Look for folders holding
  context an agent should pull in on demand: `ai-external-knowledge/`,
  `docs/designs/`, `docs/PRDs/`, a specifications folder, captured reference
  data. Any one the codemap does not name is a folder no agent will open,
  however good what is in it. Propose the line, saying what is inside and when
  to open it. For the two document folders also say how long a file in each
  lives, since that is the part a session gets wrong: a design is deleted once
  the specification is current, and a PRD is kept.
- **Live state that belongs in the tracker.** Current phase, next action, and
  open TODOs drift the moment they are written here.
- **Project-knowledge startup parity.** When the current layout is installed,
  confirm both hosts register the same loader and that it reads, in order,
  `SOUL.md`, `knowledge/README.md`, `knowledge/project.md`,
  `knowledge/current.md`, and the entry lines of both indexes. Confirm it loads
  no other memory and fails open when a file is absent. `CLAUDE.md` carries only
  the short fallback. Any copied policy is stale duplication.
- **Stale content.** Anything the code, paths, or decisions have since
  contradicted.

Report this as findings with a recommended trim, not as a pass or fail, and
treat the trim as one more item the owner opts into at step 4. One constraint on
any trim you propose:

- **Check cross-references before renumbering.** Grep the repo for references to
  CLAUDE.md section or rule numbers. If a trim would renumber sections other
  files point at, say exactly which, and let the owner choose between
  renumbering with the fixes and keeping the numbering stable.

### Folder CLAUDE.md files

The toolkit now writes a short `CLAUDE.md` inside each major folder. Claude Code
loads it only when an agent reads a file in that folder, which is what lets the
root file stay short without losing the detail. Read
`../project-init/references/folder-claudemd.md` first, then walk the project's
folders and report each one as:

- **Present.** The folder already has its own `CLAUDE.md`. Leave it alone. Do
  not rewrite it into the toolkit's wording; the project wrote it on purpose.
- **Missing.** A major folder the toolkit recognizes, with no `CLAUDE.md` and no
  `README.md` index. This is a gap.
- **Skipped by design.** A folder with a `README.md` index, or anything under
  `.claude/`, the complete `knowledge/` tree, or a folder another plugin creates
  and indexes. Not a gap. Say so rather than leaving it off the list, so it does
  not get raised again next run.
- **Not recognized.** A folder the toolkit did not create and whose purpose you
  cannot tell from the repository. Do not propose a file for it and do not guess
  what it is for. List it and ask the owner in step 4.

Two things this check never does. It never reports a nested `AGENTS.md` as
missing, because toolkit projects deliberately use one root file even though
Codex supports layering. And it never proposes moving a behavior rule out of
`.claude/rules/` into a folder file, because a file that loads only sometimes
cannot carry a rule that applies always.

## Step 3: report before touching anything

Show one table: item, status, and what specifically is missing or drifted. Make
no changes in this step. Let the user pick what to fix, and recommend an order:
resolve mixed signatures, install or migrate project knowledge, retire duplicate
local wiring as a separate choice, then update rules and other systems.
Existing v1 wiring does not block the new knowledge layout.

## Step 4: close the approved gaps, one at a time

Work the way project-init does: explain what the item is for, recommend how it
should look in THIS project, confirm, act, summarize. Ground rules:

- Opt-in per item. A "no" gets recorded, not argued with.
- Adapt to the project. Fold rules into the existing CLAUDE.md's voice and
  structure; don't paste toolkit text verbatim over a file that has its own
  style.
- Never weaken something the project already does better than the toolkit
  version. If the project's variant is an improvement, leave it and flag it
  for port-back instead (see wrap-up).
- For an approved **outdated** rule, add only the missing points, written in the
  project's existing voice. Never replace the file wholesale with the toolkit's
  text: that throws away every local adaptation the project made on purpose, and
  those adaptations are the reason the wording differs in the first place.
- For an approved output style gap, set `"outputStyle": "Concise"` in the
  committed `.claude/settings.json`, and offer to delete a leftover
  `.claude/output-styles/plain-language.md`. Where the owner wants the simpler
  voice instead, copy `library/output-styles/plain-english.md` into
  `.claude/output-styles/` and select that in place of `Concise`, never
  alongside it. If the owner deliberately selected some other style, show them
  the clash and let them choose rather than overwriting it. Say plainly that the
  new voice starts on their next session, so they do not think it failed.
- **For the retired voice rules, propose the swap, never a bare deletion.** A
  project on the old setup has working guidance; removing it before the style
  is in leaves the project with neither. Select and verify `Concise` first,
  then offer to delete `.claude/rules/writing-and-language.md`,
  `how-to-reply.md`, `treat-owner-as-non-technical.md`, and
  `define-your-terms.md`. Say the remaining cost out loud so the owner is
  choosing with it in view: a helper agent never receives an output style, and
  a built-in style leaves no file for one to read either, so
  `follow-the-output-style.md` goes into the rules folder in the same pass and
  its fallback (write plainly) is all a helper agent gets.
- **For an approved folder `CLAUDE.md` gap, do one folder at a time, and offer
  the move with it.** Adding the folder file alone leaves the root `CLAUDE.md`
  exactly as long as it was, which is the whole thing this is meant to fix. So
  for each folder the owner approves:
  1. Show the draft folder file: what the folder holds, how to work in it, and
     where the detail lives.
  2. Show the lines in the root `CLAUDE.md` that are about that folder, and
     offer to move them into the folder file, leaving one line in the codemap
     pointing at it.
  3. Never move a behavior rule out of the root file or out of
     `.claude/rules/`. Four other things never move either: how to talk to the
     owner, the pointers to the most dangerous rules, the project-knowledge
     startup route, and the codemap lines themselves. They are named in
     `../project-init/references/thin-claudemd.md` under "What must stay in the
     root file".
  4. When the project has an `AGENTS.md`, do not copy the folder detail into it.
     `AGENTS.md` tells Codex to open a folder's `CLAUDE.md` before editing files
     there, so one copy is enough. If the project pins the two root files to each
     other with a shared block and a check, the block covers only the part that
     genuinely must match: the fixed lines above the title, `Communication`, the
     project-knowledge route, and the rules too dangerous to reach late.
  5. Never create a nested `AGENTS.md`.
- For a folder listed as **not recognized** in step 2, ask the owner what it is
  for in plain words, then either write the file from their answer or record the
  skip. Do not infer a purpose from the folder name.
- For a retired `memory-pr-hook` plus `wrap-up-ritual.md` finding, first confirm
  the current packaged pull-request reminder and `remember` skill are installed.
  Then offer removal of the obsolete hook registration, copied script, config,
  and rule as one reversible cleanup. Never leave two pull-request reminders
  active.
- For any approved project-knowledge gap, install or refresh the `second-brain`
  plugin first, then follow the state-specific path below.
  - **None:** show the tree from the plugin README, obtain approval, and ask the
    owner what the project is, why it exists, what finished looks like, its
    boundaries, who is involved, and where active work is tracked. Use those
    exact answers for `SOUL.md` and `knowledge/project.md`, then install the
    complete layout and runtime.
  - **Older layout:** use the `second-brain` skill's conversion path. Count the
    files first and show the owner the total. Convert in batches of ten, mapping
    the old fields to the new ones, and show each batch for approval. This is
    the one place approval comes after the write, and only because every one of
    those files was already approved once in its old shape. Anything that will
    not map cleanly is stopped on and named, never guessed. Flatten the
    subfolders, delete `knowledge/memory/tags.md`, repair every changed link,
    and remove the old machinery only after the checker passes.
  - **Current:** install only missing runtime or rebuild the indexes. Never
    rewrite approved documents merely to match current formatting.
  - **Mixed or unknown:** stop without writing and show the conflicting
    signatures.

  For an approved **none**, **older layout**, or **current** path, finish the
  same adoption unit before calling the system installed:
  1. Copy the packaged `build-knowledge-index.mjs`, `check-knowledge.mjs`, and
     `frontmatter.mjs` into `.claude/tools/`.
  2. Copy the packaged `knowledge-session-start.mjs`, `save-reminder.mjs`,
     `work-item-close.mjs`, and `command-parsing.mjs` into `.claude/hooks/`.
  3. Copy the packaged knowledge manual unchanged to `knowledge/README.md`.
     When a copy differs, show the diff and get approval before replacing it.
     Copy the packaged `memory-self-improvement.md` template to
     `knowledge/memory-self-improvement.md` when the project has no such file.
     What that file learns is per project, so never replace one that exists.
  4. Merge, never replace, `.claude/settings.json`: disable private auto-memory,
     enable `second-brain@claude-toolkit`, register the fail-open Claude
     `SessionStart` loader, and register both reminders under `PreToolUse` with
     the `Bash` matcher.
  5. Add the same short startup and fallback pointer to root `AGENTS.md` and
     `CLAUDE.md`. Merge the same fail-open loader into `.codex/hooks.json`
     without removing other hooks, with at least 5,000 tokens of additional
     context.
  6. Add the Obsidian ignore allowlist so only `knowledge/.obsidian/app.json` is
     shared.
  7. Run `node .claude/tools/build-knowledge-index.mjs`, then
     `node .claude/tools/check-knowledge.mjs`. Both must pass. Then run the
     startup loader and confirm it prints `SOUL.md`, the manual,
     `knowledge/project.md`, `knowledge/current.md`, and the entry lines of both
     indexes, once each and in that order.
  8. After converting a folder off an older layout, run the `reflect` skill once.
     A conversion is exactly when duplicates and contradictions surface.

  Do not remove old runtime or root routes until their current replacements are
  present and these checks pass.
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
  `CLAUDE.md` and `AGENTS.md`, unless the answer is "somewhere else, or nothing
  yet", in which case record the decline instead.
- **For an approved work-item stages gap, the tracker choice comes first.**
  A stage standard with no tracker to hold it is advice nobody can follow, so if
  the Gate 1 question was never answered, ask it and finish that answer before
  installing any part of this. Then install all three parts together:
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
  3. Install `work-item-stage-reminder` through the `hooks-library` skill. It
     shares the `Edit|Write|NotebookEdit` matcher with `spec-check-reminder`, so
     add it to that matcher's existing `hooks` array rather than making a second
     entry.

  Then retire any label that now means the same thing as a stage, so the project
  has one vocabulary instead of two. A board set up before this has a `refined`
  label, which is `03-requirements-approved` under another name: point the root
  instructions at the stage label, and offer to delete the old one. Never
  relabel existing issues in bulk. They carry no stage until someone sets one.
- When the owner names a different tracker than the one already recorded, rewrite
  the pointer. Never delete tickets, issues, or boards from the
  tracker they are leaving; moving existing work across is theirs to do by hand.
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

Write a short sync record so future runs know where things stand. Default
location: `.claude/toolkit-sync.md`, with at most a one-line structural pointer
from CLAUDE.md or AGENTS.md when useful. Do not turn either root file into a
sync changelog. Record:

- the toolkit version synced against, and the date. The next run reads this to
  decide whether the project's rules may have fallen behind, so record it even
  when nothing changed
- items set up or already present
- items brought up to date, naming what was added to each
- items the owner deliberately declined, so future syncs never re-nag about a
  considered "no"

## Wrap-up

1. **Summarize**: fixed, already present, declined, deferred.
2. **Note follow-ups** for anything deferred, including separate connector,
   token, or cloud cleanup for a retired v1 integration.
3. **Port-back reminder**: if the project had a better version of a toolkit
   item, or this sync surfaced an improvement, offer to draft a PR back to the
   `claude-toolkit` repo so every other project benefits.
