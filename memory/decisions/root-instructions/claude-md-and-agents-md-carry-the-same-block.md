# CLAUDE.md and AGENTS.md carry the same block, not a pointer

`AGENTS.md` holds a word for word copy of the shared instruction block in
`CLAUDE.md` rather than pointing at it, apart from one passage each program has
to word for itself, and a pair of markers plus an automatic check keeps the two
copies in step.

Basis: Owner-confirmed 2026-08-04.

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
  compares the two blocks and fails when they differ anywhere outside the one
  passage described in the next section.

Nobody has to remember to copy the block across. The check says so when it has
not happened.

## The one passage the two files word differently on purpose

The copy is word for word apart from a single passage. The rule that grants that
exception and owns its wording is
[`keep-claudemd-current.md`](../../../.claude/rules/keep-claudemd-current.md):
in the steps for a save, Claude invokes the `memory-verifier` agent directly and
Codex cannot, so each root file states the same obligation in the way its own
program can act on it. The rule says not to "fix" either file to match the other.

That passage sits between `<!-- host-specific:start -->` and
`<!-- host-specific:end -->` in both files. The check enforces both halves of the
exception: each file must carry exactly one such passage and it may not be empty,
and everything outside those markers is compared word for word.

## The size headroom that makes the full copy affordable

`AGENTS.md` came to 18,081 bytes, about 6 KB under the working limit, so the
whole block fits. Codex caps how much of the file it reads, and
[`keep-claudemd-current.md`](../../../.claude/rules/keep-claudemd-current.md)
owns that cap and the working limit that keeps the file safely under it: stay
below about 24 KB, and measure with `wc -c AGENTS.md` or
`(Get-Item AGENTS.md).Length` after editing. That headroom is what makes copying
everything affordable rather than reckless, and it is worth measuring again
whenever the block grows.

## The other copy this sits alongside

The second-brain memory routing is duplicated on purpose too: it appears in the
canonical rule and in both root instruction files, because an agent has to know
where things go before it opens anything. The same check covers two of those
pairs: the root files against
[`orientation-snippet.md`](../../../plugins/second-brain/skills/second-brain/references/orientation-snippet.md),
the plugin file their memory section was copied from, and
[`.claude/rules/second-brain.md`](../../../.claude/rules/second-brain.md)
against the shipped
[`second-brain-rule.md`](../../../plugins/second-brain/skills/second-brain/references/second-brain-rule.md)
it is a copy of.

Nothing compares the shipped rule against the shipped snippet, and those two do
word some of their authority map differently. That is not a defect today: every
destination in every row is the same, so no routing is wrong, and the rule is
canonical by design while the snippet is a summary, so different wording there is
allowed. [The toolkit setup record](../../../.claude/toolkit-sync.md) records
that gap under "The copies, and what keeps them honest", so it is not mistaken
for drift.

## Where this was recorded at the time

[The toolkit setup record](../../../.claude/toolkit-sync.md) lists the root
instruction files under Gate 5 and describes what the copy check covers.
