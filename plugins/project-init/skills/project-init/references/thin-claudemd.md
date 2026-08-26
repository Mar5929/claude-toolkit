# Writing thin root instructions (Gate 5)

Root instructions orient a session quickly. Behavioral rules stay in
`.claude/rules/`; persistent project truth stays under `knowledge/`; folder detail
stays in the folder's own `CLAUDE.md` where Claude can load it on demand.

## What the two root files are for

Say this to the owner while writing them, because it decides every later
question about what goes in.

`CLAUDE.md` and `AGENTS.md` are the first thing an agent reads in a session,
before it knows anything else about the project. They do two jobs:

1. **Carry what an agent must know before it does anything**: how to talk to the
   owner, the rules whose breach causes real damage, and the startup route into
   project knowledge.
2. **Route.** When the owner asks for something, the root file is how the agent
   knows where that thing lives in this repository, so it can go open it.

The second job is the one that gets built badly. An agent asked to design a
Salesforce role hierarchy should be able to see from the root file that
`ai-external-knowledge/` holds vendor documentation captured for questions like
that, and go read it. A source nothing points at is a source nobody opens. So
the codemap names the context sources, not only the code folders.

Space in these files is the most expensive space in the project. A line that
does neither job is not harmless: it takes attention away from the lines that do.

## Three tests before a line goes in

Run them on every line, and again on any line an agent added later. Any yes
means it stays out.

1. **Could an agent find this out in one command?** That a folder is
   Git-ignored, that a file is generated, that a directory is empty right now.
2. **Is it about where something came from, or when it arrived?** "This folder
   came in with the latest toolkit sync." Git history owns that.
3. **Would a session that never read this line still do the right thing and
   still find what it needed?**

`keep-claudemd-current.md` in the general rules library carries the same three
tests, so every later session applies them too.

## What Gate 5 does

1. Ask whether the owner wants to create a root `SOUL.md`. If yes, work with
   them to write it. Never install a fixed template or overwrite an existing
   file.
2. Copy the approved default and conditional rules into `.claude/rules/`.
3. Write or update the root `CLAUDE.md` with the short structure below.
4. Write or update root `AGENTS.md` for Codex. Never create a nested
   `AGENTS.md`.
5. Add or update `.claude/rules/README.md` so each installed rule is indexed.

### The fixed lines above the title

Three instructions sit above the title in both root files, in this order. The
first is conditional; the other two are in every project.

**1. The SOUL route**, only when `SOUL.md` exists and the project declined the
project knowledge system:

> Read SOUL.md first and follow it throughout this session.

When project knowledge is installed, the startup hook and shared fallback route
already load SOUL, so do not add a second route. When the owner declines
`SOUL.md`, do not add an instruction.

**2. The self-check instruction**, in every project, verbatim:

> After you generate your response. Simulate the user saying "Huh? What are you
> saying?". Then regenerate your response based on that.

It goes directly under the SOUL route where there is one, and is the first line
of the file otherwise. Copy it exactly. It is the owner's wording, and it is not
to be reworded, shortened, repunctuated, or split across the two root files
differently. Write it as a single line, not as a block quote.

It sits at the top rather than in `.claude/rules/` or the output style on the
owner's instruction, and it is the one voice-shaped line the root files carry.

**3. The continuity instruction**, in every project, verbatim:

> Always execute work with the context in mind that the user will likely
> continue work across multiple AI coding sessions where the session context is
> cleared and picked up again. You must assist the user in helping establish
> that continuity across sessions while not adding context that might pollute
> future agents and skew them. Information must be curated and intentional.

Same handling: copy it exactly, in both files, on one line, and do not reword or
shorten it. It is quoted here for readability; in a root file it is one line.
It is the standing reason the rest of this document exists. A session works
knowing its context will be cleared and picked up by an agent that was not here,
so it writes down what that agent needs and leaves out what would mislead it.

The project knowledge procedure is packaged by the `second-brain` plugin. Do
not copy a retired large memory rule, verifier instructions, or the full
knowledge specification into either root file.

Both root files carry only this knowledge activation when the system is present:

> The startup hook loads `SOUL.md`, then `knowledge/README.md` once, then
> `knowledge/project.md`, `knowledge/current.md`, and the two knowledge indexes.
> If that map is not already in this session, read those files once in that
> order. If a file is missing, continue and report it. `knowledge/README.md`
> wins when project-knowledge instructions disagree.

