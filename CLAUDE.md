# CLAUDE.md: working in claude-toolkit

This repo is Mike's single source of truth for the reusable pieces he wants in
every project: rules, the new-project setup flow, and (over time) hooks, the
memory architecture, and other systems. It's packaged as a Claude Code plugin
marketplace. `README.md` has the full picture; read it first.

## Your main job here: fold new lessons into the toolkit

Most sessions in this repo start with Mike saying some version of "I want every
new project to also do X" or "remember this for future projects." Don't just
write X down somewhere. Fit it into the system:

1. **Classify it, then place it.**

   | X is... | It goes... |
   |---|---|
   | A rule for how agents behave, write, or work in every project | A new numbered rule in `plugins/project-init/skills/project-init/references/claude-md-boilerplate.md`; also update that file's "Notes for the assembling agent" |
   | A setup step for new projects | Into the right gate in `plugins/project-init/skills/project-init/SKILL.md` and `references/setup-flow.md` (or propose a new gate) |
   | A guard hook or automation | The shared hooks library. Until that library exists, record it in the README roadmap with enough detail to build it later |
   | A whole reusable system | A new plugin under `plugins/`, registered in `.claude-plugin/marketplace.json`, offered by `project-init` |

2. **Clean up the language, keep the intent.** Mike describes things loosely;
   tighten the wording. If placement or intent is ambiguous, ask before writing.
3. **One canonical home.** Each item lives in exactly one place; other files
   reference it. Update every doc that mentions it (SKILL.md, setup-flow.md,
   README).
4. **Opt-in by default.** Nothing is forced on a project unless Mike says every
   project should get it; then mark it default ON (like boilerplate rules 1-5,
   8, and 9).
5. **Bump versions.** A content change to a plugin bumps its `plugin.json`
   version and `metadata.version` in `marketplace.json`.
6. **Keep `main` installable.** `claude plugin validate .` must pass; `main` is
   what every machine installs from.

## Writing rules (they apply here too)

Boilerplate rule 9 governs this repo's own files and how you talk to Mike: no em
dashes, no section signs (write "section 7"), no AI filler language, and plain
explanations (he is a little technical, not deeply technical). Older files may
still contain em dashes; clean them up in any file you're already editing.

## Parallel sessions

Mike usually runs several Claude Code sessions at once. Work in your own git
worktree on your own branch, never edit the shared primary checkout, and land
changes on `main` by pull request. Mike merges. (This is the same protocol that
boilerplate rule 8 installs into new projects.)
