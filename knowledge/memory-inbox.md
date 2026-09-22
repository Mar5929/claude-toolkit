# Pending knowledge saves

Shown unanswered proposals and authorized unfinished saves only. Open relevant
entries; pending text is not current knowledge or permission. Preserve every
entry until rejection or verified completion. Use knowledge-save's pending-entry
template, reread before editing, and distinguish local from shared state.

<!-- knowledge-save:59013cf9-aad9-470f-8d82-70e731f06572:start -->
## Knowledge manual sentence for requirement 31

Reference: 59013cf9-aad9-470f-8d82-70e731f06572
Revision: as approved on 2026-09-22
Destination: `plugins/second-brain/skills/knowledge-setup/references/templates/knowledge/knowledge-manual.md` (managed source) and `knowledge/knowledge-manual.md` (installed copy, byte-identical)
Operation: update
State: approved, save unfinished
Source: Mike Rihm, 2026-09-22, Main Orchestrator conversation, decision D23
Conversation: Main Orchestrator conversation; host conversation ID unavailable
Updated: 2026-09-22
Next: open a reviewed pull request carrying the manual and template text below plus the version bumps the second-brain plugin requires. Do not publish it on the direct documentation route.

### Exact card or owed update

In section 9 of both files, replace:

> Keep needed context together and link shared information rather than copying it.

with:

> Keep needed context together and link shared information rather than copying it. A fact that changes over time has one owning file: other files link to it and do not restate the value, naming what the fact is beside the link when that helps. Dated facts and decisions stay as dated text where they are recorded.

The template is the source; the installed copy must stay byte-identical to it.

### Authority

Mike Rihm approved this exact wording on 2026-09-22 in the Main Orchestrator
conversation, decision D23. The approval covers the meaning and this wording.
It does not approve a version bump, a merge, or any other change.

### Execution evidence

Not written to either destination. The two PRD files that carry the same
decision were published separately on main; see the commit whose message names
requirement 31. This save stayed pending because the template sits inside the
second-brain plugin, and `plugins/AGENTS.md` requires a content change there to
bump `version` in `plugins/second-brain/.claude-plugin/plugin.json` and
`plugins/second-brain/.codex-plugin/plugin.json` and `metadata.version` in
`.claude-plugin/marketplace.json`. That makes it an implementation change under
`.claude/rules/knowledge-direct-commit.md`, which takes the pull-request route.
No branch, worktree or pull request has been created yet.
<!-- knowledge-save:59013cf9-aad9-470f-8d82-70e731f06572:end -->