## What a thin CLAUDE.md contains

In this order:

- When `SOUL.md` exists without project knowledge, the instruction to read it.
- The verbatim self-check instruction, then the verbatim continuity
  instruction. Both always.
- A title and one-line project description.
- `Read .claude/rules first.`
- When project knowledge is installed, the exact short activation above.
- A codemap with one line per major folder or module, naming the context
  sources alongside the code: captured outside documentation, the
  specifications folder, any reference data the project keeps. Each line says
  what is inside and when to open it.
- Structural pointers that are not behavior rules, including the chosen work
  tracker and how a refined item is marked.
- Only the MCP instructions for servers this project actually uses.

The root file does not repeat the contents of `knowledge/project.md`, the
generated index, the save policy, or any rule already installed under
`.claude/rules/`.

## The knowledge startup route

When Gate 3 ran, both hosts receive the manual and project map through
`.claude/hooks/knowledge-session-start.mjs`, registered under `SessionStart` in
their project hook configuration. The hook fails open if a file is missing.

The root file carries a short signpost because a future maintainer needs to
know why the hook exists. The hook output, not a copied schema, gives Claude the
startup content.

## What AGENTS.md contains

Codex reads `AGENTS.md`. It does not read `CLAUDE.md`, any folder `CLAUDE.md`,
or anything in `.claude/rules/` on its own, and it expands no import syntax: an
`@CLAUDE.md` line would sit there as plain text and load nothing. What it does
do is follow a plain instruction to open a file.

So AGENTS.md is a short pointer file, not a second copy of the project. It
contains:

- the same fixed lines above the title, in the same order;
- the same title and one-line project description;
- **a direct instruction to open and read `CLAUDE.md`, then every `.md` file
  under `.claude/rules/`, then the `CLAUDE.md` inside any folder before editing
  files in it**;
- the rules whose breach causes real damage, in short form, each naming the rule
  file that holds the whole thing, because a session that ignores the read
  instruction still must not do damage;
- the shared `Communication` and `Project knowledge` sections, identical to
  CLAUDE.md's; and
- any Codex-specific repository instructions.

It does not contain the codemap, the structural pointers, the folder detail, or
the working rules. Those live in `CLAUDE.md` and `.claude/rules/`, and AGENTS.md
sends Codex to read them.

This is a deliberate trade. The old design wrote all of it out, which guaranteed
a Codex session had the map and cost a hand-maintained second copy that drifted
from the first. The pointer design keeps one copy of each thing and relies on one
instruction being followed. That is the same bet the toolkit already makes for
`.claude/rules/`, which was never inlined.

Gate 3 registers the equivalent fail-open loader in `.codex/hooks.json` where
native hooks are available. AGENTS.md remains the portable fallback.

`root-file-examples.md` has a finished pair to write against.

## What stays in the root files

Four things stay at the root because an agent needs them before entering a
folder:

- how to talk to the owner;
- pointers to rules whose breach causes real damage;
- the project-knowledge startup route; and
- one codemap line per folder, module, or context source.

Everything else routes to its one canonical home.

## Folder detail belongs in folder CLAUDE.md files

`folder-claudemd.md` owns which folders get a short `CLAUDE.md`, what belongs in
one, and what is skipped. A folder file never owns an always-applicable rule.

The entire `knowledge/` tree is skipped because its root `README.md` already
owns the operating instructions. Adding a CLAUDE.md there would duplicate
authority.

`AGENTS.md` used to be the exception to moving folder detail, because Codex
never reads a `CLAUDE.md`. It no longer is: AGENTS.md instead tells Codex to open
each folder's `CLAUDE.md` before editing files there. Toolkit projects still keep
one root AGENTS.md even though Codex supports layered files.

## Keep both files current

When a path, startup route, tracker, or safety rule changes, update the root
file that delivers it in the same change. Under the pointer model most changes
touch `CLAUDE.md` only, because AGENTS.md holds no codemap to fall out of date.
The parts that must still match are the fixed lines above the title, the
`Communication` section, the `Project knowledge` route, and the list of rules
whose breach causes real damage. Do not force the two files to match byte for
byte anywhere else. Check `AGENTS.md` stays below the host's size cap, and never
use an `@` import or wildcard as though either host would expand it.
