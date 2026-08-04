# Wrap-up ritual

At the completion of a substantial task request, when its pull request is
opened:

1. Check that any approved behavior change is represented in the applicable
   specification, code, and tests.
2. When second-brain v3 is installed, review for context, planning, decisions,
   knowledge, references, domain understanding, or operations that would help
   future work.
3. Report what was already incorporated and propose everything else worth
   saving. There is no fixed proposal count. When second-brain v3 is installed,
   `second-brain-rule.md` owns the shape of that proposal. When it is not, put
   what is worth keeping in the work item's spec.
4. **The pull request does not wait for the owner's answer.** Open it with the
   code in it, say in its description what the check found, and show the owner
   the same list in chat. Their answer is added to the same pull request
   whenever it comes, ten seconds later or the next morning.
5. **Write nothing to memory until the owner approves it.** Asking the owner a
   yes-or-no question is not approval, because they cannot approve words they
   have not read. After approval, invoke the memory librarian in this task's
   worktree, commit the result to the same branch so it lands in the same pull
   request, and review its diff. If the librarian cannot finish an approved
   update, retry or report the failure and keep the task unfinished. Do not
   merge as though it succeeded unless the owner explicitly waives it.
6. Update the work-tracker status or handoff when the project uses one.
7. Before merging a pull request containing specification or memory changes,
   bring the branch current through the Git workflow and invoke the librarian
   for the memory rule's read-only parallel duplicate and conflict review.
8. Follow the project's Git workflow for commit, push, pull request, and merge.

Every pull request description says what the check found: either what is being
saved to memory, or that nothing was worth saving. A pull request missing that
line is visibly skipped, and the owner sees it at the moment they are already
reading, right before merging.

A hook may hold the command that opens a pull request so this rule is raised at
that moment. It only sees commands typed in the terminal. A pull request opened
on the GitHub website, or by any other tool, never reaches it. This rule is the
backup for those, and it applies whether or not a hook fires.

Run the same memory check at the end of a brainstorm or requirements interview,
at the end of a milestone or project phase, and at another natural
stopping point after meaningful work when the owner ends or pauses the task and
a settled result exists.

One review may satisfy several nearby stopping points. Do not repeat it unless
later work adds or changes a conclusion worth saving. A deferred proposal
changes no document and creates no memory queue.

Do not trigger the memory check merely because unfinished work is handed to
another session, a response ends, a commit is created, or a trivial action
finishes. Temporary next actions and handoffs remain in work-tracker.
