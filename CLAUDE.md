# CLAUDE.md: working in claude-toolkit

This repo is Mike's single source of truth for the reusable pieces he wants in
every project: rules, the new-project setup flow, and (over time) hooks, the
memory architecture, and other systems. It's packaged as a Claude Code plugin
marketplace. `README.md` has the full picture; read it first.

The three 'toolkit-enabled' projects so far are Anchor, Dragonfly, and Diligence Ready

## Work Item Tracking

Work for this repo is tracked on the `Claude-Toolkit-Project` board on GitHub,
which is connected to this repository. Every piece of work is logged there as an
issue before it is built, and nothing is built until a refinement session has
filled in the six-part spec.

Those rules are stated once, in
`plugins/project-init/library/rules/general/spec-before-you-build.md`.
Read it. It is the canonical statement and it governs this repo as well as every
project the toolkit sets up. Do not restate the six parts here; if they need to
change, change them there.

What is specific to this repo, on top of that rule:

- Move the issue to `Refining` when the refinement session starts.
- When the session ends and the spec is agreed, add the `refined` label and move
  the issue to `Ready`. Work may start then, and not before.
- The spec is written into the GitHub issue body, since the board holds the work
  and this repo has no `work-items/` folder.
- **The issue body holds the functional requirements and nothing else.** That is
  the goal, why it matters, what has to be true for it to count as finished, the
  use cases and scenarios, and what the person using it should experience. What
  and why, never how. Keep out the file paths, the current version numbers, the
  "replace the example under this heading", and the step-by-step build plan.
  Those are implementation. They are read once, and they are wrong as soon as a
  file moves or a version bumps.
- **Everything else goes in the issue comments.** Progress, decisions made while
  building, blockers, and pointers to files by relative path, such as
  `plugins/session-summary/skills/session-summary/SKILL.md`. Comments are dated
  and in order, so they carry the story of the work without letting it rot the
  requirements. This is the same split the `work-tracker` plugin makes between
  `SPEC.md` and `STATUS.md`. On this board, the body is the `SPEC.md` and the
  comments are the `STATUS.md`.
- Keeping both current is already required by `spec-before-you-build.md`, which
  says a written requirement that goes stale is what makes an agent build
  carefully to the wrong target. When direction changes, edit the body in that
  same session rather than leaving the old target standing, and put the reason
  for the change in a comment.
- The `grill-me` skill is one way to run the refinement session, and using it is
  optional. What the rule requires is the session and the agreed spec, whether
  that comes from the skill or from a plain conversation.

## Your main job here: fold new lessons into the toolkit

Most sessions in this repo start with Mike saying some version of "I want every
new project to also do X" or "remember this for future projects." Don't just
write X down somewhere. Fit it into the system:

1. **Classify it, then place it.**

   | X is... | It goes... |
   | --- | --- |
   | A rule for how agents behave, write, or work in every project | A new file in `plugins/project-init/library/rules/general/`; also add a row to that folder's `README.md` index (default ON or conditional) |
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
   project should get it; then mark it default ON in the `library/rules/general/README.md`
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
`plugins/project-init/library/output-styles/plain-language.md`.
Read it. It is the canonical statement and it applies to this repo's own files,
not just to the projects this toolkit sets up: real names only and never one you
invented, no figures of speech, common words, the answer first, a shape that
matches the content, every fact kept, no filler, no em dashes, no section signs,
quiet between tool calls, and the actions Mike has to take at the end.

Two things that style cannot know, which this repo needs on top:

- **This is the easiest place to forget that Mike is non-technical.** The repo
  is full of hooks, git plumbing, MCP servers, and deployment steps, so the
  jargon is always right there. Explaining what you DID counts, not just telling
  him what to do: say it in plain words, say what it means for him, and skip the
  mechanics unless he asks. If a sentence only makes sense to someone who
  already knows git or MCP, rewrite it.
- **Every agent this toolkit ships carries the same writing rules as the output
  style.** An output style is delivered in the main conversation's system prompt
  and never reaches a helper agent, so an agent definition under `plugins/*/agents/`
  has to carry the rules in its own text. `memory-librarian.md` has a "How to
  write" section for exactly this reason: it writes memory documents that future
  sessions read back, so a decoded-once word would spread instead of being
  forgotten. When you add an agent here, give it that section too.

Older files may still contain em dashes and section signs; clean them up in any
file you are already editing.

Mike will tell you when he wants the detail. Default to the short, plain version.

## Parallel sessions

Mike usually runs several Claude Code sessions at once. Work in your own git
worktree on your own branch, never edit the shared primary checkout, and land
changes on `main` by pull request. After opening the PR, ask Mike whether to
merge and clean up; merge only when he approves. (This is the same protocol
that the `parallel-agent-sessions.md` general rule installs into new projects.)
