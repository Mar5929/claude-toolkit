# Answer Impact Questions From the Code Graph, and Keep It Fresh

This project has a graphify code graph: a local, offline map of what calls what,
built by parsing the source. It exists so "what calls this?" and "what breaks if
I change it?" are answered from the code itself instead of from a text search or
from memory. A text search finds the word; the graph finds the callers.

## Rules

1. **Answer impact questions from the graph, not from a search or from memory.**

   ```
   graphify affected "<symbol>"     # what depends on it: the "what breaks?" answer
   graphify query "<question>"      # a path through the code in plain language
   graphify path "<a>" "<b>"        # the shortest connection between two symbols
   graphify god-nodes               # the most connected parts: the architecture map
   graphify explain "<symbol>"      # a summary of one part and its neighbors
   ```

   Cite the file and line the graph reports. When the graph and a search
   disagree, say so rather than quietly picking one.

2. **Make sure the build is current before you rely on it.** If source changed
   since the last build, run `graphify update .` first. A stale graph is worse
   than no graph, because it answers confidently.

3. **Keep the automatic rebuild installed, once per copy of the repo.**

   ```
   graphify hook install
   ```

   This rebuilds the graph after every commit and every checkout, so day to day
   nobody has to remember. It has one trap worth knowing: these hooks live in
   the repository's hidden git folder, which is never committed. A fresh clone
   on another machine has no hooks and its graph will silently stop updating.
   Whoever clones runs the command once. Linked worktrees of an existing clone
   share its hooks and need nothing.

4. **If this repository cannot use git hooks,** because of policy or because it
   is not a git repository, skip the hook and run `graphify update .` at the
   start of any impact question instead. Say which of the two this project uses.

5. **Install exactly one freshness mechanism.** Graphify's git hooks are this
   project's. Do not add a second rebuild-on-change hook beside them.

6. **Keep the code graph offline.** Build with `--code-only` and cluster with
   `--no-label` so no source and no code content leaves the machine. Graphify's
   document extraction and its plain-language naming step both call a paid
   service; use them only when the owner has asked for them and knows the code
   is being sent.

7. **Never commit the build.** `graphify-out/` is a build artifact and belongs in
   `.gitignore`. A rebuild recreates it from source.

8. **State the graph's blind spot when it matters.** Calls, imports, and type
   references are captured well. Dispatch decided at runtime, reflection, and
   wiring done through configuration are not always captured. Check the
   project's written notes before ever saying "nothing uses this".

## Companion rule

A Salesforce project uses the bundled metadata dependency graph instead, which
has its own rule of the same name. A project has one graph or the other, never
both.
