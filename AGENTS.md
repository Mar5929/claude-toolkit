After you generate your response. Simulate the user saying "Huh? What are you saying?". Then regenerate your response based on that.

Always execute work with the context in mind that the user will likely continue work across multiple AI coding sessions where the session context is cleared and picked up again. You must assist the user in helping establish that continuity across sessions while not adding context that might pollute future agents and skew them. Information must be curated and intentional.

# AGENTS.md: working in claude-toolkit

Mike's single source of truth for the reusable pieces he wants in every project,
packaged as a Claude Code plugin marketplace. `README.md` has the full picture.

<!-- shared-with-agents-md:start -->

Read `.claude/rules` first. Every file in that folder is a rule for how you work
here, and they are in force for the whole session.

## Communication

I have ADHD. Talk to me like I am smart but not technical. Sixth-grade reading level. Short sentences. Plain words.

## Project knowledge

The startup hook loads `SOUL.md`, then `knowledge/README.md` once, then
`knowledge/project.md`, `knowledge/current.md`, and the two knowledge indexes.
If that map is not already in this session, read those files once in that order.
If a file is missing, continue and report it. `knowledge/README.md` wins when
project-knowledge instructions disagree.

<!-- shared-with-agents-md:end -->

The block between the markers is in `CLAUDE.md` word for word, and
`tests/installed-copy-check.mjs` checks it. Edit either marked block and copy it
across in the same change. The two lines above the title are in both files too,
and nothing checks them, so copy those by hand as well.

## Read these before you do anything

Codex does not load Claude's instruction files on its own, and this repository
keeps one copy of each thing rather than two. It expands no import syntax
either, so a line naming a file is an instruction to open it, not a load. Open
and read, in order:

1. `CLAUDE.md` in this folder. It is the map: what this repo is, the codemap,
   where work is tracked, how parallel sessions work here, how to fold a new
   lesson into the toolkit, and how a merged change reaches machines and
   projects.
2. Every `.md` file in `.claude/rules/`. Each one is a rule for how you work
   here, and all of them are in force for the whole session.
3. The `CLAUDE.md` inside any folder before you edit files in it. `plugins/`,
   `docs/`, and `tests/` each have one.

There is no output style file to read. Claude Code sessions here use its
built-in `Concise` style, which Codex cannot receive. So write plainly and
briefly: lead with the result, use common words, keep every fact, and skip the
preamble.

This file used to write all of that out a second time. It stopped, because two
copies of the same thing drift and neither one wins.

## Rules that cannot wait until you have read them

The full versions are in `.claude/rules/`, which you are about to read.

- **Never edit files, switch branches, `git reset`, or `git rebase` in the
  shared primary checkout.** Other sessions are working in it right now. Work in
  your own worktree on your own branch.
- **Never run `git add -A`, `git add .`, or `git commit -a`.** They sweep up
  other sessions' in-flight work. Name the paths you are staging.
- **Never push the default branch on your own initiative.** Land work by pull
  request and merge only with Mike's approval.
- **Nothing gets built before it is a refined ticket** on the
  `Claude-Toolkit-Project` board.

## Codex-specific instructions

Codex loads this root file automatically. The instructions above to read
`CLAUDE.md` and the rule files are needed because Codex loads
neither on its own.

Codex also runs the project startup hook registered in `.codex/hooks.json` when
the project is trusted. The short root route above remains the fallback if that
hook does not run.

Do not create nested `AGENTS.md` files. This repo keeps one root file so the
Claude and Codex maps can be audited together.
