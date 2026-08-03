---
name: project-sync
description: >-
  Audit an EXISTING project against the claude-toolkit and set up whatever is
  missing. Use when the user points a project at the toolkit and says things
  like "make sure all the tools, rules, and systems from my toolkit are set up
  in this project", "sync this project with claude-toolkit", "audit this
  project against the toolkit", or "/project-sync". This skill inventories
  everything the toolkit currently ships (the general and Salesforce rules
  libraries, hooks, the Git-native work-tracker, the complete second-brain v3
  system, retired v1 local-wiring recognition, standalone skills such as
  grill-me, and any newer systems), cross-references the current project,
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
     (with its own index), `output-styles/` (with its own index), `tools/`,
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
  - every file in `library/output-styles/`, noting from its `README.md` which are
    default ON. These are not rule files and a project that carries every rule
    can still have no style installed, so check them separately
  - the per-server MCP tool rules in `../../library/guides/mcp-best-practices.md`;
    these are conditional, so only audit the servers this project connects
  - each system from the setup gates: hooks, memory system, knowledge layer
  - the multi-part kits, which are a tool plus a rule plus a hook rather than a
    single file, so a partial install looks like a pass unless you check each
    part: the Salesforce permission set kit
    (`salesforce-permissions-retrieval.md`), the Salesforce dependency graph
    (`salesforce-dependency-graph.md`, whose tool is `../../library/tools/kb/`),
    and, for every other stack, the graphify code graph
    (`graphify-dependency-graph.md`, whose rule is
    `library/rules/general/dependency-graph.md`)
  - the `work-tracker` plugin and any existing `work-items/` or
    `engagement/work-items/` tree
  - the `hooks-library` plugin and both its hooks: `style-reminder`
    (UserPromptSubmit) and `writing-guard` (Stop). Check `.claude/settings.json`
    for a registered entry and `.claude/hooks/` for each copied script. Both pair
    with the output style and do nothing useful without one, so audit them
    together and never report a hook as installed when no style is selected
  - a project still carrying the retired voice rules (`writing-and-language.md`,
    `how-to-reply.md`, `treat-owner-as-non-technical.md`,
    `define-your-terms.md`). All four were removed from the toolkit in favor of
    the output style. Report them, but see step 4 before touching any
  - a project whose `writing-guard.mjs` predates #102. The old copy checks
    filler openers by default and cites three rule files that no longer exist.
    The current one checks the em dash and the section sign, leaves filler
    openers off, and ignores anything inside a fenced block or a backtick span.
    Offer the newer script
  - a project whose `.claude/output-styles/plain-language.md` predates #102. The
    old copy is a flat bullet list, says "prefer lists and bullet points", and
    has no goal, no examples, and nothing about invented names or figures of
    speech. Offer the rewrite
  - each standalone skill offered by the setup flow, including `grill-me`
  - anything newer listed in the toolkit README under "What's here now"
  - skip roadmap items; they are not built and cannot be audited. Second-brain
    v3 is shipped and must be inventoried from its plugin. Existing retired v1
    integration remains a separate local finding
- Note the toolkit version (from `plugin.json` or `marketplace.json`) for the
  sync record in step 5.

## Step 2: audit the current project

For each inventory item, look for evidence in the project. Judge by intent, not
exact wording: a CLAUDE.md that says "never commit secrets" satisfies the
secrets rule even if the prose differs. Typical checks:

