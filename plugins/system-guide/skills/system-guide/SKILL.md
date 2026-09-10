---
name: system-guide
description: Uses and maintains an enabled project's System Guide for questions or work about how an existing system is structured, what its parts do, how they connect, or what a change may affect. Also use when substantial investigation finds valuable understanding, source behavior changes, or the owner corrects system meaning. Do not use for required future behavior alone, work status, or obvious code summaries.
---

# System Guide

Start by inspecting the project with the packaged CLI. Resolve it from this
skill's installed directory as `../../tools/system-guide.mjs`; do not assume the
current project contains the plugin source. Claude Code may equivalently use
`${CLAUDE_PLUGIN_ROOT}/tools/system-guide.mjs`. In Codex, use the discoverable
skill path shown by the host and resolve the same `../../tools/` location; the
Claude-only environment variable is not available there. Run `status --root
<project-root> --json` against that resolved file. Missing configuration or
`enabled: false` means off: do not create guide files, refresh sources, or
redirect system explanations into memory or a PRD. Report a configured guide
that is broken as needing repair.

When the guide is on:

- For a question about an existing part, purpose, connection, process, or possible impact, open the configured entry page and the smallest relevant index and pages before broad source investigation. Follow the cited evidence when current state matters, and name the source used.
- Before planning a change to a documented part, read its explanations and connections. Guide content supplies context; it never authorizes a system change.
- When sources or implemented behavior change, refresh the generated layer and inspect affected meaning. Preserve approved meaning, and flag meaning whose subject was removed, renamed, or changed.
- When an investigation produces understanding that would take substantial work to recover, check for an existing home and propose only the useful finding with its evidence and uncertainty. Skip obvious code summaries and duplicate explanations.
- Before handing off substantial investigation or change work, check the affected pages once for unresolved refresh or meaning work. Do not scan the whole guide or repeat an unchanged proposal.

Reading, recognizing a useful finding, and preparing a preview do not grant permission to change meaning. Add, edit, move, merge, or delete meaning only after the owner approves the exact text, destination, source, and uncertainty. Approval of setup, refresh, or related implementation is not approval of meaning. Use the preview produced by `propose`; use `apply` only with a record of that exact human approval.

Read only the reference needed for the current task:

- [routing-and-sources.md](references/routing-and-sources.md) for find order, placement, and source disagreements.
- [meaning-and-maintenance.md](references/meaning-and-maintenance.md) before proposing, applying, refreshing, repairing, or cleaning up content.
- [commands-and-hosts.md](references/commands-and-hosts.md) for setup, CLI syntax, host behavior, and verification.
- [one-screen-preview.md](references/one-screen-preview.md) for concrete examples of expected behavior.
