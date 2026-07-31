# Dependency graph for non-Salesforce projects: graphify

Companion to `salesforce-dependency-graph.md`. The bundled tool in that file
only parses Salesforce `force-app/` metadata, so it cannot analyze any other
kind of code. For every other project type (Swift or iOS, web, backend, CLI,
generic), the mechanical "what connects to what" graph that answers "if I change
this, what breaks N steps out?" comes from **graphify**: an open-source tool that
parses source locally with tree-sitter (40+ languages including Swift) and
builds a queryable graph. The project's written notes record WHY; this records
WHAT connects to WHAT.

Offer it in Gate 4 whenever the owner of a non-Salesforce project wants
mechanical impact analysis, the same trigger as the Salesforce graph. It is
optional the same way: a small codebase is well served by the compiler and its
tests, so add graphify when "what calls this?" is a real, recurring question.

## What it is

- Local, deterministic parsing via tree-sitter. No AI model and no network for
  the code graph, and nothing leaves the machine. (Graphify's optional
  document, PDF, and image extraction does use an API key; `--code-only` skips
  everything that would, so the code graph stays offline.)
- MIT-licensed. Installed as a `graphify` command plus an optional Claude Code
  skill.
- Produces `graphify-out/graph.json` (queryable), `graph.html` (interactive
  map), and `GRAPH_REPORT.md`.

## Install the kit (four parts)

Like the Salesforce kit, this is one unit. The tool without the rule gets
ignored by every session, and the tool without the hooks quietly goes stale.
Install all four or none.

1. **The tool.** Prerequisite: Python 3.10+ and `uv` (or `pipx` or `pip`).

   ```
   uv tool install graphifyy      # PyPI package is graphifyy (two y's); installs the `graphify` command
   ```

   Optional, register it as a Claude Code skill so `/graphify` works in-session:

   ```
   graphify install --platform claude   # copy the skill into Claude Code's config dir
   # or, to add a graphify section plus a PreToolUse nudge to the project's CLAUDE.md:
   graphify claude install
   ```

   That skill is per machine, not per project. It makes the command easy to
   reach; it does not tell a session to prefer the graph over a text search.
   Part 3 is what does that.

2. **The gitignore entry.** `graphify-out/` is a build artifact, never a commit.

3. **The rule.** Copy `general-rules/dependency-graph.md` into the project's
   `.claude/rules/`. It is the standing instruction to answer impact questions
   from the graph, keep the build current, and keep it offline. Without it the
   tool sits there and sessions keep grepping.

4. **The automatic rebuild** (see "Keep it fresh" below), so nobody has to
   remember to rebuild.

## Build the graph (local, no API key)

From the project root:

```
graphify extract . --code-only     # parse only; writes graphify-out/graph.json
graphify cluster-only . --no-label # cluster and build graph.html + GRAPH_REPORT.md, no AI naming
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
graphify god-nodes                   # most-connected hubs (architecture map, and a worklist)
graphify explain "BlockStore"        # plain-language summary of a node and its neighbors
```

## Keep it fresh

Graphify has its own freshness path, the equivalent of the Salesforce graph's
`graph_freshness_hook.py`. **When you install graphify for a project, install its
auto-update git hooks as part of setup** so the graph rebuilds itself on every
commit and checkout and never silently goes stale:

```
graphify hook install   # post-commit and post-checkout auto-rebuild; install this at setup
```

Day to day you then rarely touch it. To rebuild by hand or watch live:

```
graphify update .       # re-parse changed code and update the graph
graphify watch .        # rebuild on file changes while working
```

A project installs ONE freshness mechanism, not several. On a non-Salesforce
project graphify's git hooks ARE that mechanism, so do not also install the
bundled Salesforce freshness hook (it is Salesforce-only anyway). If a project
cannot use git hooks (repo policy, or no git), skip `graphify hook install` and
instead run `graphify update .` at the start of an impact query so the graph is
current before you rely on it. Record which of the two this project uses.

**The gap to tell the owner about.** Git hooks live in the repository's hidden
git folder, which is never committed. So installing them once does NOT cover
everyone: a fresh clone on another machine, or a teammate's checkout, has no
hooks and its graph will silently stop updating while still answering questions.
Whoever clones runs `graphify hook install` once. Linked worktrees of an
existing clone share its hooks and need nothing. The rule in step 3 of the
install carries this into the project so a later session does not have to
rediscover it.

## The standing rule

`general-rules/dependency-graph.md` is the rule this tool ships with, copied
into the project's `.claude/rules/` as install step 3. It is the non-Salesforce
twin of `salesforce-rules/dependency-graph.md`; a project has one graph, so it
gets one of the two rules, never both, and either lands under the same file
name. Do not paste a hand-written variant into the project: edit the library
file and copy it, so every project stays in step with the toolkit and
`project-sync` can tell when one has fallen behind.

## Known limits

- Swift and 40+ other languages are supported via tree-sitter grammars;
  extraction depth varies by grammar. Calls, imports, and type references are
  captured well; fully dynamic dispatch and reflection-based wiring are not.
- When the same symbol name is minted by two files (for example a test target
  that re-declares the module name), graphify keeps one and warns about the
  drop. For a large monorepo, extract per subfolder and combine with
  `graphify merge-graphs`.

## Reference example

On an iOS app written in Swift, `graphify extract . --code-only` produced about
2,500 nodes and 6,800 edges in a few seconds, and `graphify affected "SetLog"`
traced the core capture type into the balance ledger, progression, and coach
paths with file and line cites. That is the impact analysis the Salesforce-only
tool could not give a Swift codebase.
