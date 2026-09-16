# Handoff: how decisions get organized and tied to the whole product

Written 2026-09-16 for a new session in the claude-toolkit repo. Paste the
section below "Handoff prompt" into that session as its first message.

## Handoff prompt

You are picking up one question for Mike, the owner of this repo. Read
`CLAUDE.md`, every file in `.claude/rules/`, `knowledge/README.md`,
`knowledge/project.md`, and `knowledge/current.md` first. Then read Mike's
words below, exactly as he said them on 2026-09-16, and work out what he is
asking for before you do anything else.

Mike's words:

> I mean, so for the open question from before, like, what do you recommend?
> And I mean, like, so this is a good use case to use as like an isolated
> scenario, but it's relevant and the principle in which, like, so the decision
> that we make here is going to decide a lot of how projects that have the
> toolkit operate. So like, for example, this is a perfect use case where I
> said, what does the PR do, like what does the toolkit say that like where
> should the design docs be stored and you had trouble sort of figuring that
> out right like you had to look at a decision that was made in the work item
> and then cross-reference that against the PRD and not sure if the PRD is
> updated or not and you couldn't really trust the current code of the toolkit
> because we're sort of in flight and making decisions right so like this is a
> really good use case where, like, how would, you, like, I guess we're trying
> to build a knowledge system, right? And a core principle of this that we're
> going to need to solve for, like, a core pattern is, like, all of these
> things need to, the agent, the AI agent in the future state should be
> responsible for managing and storing all this information. It has to be
> crystal clear. What did we decide, right? And like all these decisions need
> to fit in and be organized in such a way that you can connect these
> decisions to like the broader overall holistic system or application or
> product that we're building, right? Like, or, or company or like whatever
> we're doing, whatever project we're building, like the overall project, a
> lot of these smaller decisions are you know, decisions about like a
> subsystem or a sub process or something like that. But we need to fit them
> in and tie them into the overall, like make sure that, I don't know, do you
> understand what I'm asking you?

The scenario that prompted this:

- Mike asked where the toolkit says a solution design should live when work
  is tracked on GitHub.
- The agent found four sources that disagree or leave it open. The Progress
  log on issue #269 says Mike decided on 2026-09-09 that the design lives on
  the issue and the `docs/designs/` folder is dropped. Mike's own commit that
  same day added `docs/designs/README.md`, which says designs live in that
  folder. The guided-delivery PRD
  (`knowledge/prds/toolkit-operating-system/guided-delivery.md`) says the
  location is agreed per item. The new solution-design skill
  (`plugins/session-skills/skills/solution-design/SKILL.md`) gives
  `docs/designs/<id>-<slug>.md` as the default. The knowledge-system PRD,
  requirement 18, says a design is "kept with or linked from the work item".
- Mike then said the 2026-09-09 decision is right: the design should live
  with the work item. The agent asked whether that means the text on the
  issue or a file the issue links to, and recommended the file, because the
  design is about 150 KB and a GitHub comment holds 64 KB. Mike has not
  answered yet.
- Mike's larger point: a decision made inside one work item changed how the
  whole toolkit works, and nothing carried it to the place that says how the
  toolkit works. The agent could not tell what was decided.

What exists now, all on main:

- The knowledge-system PRD at
  `knowledge/prds/toolkit-operating-system/knowledge-system.md`, status
  proposed, 30 requirements. Requirement 16 covers PRDs and automatic upkeep
  after shipped work. Requirement 18 is the table of where each kind of
  information goes. Requirement 10 lets an agent write the owner's clear
  answers into a PRD it has drafting permission for. The closing section
  holds Mike's handshake principle from 2026-09-16.
- The PRDs are now a tree: `toolkit-operating-system.md` is the parent with a
  "Parts of the toolkit" section; the component PRDs are children beside it
  (merged 2026-09-16, PR #348).
- The solution design for the knowledge system:
  `docs/designs/269-knowledge-system.md`, with its working records, process,
  and pick-up notes in `docs/designs/269-knowledge-system/`. Section 13 lists
  23 places a builder could misread the PRD; section 15 lists 27 open
  questions. Question 1 is answered; question 2 is next.
- This repo's rule for work items (`CLAUDE.md`, "Where work is tracked"):
  settled decisions go in the issue body, arguments in comments, one Progress
  log comment edited in place.

Your job, in this order:

1. Restate what Mike is asking for in plain words, and confirm it with him
   before going further.
2. Trace the scenario above through the knowledge system as designed. For
   each step, say which part of the design would have caught it, or that
   nothing would. Be honest. The likely gap: requirement 16's automatic PRD
   upkeep triggers only after work ships, and a decision made during
   refinement reaches a PRD only when an agent has drafting permission and
   remembers to write it. Nothing today carries a work-item decision that
   changes toolkit-wide behavior into the parent PRD or the shipped files.
3. Propose how decisions get organized so each one is tied to the part of the
   product it belongs to and to the overall product: for example, a decision
   made in a work item is recorded in the child PRD it changes and, when it
   changes how the whole toolkit works, in the parent PRD, in the same reply,
   with the date and the issue number. Say which requirement in the
   knowledge-system PRD changes, and give Mike the exact wording, one decision
   at a time. Use the handshake principle: guide the agent and check that the
   step happened; do not build a program that decides for it.
4. Settle the design-location question with Mike as the first worked example
   of that process, and record the answer in the guided-delivery PRD and, if
   he confirms it applies toolkit-wide, in the parent PRD.
5. Record every decision you settle with Mike in the issue #269 Progress log
   and in the PRD that owns it, in the same reply, and push to main under the
   knowledge direct-commit rule.

Plain English throughout. No figurative language. One question at a time.
Mike prefers a recommendation with each question.
