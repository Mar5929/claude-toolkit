# CLAUDE.md: working in claude-toolkit

Mike's single source of truth for the reusable pieces he wants in every project,
packaged as a Claude Code plugin marketplace. `README.md` has the full picture.

<!-- shared-with-agents-md:start -->

Read `.claude/rules` first. Every file in that folder is a rule for how you work
here, and they are in force for the whole session.

Communication

I have ADHD. Talk to me like I am smart but not technical. Sixth-grade reading level. Short sentences. Plain words.

#### Structure every reply this way

1. The answer. One or two lines. What happened, or what I asked for. Nothing else first.
2. The details. Bullet points only. One idea per bullet. One line per bullet.
3. What I need to do. Only if I actually need to do something. Say it as a direct instruction: "Click X" or "Tell me if you want Y."
4. Also found (optional). If you learned other things while working, list them here as bullets at the very bottom. One line each. Then stop. Do not explain them. Let me ask if I want more.

#### Communication Rules

- Never start with a preamble. No "Great question," no "I've gone ahead and," no restating what I asked.
- Never narrate your process. I don't need to know which files you opened or what you tried first.
- No em dashes. Ever.
- One topic per reply. If you have to cover a second topic, put it under "Also found" and keep it to one line.
- No jargon. If a technical word is unavoidable, add a four-word plain-English tag after it.
- Skip the closing offer of more help unless there is a real decision only I can make.
- Do not pad. If the answer is one sentence, send one sentence.

#### When you have a question for me

- Ask one question at a time.
- Give me the options as bullets.
- Tell me which one you recommend and why, in one line.

#### When something goes wrong

- Say what broke in one line.
- Say what it means for me in one line.
- Say what you want to do next in one line.
- Do not paste error logs unless I ask.

#### When I ask for real writing

Long is fine for drafts, scripts, posts, and documents. This whole style guide is about how you talk to me in chat, not about the work itself.

## Project knowledge

1. At session start, read `knowledge/project.md` and `knowledge/index.md`.
2. `knowledge/specs/` says what things must do. `knowledge/memory/` says what
   is worth knowing. `knowledge/brainstorms/` is unchecked source material.
3. Before changing behavior or asking something already documented, read the
   relevant specification or memory.
4. Never make durable knowledge current without showing Mike the exact words
   and getting his approval. The full policy is
   `knowledge/specs/memory-system.md`.
5. Keep project knowledge small: save stable facts, lasting events, decisions,
   or states that prevent repeated explanation or a wrong action. Put live
   progress in the tracker, reusable procedures in skills, source material in
   references, and past conversations in session history.

<!-- shared-with-agents-md:end -->

Everything above that marker is in `AGENTS.md` word for word. Everything below it
may differ, and does: this file keeps one line per folder and sends the detail to
that folder's own `CLAUDE.md`, while `AGENTS.md` writes the same detail out in
full because Codex never reads any `CLAUDE.md`. `tests/installed-copy-check.mjs`
compares only the text between the markers, so below them nothing checks
anything: change a passage here and change the matching passage in `AGENTS.md` in
the same edit, by hand.
`knowledge/memory/decisions/claude-md-and-agents-md-carry-the-same-block.md`
says why the markers sit where they do.

## Codemap

| Path | What lives there |
| --- | --- |
| `plugins/` | The nine plugins this repo ships, the `project-init/library/` material other projects receive, and the `project-init/machine/` material every computer receives. Detail: `plugins/CLAUDE.md`. |
| `.claude-plugin/marketplace.json` | Registers every plugin for Claude Code. `.agents/plugins/marketplace.json` does the same for Codex. |
| `docs/` | `toolkit-map.md`, the cross-cutting catalog. Detail: `docs/CLAUDE.md`. |
| `tests/` | Three Node checks, run by hand before every pull request. Detail: `tests/CLAUDE.md`. |
| `archive/` | Retired material kept for history. Never a source of current truth. |
| `knowledge/` | The project overview, generated index, approved specifications, durable memory, raw brainstorms, and minimal Obsidian vault settings. |
| `.claude/` | What this repo runs on itself: the rule copies, output style, installed hooks and tools, settings, and the setup record in `toolkit-sync.md`. |

This repo runs the toolkit on itself. `.claude/rules/`, `.claude/hooks/`,
`.claude/output-styles/`, and `knowledge/` are the same setup every other toolkit
project gets, installed here so a change is felt where it is written instead of
three weeks later in another project. That means most files under `.claude/` are
copies of files this repo also ships.
`tests/installed-copy-check.mjs` fails when a shipped file and its copy stop
matching, so nobody has to remember to change both.

The `second-brain` plugin supplies the `remember`, `recall`, `cleanup`, and
`session-search` skills. The installed startup loader, pull-request reminder,
layout tool, and read-only health tool under `.claude/` are copies of what that
plugin ships. The policy they follow is `knowledge/specs/memory-system.md`.

## Where work is tracked

The `Claude-Toolkit-Project` board on GitHub, which is connected to this
repository. `.claude/rules/spec-before-you-build.md` says what has to be true of
every ticket before work starts. What is specific to this board:

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
  requirements. This is the same split `work-tracker` makes between `SPEC.md`
  and `STATUS.md`: here the body is the `SPEC.md` and the comments are the
  `STATUS.md`.
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
- Knowledge writes land in the worktree and reach `main` when the pull request
  merges, so two sessions saving at once both rebuild `knowledge/index.md`. Git
  can merge that with no reported conflict and still leave the index wrong.
  After bringing your branch current, run
  `node .claude/tools/build-knowledge-index.mjs` again: it rebuilds the index
  from the files, which are what win.

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
