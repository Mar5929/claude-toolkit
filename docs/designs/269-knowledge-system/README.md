# 269-knowledge-system: the working records behind the design

This folder holds the material that produced
`docs/designs/269-knowledge-system.md`: the research reports, the two design
leads' briefs, and every review and fix list.

The research, briefs, and completed reviews are history. They are not current truth. Where a record and the design
file disagree, the design file is right, because the design file was corrected
three times after these records were written. Where the design file and the
requirements document disagree, `knowledge/prds/toolkit-operating-system/knowledge-system.md` is right.

`process.md` says how the design was made and where the work stands.
`prep.md` is the design prep file, filled in after the fact.
[The design walkthrough](design-walkthrough.md) is the active scenario-led
review companion. It records the current step, accepted answers, and remaining
choices; its unapproved proposals do not change the PRD or approve a build.

Every record was written by an agent. The roles are: an Opus research agent,
the peer Fable design lead, the main Fable design lead, an Opus reviewer, and
an Opus fixer. `process.md` says what each role did.

## research/

| File | What it is | Written by |
| --- | --- | --- |
| `r1-claude-code-capabilities.md` | What Claude Code can do: hooks, skills, plugins, rules, settings, and the limits on each, checked against the live documentation on 2026-09-16 | An Opus research agent |
| `r2-codex-capabilities.md` | The same question for Codex, read from the Codex source at commit 9771934 because the documentation site was blocked | An Opus research agent |
| `r3-current-implementation.md` | An audit of the knowledge system the toolkit ships today: every file, hook, skill, tool, test, and the couplings between them | An Opus research agent |
| `r4-history-digest.md` | Every decision recorded on issue 269 and the related requirements documents, in date order | An Opus research agent |
| `r5-alternatives.md` | A survey of other agent memory systems and what each one does about the same problems | An Opus research agent |
| `verification-report.md` | A check of every citation in the two leads' briefs. It found 31 errors, which went to the fixers | An Opus reviewer |

## briefs/

| File | What it is | Written by |
| --- | --- | --- |
| `outline.md` | The first outline of the design document's sections | The main Fable design lead |
| `main-decision-brief.md` | The decisions the design rests on, with the reason for each, and the three disagreements between the two leads and how each was settled | The main Fable design lead |
| `peer-requirements-critique.md` | A critique of all 30 requirements: what each one asks for, what a harness can and cannot do about it, and where the wording is unclear | The peer Fable design lead |
| `peer-design-sketch.md` | An independent design of the whole system, written without reading the main lead's brief | The peer Fable design lead |
| `peer-decision-notes.md` | The peer lead's notes on the consolidation round | The peer Fable design lead |

## reviews/

| File | What it is | Written by |
| --- | --- | --- |
| `review-1-requirements.md` | Round one: does the design meet all 30 requirements | An Opus reviewer |
| `review-2-harness.md` | Round one: is every claim about Claude Code and Codex correct | An Opus reviewer |
| `review-3-philosophy-ux.md` | Round one: does the design follow the stated philosophy, and can it be read | An Opus reviewer |
| `fix-list-round-1.md` | The main lead's ruling on every round-one finding | The main Fable design lead |
| `fix-list-round-1-addendum.md` | Further round-one rulings, added after the first list was written | The main Fable design lead |
| `fix-report-round-1.md` | What was changed in the design for round one, fix by fix | An Opus fixer |
| `review-4-round2-fixes.md` | Round two: a check that every round-one fix landed | An Opus reviewer |
| `review-5-round2-fresh.md` | Round two: a fresh reading of the design as the owner and as an intern | An Opus reviewer |
| `fix-list-round-2.md` | The main lead's ruling on every round-two finding | The main Fable design lead |
| `fix-report-round-2.md` | What was changed in the design for round two | An Opus fixer |
| `review-6-round3-final.md` | Round three: a final pass over the whole design | An Opus reviewer |
| `fix-report-round-3.md` | The four round-three edits and the decision block that was added | An Opus fixer |

## Two things to know before reading a record

File paths beginning `/tmp/` appear inside these records. They pointed at the
session's own scratch folder, which no longer exists. Nothing there can be
opened, and nothing there was lost: everything worth keeping is in this folder
or in the design file.

Five labels and one marker name were rewritten in these copies so that
`tests/knowledge-startup-check.mjs` passes on the `docs/` folder. The five
proposal labels are in backticks instead of bold, and the manual's policy
marker name is written with a space in place of its colon. Nothing else was
changed.
