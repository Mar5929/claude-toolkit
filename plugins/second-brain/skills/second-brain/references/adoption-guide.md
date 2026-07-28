# Second-brain v3 setup and adoption guide

Use this guide after the owner chooses v3. Do not change a project before
showing the proposed scope and receiving approval.

## Source map

Copy from this plugin:

| Project destination | Plugin source |
|---|---|
| `.claude/rules/second-brain.md` | `references/second-brain-rule.md` |
| `.claude/agents/memory-librarian.md` | `../../../agents/memory-librarian.md` from the plugin root |
| Root indexes | `references/templates/` |
| Root orientation in `CLAUDE.md` and `AGENTS.md` | `references/orientation-snippet.md` |

The paths above are relative to the second-brain plugin. Resolve them from the
installed skill or the local toolkit checkout. Do not retype a second copy from
memory.

## Greenfield setup

1. Learn the project purpose, stack, and known system areas.
2. Explain the authority boundary between brainstorms, specifications, typed
   memory, raw artifacts, work tracking, and Git history.
3. Show the complete core tree plus only the currently known system areas.
4. Show the proposed `CLAUDE.md` and `AGENTS.md` routing edits.
5. Ask the owner to approve, edit, or skip the complete v3 system.
6. After approval, copy the canonical rule, role, and root index templates.
7. Merge the compact orientation into both root instruction files without
   replacing their existing content.
8. Add only approved system-area indexes.
9. Review the resulting diff and confirm no duplicate authority was created.
10. Offer an initial memory pass and `grill-me`.

The initial memory pass may propose project context, planning, known areas, and
already-approved requirements. It does not silently write assumptions.

## Brownfield read-only audit

Before proposing changes, inventory:

- existing specifications and design documents;
- ADRs and decision records;
- architecture and system maps;
- roadmaps and project overviews;
- runbooks and operating guidance;
- glossaries and business-domain documentation;
- reference and research material;
- raw artifact folders;
- `CLAUDE.md`, `AGENTS.md`, `.claude/rules/`, and `.claude/agents/`;
- work-tracker location and authority;
- existing indexes, links, duplicates, and contradictions; and
- retired v1 MCP, hook, curator, outbox, or local rule wiring without reading
  legacy memory content or secret files.

Report:

- proposed system areas;
- existing documents already in good canonical homes;
- likely overlaps or conflicting current truth;
- missing or stale root routes;
- live ticket state copied into durable documentation;
- exact files recommended for creation, editing, moving, consolidation, or no
  change; and
- what is observed, inferred, owner-confirmed, or still unknown when the
  distinction matters.

## Brownfield treatment choices

Recommend one treatment per existing source:

1. **Keep and link.** The existing home already works.
2. **Move with approval.** A v3 home is clearer and links can be repaired.
3. **Consolidate with approval.** Several files duplicate one current truth.
4. **Leave unresolved.** Available evidence is insufficient.

Never mass-move, duplicate, delete, or declare documents authoritative merely
to make them resemble the templates. A risky or large structural change needs
its own visible approval.

After the read-only audit is approved, install the complete core, make only the
approved document treatments, review the diff, and offer an initial memory
pass or `grill-me` for important gaps.

## Existing retired v1 wiring

V1 content is not a migration source and cannot become v3 truth automatically.
Do not contact Worker or Neon resources, open token files, read legacy memory,
or import curator and outbox content.

Local v1 wiring does not block v3 adoption. Report it separately and offer:

1. reversible local deactivation of committed MCP and automatic hook wiring;
   or
2. removal of specifically listed committed integration files.

Neither choice is implied by installing v3.

## Verification

After setup or adoption, confirm:

- both root files route to the same canonical rule;
- the memory-librarian role is present;
- every core index exists;
- known system areas are indexed without hypothetical empty areas;
- existing project documents were preserved unless their treatment was
  approved;
- work-tracker still owns live work state;
- raw project artifacts remain in their canonical homes;
- no v1 content was imported;
- no database, MCP memory server, hook, runtime script, embedding, transcript
  capture, or background curator was installed; and
- all writes occurred in the requesting session's worktree.
