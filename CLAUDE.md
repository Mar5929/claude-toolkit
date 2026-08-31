After you generate your response. Simulate the user saying "Huh? What are you saying?". Then regenerate your response based on that.

Always execute work with the context in mind that the user will likely continue work across multiple AI coding sessions where the session context is cleared and picked up again. You must assist the user in helping establish that continuity across sessions while not adding context that might pollute future agents and skew them. Information must be curated and intentional.

# CLAUDE.md: working in claude-toolkit

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

The block between the markers is in `AGENTS.md` word for word, and
`tests/installed-copy-check.mjs` checks it. So are the two lines above the title,
which nothing checks, so copy those by hand.

Everything else differs on purpose. This file is the map. `AGENTS.md` is a short
pointer that tells Codex to come read this file, then `.claude/rules/`, then a
folder's own `CLAUDE.md` before editing there. It holds no
codemap and no folder detail, so there is nothing below the markers to keep in
step. What it does hold is the handful of rules too dangerous for Codex to reach
late; when one of those changes, change it there too.

## Codemap

| Path | What lives there |
| --- | --- |
| `plugins/` | The nine plugins this repo ships, the `project-init/library/` material other projects receive, and the `project-init/machine/` material every computer receives. Detail: `plugins/CLAUDE.md`. |
| `.claude-plugin/marketplace.json` | Registers every plugin for Claude Code. `.agents/plugins/marketplace.json` does the same for Codex. |
| `docs/` | `toolkit-map.md`, the cross-cutting catalog. Detail: `docs/CLAUDE.md`. |
| `tests/` | Three Node checks, run by hand before every pull request. Detail: `tests/CLAUDE.md`. |
| `archive/` | Retired material kept for history. Never a source of current truth. |
| `knowledge/` | The project overview, generated index, approved specifications, persistent memory, raw brainstorms, and minimal Obsidian vault settings. |
| `.claude/` | What this repo runs on itself: the rule copies, installed hooks and tools, settings, and the setup record in `toolkit-sync.md`. |

This repo runs the toolkit on itself. `.claude/rules/`, `.claude/hooks/`, and
`knowledge/` are the same setup every other toolkit
project gets, installed here so a change is felt where it is written instead of
three weeks later in another project. That means most files under `.claude/` are
copies of files this repo also ships.
`tests/installed-copy-check.mjs` fails when a shipped file and its copy stop
matching, so nobody has to remember to change both.

The `second-brain` plugin supplies the `remember`, `recall`, `retire`,
`reflect`, and `session-search` skills. The installed manual, startup loader,
per-prompt memory reminder, pull-request reminder, work-item reminder, index
builder, and knowledge checker are managed copies of what that plugin ships. `knowledge/README.md` is the
runtime authority. `knowledge/specs/knowledge-system.md` is the build authority
for the plugin itself.

## Where work is tracked

The `Claude-Toolkit-Project` board on GitHub, which is connected to this
repository. How this board works:

- Move the issue to `Refining` when the refinement session starts. When the
  session ends and the spec is agreed, add the `refined` label and move it to
  `Ready`. Work may start then, and not before.
- **The issue body holds the functional requirements and nothing else.** The
  goal, why it matters, what has to be true for it to count as finished, the use
  cases and scenarios, and what the person using it should experience. What and
  why, never how. Keep out file paths, version numbers, and the step-by-step
  build plan: they are read once and are wrong as soon as a file moves.
- **Everything else goes in the issue comments.** Progress, decisions made while
  building, blockers, and pointers to files by relative path. Comments are dated
  and in order, so they carry the story of the work without letting it rot the
  requirements. This is the same split `work-tracker` makes between
  `REQUIREMENTS.md` and `STATUS.md`: here the body plays the requirements role
  and the comments play the status role.
- When direction changes, edit the body in that same session rather than leaving
  the old target standing, and put the reason in a comment.
- The `grill-me` skill is one way to run the refinement session. What the rule
  requires is the session and the agreed spec, whether that comes from the skill
  or from a plain conversation.

