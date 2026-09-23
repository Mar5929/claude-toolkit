# Lifecycle operations and file templates

Every operation uses execution-and-recovery.md for authority, fresh reads,
checks, publication and cleanup. This reference decides what a valid operation
changes; it supplies no permission by itself.

| Operation | Change and required checks |
| --- | --- |
| Create | Search first. Create only a distinct topic, an approved split, or a coherent new subtopic without an existing owner. Use the destination template. |
| Update | Integrate authorized meaning into its owning section; preserve unrelated content. Keep original creation date; update content-change date. Reverification dates change only after checking those claims. |
| Supersede | Replace an old fact/decision in the existing topic; repair references treating the old statement as current. Keep useful dated history labelled superseded; do not create a file merely because a decision changed. Whole-file replacement, when warranted, records both directions and updates navigation together. |
| Retire | Set retired when no longer applicable but history remains useful. Explain why; keep findable as history. Age alone is no reason. |
| Remove content | Remove only approved obsolete/repeated/incorrect content, preserving useful history and context. This does not authorize deleting its whole file. |
| Delete whole file | Only accidental duplicate, secret, never-true content or redundant original after approved consolidation. Name the reason. Deleting a secret from the latest file does not remove Git history; report that separately without reproducing it. |
| Consolidate or split | Approval names affected files, replacement arrangement and cleanup. Preserve useful meaning/history/sources and differing claim evidence; repair links and verify replacements before removing approved originals. A failure retains originals and leaves the operation unfinished. |

No blanket shortening. Topic length or fact counts alone do not justify a split.
Within a topic, retain source, confidence, effective-date and approval distinctions
beside claims when one file-level value would misrepresent them. An update does
not reverify unrelated claims or broaden their approval.

Read only the relevant template before writing:

- [Memory topic](../../knowledge-setup/references/templates/memory-topic.md):
  required fields, body, dates and useful history.
- [PRD](../../knowledge-setup/references/templates/prd.md): new-document layout,
  requirements approval, parent/child ownership, bottom Notes. Existing PRDs may
  retain their body layout; do not force a rewrite just to match headings.
- [Current work](../../knowledge-setup/references/templates/knowledge/memory/current.md):
  multi-session overview and later to-dos, not another tracker.
- [Pending entry](../../knowledge-setup/references/templates/pending-entry.md):
  exact cards, durable authority, worker and publication evidence.
- [Glossary](../../knowledge-setup/references/templates/knowledge/memory/memory-entries/terminology-glossary.md):
  concise term table, outside the memory index. Apply the destination's existing
  permission to meaning changes; moving or repairing a link grants no new meaning.
- [Captured topic](../../knowledge-setup/references/templates/captured-topic.md):
  source metadata, outside-documentation index and preserved external text.

For a repeatable procedure, use the project's installed skill-authoring process
and its approval rules. Locate it through the available skill catalog or project
instructions; a Codex skill-creator available on one machine does not establish
portable project setup. If none is available, report the missing procedure and
leave a linked proposal in the existing work record under its authority. Do not
save the procedure as memory or use a knowledge card to authorize implementation.
An enabled System Guide and separately designated architecture keep their own
writers, templates and permissions.

## Keep current work up to date

`knowledge/memory/current.md` is the shared overview of current work.

- Update it as work happens. Stay under its 5,000-character limit.
- Keep project context and every relevant concurrent item: goal, current state,
  useful recent results, next step, blocker, and later to-dos.
- Date short entries. Link the records that own the detail. Follow the
  current-work template.
- A size limit never permits silently losing needed context. If essential
  context does not fit, propose a concrete arrangement that uses existing
  owning records.
- Reread the file before editing, to keep other sessions' entries.
- Session handoffs live under "Session handoffs", newest first, with UTC
  creation times. They are disposable continuation, not lasting memory or
  approval. The `handoff` skill owns their capture and resume. Do not truncate
  them, expire them by age, or create a separate handoff store.
- After an update, confirm in one short line that it is saved and available to
  the next session. Otherwise say what is still only local, and keep the
  unfinished publication step.

## Write files future sessions can understand

- Write plain, concrete language with the needed context and sources. Explain
  exact technical names when needed.
- Remove repetition, unsupported claims, and references to a conversation the
  reader cannot see.
- Keep required verbatim wording unchanged. Resolve a conflict between that
  wording and these writing rules before approval.
- Match the detail to the topic. Keep the current answer easy to find. Keep the
  explanations, examples, exceptions, and useful history needed to apply it.
  Clarity does not require shortening every account.
- Use descriptive lowercase file names with hyphens. Keep one memory file per
  topic by default. Use an approved topic folder for coherent subtopics.
- Integrate additions into the relevant section. Propose a split only when
  distinct subtopics would be easier to find or understand apart. Fact counts
  or file length alone do not justify a split.
- A fact that changes over time has one owning file. Other files link to it and
  do not restate the value.
- Keep links relative. Use actual dates. Keep original creation dates. Update
  content-change dates. Record a verification date only when you checked the
  claim.
- Index summaries stay under 200 characters. There is no fixed memory-file
  length cap. Never cut approved meaning silently to pass a check.
- Rebuild generated indexes from their sources. Never edit them by hand.
