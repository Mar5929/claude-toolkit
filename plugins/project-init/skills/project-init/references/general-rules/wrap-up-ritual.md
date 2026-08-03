# Wrap-up ritual

At the completion of a substantial task request, before its pull request is
opened or merged:

1. Check that any approved behavior change is represented in the applicable
   specification, code, and tests.
2. When second-brain v3 is installed, review for durable context, planning,
   decisions, knowledge, references, domain understanding, or operations that
   would help future work.
3. Report what was already incorporated and propose every additional useful
   durable update. There is no fixed proposal count.
4. After owner approval, invoke the memory librarian in this task's worktree
   and review its diff. If the librarian cannot finish an approved update,
   retry or report the failure and keep the task unfinished. Do not merge as
   though it succeeded unless the owner explicitly waives it.
5. Update the work-tracker status or handoff when the project uses one.
6. Before merging a pull request containing specification or memory changes,
   bring the branch current through the Git workflow and invoke the librarian
   for the memory rule's read-only parallel duplicate and conflict review.
7. Follow the project's Git workflow for commit, push, pull request, and merge.

Run the same durable-update review at the end of a brainstorm or requirements
interview, at the end of a milestone or project phase, and at another natural
stopping point after meaningful work when the owner ends or pauses the task and
a settled durable result exists.

One review may satisfy several nearby stopping points. Do not repeat it unless
later work adds or changes a durable conclusion. A deferred proposal changes no
durable document and creates no memory queue.

Do not trigger the durable-update review merely because unfinished work is
handed to another session, a response ends, a commit is created, or a trivial
action finishes. Temporary next actions and handoffs remain in work-tracker.
