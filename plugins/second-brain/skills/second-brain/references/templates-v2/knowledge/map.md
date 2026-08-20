# Project map

This file says what each logical role means here, where it physically lives
right now, who owns it, whether it is authoritative or derived, and how it is
searched. An agent reads it instead of guessing a path or creating a second
home for something the project already has.

Two rules hold for every row.

1. A mapped area points at a folder that already exists. Setup maps an existing
   location in place. It never moves, copies, or renames project material to
   fit a shape this file prefers.
2. A role with no home yet is left out or marked `not present`. Absence is not
   an error, and an empty folder is not created to fill a row.

## Required core

These paths are fixed. They are the required project shape, so they are not
remapped.

| Role | Path | Owner | Authority | How it is searched |
| --- | --- | --- | --- | --- |
| Project identity and settings | `knowledge/project.md` | Owner | Authoritative | Read at startup |
| This map | `knowledge/map.md` | Owner | Authoritative | Read at startup |
| Current state and handoff | `knowledge/current.md` | Write coordinator | Authoritative | Read at startup |
| Approved behavior | `knowledge/specs/` | Owner, through approval | Authoritative | `memory.mjs spec-search` and `spec-get` |
| Durable facts | `knowledge/memory/facts/` | Write coordinator | Authoritative | `memory.mjs search` |
| Durable decisions | `knowledge/memory/decisions/` | Write coordinator | Authoritative | `memory.mjs search` |
| Durable events | `knowledge/memory/events/` | Write coordinator | Authoritative | `memory.mjs search` and `timeline` |
| Durable patterns | `knowledge/memory/patterns/` | Write coordinator | Authoritative | `memory.mjs search` |

## Mapped areas

Fill in the path each role already resolves to in this project. Delete a row
whose role this project does not have.

| Role | Path | Owner | Authority | How it is searched |
| --- | --- | --- | --- | --- |
| Project rules and host instructions | not present | Owner | Authoritative | Loaded by the host at session start |
| Reusable skills and procedures | not present | Owner | Authoritative | Invoked by name |
| Active work tracker | not present | Owner | Authoritative for live status | Tracker adapter, when one is configured |
| Delivery and client artifacts | not present | Owner | Authoritative for delivered work | Ordinary file search |
| Outside and project research references | not present | Owner | Reference only until promoted | Ordinary file search |
| Source records and raw evidence | not present | Owner | Authoritative as evidence | Ordinary file search, linked from records |
| Domain-owned stores | not present | Owner | Set by the profile | Set by the profile |

## The reference area for research spikes

A research-only or spike work item that produces a report which may guide later
work leaves that report in this project's mapped reference area. The role is
listed above as `Outside and project research references`. Common homes are
`references/`, `engagement/references/`, and `delivery/references/`. Map the one
this project already uses.

What the reference area holds and how it behaves:

- The final editable report lives there and stays findable after the work item
  closes. A generated PDF or other reading copy may sit beside it, labeled as
  derived and regenerated from the editable source. The editable source is the
  copy that is edited.
- Raw queries, working notes, and other work-item evidence stay with the
  original work item. The work item and the reference package link to each
  other.
- The package states whether it has been reviewed or verified. Storing research
  here is not owner approval and does not make it project truth.
- A later work item, decision, or specification links to the reference instead
  of copying it. Promoting a conclusion into a fact, decision, event, pattern,
  specification, rule, or skill follows the normal approval flow.

## Optional canonical files

Neither file exists in a new project, and absence of either is not an error.

| File | Appears when | Absence means |
| --- | --- | --- |
| `knowledge/memory/pins.md` | The owner approves the first pin | The project has no pins. Startup renders an empty pin block |
| `knowledge/retrieval-gold-set.md` | The owner writes the project's retrieval questions | The project has no gold set. It is reported as a warning only |

A project that already owns a home for retrieval test material maps the gold set
there in the mapped areas table instead of using the default path.

## Local state

`.memory/` holds a lock or a crash-recovery journal during an approved write.
It is disposable, gitignored, and removable without losing anything canonical.
It is absent during normal reads.
