# Structural layer for non-Salesforce projects: graphify

Companion to `structural-layer.md`. That bundled tool only parses Salesforce
`force-app/` metadata, so it cannot analyze any other kind of code. For every
other project type (Swift/iOS, web, backend, CLI, generic), the structural layer,
the mechanical "what connects to what" code graph that answers "if I change this,
what breaks N steps out?", is provided by **graphify**: an open-source tool that
parses source locally with tree-sitter (40+ languages including Swift) and builds
a queryable graph. The knowledge layer records WHY; this records WHAT connects to
WHAT.

Install it whenever the owner of a non-Salesforce project wants mechanical impact
analysis, the same trigger as the Salesforce structural layer. It is optional the
same way: a small codebase is well served by the compiler + tests + `covers:` SHA
pins, so add graphify when "what calls this?" is a real, recurring question.

## What it is

- Local, deterministic AST parsing via tree-sitter. No LLM and no network for the
  code graph, and nothing leaves the machine. (Graphify's optional doc/PDF/image
  extraction does use an API key; `--code-only` skips everything that would, so
  the code graph stays offline.)
- MIT-licensed. Installed as a `graphify` CLI plus an optional Claude Code skill.
- Produces `graphify-out/graph.json` (queryable), `graph.html` (interactive map),
  and `GRAPH_REPORT.md`.

## Install

Prerequisite: Python 3.10+ and `uv` (or `pipx`/`pip`).

```
uv tool install graphifyy      # PyPI package is graphifyy (two y's); installs the `graphify` command
```

Optional, register it as a Claude Code skill so `/graphify` works in-session:

```
graphify install --platform claude   # copy the skill into Claude Code's config dir
# or, to add a graphify section + a PreToolUse nudge to the project's CLAUDE.md:
graphify claude install
```

## Build the graph (local, no API key)

From the project root:

```
graphify extract . --code-only     # AST-only extraction; writes graphify-out/graph.json
graphify cluster-only . --no-label # cluster + build graph.html + GRAPH_REPORT.md, no LLM naming
```

`--no-label` keeps "Community N" placeholder names so the whole build stays
offline. Later, with an API key set, `graphify label .` names the communities in
plain language. The in-session skill equivalent of the two commands is
`/graphify .`.

Gitignore the artifacts (a rebuild recreates them from source):

```
graphify-out/
```

## Query it

```
graphify affected "SetLog"           # reverse impact: what depends on X (the "what breaks?" answer)
graphify query "how does logging reach the balance ledger?"
graphify path "TodayStore" "SetLog"  # shortest connection between two symbols
graphify god-nodes                   # most-connected hubs (architecture map, and a backfill worklist)
graphify explain "BlockStore"        # plain-language summary of a node and its neighbors
```

## Keep it fresh

Graphify has its own freshness path, the analog of the Salesforce structural
layer's `graph_freshness_hook.py`. **When you install graphify for a project,
install its auto-update git hooks as part of setup** so the graph rebuilds itself
on every commit and checkout and never silently goes stale:

```
graphify hook install   # post-commit / post-checkout auto-rebuild — install this at setup
```

Day to day you then rarely touch it. To rebuild by hand or watch live:

```
graphify update .       # re-extract changed code and update the graph (no LLM)
graphify watch .        # rebuild on file changes while working
```

A project installs ONE freshness mechanism, not several. On a non-Salesforce
project graphify's git hooks ARE that mechanism, so do not also install the
bundled structural-layer freshness hook (it is Salesforce-only anyway). If a
project cannot use git hooks (repo policy, or no git), skip `graphify hook
install` and instead run `graphify update .` at the start of an impact query so
the graph is current before you rely on it.

## Wire the knowledge-curator (if the knowledge layer is on)

Add a short block to the project's `.claude/agents/knowledge-curator.md`, the same
contract the Salesforce structural-layer section uses, so impact questions come
from the graph and not from guesses:

```markdown
## Structural layer: the graphify code graph (read it, never hand-maintain it)

Beside your prose layer sits a mechanical one: graphify compiles the source into a
local, gitignored graph of symbols and their calls / imports / references. Answer
"what calls X" and "what breaks if I change it" from `graphify affected "X"` and
`graphify query "..."`, citing the file:line the graph reports. Rebuild first
(`graphify update .`) if code changed. Known limit: fully dynamic dispatch and
runtime wiring are not always captured, so check the prose `know-*` notes before
saying "nothing uses this."
```

## Known limits

- Swift and 40+ other languages are supported via tree-sitter grammars; extraction
  depth varies by grammar. Calls, imports, and type references are captured well;
  fully dynamic dispatch and reflection-based wiring are not.
- When the same symbol name is minted by two files (for example a test target that
  re-declares the module name), graphify keeps one and warns about the drop. For a
  large monorepo, extract per subfolder and combine with `graphify merge-graphs`.

## Reference example

Anchor (Mike's iOS app, Swift): `graphify extract . --code-only` produced about
2,500 nodes and 6,800 edges in a few seconds, and `graphify affected "SetLog"`
traced the core capture type into the balance ledger, progression, and coach
paths with file:line cites. That is the impact analysis the Salesforce-only tool
could not give a Swift codebase.
