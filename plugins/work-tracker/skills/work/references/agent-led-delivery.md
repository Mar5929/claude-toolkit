# Agent-led delivery

Use this procedure when starting or resuming a substantial feature or work item. The `work` skill
owns the choice and its durable record. `work-guide`, when installed, retains
the detailed orchestration method for roadmaps, tasks, documents, helpers, and
handoffs.

## Offer once for the goal

First read the canonical goal record and any linked continuation to determine
whether the owner already accepted, declined, or revoked agent-led delivery for
this goal. Do not treat missing access as an undecided choice. When the current
records show no choice, ask exactly:

> Would you like agents to take responsibility for delivering this, with you acting as product owner?

Do not make this offer for a simple question or quick edit. Wait for the answer
before taking responsibility for organizing delivery, while continuing any
useful work that does not depend on the choice.

A clear acceptance authorizes agent-led delivery for this goal across sessions.
A later explicit request for agents to manage or deliver the goal also counts;
do not ask the opt-in question again. A decline preserves normal help and existing tracker and lifecycle upkeep,
and suppresses the offer for this goal, including in later sessions. Offer again
only if the work grows substantially or the owner asks about managed delivery.
The owner may revoke acceptance at any time. Record that choice as revoked:
agent-led responsibility ends, normal help and required upkeep continue, and
the same offer-suppression rules as decline apply.

The choice belongs to the named goal. Do not inherit it to an unrelated goal,
new work item, or unrelated child item. Session end does not expire it, and
missing tracker access does not mean the owner is undecided.

## Ask how the team is arranged

After a clear acceptance, read the goal record for a saved team arrangement.
When none is recorded, ask one more question, in substance:

> Do you want one team inside this chat, or do you want me to rename this chat to Main Orchestrator and coordinate other chats that each have their own team?

Offer the multi-chat choice only where the current host lets this chat list,
read, and message other chats and offer new chats to the owner as task buttons.
Today that is the Claude Code desktop app. On any other host, do not ask. Tell
the owner the multi-chat arrangement is unavailable on this host and use one
team inside this chat. Record that the owner was not asked, so a session on a
host that supports the choice can ask once.

Do not ask after a decline or a revocation, and do not ask again once the
owner's answer is recorded for the goal. The owner may change the arrangement
at any time; record the new answer.

When the owner chooses the Main Orchestrator arrangement, ask one more
question, in substance:

> Do you want me to archive sessions after their task is fully complete, everything is merged and shipped, and you approved?

Record the answer with the goal like the arrangement answer, and do not ask it
again.

[Team arrangements](team-arrangements.md) explains what each answer means,
including when a chat may be archived. Read it before organizing the team, and
when resuming a goal that has a recorded arrangement. Helper authority for
either arrangement is stated under "Divide responsibility" below.

## Record the choice durably

Save accepted, declined, or revoked, and the team arrangement once chosen, in
the existing canonical item:

- Local tracker: save Overview `Context and notes` in `WORK-ITEM.md` with
  `work edit` and its current hash. Existing legacy items retain the preserved
  `User notes` section of `STATUS.md`.
- External tracker: use the existing item body or suitable native fields. Do
  not initialize `.work-items/` or create a local mirror.

If no item exists, use the project's normal authorized capture route when the
goal warrants a record. Do not create a tracker or work item solely to record a
refusal. If there is no durable authorized home, state that limitation and
preserve the choice and its scope in the handoff until it can be saved.

Record the goal scope, accepted, declined, or revoked state, the team
arrangement when one was chosen or that the owner was not asked and why, the
archive answer when it was asked, the source/person and date,
the current authority limits, a reference to the main session or agent leading
delivery, and references to the next actions. A lead reference coordinates
ownership; it is not an atomic lock or proof that an agent is still running.
Reread the saved destination and verify the meaning landed.

Keep the existing current-task and next-step fields consistent with the choice.
For example, replace a pending "decide whether agents lead" next step after the
owner answers, using `work update ID --next-step TEXT` in local mode or the
external tracker's native update. Preserve unrelated tasks and approvals.
Verify the choice and next action together; if only one update succeeds,
report the partial save and retain the exact repair instead of claiming both.

The main session owns canonical updates. Helpers return findings and proposed
changes to it. Respect another main session's ownership, reread shared records
before edits, and resolve conflicting ownership before overwriting anything.

If the write fails, lead with `not saved`, name the exact destination and failed
step, and keep the choice as a pending update. If the write reports success but
readback fails, say `saved but not verified` and retain the readback as pending;
do not claim the stored meaning was confirmed. Continue independent work. Put
the pending save, readback, or retry in the current handoff and retry when
authorized access returns.

## Divide responsibility

With acceptance, agents take responsibility for moving the agreed goal through
discovery, owner interview, requirements, open questions, records, focused
research, design challenge, authorized build, testing, and delivery. They keep
the plan and continuation current and bring the owner the decisions and results
that need attention.

The owner remains product owner: they make product and scope decisions, supply
required approvals, and approve the result. Acceptance does not expand tool,
security, spending, publication, deployment, implementation, or other existing
authority. Observe every project gate and recognize approvals already given.

Acceptance of agent-led delivery does not itself authorize spawning helpers.
The owner's choice of a team arrangement is the one exception: it authorizes
focused, bounded helper agents for that goal only. It does not carry to another
goal, and every other existing limit on tools, spending, publication,
deployment, and approvals still applies. Use focused, bounded helpers only when
that choice or existing item-specific or project authority allows them and
research, specialist knowledge, independent challenge, or parallel work
materially helps. Preserve meaningful decisions from their findings in the
canonical records. Reuse the owner's model preferences and only select models
and agent features the current host supports. Do not impose a fixed council,
repeat reviews without a new reason, or allow helper loops to replace a
decision. When helper authority is absent, use the main-agent fallback unless a
decision truly requires the owner's direction.

When available and relevant, invoke the installed `work-guide`,
`requirements-helper`, or `solution-design` skill by its registered name. Do
not depend on a relative path into another plugin. If a skill or delegation is
unavailable, the main agent performs that part using project instructions and
records the same decisions, evidence, and continuation.
