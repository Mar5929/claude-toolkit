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
across in the same change.

Everything **below** the marker is allowed to differ, and does. `CLAUDE.md` keeps
one line per folder there and sends the detail to a `CLAUDE.md` inside that
folder, which Claude Code loads only when it reads a file there. Codex has no
such mechanism and never reads any `CLAUDE.md`, root or nested, so this file
writes the same detail out in full. That is deliberate. Do not shorten it to
match `CLAUDE.md`, and do not create nested `AGENTS.md` files.
`tests/installed-copy-check.mjs` compares only the text between the markers, so
below them nothing checks anything: when you change a passage here, change the
matching passage in `CLAUDE.md` in the same edit, by hand.

## Codex communication rules

Codex cannot load the output-style file through the Claude `@` import above,
so follow these rules directly.

#### Structure every reply this way

1. The answer. One or two lines. What happened, or what Mike asked for. Nothing else first.
2. The details. Bullet points only. One idea per bullet. One line per bullet.
3. What Mike needs to do. Only if he actually needs to do something. Give one direct instruction.
4. Also found (optional). Put unrelated findings at the bottom as one-line bullets. Then stop.

#### Communication rules

- Never start with a preamble or restate the request.
- Never narrate the work process.
- No em dashes.
- Keep one topic per reply.
- Use plain words. Explain unavoidable technical words in four plain words.
- Skip a closing offer unless Mike must make a decision.
- Do not pad the answer.

#### When something goes wrong

- Say what broke in one line.
- Say what it means for Mike in one line.
- Say what should happen next in one line.
- Do not paste error logs unless Mike asks.

#### When Mike asks for real writing

Long drafts, scripts, posts, and documents are allowed. These chat rules do not
limit the requested work product.

## Codemap

| Path | What lives there |
|---|---|
| `plugins/` | The nine plugins this repo ships. Each has its own `README.md`, which is that plugin's canonical description. |
| `plugins/project-init/library/` | The reusable material other projects receive: `rules/general/`, `rules/salesforce/`, `output-styles/`, `tools/`, `templates/`, `guides/`. Each has a `README.md` index. |
| `plugins/project-init/machine/` | The material a whole computer receives through `machine-sync`: Claude rules and settings plus the managed Codex project-knowledge pointer. Its `README.md` holds the two-question test for what belongs here instead of in `library/`. |
| `.claude-plugin/marketplace.json` | Registers every plugin for Claude Code. `.agents/plugins/marketplace.json` does the same for Codex. |
| `docs/toolkit-map.md` | The cross-cutting catalog: what each piece is, and the honest read on what looks redundant but is not. |
| `tests/` | Node checks, run by hand. `link-check.mjs` (a link pointing at a file that is not there), `orphan-check.mjs` (a shipped file no index points at), `installed-copy-check.mjs` (a file this repo ships and the copy it runs have drifted apart). |
| `archive/` | Retired material kept for history. Never a source of current truth. |
| `knowledge/` | The project overview, generated index, approved specifications, persistent memory, raw brainstorms, and minimal Obsidian vault settings. |
| `.claude/` | What this repo runs on itself: the rule copies, output style, installed hooks and tools, settings, and the setup record in `toolkit-sync.md`. |

This repo runs the toolkit on itself. `.claude/rules/`, `.claude/hooks/`,
`.claude/output-styles/`, and `knowledge/` are the same setup every other toolkit
project gets, installed here so a change is felt where it is written instead of
three weeks later in another project. That means most files under `.claude/` are
copies of files this repo also ships. `tests/installed-copy-check.mjs` fails when
a shipped file and its copy stop matching, so nobody has to remember to change
both.

The `second-brain` plugin supplies the `remember`, `recall`, `retire`,
`reflect`, and `session-search` skills. The installed manual, startup loader,
pull-request reminder, work-item reminder, index builder, and knowledge checker
are managed copies of what that plugin ships. `knowledge/README.md` is the
runtime authority. `knowledge/specs/knowledge-system.md` is the build authority
for the plugin itself.

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
  merges, so two sessions saving at once both rebuild the two generated
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
5. **Give every agent you add the writing rules in its own text.** An output
   style is delivered in the main conversation's system prompt and never reaches
   a helper agent, so an agent definition under `plugins/*/agents/` has to carry
   those rules itself. Its findings are read back to Mike, so a word he has to
   decode once would spread instead of being forgotten.
6. **Bump versions.** A content change to a plugin bumps its `plugin.json`
   version and `metadata.version` in `marketplace.json`.
7. **Keep `main` installable.** `claude plugin validate .` must pass; `main` is
   what every machine installs from. Run `node tests/link-check.mjs`,
   `node tests/orphan-check.mjs`, and `node tests/installed-copy-check.mjs` too.

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
## Codex-specific instructions

Codex loads this root file automatically. The instruction above to read
`.claude/rules/` is still needed because those Claude rule files are not loaded
by Codex on their own. Open and read every `.md` file there before work.

Codex also runs the project startup hook registered in `.codex/hooks.json` when
the project is trusted. The short root route remains the fallback if that hook
does not run.
