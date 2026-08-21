---
summary: The installed-copy check has no automatic trigger, so it catches drift only when a person types the command, and the plain-language output style reached main wrong twice before anyone noticed.
type: fact
status: current
source: Mike, on 2026-08-06, pointing at commits 09f28ab and 36d2c2e
confidence: reported
created_at: 2026-08-06
tags: [testing, installed-copies, drift, writing-voice]
approved_by: Mike Rihm
approval_date: 2026-08-06
project: claude-toolkit
---

# Nothing catches a drifted copy before it lands

`tests/installed-copy-check.mjs` has no automatic trigger: no GitHub Actions
workflow, no git hook. It catches drift only when a person types the command.
On 2026-08-06 the plain-language output style was edited under `.claude/`
alone and pushed straight to main twice (09f28ab, 36d2c2e). Both breaks were
found after the fact, and until each was fixed, other projects kept getting
the old wording of the style.

A Claude Code hook cannot close this. Those fire only inside a Claude Code
session, and both commits were made in an editor. Only a git hook or a
GitHub Actions check would see them.
