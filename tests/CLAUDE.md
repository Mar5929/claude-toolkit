# tests: four Node checks, run by hand

Nothing runs these automatically. Run all four before opening a pull request:

```
node tests/link-check.mjs
node tests/orphan-check.mjs
node tests/installed-copy-check.mjs
node tests/knowledge-startup-check.mjs
```

Each asks a different question, and each exists because something real broke.

| Check | The question it asks |
| --- | --- |
| `link-check.mjs` | Does what a file points at still exist? |
| `orphan-check.mjs` | Can a shipped file still be found, meaning is it named by at least one index document? |
| `installed-copy-check.mjs` | Do two files that must say the same thing still say it, and do the lifecycle rule and Salesforce scaffold keep their required homes? |
| `knowledge-startup-check.mjs` | Do both hosts load one managed manual and the same small project map? |

## Working in here

- **`orphan-check.mjs` counts only index documents**, not any file that happens
  to mention a path. An index is the top `README.md`, `CLAUDE.md`,
  `docs/toolkit-map.md`, a plugin's `README.md`, a skill's `SKILL.md`, any
  `references/setup-flow.md`, or a `README.md` that indexes a folder. A new
  shipped file has to be named by one of those or the check fails. Being
  mentioned in an ordinary document is deliberately not enough: the July 2026
  failure it was written for had two such mentions and the tool still went
  missing for weeks.
- **`installed-copy-check.mjs` covers two pairs.** Every tracked file under
  `.claude/` against its shipped original, and the block between the
  `shared-with-agents-md` markers in `CLAUDE.md` against the same block in
  `AGENTS.md`. A new file under `.claude/` needs either a known original in
  `shippedOriginalFor()`, an entry in `OWN_FILES`, or a folder in `OWN_FOLDERS`,
  or the check fails on purpose.
- **The block between the markers must match word for word**, with no
  exceptions. Host-specific startup wiring belongs in the host settings files;
  the shared root block carries the same short knowledge route for both.
- **`knowledge-startup-check.mjs` owns the startup contract.** It checks the
  loader order, fail-open behavior, host registration, root fallback, manual
  size and checksum, and the absence of a second marked policy owner.
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
- `../.claude/rules/keep-claudemd-current.md`: the rules the third check
  mechanically enforces about `CLAUDE.md`, `AGENTS.md`, and the folder files.
