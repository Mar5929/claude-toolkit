# Delivering the Toolkit operating manual

Every project equipped through project-init receives the shared Toolkit
operating manual. This is independent of project knowledge, System Guide, and
the chosen tracker.

## Files and routes

1. Copy `library/templates/toolkit-manual.md` from the current project-init
   plugin to `knowledge/toolkit-manual.md` in the project. Create `knowledge/`
   when needed. Installing this manual does not enable project knowledge or
   create any other knowledge files. When `.toolkit-memory.json` says
   `"memory": "external"`, copy it to `docs/toolkit-manual.md` instead and do
   not create `knowledge/`. A missing file means the `files` memory mode.
2. Copy the project-init-owned Toolkit startup hook to
   `.claude/hooks/toolkit-session-start.mjs`. On each supported host, register
   it for SessionStart `startup|resume|clear|compact` only. Remove an older
   UserPromptSubmit registration of the same script. Use
   [the hook's installation instructions](../../../library/hooks/README.md)
   for the exact Claude and Codex settings. Preserve other hooks and avoid
   duplicates.
3. Write the Startup section for the project's memory mode from
   `thin-agents-md.md` into `AGENTS.md`.
   `CLAUDE.md` stays one line and reaches it through its import of `AGENTS.md`.
4. Keep the root codemap, Tools, Quick saves, and tracker sections accurate for
   this project. The manual refers to those sections instead of carrying
   project-specific paths or inactive component links.

The hook reads `.toolkit-memory.json` to find the manual. It prints the
manual's `## Summary` section and any missing-file gaps. It
never prints the manual body. It asks for no full read and no acknowledgment.
The manual is reference: agents open the section a task needs.

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

- Confirm the installed manual (`knowledge/toolkit-manual.md`, or
  `docs/toolkit-manual.md` in `external` mode) matches the reconciled result, starts
  with a `## Summary` section, and has no links to paths that exist only in the
  toolkit repository.
- Run the installed hook directly. Confirm it prints the Summary, not the body,
  and asks for no acknowledgment.
- Confirm the hook is registered for SessionStart only, in each configured
  host. Test startup, resume, clear, and compaction in each supported host
  before claiming host delivery.
- Confirm a missing and an unreadable manual each produce a gap line.
- Confirm projects with Knowledge and System Guide disabled still receive the
  Toolkit manual without files or claims for those components.

Report installation and host delivery as separate facts.
