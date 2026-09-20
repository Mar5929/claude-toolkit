# Keep Both Operating Manuals Current

Before publishing a finalized change in this project, review its effect on
`knowledge/toolkit-manual.md` and `knowledge/knowledge-manual.md`. Update every
affected explanation, workflow, path, and link as part of delivering the change.
A finalized, pushed change is not complete while either manual describes the
affected behavior incorrectly or omits guidance needed to use it.

The toolkit manual owns the overall philosophy, structure, connected workflows,
and component relationships. The knowledge manual owns detailed knowledge
instructions. Keep each explanation with its owner and link between them;
do not duplicate subsystem procedures in the toolkit manual. If neither manual
needs a change, record that conclusion briefly in the work item's delivery
evidence rather than making an unnecessary edit.

The knowledge manual is a managed copy. Make its authorized changes in
`plugins/second-brain/skills/knowledge-setup/references/templates/knowledge/knowledge-manual.md`
and reconcile the installed copy, checks, and release metadata through that
component's existing workflow. Preserve meaning approvals; this upkeep rule
does not approve new policy or turn proposed behavior into shipped behavior.

Check the affected manuals and their links before publishing. Include dependent
manual updates with implementation; independent documentation follows
`knowledge-direct-commit.md`. Verify that the manual updates reached the
default branch before reporting delivery complete. If publication fails, keep
the missing update and next action visible in the existing work record.
