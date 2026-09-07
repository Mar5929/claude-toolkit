# Protect Local Work-Item Folders

This rule applies only when the project uses the local `work-tracker` plugin.
The `work` skill owns tracker commands and record handling.
`work-item-stages.md` owns orientation, requirements and approval judgment,
progress, handoff, and completion.

Local records live under the Git-ignored `.work-items/` folder. They stay in
the current clone and do not sync to another computer. Linked Git worktrees in
one clone share the primary checkout's tracker and ID lock. Always use
`work add` so parallel sessions cannot choose the same ID.

Use tracker commands instead of directly editing command-managed files such as
`ITEM.yaml`, `STATUS.md`, `HISTORY.ndjson`, `ACTIVE.json`, and
`EVENTS.ndjson`. `DASHBOARD.md` is generated and is never a source of truth.
Preserve owner-written files in every work-item folder.

## Leave the owner's grouping alone

Any folder under `.work-items/` may hold work items. A plain folder is only a
group. A work-item folder may also hold child work-item folders and shared
documents. The tracker finds items at any depth.

- Create an item in a group with `work add --group NAME`.
- Never move an item, invent a group, or reorganize folders without the owner's
  request.
- Folder position and tracker relationships are separate. Nesting writes no
  `parent` link, and linking moves no folder.
- Say once that documents under `.work-items/` are not backed up or shared. Put
  material other people need in the project's documented repository location.

## Protect the archive

Anything under `.work-items/archive/` is archived. Folder location is the only
archive record. Moving a group there archives every item inside it, so state
the scope before using `work archive`.

Archiving is organization, not completion or cancellation. Never archive on
your own initiative. Use `work archive` or `work unarchive` only when the
owner asks. Archived IDs are not reused, links still work, and validation still
covers the records.

If the plugin is absent but an older staged tracker exists, preserve it and
offer the preview-first `work migrate` flow. Never create a competing
hand-built tracker or remove the old one without approval.
