# Preserve records while updating the system

Inspect the latest project and its existing setup record. Work in reversible
batches under actual project update authority. Capture the Git baseline and an
old-to-new path map in the existing work record. Do not migrate another project
because this plugin was updated. Preserve owner edits and pending permissions.

## Detect before moving

- A marked legacy `knowledge/README.md` with no canonical manual needs the
  filename migration below; an ordinary README is not a policy owner.
- Old flat memory, `knowledge/current.md` and `spec-index.md` identify the v1
  record shape only with the toolkit's other signatures.
- The schema:2 marker in the managed manual selects the new file/check contract;
  it does not prove the project is complete. Do not add it before records and
  runtime are ready together.
- Mixed old/new destinations, unknown folders or customized conflicting policy
  need inspection. Never overwrite or merge them merely because names match.
- Exclude `.system-guide.json` and its configured guide tree from conversion.
  A Guide-only project has not enabled Knowledge. Preserve that component exactly.

Older signatures include `knowledge/specs/`, type-based memory subfolders,
`memory/tags.md` or source/session metadata from an earlier toolkit. Inventory
them explicitly. A lone known specs folder can move to prds under the same
migration authority; if both exist, reconcile collisions before any move. Convert
only fields whose meaning, source and permission can be recovered from actual
records. Unmappable entries remain intact and visibly pending. Do not import a
retired database/verifier system or flatten unknown owner folders by guesswork.

## Move supported records together

| Existing record | New home |
| --- | --- |
| knowledge/current.md | knowledge/memory/current.md |
| knowledge/memory/<topic>.md | knowledge/memory/memory-entries/<topic>.md |
| knowledge/prds/spec-index.md | regenerated knowledge/prds/prd-index.md |
| knowledge/brainstorms/ | brainstorms/ |
| Existing glossary | knowledge/memory/memory-entries/terminology-glossary.md, only with clear identity |
| Current manual and feedback | Same canonical homes; update managed manual through its component |

Already-approved older records may be converted then shown in readable batches.
This exception preserves meaning; it supplies no missing source or approval.
For drafts, use existing drafting/setup authority only for its covered structural
changes. Leave an unclear conversion untouched and report what is missing.

Memory keeps its original creation/source/confidence/approval. Add group from its
actual topic, context from the documented occasion, updated_at from verified
content history (or the dated conversion as a content-format change, stated as
such). Do not invent a past approval date or set confirmed_at because a file was
moved. New fields must be supported by the existing record. Convert approved
legacy PRD current to finalized without claiming delivery; preserve proposed
approval absence and existing PRD body layouts. Shorten an index summary only
when the same meaning is preserved; a limit never permits losing approved scope.

Convert current work to the complete template, preserving all concurrent items,
useful recent results, blockers, later to-dos and Session handoffs. Add actual
missing fields or explicitly mark unknown; do not invent facts. Keep under the
whole-file limit without silently deleting needed context. Use owning records
for detail when appropriate and authorized; no forced tracker creation.

For each captured topic README, add group/summary plus existing source and actual
capture date. Preserve captured text and useful navigation. An unknown capture
date remains a migration issue, not today's date by default. Rebuild the external
index with those topic entries; keep project conclusions in their existing homes.

Repair active relative Markdown links and metadata paths using the old-to-new
map, including inbound links and links inside moved files. Preserve historical
quotes and frozen references; do not mass-rewrite history. Generate indexes, never
hand-edit them. Validate renamed links, actual fields, content read-back and
source/copy consistency before activating the new manual/runtime together.

## Manual and entry-point compatibility

Only the marker identifies the managed manual. Move a lone marked legacy README
to the canonical manual path preserving its policy, then reconcile authorized
package updates separately. With both marked paths present, normalize line endings
and self-paths to compare; remove an identical duplicate only under cleanup
permission. Conflicting meanings stay intact until resolved. Preserve an unmarked
README and an unmarked canonical-file collision. Do not copy a template over it.

Replace old procedure routes: recall/session-search -> knowledge-find,
remember/retire -> knowledge-save, reflect -> knowledge-review,
second-brain setup -> knowledge-setup. The plugin name stays second-brain.
Update active callers and catalogs; any temporary compatibility entry must only
point to the new procedure, never retain a second policy or writer.

Copied project tools, hooks, settings, fallback instructions and checks update in
the same operation. Remove only known obsolete managed registrations; keep unrelated
handlers. Use project-sync's current Toolkit manual loader and preserve the required
Knowledge read order. Do not call the project equipped until file checks and actual
host behavior pass at the claimed level. Report legacy/partial support separately.
