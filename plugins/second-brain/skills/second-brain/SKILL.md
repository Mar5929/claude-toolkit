---
name: second-brain
description: >-
  Install the portable second-brain memory and knowledge architecture in the
  current project: a gitignored brain/ knowledge graph curated by background
  agents, synced to a dedicated private repo, with digest injection, per-prompt
  recall, drift-pinned knowledge nodes, and a self-verifying test harness. Use
  when the user wants durable cross-session memory for a project, or says
  things like "set up the memory architecture", "implement the second brain",
  "add long-term memory to this project", "install the memory system from my
  toolkit", or "/second-brain". This skill INSTALLS a fully specified system
  from bundled reference implementations; there is no design work to do, only
  placeholders to fill and acceptance tests to pass.
---

# second-brain: install durable cross-session memory

You are installing a **fully specified, battle-tested system**, not designing
one. The complete technical specification is
`references/architecture-spec.md`; read it end-to-end before touching the host
project. The bundled `references/hooks/`, `references/agents/`, and
`references/templates/` are working implementations that passed a 30+
assertion harness. Copy them and fill placeholders. Do not re-derive, rewrite,
or "improve" them during installation; if you find a real defect, fix it, keep
the harness green, and tell the user to port the fix back to the toolkit.

## Step 1: Orient and interview

Read the spec, look at the host project (git repo? origin URL? public or
private? does a memory system already exist?), then collect the placeholders:

1. `<APP_NAME>`: the project/product name.
2. `<BRAIN_REMOTE_URL>`: the dedicated **private** brain repo. Default
   suggestion: `<owner>/<app>-brain` on the same git host. Offer to create it
   (`gh repo create <owner>/<app>-brain --private`). If the user refuses a
   second repo, fall back to the legacy orphan-branch mode (spec section 5),
   and warn plainly if the app repo is public: the store would be public too.
3. `<PROJECT_EXCLUSIONS>`: what must never be stored (beyond secrets/PII).
   Ask; every domain has something.
4. `<MODEL>`: curator model, default `sonnet`.
5. `<CODE_PATH_REGEX>`: which paths count as app code (drives the
   knowledge-curator's phase 2), for example `src/|lib/|Tests/`. Also ask
   whether they want the knowledge layer at all (`BRAIN_KNOWLEDGE=0` disables
   phase 2; everything else still works).

If the project already has ANY memory system (a `memories/` or `brain/` dir, a
memory hook, a curator agent), stop and reconcile with the user before
installing a second one.

## Step 2: Install (spec section 10 has the exact order)

1. Create/confirm the brain repo.
2. Add the `/brain/*` gitignore (with the `!/brain/README.md` whitelist) to
   the app repo.
3. Scaffold `brain/` (empty digest, empty index, template, signpost README,
   node folders).
4. Copy `references/hooks/*.sh` to `.claude/hooks/`, `chmod +x`. Keep the
   `brain-*` file names.
5. Copy `references/agents/*.md` to `.claude/agents/`, filling `<APP_NAME>`
   and `<PROJECT_EXCLUSIONS>`.
6. MERGE `references/templates/settings-hooks.json` into
   `.claude/settings.json` (drop its `_comment` key; never clobber existing
   env or hooks entries; never add a `BRAIN_BRANCH` key, the spec explains
   why).
7. Seed: `bash .claude/hooks/brain-sync.sh --force`, then verify the remote
   branch exists.

## Step 3: Verify (do not skip; do not claim success without this)

1. `bash .claude/hooks/brain-harness-test.sh` must end `FAIL: 0`.
2. Run the live acceptance checks from spec section 12.
3. Confirm `git status` in the app repo shows nothing under `brain/` while the
   store is populated.

## Step 4: Document

Record the ground rules in the project's `CLAUDE.md`: only the curators write
to `brain/`; sessions never hand-edit it; where the canonical store lives; how
to ask for recall ("delegate to the brain-curator"). Tell the user the first
digest will be thin until a few curated batches have run, and show them the
health footer they should expect at session start.