## Parallel sessions in this repo

`.claude/rules/parallel-agent-sessions.md` is the rule. Two things are specific
to this repo:

- Worktrees are siblings of the primary checkout, named
  `claude-toolkit-<issue number>`, on a branch named `issue-<number>-<slug>`.
- A save that touches only `knowledge/` lands directly on `main`, per
  `.claude/rules/knowledge-direct-commit.md`. Knowledge writes made during
  branch work land in the worktree instead and reach `main` when the pull
  request merges. Either way, two sessions saving at once both rebuild the two generated
  indexes, `knowledge/memory/memory-index.md` and
  `knowledge/specs/spec-index.md`. Git can merge those with no reported conflict
  and still leave them wrong. After bringing your branch current, run
  `node .claude/tools/build-knowledge-index.mjs` again: it rebuilds them from
  the files, which are what win.

## Your main job here: fold new lessons into the toolkit

Most sessions in this repo start with Mike saying some version of "I want every
new project to also do X" or "remember this for future projects." Don't just
write X down somewhere. Fit it into the system:

1. **Classify it, then place it.**

   | X is... | It goes... |
   | --- | --- |
   | A rule for how agents behave, write, or work in every project | A new file in `plugins/project-init/library/rules/general/`; also add a row to that folder's `README.md` index (default ON or conditional) |
   | A rule that must hold in every repository on the machine, including ones nobody set up with the toolkit | A new file in `plugins/project-init/machine/rules/`, plus a row in that folder's `README.md` and an entry in the `machine-sync` skill. Only when a project rule genuinely cannot cover it |
   | A setup step for new projects | Into the right gate in `plugins/project-init/skills/project-init/SKILL.md` and `references/setup-flow.md` (or propose a new gate) |
   | A guard hook or automation | The `hooks-library` plugin. A hook checks an output, triggers a process agents forget to run, or orients a session at its start; if it needs none of those, it stays a rule |
   | A whole reusable system | A new plugin under `plugins/`, each with its own `README.md`, registered in `.claude-plugin/marketplace.json`, offered by `project-init`, and listed in `docs/toolkit-map.md` |

2. **Clean up the language, keep the intent.** Mike describes things loosely;
   tighten the wording. If placement or intent is ambiguous, ask before writing.
3. **Then follow `plugins/CLAUDE.md`** for the rest: one canonical home and
   every document that has to be updated with it, opt-in by default, giving a
   new agent the writing rules in its own text, the three version numbers to
   bump, and keeping `main` installable. It loads as soon as you open a file
   under `plugins/`, which is where all of that work happens.

Older files may still contain em dashes and section signs; clean them up in any
file you are already editing.

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
2. **Roll the machine-wide part into each machine.** When the change touched
   `plugins/project-init/machine/`, refreshing the plugin does NOT put it in
   `~/.claude/`. Run the `machine-sync` skill (`/machine-sync`) on each machine.
   It compares that machine's own `~/.claude/` against the machine-wide set and
   installs what you approve. This is also the whole setup for a brand-new
   computer: add the marketplace, install `project-init`, run `/machine-sync`.
3. **Roll the change into each existing project.** Refreshing the plugin does
   NOT touch a project that is already set up: its rules were copied into
   `.claude/rules/` when the project was initialized, so a new rule or system
   does not appear there on its own. In each project that should get the change,
   run the `project-sync` skill (`/project-sync`, or just "sync this project
   with the toolkit"). It audits the project against the refreshed toolkit and
   adds what is missing, with your approval. project-sync refreshes the plugin
   first as its own Step 1, so running it inside a project also covers step 1
   for that machine.

In one line: push to GitHub, then on every machine `/plugin marketplace update`
and `/machine-sync`, then in every project `/project-sync`. Nothing propagates
across machines by itself; each machine and each project pulls the change in.

This repo is one of those projects now. It runs the toolkit on itself, so a
merged change reaches it the same way: refresh the plugin, then sync.
