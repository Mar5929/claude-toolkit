---
name: spec-check
description: Check the specification an agent is about to build from or design a solution from, flag anything that could skew the work, and propose fixes before any building starts. Use when the owner types /spec-check, when a session is about to build or solution from a knowledge/prds/ file or a ticket body, or when the owner says "check the spec", "is this spec clean", or "make sure the spec hasn't drifted".
---

# Spec check

A specification that many sessions have touched drifts: agents add context,
research, and detail, and each later agent builds from a slightly more polluted
version. Before building from or designing a solution from a specification,
run this check, show the owner what could skew the work, and fix it with their
approval before any building starts.

## What counts as a specification

- A file under `knowledge/prds/`. Building from one, read the `proposed` PRD,
  because a `current` one describes what is already there rather than what is
  being asked for.
- A ticket body: a GitHub issue, a Linear ticket, or a local work item's
  `REQUIREMENTS.md`.
- A supplied conversation draft. Identify it as unsaved and review the actual
  text without inventing a file path, tracker update, or approval.

If there is no specification text at all, say so in one line and use
[requirements-helper](../requirements-helper/SKILL.md) to help the owner draft
it. Do not claim to have checked missing text or assign the documentation work
back to the owner. Saving follows the project's existing placement and approval
rules; a conversation draft remains unsaved until that succeeds.

## The check

Read the whole specification, then produce, in this order:

1. **Name what you read.** The exact file path, ticket number, or clearly
   identified unsaved conversation draft.
2. **The goal in one line.** Restate what the specification is for, in plain
   words. If you cannot state the goal in one line, that is itself the first
   flag.
3. **The flags.** Read every part against that goal and flag:
   - **Text that fights the goal.** Two statements that cannot both be true,
     or a requirement that pulls away from the stated goal.
   - **Build details that crept into requirements.** File paths, version
     numbers, step-by-step build plans, tool choices. Requirements say what
     and why, never how. Potential solution notes may sit at the very bottom
     of a PRD, linked to the relevant requirements and explicitly labeled as
     paths to explore, not requirements, approved design, or build instructions.
     Do not flag those notes merely for existing or use them as required scope.
   - **Statements that read two ways.** Different readings of the required
     behavior, rules, or outcome. Quote it and show both readings. Several valid
     ways to build the same clear behavior are design freedom, not ambiguity.
   - **Meaning a new reader cannot use.** Jargon, vague goals, missing relevant
     conditions or exceptions, or unclear completion expectations that prevent
     handoff without the original conversation. Suggest plain-language fixes;
     leave unanswered details open rather than inventing requirements.
   - **Research and narrative that belongs elsewhere.** Benchmarks, quotes,
     outside sources, and session history sitting in the requirements. It
     dilutes focus even when it is accurate.
   - **Requirements with no reason attached.** A "must" nobody can trace to
     the goal. It may be right, but it cannot be checked.
4. **A proposed fix for every flag.** Plain words: what to change, where, and
   what the line would say instead. Show the exact replacement wording only
   when the owner asks or when a one-line quote makes the fix obvious.

If nothing is wrong, say in one line that the specification is clean and start
the work. No ceremony for a clean spec.

## The hard rules

- **Change nothing without the owner's approval.** The check flags and
  proposes. The owner approves, edits, or dismisses each flag, one decision at
  a time when there are few, as a short list when there are many.
- **A dismissed flag stays dismissed.** Do not raise it again for the same
  specification in the same session.
- **Apply approved fixes to the specification itself before building starts**,
  wherever it lives: edit the `knowledge/prds/` file, or edit the ticket body.
  Retained potential solutions in a PRD go in linked, explicitly tentative
  notes at its bottom; approved design belongs in the canonical design record.
  When the tracker keeps requirements and history apart, move displaced history
  to a comment rather than deleting it, and record the reason for a requirement
  change as a dated comment.
- **Two specifications that disagree.** Name both, quote the exact
  disagreement, and let the owner pick which one is right. Never silently
  prefer the newer or longer one.
- **Do not expand the check into a rewrite.** Flag what could skew the build.
  Personal wording taste is not a flag. Plain-language clarity and separating
  requirements from solution notes are substantive checks.

## After the check

The cleaned specification is the agreed scope. Build from it, and do not
quietly carry context from the removed text back into the build.

## Voice

Read the project's active output style before writing anything the owner
reads, so the flags match the rest of the project. Find it at
`.claude/output-styles/<name>.md`, where `<name>` is the `outputStyle` value in
`.claude/settings.local.json`, then `.claude/settings.json`, then
`~/.claude/settings.json`. If there is no such file, plain short sentences are
enough.
