# The machine-wide set

What belongs to a whole computer rather than to one project. The `machine-sync`
skill compares a computer against this folder and installs what the owner
approves into `~/.claude/`.

`../library/` is the other pile and the difference is the whole point:
`library/` lands in a project folder, this lands in the owner's home folder.
A project gets `library/` only when someone runs `project-init` or
`project-sync` on it. This set applies to every repository on the computer,
including ones nobody ever set up.

## The test for putting something here

Two questions, and both have to be yes:

1. **Does it have to hold in a repository that was never set up with the
   toolkit?** If a project rule would cover it, it is a project rule. That is
   where almost everything belongs.
2. **Is it absent from `../library/` and from the output styles?** Shipping the
   same guidance twice, once per machine and once per project, means two copies
   that drift apart and a session reading both.

Anything that fails either question goes in `../library/` instead. This folder
stays small on purpose.

## What is in it

| Piece | Lands at | What it does |
|---|---|---|
| `rules/no-ai-attribution.md` | `~/.claude/rules/no-ai-attribution.md` | Nothing the owner commits or pushes carries a line saying an AI helped write it. Covers commit trailers, pull request text, code comments, file headers, and documents. |
| `settings/required.json` | merged into `~/.claude/settings.json` | Sets `attribution.commit` and `attribution.pr` to an empty string, which is what removes the `Co-Authored-By: Claude` trailer and the "Generated with Claude Code" line Claude Code adds by itself. |
| `no-ai-attribution-guard` hook | `~/.claude/hooks/` plus an entry in `~/.claude/settings.json` | Refuses a `git commit`, `git tag`, `gh pr create`, or `gh release create` whose text carries AI credit. Its script lives with every other hook in the toolkit, in `../../hooks-library/hooks/`, not here. |
| `rules/propose-the-best-solution.md` | `~/.claude/rules/propose-the-best-solution.md` | The best answer always gets said out loud. Time, effort, cost, and resources never decide whether it is mentioned, only what the owner picks after seeing it. |
| `rules/keep-design-out-of-requirements.md` | `~/.claude/rules/keep-design-out-of-requirements.md` | Build decisions never go in requirements. Splits the work into one functional requirements document of five sections, a separate technical specification, and the architectural decision records that join them. |

The first three rows cover one rule between them, and each has a hole the other
two fill. That rule file explains which hole belongs to which. Installing one
without the others leaves a real gap, so `machine-sync` treats them as one item
and reports a partial install as incomplete.

`propose-the-best-solution.md` stands on its own, with no settings value or hook
behind it. It shares a border with the project rule "Build It Well, and Never
Quietly Build More Than Was Asked" in `../library/rules/general/`, and the two
files each say where that border is. Keep them in step: the project rule owns
the caliber of what gets built in a project, and this one owns the instruction
that cost is never a reason to keep the best answer quiet, anywhere on the
computer.

`keep-design-out-of-requirements.md` stands on its own as well. It shares a
border with the project rule "Log the Work, Spec It, Then Build It" in
`../library/rules/general/spec-before-you-build.md`, which already says a
ticket's requirements are what and why, never how. That rule stops at the ticket
and reaches only a project someone set up with the toolkit. This one holds in
every repository on the computer and adds what that one does not carry: the five
sections of the functional requirements, the separate technical specification,
and the architectural decision records that join the two. Keep them in step.

## Why the hook script is not in this folder

Every hook in the toolkit lives in the `hooks-library` plugin, so there is one
place to look for one. This is the first hook that is registered in the owner's
own settings instead of a project's, but it is still a hook, and splitting hooks
across two plugins by scope would mean checking two folders to answer "what
hooks does the toolkit ship?".

## Where the settings values can be beaten

Claude Code reads settings in this order, and later beats earlier: the machine's
own `~/.claude/settings.json`, then a project's `.claude/settings.json`, then a
project's `.claude/settings.local.json`, then anything passed on the command
line, then managed policy settings above all of them.

So a project that sets `attribution` to its own value wins over this set. That
is not a bug to fix here, because a project is allowed to decide its own
settings. It is a thing `machine-sync` reports when it sees it, so the owner
knows the machine-wide value is not in force there.

## Adding to this set

Answer both questions at the top first. Then drop the file in the right
subfolder, add a row to the table above, and add it to the `machine-sync`
skill's list of what it checks. Write it in plain language: no em dashes, no
section signs, "owner" rather than a personal name, and no path that only exists
on one computer.
