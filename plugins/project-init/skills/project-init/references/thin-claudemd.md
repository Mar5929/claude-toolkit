# Writing thin root instructions (Gate 5)

Root instructions orient a session quickly. Behavioral rules stay in
`.claude/rules/`; durable project truth stays under `knowledge/`; folder detail
stays in the folder's own `CLAUDE.md` where Claude can load it on demand.

## What Gate 5 does

1. Copy the approved default and conditional rules into `.claude/rules/`.
2. Write or update the root `CLAUDE.md` with the short structure below.
3. Write or update root `AGENTS.md` for Codex. Never create a nested
   `AGENTS.md`.
4. Add or update `.claude/rules/README.md` so each installed rule is indexed.

The project knowledge procedure is packaged by the `second-brain` plugin. Do
not copy a retired large memory rule, verifier instructions, or the full
knowledge specification into either root file.

Both root routes carry this short principle:

> Keep project knowledge small: save stable facts, lasting events, decisions,
> or states that prevent repeated explanation or a wrong action. Put live
> progress in the tracker, reusable procedures in skills, source material in
> references, and past conversations in session history.

## What a thin CLAUDE.md contains

In this order:

- A title and one-line project description.
- `Read .claude/rules first.`
- When project knowledge is installed, one short line saying the fail-open
  `SessionStart` loader reads `knowledge/project.md` and
  `knowledge/index.md`, and that `knowledge/brainstorms/` is unchecked.
- A codemap with one line per major folder or module.
- Structural pointers that are not behavior rules, including the chosen work
  tracker and how a refined item is marked.
- Only the MCP instructions for servers this project actually uses.

The root file does not repeat the contents of `knowledge/project.md`, the
generated index, the save policy, or any rule already installed under
`.claude/rules/`.

## The knowledge startup route

When Gate 3 ran, Claude receives the project overview and map through
`.claude/hooks/knowledge-session-start.mjs`, registered under `SessionStart` in
`.claude/settings.json`. The hook fails open if either file is missing.

The root file carries a short signpost because a future maintainer needs to
know why the hook exists. The hook output, not a copied schema, gives Claude the
startup content.

## What AGENTS.md contains

Codex does not reliably receive Claude's rules or hooks. Root `AGENTS.md`
therefore contains:

- the same title and one-line project description;
- a direct instruction to open and read every `.md` rule under
  `.claude/rules/` before work;
- when project knowledge is installed, a direct instruction to read
  `knowledge/project.md` and `knowledge/index.md` first, open only the relevant
  specification or memory files, and treat `knowledge/brainstorms/` as
  unchecked;
- the same structural pointers as `CLAUDE.md`;
- every safety-critical rule Codex must receive before it can open a referenced
  file;
- folder detail that Claude moved into nested `CLAUDE.md` files, because Codex
  does not load those files; and
- any Codex-specific repository instructions.

Where native Codex hooks are available, Gate 3 may also register the equivalent
fail-open loader in `.codex/hooks.json`. `AGENTS.md` remains the portable route
and is required even when that hook exists.

## What stays in the root files

Four things stay at the root because an agent needs them before entering a
folder:

- how to talk to the owner;
- pointers to rules whose breach causes real damage;
- the project-knowledge startup route; and
- one codemap line per folder or module.

Everything else routes to its one canonical home.

## Folder detail belongs in folder CLAUDE.md files

`folder-claudemd.md` owns which folders get a short `CLAUDE.md`, what belongs in
one, and what is skipped. A folder file never owns an always-applicable rule.

The entire `knowledge/` tree is skipped even though it has no hand-maintained
README index. Its behavior is already owned by the root startup routes and the
project-knowledge specification. Adding another instruction file inside the
vault would duplicate authority.

`AGENTS.md` is the exception to moving folder detail. Codex never reads a nested
`CLAUDE.md`, so it keeps that detail in full. The two root files are deliberately
different lengths.

## Keep both files current

When a path, startup route, tracker, or safety rule changes, update the root
file that delivers it in the same change. Do not force the two files to match
byte for byte. Check `AGENTS.md` stays below the host's size cap, and never use
an `@` import or wildcard as though either host would expand it.
