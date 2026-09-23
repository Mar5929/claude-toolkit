# tests: Node checks, run by hand

Nothing runs these automatically. Run them all before opening a pull request:

```
node tests/link-check.mjs
node tests/orphan-check.mjs
node tests/installed-copy-check.mjs
node tests/knowledge-startup-check.mjs
node tests/skill-copy-check.mjs
node tests/startup-budget-check.mjs
node tests/protocol-guard-check.mjs
node --test tests/toolkit-startup.test.mjs
```

`startup-budget-check.mjs` runs its three profiles by default. Plugin tests have
their own runners: `node --test plugins/second-brain/tests/*.test.mjs` (it
includes `external-memory.test.mjs`, the `external` memory mode tests), the work-tracker
command in its `README.md`, and `node --test
plugins/hooks-library/tests/style-handshake.test.mjs` plus `node
plugins/hooks-library/tests/no-ai-attribution-guard-harness.mjs` and `node
plugins/hooks-library/tests/guard-protected-orgs.test.mjs`.
`claude plugin validate .` must pass too.

Each asks a different question, and each exists because something real broke.

| Check | The question it asks |
| --- | --- |
| `link-check.mjs` | Does what a file points at still exist? |
| `orphan-check.mjs` | Can a shipped file still be found, meaning is it named by at least one index document? |
| `installed-copy-check.mjs` | Do two files that must say the same thing still say it, and does the Salesforce scaffold keep its required homes? |
| `knowledge-startup-check.mjs` | Do both hosts ask for the three startup reads (`SOUL.md`, `knowledge/project.md`, `knowledge/memory/current.md`) and the inbox check, with no manual read and no acknowledgment? Is the per-message reminder short, and does the managed manual match its hash? |
| `startup-budget-check.mjs` | Does the text loaded at the start of every session stay under budget? It counts words in rules with no `paths:`, root `AGENTS.md`, SessionStart hook output, and the three required reads (`SOUL.md`, `knowledge/project.md`, `knowledge/memory/current.md`), or `SOUL.md` and `PROJECT.md` in the `external` memory mode. |
| `protocol-guard-check.mjs` | Does the `protocol-guard` engine still fit the installed Claude Code? It regenerates the function-hook declarations with `/plugin-types`, type-checks the engine, runs `claude plugin validate` and the plugin's offline tests, checks that each protocol's owner skill exists, and compares the engine's shell reader with the command hooks' reader. The Claude Code steps skip when `claude` is not installed. Run it after every Claude Code update too. |
| `skill-copy-check.mjs` | Are the `.claude/skills/<name>/` and `.agents/skills/<name>/` copies of each project skill byte-identical, do library skills use only `name` and `description` frontmatter, and does every skill a Salesforce rule names exist? Run `node tests/skill-copy-check.mjs`. |

`toolkit-startup.test.mjs` checks the short Summary output, missing guidance, copied hooks, path
aliases, nested working directories, SessionStart-only registration, and
portable manual references.

## Working in here

- **`startup-budget-check.mjs` has three budgets**, set on 2026-09-23 from the
  measured result of the #396 startup cut. `repo` (4,500) is this repository
  as it runs itself; it measured 4,249, down from 9,004 on `d4d7fce` counted
  the same way (that count leaves out the two manuals and two indexes the old
  hooks also asked for). `general` (3,000) is a new project built from shipped
  files only; it measured 2,751. `external` is that same new project in the
  `external` memory mode (`.toolkit-memory.json`, `PROJECT.md`, both manuals in
  `docs/`, no `knowledge/`) and uses the `general` budget. `--project <path>` measures a real project
  against 4,300, the approved #396 target for DragonFly without its Salesforce
  rules; `--budget <words>` overrides it. Raise a budget only with the owner's
  approval, and record the reason here.

- **`orphan-check.mjs` counts only index documents**, not any file that happens
  to mention a path. An index is the top `README.md`, `AGENTS.md`,
  `docs/toolkit-map.md`, a plugin's `README.md`, a skill's `SKILL.md`, any
  `references/setup-flow.md`, or a `README.md` that indexes a folder. A new
  shipped file has to be named by one of those or the check fails. Being
  mentioned in an ordinary document is deliberately not enough: the July 2026
  failure it was written for had two such mentions and the tool still went
  missing for weeks.
  Design records under `docs/designs/` are exempt. Each is reached from its
  work item, and designs are kept after delivery (decision D21, #409), so no
  index lists them.
- **`installed-copy-check.mjs` compares every tracked file under `.claude/`
  with its shipped original.** A new file under `.claude/` needs either a known
  original in `shippedOriginalFor()`, an entry in `OWN_FILES`, or a folder in
  `OWN_FOLDERS`, or the check fails on purpose.
- **It also checks the instruction file pairs.** At the root, and in every
  folder that has an instruction file, `CLAUDE.md` must be exactly the one line
  `@AGENTS.md` and `AGENTS.md` must hold no `@` import line of its own. Claude
  Code reads `CLAUDE.md` files whenever both names are present, so that import
  is what brings `AGENTS.md` in, and anything else written into `CLAUDE.md` is
  a second copy that drifts. Codex expands no import syntax, so an `@path` line
  inside `AGENTS.md` would reach a Codex session as literal text.
- **`knowledge-startup-check.mjs` owns the startup contract.** It checks the
  three-read list and its order, the `external` memory mode reads, fail-open behavior, host registration, the
  root `AGENTS.md` Startup section, the short reminder text, the manual hash,
  and the absence of a second marked policy owner.
- **Stage a deletion before running the checks.** `link-check.mjs` and
  `knowledge-startup-check.mjs` both walk `git ls-files --cached`, so a file
  deleted from disk but not yet staged is still listed and then fails to open.
  The failure reads as a broken link or a missing policy owner, which points at
  the wrong problem. `git add` the deleted path first, then run them.
- Each script explains its own reason for existing in a comment at the top. Read
  that before changing what it checks.

## Where the detail lives

- The comment block at the top of each script: why it exists and what it
  enforces.
- `../plugins/project-init/skills/project-init/references/thin-agents-md.md`:
  what `AGENTS.md` and `CLAUDE.md` are for. `AGENTS.md` holds the instructions
  both hosts read. `CLAUDE.md` holds the one import line that brings it in for
  a Claude Code session that cannot read `AGENTS.md` by itself.
