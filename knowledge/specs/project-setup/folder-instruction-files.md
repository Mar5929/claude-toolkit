# Folder instruction files

Every major folder in a toolkit project carries its own short `CLAUDE.md` unless
another canonical file already owns its instructions, so folder detail reaches
an agent when it opens that folder instead of loading in every session.

## What it is for

The root `CLAUDE.md` and every file in `.claude/rules/` load at the start of
every session. The bigger that pile grows, the less weight any one part of it
carries, and rules that are loaded get missed because they are buried. Claude
Code loads a `CLAUDE.md` sitting inside a folder only when an agent reads a file
in that folder, so folder detail moved there leaves the always-loaded pile
without being lost.

## Who uses it

- **The owner.** Wants a root instruction file short enough to read and to keep
  current, and wants each folder to explain itself.
- **The agent.** Wants the orientation for a folder to arrive when it opens that
  folder, without every session paying for it.

## What it must do

- **New-project setup writes them.** Each major folder `project-init` creates
  gets a short `CLAUDE.md` saying what the folder holds, how to work in it, and
  where the detail lives. It is written at the same time as the folder, even
  when the folder starts empty.
- **Five kinds of folder are skipped**, and every skip is recorded in the setup
  summary: a folder that already has a `README.md` index, `.claude/` and
  everything under it, a folder another plugin creates and indexes, and a folder
  with an obvious name and no conventions to state. The fifth is `knowledge/`
  and everything under it: the root startup route and the project-knowledge
  specification already own that vault, so another instruction file would
  duplicate authority.
- **A `README.md` index is never repeated.** Where a folder has one it stays the
  one index. A pointer-only file is written only when the folder needs a working
  note the README does not carry.
- **Sync treats a missing one as a gap.** `project-sync` reports each folder as
  present, missing, skipped by design, or not recognized, and adds a file only
  with the owner's approval. A folder that already has its own `CLAUDE.md` is
  left alone and reported as present. A folder the toolkit did not create is
  reported and the owner is asked what it is for, never guessed at.
- **Sync also offers the move.** For each folder file the owner approves, sync
  shows the lines in the root `CLAUDE.md` about that folder and offers to move
  them into the folder file, leaving one codemap line pointing at it.
- **No rule moves.** Behavior rules stay in `.claude/rules/`, which loads every
  session. A folder file may point at a rule and may never hold the only copy of
  one.
- **Four things stay in the root file:** how to talk to the owner, the pointers
  to the most dangerous rules, the project-knowledge startup route when that
  system is installed, and the codemap lines themselves.
- **Codex is unaffected.** Codex reads the root `AGENTS.md` and never reads any
  `CLAUDE.md`, root or nested. Nothing Codex needs lives only in a folder file,
  and `AGENTS.md` keeps in full any detail the root `CLAUDE.md` handed off. No
  nested `AGENTS.md` files are created.
- **They are kept current.** When later work changes what a folder is for, that
  folder's `CLAUDE.md` is updated in the same session, the same way the root
  file is.

## How it behaves from the outside

Setting up a new project: the owner approves a folder, and the folder and its
`CLAUDE.md` appear together. At the end, the setup summary lists both the files
written and the folders skipped, with the reason for each skip.

Syncing an existing project: the gap report lists every folder in one of the
four states. Nothing changes until the owner approves. For each folder they
approve, they see the draft file, then the root `CLAUDE.md` lines about that
folder with an offer to move them in.

Daily work: nothing changes for the agent except that opening a folder brings
that folder's orientation with it.

## Edge cases

- **A folder whose only content is a `README.md` index.** Skipped, and the skip
  is recorded. If the folder needs a working note the README does not carry, a
  pointer-only file is written instead: it names the folder, links the README,
  and adds the note.
- **The `knowledge/` vault.** Skipped even though it has no hand-maintained
  folder index. Its root route and specification already tell agents how to use
  it, and its generated index lists the current documents.
- **An agent runs a command against a folder without ever reading a file in
  it.** That folder's `CLAUDE.md` never loads. This is exactly why behavior
  rules stay in `.claude/rules/`.
- **A folder the toolkit did not create.** Sync lists it as not recognized and
  asks the owner what it is for, rather than inferring a purpose from the name.
- **A Codex session works in the project.** It sees no folder file at all.
  Everything Codex must always know stays in the root `AGENTS.md`.
- **A project pins its two root files to each other with a shared block and an
  automatic check.** Detail cannot leave the root `CLAUDE.md` while it sits
  inside that block, because removing it would remove it from `AGENTS.md` too.
  The block has to shrink to the part that genuinely must match first, and that
  is said out loud before either file is touched.

## What it deliberately does not do

- **No automatic staleness check.** Nothing detects a folder file that has
  fallen behind what its folder now holds. The upkeep rests on
  `keep-claudemd-current.md`, which loads at the start of every session. If
  staleness shows up in practice, a reminder hook can be a later ticket.
- **No nested `AGENTS.md` files.** Codex would not read them, and they would
  double the files to keep current for no gain.

## Related

- [folder-claudemd.md](../../../plugins/project-init/skills/project-init/references/folder-claudemd.md):
  what goes in one, what never does, which folders get one, which are skipped,
  and the template.
- [thin-claudemd.md](../../../plugins/project-init/skills/project-init/references/thin-claudemd.md):
  what must stay in the root file, and what `AGENTS.md` keeps in full.
- [keep-claudemd-current.md](../../../plugins/project-init/library/rules/general/keep-claudemd-current.md):
  the rule that keeps the folder files current after setup.
- [CLAUDE.md and AGENTS.md carry the same block, not a pointer](../../memory/decisions/claude-md-and-agents-md-carry-the-same-block.md):
  why this repository's two root files hold the same block, and what the block
  covers now.
