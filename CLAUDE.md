# CLAUDE.md: working in claude-toolkit

This repo is Mike's single source of truth for the reusable pieces he wants in
every project: rules, the new-project setup flow, and (over time) hooks, the
memory architecture, and other systems. It's packaged as a Claude Code plugin
marketplace. `README.md` has the full picture; read it first.

The three 'toolkit-enabled' projects so far are Anchor, Dragonfly, and Diligence Ready

## Log every piece of work on the GitHub board

**Work tracking.** Work items for this repo live on the `Claude-Toolkit-Project`
board on GitHub, which is connected to this repository. Every piece of work is
logged there as an issue before it is built, and nothing is built until a
refinement session has filled in the six-part spec.

Those rules are stated once, in
`plugins/project-init/skills/project-init/references/general-rules/spec-before-you-build.md`.
Read it. It is the canonical statement and it governs this repo as well as every
project the toolkit sets up. Do not restate the six parts here; if they need to
change, change them there.

What is specific to this repo, on top of that rule:

- Move the issue to `Refining` when the refinement session starts.
- When the session ends and the spec is agreed, add the `grill-me-completed`
  label and move the issue to `Ready`. Work may start then, and not before.
- The spec is written into the GitHub issue body, since the board holds the work
  and this repo has no `work-items/` folder.

## Your main job here: fold new lessons into the toolkit

Most sessions in this repo start with Mike saying some version of "I want every
new project to also do X" or "remember this for future projects." Don't just
write X down somewhere. Fit it into the system:

1. **Classify it, then place it.**

   | X is... | It goes... |
   | --- | --- |
   | A rule for how agents behave, write, or work in every project | A new file in `plugins/project-init/skills/project-init/references/general-rules/`; also add a row to that folder's `README.md` index (default ON or conditional) |
   | A setup step for new projects | Into the right gate in `plugins/project-init/skills/project-init/SKILL.md` and `references/setup-flow.md` (or propose a new gate) |
   | A guard hook or automation | The `hooks-library` plugin. A hook checks an output, triggers a process agents forget to run, or orients a session at its start; if it needs none of those, it stays a rule |
   | A whole reusable system | A new plugin under `plugins/`, each with its own `README.md`, registered in `.claude-plugin/marketplace.json`, offered by `project-init`, and listed in `docs/toolkit-map.md` |

2. **Clean up the language, keep the intent.** Mike describes things loosely;
   tighten the wording. If placement or intent is ambiguous, ask before writing.
3. **One canonical home.** Each item lives in exactly one place; other files
   reference it. Update every doc that mentions it (SKILL.md, setup-flow.md,
   README). Every plugin has a `README.md` (its canonical description), and
   `docs/toolkit-map.md` is the cross-cutting catalog plus the honest read on how
   the pieces relate (what looks redundant but is not). When you add, rename, or
   remove a plugin or skill, update that plugin's `README.md`, the map, and the
   top `README.md` in the same change, so a future session can still answer "what
   is each thing, and is anything redundant?" from the repo itself.
4. **Opt-in by default.** Nothing is forced on a project unless Mike says every
   project should get it; then mark it default ON in the `general-rules/README.md`
   index (like most rules there), not conditional.
5. **Bump versions.** A content change to a plugin bumps its `plugin.json`
   version and `metadata.version` in `marketplace.json`.
6. **Keep `main` installable.** `claude plugin validate .` must pass; `main` is
   what every machine installs from.

## The other direction: pull a merged change onto your machines and into projects

Folding a change into `main` (above) is only half the trip. A change starts
helping other projects only once each machine pulls it and each project adopts
it. Pushing to GitHub updates nothing on its own. After a PR merges to `main`:

1. **Refresh the plugin on each machine.** The installed copy at
   `~/.claude/plugins/marketplaces/claude-toolkit` is a git clone that does not
   auto-update. Inside a Claude Code session run
   `/plugin marketplace update claude-toolkit`; from a terminal run
   `claude plugin marketplace update claude-toolkit`. That git-pulls the copy
   and refreshes the plugin cache. Restart the session to be sure it picks up
   the new content.
2. **Roll the change into each existing project.** Refreshing the plugin does
   NOT touch a project that is already set up: its rules were copied into
   `.claude/rules/` when the project was initialized, so a new rule or system
   does not appear there on its own. In each project that should get the change,
   run the `project-sync` skill (`/project-sync`, or just "sync this project
   with the toolkit"). It audits the project against the refreshed toolkit and
   adds what is missing, with your approval. project-sync refreshes the plugin
   first as its own Step 1, so running it inside a project also covers step 1
   for that machine.

In one line: push to GitHub, then on every machine `/plugin marketplace update`,
then in every project `/project-sync`. Nothing propagates across machines by
itself; each machine and each project pulls the change in.

## Writing rules (they apply here too)

How you talk to Mike is governed by the `plain-language` output style, at
`plugins/project-init/skills/project-init/references/output-styles/plain-language.md`.
Read it. It is the canonical statement and it applies to this repo's own files,
not just to the projects this toolkit sets up: plain language, no jargon you
have not defined, no em dashes, no section signs, no filler, replies built from
lists, quiet between tool calls, and the actions Mike has to take at the end.

One thing that style cannot know, which this repo needs on top:

- **This is the easiest place to forget that Mike is non-technical.** The repo
  is full of hooks, git plumbing, MCP servers, and deployment steps, so the
  jargon is always right there. Explaining what you DID counts, not just telling
  him what to do: say it in plain words, say what it means for him, and skip the
  mechanics unless he asks. If a sentence only makes sense to someone who
  already knows git or MCP, rewrite it.

Older files may still contain em dashes and section signs; clean them up in any
file you are already editing.

Mike will tell you when he wants the detail. Default to the short, plain version.

## Parallel sessions

Mike usually runs several Claude Code sessions at once. Work in your own git
worktree on your own branch, never edit the shared primary checkout, and land
changes on `main` by pull request. After opening the PR, ask Mike whether to
merge and clean up; merge only when he approves. (This is the same protocol
that the `parallel-agent-sessions.md` general rule installs into new projects.)
