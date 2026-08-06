# tests: three Node checks, run by hand

Nothing runs these automatically. Run all three before opening a pull request:

```
node tests/link-check.mjs
node tests/orphan-check.mjs
node tests/installed-copy-check.mjs
```

Each asks a different question, and each exists because something real broke.

| Check | The question it asks |
| --- | --- |
| `link-check.mjs` | Does what a file points at still exist? |
| `orphan-check.mjs` | Can a shipped file still be found, meaning is it named by at least one index document? |
| `installed-copy-check.mjs` | Do two files that must say the same thing still say it? |

## Working in here

- **`orphan-check.mjs` counts only index documents**, not any file that happens
  to mention a path. An index is the top `README.md`, `CLAUDE.md`,
  `docs/toolkit-map.md`, a plugin's `README.md`, a skill's `SKILL.md`, any
  `references/setup-flow.md`, or a `README.md` that indexes a folder. A new
  shipped file has to be named by one of those or the check fails. Being
  mentioned in an ordinary document is deliberately not enough: the July 2026
  failure it was written for had two such mentions and the tool still went
  missing for weeks.
- **`installed-copy-check.mjs` covers three pairs.** Every tracked file under
  `.claude/` against its shipped original; the block between the
  `shared-with-agents-md` markers in `CLAUDE.md` against the same block in
  `AGENTS.md`; and the memory section inside that block against
  `plugins/second-brain/skills/second-brain/references/orientation-snippet.md`.
  A new file under `.claude/` needs either a known original in
  `shippedOriginalFor()` or an entry in `OWN_FILES`, or the check fails on
  purpose.
- **The block between the markers must carry exactly one `host-specific`
  passage**, and it may not be empty. That is the single difference Claude and
  Codex are allowed: Claude invokes the memory verifier agent directly and Codex
  cannot.
- Each script explains its own reason for existing in a comment at the top. Read
  that before changing what it checks.

## Where the detail lives

- The comment block at the top of each script: why it exists and what it
  enforces.
- `../.claude/rules/keep-claudemd-current.md`: the rules the third check
  mechanically enforces about `CLAUDE.md`, `AGENTS.md`, and the folder files.
