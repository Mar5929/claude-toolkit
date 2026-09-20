# PRD template

Use for required behavior, not a build plan, progress record or system inventory.
New PRDs use this layout; existing bodies may retain their shape. A parent PRD
at `knowledge/prds/<area>/<area>.md` owns shared requirements; sibling children
own their subparts and refer to parent requirement numbers instead of copying.
A small area may use one top-level file.

```yaml
---
summary: <one line under 200 characters>
group: <short index topic heading>
area: <feature-area name>
status: proposed
source: <actual requirement source>
created_at: <original YYYY-MM-DD>
updated_at: <content-change YYYY-MM-DD>
tags: [<useful terms>]
---
```

Approval fields mean requirements approval, not drafting/save authority. An
unapproved proposed PRD omits both. Approved requirements require `approved_by`
and real `approval_date`, even if still proposed. `finalized`, `superseded` and
`retired` require both. Finalized means ready for design/build, not delivered or
automatically authorized for implementation. Legacy current is converted only
with its existing approval evidence. A PRD has no type, confidence or auto_saved.
Optional fields are the memory template's optional fields except related_memories.

The body, in order:

1. `# <Feature title>` and table of contents.
2. `## Why this exists`: problem, context and intended result.
3. `## What this document holds`: this document holds what the system does,
   what users experience, and what information is stored and where. Functional,
   process, logic, interface and data requirements belong here; how it is built
   does not. State behavior and checks explicitly in plain words. If design may
   choose, state what may vary and the outcomes/constraints it must meet.
   An open question is not permission to guess.
4. `## Requirements`, with `### <Area>` sections and numbered
   `#### <N. Requirement>` headings. Each ends with a **Check** paragraph.
5. `## Notes` last: useful decisions and approval state, unanswered questions,
   remaining document tasks and exact resume point. Clearly mark tentative
   solution ideas. Settled answers update requirements, not just Notes.

Keep overall work status and delivery evidence in the tracker. Link affected
component and parent requirements to their owner. Authorized post-delivery
upkeep records only agreed delivered behavior; it never legitimizes defects or
finalizes requirements by itself. Preserve permission and explicit holds.
