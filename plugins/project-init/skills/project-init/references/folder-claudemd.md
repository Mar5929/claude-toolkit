# A CLAUDE.md in every major folder (Gate 1)

A folder `CLAUDE.md` is a short file sitting inside a folder that says what the
folder holds, how to work in it, and where the detail lives. Claude Code loads it
only when an agent reads a file in that folder, so it costs nothing in the
sessions that never go there.

That is the whole point. The root `CLAUDE.md` and every file in `.claude/rules/`
load at the start of every session, and the bigger that pile grows the less
weight any one part of it carries. Folder detail moved into a folder file leaves
the always-loaded pile without being lost.

Write the folder's file at the same time as the folder, even when the folder
starts empty. Its purpose is known at creation, and a folder created now and
described later is usually never described.

## What goes in one

Ten to twenty lines. Three things:

- **What the folder holds.** One or two sentences.
- **How to work in it.** The conventions an agent needs while editing files
  here: naming, what pairs with what, what has to be updated alongside a change.
- **Where the detail lives.** Links to the index, the specification, the
  guide, or the rule that owns each part.

## What never goes in one

- **A behavior rule.** Rules live in `.claude/rules/`, which Claude Code loads
  at the start of every session. A folder file loads only when an agent reads a
  file in that folder, and never when an agent only runs a command against it.
  A file that loads sometimes cannot carry a rule that applies always. A folder
  file may point at a rule; it may never hold the only copy of one.
- **A rule too dangerous for Codex to reach late.** Codex reads `AGENTS.md` and
  nothing else on its own. Root `AGENTS.md` tells it to open a folder's
  `CLAUDE.md` before editing files there, so ordinary folder detail is safe to
  keep here. What is not safe is a rule that must land before the folder is
  opened at all: that stays written out in root `AGENTS.md`.
- **A second copy of a `README.md` index.** The README stays the one index. The
  folder file points at it and never repeats it, so the two cannot drift apart.
- **Live status.** Current phase, next action, and open work belong in the work
  tracker.

## Never a nested AGENTS.md

Do not create `AGENTS.md` files inside folders. Codex would not read them, and
it would double the files to keep current for no gain.

## Which folders get one

The major folders setup creates: a folder an agent will open files in whose
purpose is not obvious from its name alone. Source folders, test folders,
documentation folders, tool folders, and the project's own working folders.

## Which folders are skipped

Record every skip in the setup summary, so a later `project-sync` can tell a
considered skip from an oversight.

- **A folder that already has a `README.md` index.** The README already states
  the folder's purpose, and a pointer next to it adds nothing. Skip it by
  default. Write a pointer-only file, two or three lines naming the folder and
  linking the README, only when the folder needs a working note the README does
  not carry.
- **`.claude/` and everything under it.** Its rules, hooks, output styles, and
  agents already reach a session through their own mechanisms, and
  `.claude/rules/README.md` indexes the rules folder.
- **`knowledge/` and everything under it.** Its root startup routes and
  project-knowledge specification already own the vault contract. Adding a
  folder instruction file there would create a second authority.
- **A folder another plugin creates and indexes.** That plugin owns describing
  it. Leave it alone.
- **A folder with an obvious name and no conventions to state.** A file that
  says "this folder holds images" is noise.

## Template

```markdown
# <folder name>: <what it holds in five words>

<One or two sentences: what lives here and what does not.>

## Working in here

- <convention an agent needs while editing these files>
- <what has to be updated alongside a change here>

## Where the detail lives

- <link>: <what that document owns>
```

## Keeping them current

`keep-claudemd-current.md` in the general rules library covers the folder files
as well as the root file. When work changes what a folder is for, that folder's
`CLAUDE.md` is updated in the same session.
