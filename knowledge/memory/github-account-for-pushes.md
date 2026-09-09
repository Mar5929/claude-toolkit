---
summary: This computer has two GitHub accounts, and only the personal one, Mar5929, may ever be used for this repository; the work account cannot push here, and a Git login window on push means the saved login flipped to the work one.
group: Git and GitHub
type: constraint
status: current
source: Mike Rihm, in the session on 2026-09-09, after pushes to main failed with "Invalid username or token" and Git kept opening a login window
confidence: observed
created_at: 2026-09-09
tags: [git, github, accounts, pushing, this-machine]
approved_by: Mike Rihm
approval_date: 2026-09-09
project: claude-toolkit
---

# Only the Mar5929 GitHub account is used here

This computer is signed in to two GitHub accounts: Mar5929, Mike's personal
account that owns this repository, and mrihmDragonflyCGI, his work account.
Only Mar5929 is ever used for this repository. The work account has no push
rights here.

On 2026-09-09 the saved Git login flipped to the work account. Every push to
main was refused with "Invalid username or token", and Git opened a login window
on each try. Sessions that pushed sat waiting on that window, which looked like
Git silently not pushing. Signing Git back in as Mar5929 fixed it.

What to do: before pushing, if GitHub refuses the login or a login window
appears, do not keep retrying. Check which account is saved with
`git credential fill` and `gh auth status`, and tell Mike the login has flipped
to the work account. He switches it back.