- **CLAUDE.md and `.claude/rules/`**: does CLAUDE.md exist and point at
  `.claude/rules/`, and does that folder carry each default-ON general rule (a
  file, or the rule's intent folded into CLAUDE.md)? Judge by intent, not exact
  wording or file name.

  One exception to the "copy every default-ON rule" pass:
  `spec-before-you-build.md` reads the tracker's name out of the project's root
  instructions and tells an agent to stop and ask when none is there. Never copy
  it on its own. It ships only together with a settled answer to the tracking
  question and the pointer that answer produces, both covered below. A project
  that gets the rule with no pointer stalls the next time an agent goes to log
  work.
- **Output style**: does `.claude/output-styles/` hold each default-ON file, and
  does a settings file actually select one (`outputStyle` in
  `.claude/settings.json` or `.claude/settings.local.json`)? Both halves matter.
  A copied style file that nothing selects is inert, and a selected style whose
  file is missing silently falls back to the default. Judge the file by intent,
  not exact wording, the same as a rule.
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
- **Second-brain v3 status:** v3 is the current Markdown and Git system. Audit
  it as one coherent installation:
  - `.claude/rules/second-brain.md`;
  - `.claude/agents/memory-librarian.md`;
  - the full memory section, identical and first, in `CLAUDE.md` and
    `AGENTS.md`;
  - `brainstorms/README.md`;
  - `specs/README.md`;
  - `memory/README.md`; and
  - root indexes for context, planning, decisions, knowledge, references,
    domain, and operations.
  Classify v3 as present only when the complete core exists. A few similar
  folders without the shared rule and role are existing project documentation,
  not an installed v3 system.
- **V3 document map:** inventory existing specifications, brainstorms, ADRs,
  architecture and system maps, roadmaps, project overviews, runbooks,
  glossaries, references, and raw artifact folders. Report likely canonical
  homes, duplicates, contradictions, missing indexes, broken routes, and live
  work state copied into durable documents. Distinguish observed facts,
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
- **Knowledge layer:** v3's typed memory is the knowledge layer. Do not create a
  second store. Existing v1 curator files, `know-*` nodes, SHA pins, and drift
  reports remain retired and are never refreshed, reconciled, imported, or
  used as current truth.
- **Standalone toolkit skills:** check the previous sync record and the
  available host plugins. For `grill-me` and `session-summary`, classify each as
  available to invoke, previously declined, or not applicable. Do not look for a copied
  `SKILL.md` inside the project because the canonical skill stays in its plugin.
- **Where work items are tracked:** read the root instructions for a structural
  pointer naming a tracker, and for a recorded decline. Classify as one of:
  answered and set up, answered and declined, or never asked. A project that has
  a `work-items/` tree but no pointer counts as never asked. Never-asked is a gap
  to offer in step 4; a recorded decline is respected and not raised again.
- **The `spec-before-you-build.md` rule:** classify as present, missing, or
  previously declined in `.claude/rules/`. When a tracker is named but the rule
  is missing, that is a gap: the project has somewhere to log work and no
  instruction to log it there. When the project's root instructions or its own
  rules already say something about ticket quality, show the difference against
  the toolkit's current wording and let the owner keep theirs, take the
  toolkit's, or merge the two. Never overwrite without asking.
- **Work tracker:** detect `work-items/` and `engagement/work-items/`. If
  `.work-tracker.json` and per-item `ITEM.json` records exist, run the tracker
  validator and classify the system as present or partial from its output. If
  only the older stage folders, `BACKLOG.md`, `SPEC.md`, and `STATUS.md` exist,
  classify them as safely adoptable, not as a competing tracker. If neither
  exists, classify work-tracker as missing or previously declined.
- **GitHub Project option:** inspect only the checked-in tracker configuration.
  Report whether GitHub mirroring is configured. Do not create, link, or modify
  a Project during the audit. Offer it separately in step 4 because it changes
  external issues, labels, fields, and Project items.
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
`.claude/rules/`. The v3 memory section in `CLAUDE.md` and `AGENTS.md` is
already covered below; treat it as the worked example of this check rather than
a separate rule.

### Codex reachability: can AGENTS.md deliver the rules?

Every check above asks whether a rule EXISTS. None asks whether the agent
actually receives it. Those are different questions, and they have different
answers for the two programs.

- **Claude Code loads `.claude/rules/` automatically.** Every `.md` file there
  without `paths:` frontmatter is in context at session start. No import needed,
  and CLAUDE.md does not have to mention the folder for it to work.
- **Codex loads `AGENTS.md` and nothing else.** Not `CLAUDE.md`, not
  `.claude/rules/`, and it has no `@` import syntax, so any `@` line in
  AGENTS.md is plain text the model may or may not act on. Codex caps the file
  at 32 KB and drops the rest silently.

So a project can pass every rule check while a Codex session runs on whatever
fraction of the rules happens to be inline in AGENTS.md. Report:

- **The delivery gap.** How many lines are in `.claude/rules/`, and how many
  reach Codex? Say it as a number, because the ratio is usually startling.
- **Which safety-critical rules are missing from AGENTS.md entirely.** For each
  rule whose breach causes real damage (production writes, deploys, destructive
  commands, secrets, anything a guard hook exists for), check whether AGENTS.md
  states it inline. A pointer to a rule file is not delivery.
- **Whether a guard hook covers the gap.** Claude Code `PreToolUse` hooks do not
  fire for Codex, and `~/.codex/config.toml` usually registers none. A rule
  Codex cannot see, backed by a hook that never runs for Codex, is unenforced in
  both directions at once. Flag that combination explicitly; it is the worst
  state a project can be in and it is invisible to every other check.
- **Dead imports.** Grep both root files for `@` lines. Report any that resolve
  to nothing, especially wildcards such as `@.claude/rules/**`, which look
  load-bearing and expand to nothing in either program.
- **AGENTS.md size** against the 32 KB cap, so nothing is being truncated.

The fix, when the owner approves it, is not to shrink CLAUDE.md into AGENTS.md
or the reverse. It is to write the damaging rules out in full in AGENTS.md, add
a table saying which rule file to open before which kind of work, and record in
`keep-claudemd-current.md` that the two root files diverge on purpose so the next
session does not helpfully "fix" them back into copies.

Skip this check only when the owner confirms Codex never runs in the project.

### CLAUDE.md health

A project can pass every check above and still have a CLAUDE.md nobody reads.
The file only ratchets: `keep-claudemd-current.md` tells every session to add to
it, and nothing tells a session to subtract. So audit its shape, not just its
presence. Read the file and report:

- **Size.** How many lines? The thin model (`thin-claudemd.md`) targets a file a
  session reads in full. Past roughly 250 lines, flag it and say which sections
  account for the bulk.
- **Duplication against `.claude/rules/`.** For each rule file in that folder,
  is the same rule also spelled out in CLAUDE.md? Restating it is worse than
  moving it, because the two copies drift and neither wins. List every rule that
  is said twice.
- **A codemap that became a changelog.** Codemap entries should be one line per
  folder or module plus any load-bearing invariant. Flag entries carrying dated
  history ("2026-07-17 changed X, decision #17"); that history belongs in Git
  and the applicable specification or durable memory.
- **Live state that belongs in the status doc.** Current phase, next action, and
  open TODOs drift the moment they are written here. Flag them for work-tracker
  or the live status doc.
- **V3 memory section parity.** When second-brain is installed, confirm both
  `CLAUDE.md` and `AGENTS.md` carry the full memory section from the plugin's
  `references/orientation-snippet.md`, identical in both, positioned first
  (after the title and the rules line, before the codemap), and pointing at
  `.claude/rules/second-brain.md` as canonical. This section is the one
  sanctioned duplication, so do not flag it as bloat and never propose trimming
  it. Do flag: a shortened or paraphrased copy, the two files disagreeing, the
  section buried below other sections, it being present in only one root file,
  or it having drifted from the canonical rule's authority map, homes, or
  document contract.
- **Stale content.** Anything the code, paths, or decisions have since
  contradicted.

Report this as findings with a recommended trim, not as a pass or fail, and
treat the trim as one more item the owner opts into at step 4. Two constraints
on any trim you propose:

- **Never drop the file's self-maintenance mandate.** The wording making
  CLAUDE.md a living document that sessions must keep current stays, verbatim.
  A trim that removes it guarantees the file goes stale next.
- **Check cross-references before renumbering.** Grep the repo for references to
  CLAUDE.md section or rule numbers. If a trim would renumber sections other
  files point at, say exactly which, and let the owner choose between
  renumbering with the fixes and keeping the numbering stable.

## Step 3: report before touching anything

Show one table: item, status, and what specifically is missing or drifted. Make
no changes in this step. Let the user pick what to fix, and recommend an order
(complete v3 adoption, retired v1 local wiring as a separate choice, missing
default-ON rules, outdated rules, then other systems).
Existing v1 wiring does not block v3 adoption.

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
- For an approved output style gap, do all four parts: copy the file from
  `../../library/output-styles/` into `.claude/output-styles/`, set
  `outputStyle` in the committed `.claude/settings.json`, and install both
  `style-reminder` and `writing-guard` via `/hooks-library`. The style alone is
  delivered once at session start and then goes stale; either hook alone does
  nothing useful. If the owner already selected a different style, show them the
  clash and let them choose rather than overwriting it. Say plainly that the new
  voice starts on their next session, so they do not think it failed.
- **For the retired voice rules, propose the swap, never a bare deletion.** A
  project on the old setup has working guidance; removing it before the style is
  in leaves the project with neither. Install and verify the style plus its two
  hooks first, then offer to delete `.claude/rules/writing-and-language.md`,
  `how-to-reply.md`, `treat-owner-as-non-technical.md`, and
  `define-your-terms.md`. Say the one remaining cost out loud so the owner is
  choosing with it in view: a helper agent still never sees an output style,
  which is why `follow-the-output-style.md` goes into the rules folder in the
  same pass.
- **An older `writing-guard` in a project is an upgrade, not a removal.** #101
  retired the hook and #102 brought it back narrower, so a project that kept its
  old copy was right to. Offer to replace the script with the current one and
  say what changes: filler openers stop being checked by default, quoted text
  stops counting, and the messages stop citing rule files that were deleted.
  Leave `.claude/writing-guard.json` alone unless the owner wants its checks
  changed.
- For an approved v3 gap, install the `second-brain` plugin and follow its
  brownfield adoption guide:
  1. keep the audit read-only until the owner approves exact treatments;
  2. show the complete core plus real project-specific system areas;
  3. use the plugin's canonical rule, role, orientation snippet, and index
     templates rather than retyping them;
  4. preserve good existing homes;
  5. treat each existing source as keep and link, move with approval,
     consolidate with approval, or leave unresolved; and
  6. offer an initial memory pass and `grill-me` after adoption.
  Do not mass-move, duplicate, delete, or declare current truth to make an
  existing project resemble a template. Risky or large structural work must be
  separately visible and approved.
- Do not install second-brain v1 or import its content. For an existing v1
  project, offer the following separately after reporting the exact local
  scope:
  1. **Deactivate:** remove v1 MCP entries and automatic hook registrations
     from committed Claude and Codex configuration. Preserve old scripts and
     agents temporarily.
  2. **Remove local integration:** delete only the committed v1 files and
     settings the owner explicitly approves.
  Neither option contacts the Worker or Neon, reads legacy memory, imports
  anything into v3, or deletes cloud infrastructure. Installing v3 does not
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
  that file for whichever answer comes back. Copy
  `library/rules/general/spec-before-you-build.md` into `.claude/rules/` and add the
  one-line pointer to `CLAUDE.md` and `AGENTS.md`, unless the answer is
  "somewhere else, or nothing yet", in which case record the decline instead.
- When the owner names a different tracker than the one already recorded, rewrite
  the pointer and the rule. Never delete tickets, issues, or boards from the
  tracker they are leaving; moving existing work across is theirs to do by hand.
- For an approved work-tracker gap, install the plugin and run `work init` at
  the detected canonical path. This may add metadata and generated views, but
  it must not overwrite existing `SPEC.md`, `STATUS.md`, or notes. Show any
  adopted records that still need owner review.
- Treat GitHub Projects as a second approval. Local tracker installation does
  not imply permission to create issues or a Project. If approved, use
  `work github connect` and report the exact repository and Project before
  synchronizing tickets.

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
