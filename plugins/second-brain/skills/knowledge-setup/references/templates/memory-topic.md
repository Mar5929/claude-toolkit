# Memory topic template

Replace placeholders with supported facts. This template is not itself a memory.
Use one coherent topic file under `knowledge/memory/memory-entries/`; approved
subtopics may share a topic folder. Do not sort by type or create a file per fact.

```yaml
---
summary: <one line under 200 characters, copied exactly into the index>
group: <short topic heading>
type: <fact | decision | event | context | constraint>
status: <current | superseded | retired>
source: <evidence path, link, commit or person>
context: <occasion and actual date when known, without a transcript>
confidence: <observed | reported | inferred>
created_at: <original YYYY-MM-DD>
updated_at: <content-change YYYY-MM-DD>
tags: [<useful terms>]
approved_by: <actual approving person>
approval_date: <actual YYYY-MM-DD>
---
```

For automatically saved memory, replace the individual approval pair with
`auto_saved: true`. Never claim individual review from a standing grant. The
project's current permission is in knowledge/project.md; record its person,
date, source and memory-only lifecycle scope once there. Revocation prevents new
automatic writes; it does not falsify the provenance of earlier auto-saved files.
Mixed claims retain material approval/source/confidence differences in the body.

Start the body with `# <Plain topic name>`, followed by the current useful facts,
meaning and context. Organize related information with useful headings. Retain
necessary examples, exceptions and reasons. Clearly label dated superseded
history when useful; don't append an activity log. Optional sections are
`## When to revisit` and `## Related records`; omit invented dates or links.

Optional fields only when applicable: `confirmed_at`, `source_quote`,
`effective_from`, `effective_to`, `project`, `work_item`, `supersedes`,
`superseded_by`, `related_memories`. Dates are real YYYY-MM-DD. Metadata paths
are project-relative; body links are relative to the file. Keep reciprocal links
for related_memories and whole-file replacement. Superseding a statement normally
updates this same topic; a whole-file superseded status names its replacement.
An edit date is not a verification date.

Example of mixed evidence: the owner reported on a named date that duplicate
names occur. A separately dated fixture confirmed identifier matching on its
sample. Do not describe that sample as proof of all production data. An inferred
cause remains labelled inferred until verified. Preserve each actual source.
There is no fixed file-length cap.
