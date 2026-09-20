# Delivering the Toolkit operating manual

Every project equipped through project-init receives the shared Toolkit
operating manual. This is independent of project knowledge, System Guide, and
the chosen tracker.

## Files and routes

1. Copy `library/templates/toolkit-manual.md` from the current project-init
   plugin to `knowledge/toolkit-manual.md` in the project. Create `knowledge/`
   when needed. Installing this manual does not enable project knowledge or
   create any other knowledge files.
2. Copy the project-init-owned Toolkit startup hook to
   `.claude/hooks/toolkit-session-start.mjs`. On each supported host, register
   it for SessionStart `startup|resume|clear|compact` and UserPromptSubmit.
   Use [the hook's installation instructions](../../../library/hooks/README.md)
   for the exact Claude and Codex settings; preserve other hooks and avoid duplicates.
3. Add the exact complete-read fallback from `thin-claudemd.md` to `CLAUDE.md`.
   `AGENTS.md` stays one line and reaches the route through `CLAUDE.md`.
4. Keep the root codemap, Tools, Quick saves, and tracker sections accurate for
   this project. The manual refers to those sections instead of carrying
   project-specific paths or inactive component links.

The SessionStart route tells the agent to read the complete project file and
acknowledge receipt and intent after that read. The prompt route is a short
workflow and file pointer; it does not demand a repeated acknowledgment. Neither
route prints or copies the manual body. The agent continues from the first
missing section if output is shortened. Missing or unreadable content produces
an honest gap report instead of a readiness acknowledgment.

## Existing projects and local adaptations

During project-sync, compare the installed manual with the packaged source.
Show a meaningful diff. Apply changes already covered by the sync authorization
and preserve deliberate project meaning. Ask only when the update changes
unresolved meaning or scope, or when local changes conflict with the packaged
update. Never replace a differing copy merely because its bytes differ.

Audit the hook file, both host registrations where supported, and the root
fallback separately. A current plugin cache does not prove the project adopted
the current files, and a copied file does not prove the host ran it.

## Verification

- Confirm `knowledge/toolkit-manual.md` matches the reconciled result and has no
  links to paths that exist only in the toolkit repository.
- Run both Toolkit hook events directly from the installed path. Confirm each
  output names `knowledge/toolkit-manual.md` without printing the body and that
  only SessionStart asks for the read acknowledgment.
- Inspect the configured Claude and Codex startup routes. Test startup, resume,
  clear, and compaction in each supported host before claiming host delivery.
- Confirm a complete direct read, a shortened-read recovery, a missing file,
  and an unreadable file. Receipt and intent follow only the complete read.
- Confirm projects with Knowledge and System Guide disabled still receive the
  Toolkit manual without receiving files or claims for those components.

Report installation, host delivery, complete reading, acknowledgment, and
correct use as separate facts.
