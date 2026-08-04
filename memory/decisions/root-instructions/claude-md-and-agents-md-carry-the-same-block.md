# CLAUDE.md and AGENTS.md carry the same block, not a pointer

`AGENTS.md` holds a word for word copy of the shared instruction block in
`CLAUDE.md` rather than pointing at it, and a pair of markers plus an automatic
check keeps the two copies the same.

Decided on 2026-08-04, while setting this repository up with its own toolkit for
GitHub issue #138.

## What each program reads

Claude Code reads [`CLAUDE.md`](../../../CLAUDE.md) and loads every file in
`.claude/rules/` on its own. Codex reads [`AGENTS.md`](../../../AGENTS.md) and
nothing else: not `CLAUDE.md`, not the rules folder. Codex also has no `@` import
syntax, so an import line written into `AGENTS.md` is plain text the model may or
may not act on.

Before this change, `AGENTS.md` in this repository was a single line: "Follow and
adhere to @CLAUDE.md". Codex could not resolve that, so a Codex session here
effectively got no instructions at all.

## What was rejected

The project-init reference on writing a thin root instruction file,
[`thin-claudemd.md`](../../../plugins/project-init/skills/project-init/references/thin-claudemd.md),
allows `AGENTS.md` to carry either the same structural pointers or a pointer to
the `CLAUDE.md` section that holds them. The pointer form was rejected here. The
Codex reachability check in
[the project-sync skill](../../../plugins/project-init/skills/project-sync/SKILL.md)
says it plainly: a pointer to a rule file is not delivery.

## The cost, and what pays it down

The accepted cost is duplication, which is the exact drift that
[this repository's memory rule](../../../.claude/rules/second-brain.md) tells
writers to avoid. It is paid down by making the duplication mechanical instead
of remembered:

- the shared content sits between `<!-- shared-with-agents-md:start -->` and
  `<!-- shared-with-agents-md:end -->` in both files; and
- [`tests/installed-copy-check.mjs`](../../../tests/installed-copy-check.mjs)
  fails the moment the two blocks differ.

Nobody has to remember to copy the block across. The check says so when it has
not happened.

## The size headroom that makes the full copy affordable

Codex silently drops the rest of an `AGENTS.md` past 32 KB. This one came to
17.9 KB, so the whole block fits with room to spare. That headroom is what makes
copying everything affordable rather than reckless, and it is worth measuring
again if the block grows a lot.

## The other copy this sits alongside

The second-brain memory routing is duplicated on purpose too: it appears in the
canonical rule and in both root instruction files, because an agent has to know
where things go before it opens anything. The same check compares that section
in the root files against the second-brain plugin file it was copied from, so
the routing cannot drift either.

## Where this was recorded at the time

[The toolkit setup record](../../../.claude/toolkit-sync.md) lists the root
instruction files under Gate 5 and describes what the copy check covers.
