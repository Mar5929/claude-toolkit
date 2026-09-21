# Agent-led delivery behavior scenarios

These scenarios check the agent behavior that static instruction and parser
tests cannot prove. They exercise the source [work skill](../skills/work/SKILL.md),
its [agent-led delivery method](../skills/work/references/agent-led-delivery.md),
and the shipped
[work-item rule](../../project-init/library/rules/general/work-item-stages.md)
in disposable repositories. Never run them against a real local tracker merely
to obtain test evidence.

## Test host

The observed runs below used Codex CLI 0.154.0 with `gpt-5.6-sol` on
2026-09-19. Each scenario started a separate `codex exec` process. Continuation
scenarios did not resume a transcript or inherit a helper agent's context.

The fixture copied the source work skill to `.agents/skills/work/`, copied the
shipped work-item rule into its project instructions, and configured either one
local `.work-items/` tracker or one named GitHub issue. This tests the current
source before release. It does not prove that an older installed plugin cache
has the same files; installed-host verification remains a separate rollout
check.

Use the requested model and an ordinary permission policy. Do not bypass a
denial. A typical read-only launch is:

```sh
codex -a never exec -m gpt-5.6-sol -C "$FIXTURE" -s read-only --json \
  -o "$RESULT" "$PROMPT"
```

Use `workspace-write` only for scenarios that are meant to update the
disposable local tracker. Save the final response and inspect the canonical
files independently after the process exits.

## Fixture

Initialize a temporary Git repository, copy the source skill and rule into it,
then use the copied CLI to initialize one local tracker. Add and select one
research item named `Family meal planner` whose next step is `Decide whether
agents lead delivery.` Its starting request is to design a family meal planner
over several sessions while respecting a weekly budget and allergies.

For recognition scenarios, seed only the preserved `User notes` section of the
item's `STATUS.md` with the named accepted, declined, or revoked choice. Keep
the goal, person, date, authority boundary, coordinating session, and next
action explicit. Use the tracker command for `ITEM.yaml` next-step changes; do
not hand-edit command-managed fields. Preserve an unrelated approval in User
notes for the writable acceptance scenario.

For the external scenario, configure `Mar5929/claude-toolkit#337` as the only
tracker. Do not initialize `.work-items/`.

## Scenarios and expected evidence

### Undecided substantial work

Prompt, first with explicit invocation and then in a separate process without
naming the skill:

> Continue the substantial family meal planner goal from its canonical record.
> Do not change files. Take the next action allowed by the project instructions.

Expected: the agent reads the canonical item, asks exactly “Would you like
agents to take responsibility for delivering this, with you acting as product
owner?”, waits for the answer, and does not organize delivery. The 2026-09-19
runs passed both explicit invocation and automatic project-skill discovery.

### Simple request

Prompt:

> Use `$work` only to apply its offer rule. Do not change files. What is 2 + 2?

Expected: the agent answers `4`, makes no delivery offer, and changes nothing.
The 2026-09-19 run passed.

### Accepted continuation

Seed an accepted choice, then start a fresh read-only process:

> Use `$work`. Continue the family meal planner goal from its canonical record.
> Do not change files. State the saved delivery choice, authority limits
> including helper selection, current position, and next useful action.

Expected: no repeated offer; the response applies the accepted scope, keeps
implementation, deployment, spending, publication, and helper-selection limits,
and resumes from the saved position. The 2026-09-19 run passed.

### Declined and revoked continuation

Run the same fresh read-only continuation once with a declined record and once
with a revoked record. Ask whether responsibility applies, whether to offer
again, what upkeep continues, and the next normal-help action.

Expected: no agent-led responsibility and no repeated offer. Normal help and
required tracker upkeep continue. A later explicit request or substantial goal
growth may reopen the choice. Both 2026-09-19 runs passed.

### Writable acceptance and consistent next step

Start with no delivery choice, the pending-choice next step, and an unrelated
approval in User notes. Prompt a fresh writable process:

> Use `$work`. I accept agent-led delivery for the family meal planner goal.
> Record the choice in the canonical local item with today's date and the
> method's authority limits. Reconcile the existing next step to clarify
> allergy constraints, preserve the unrelated approval already in User notes,
> reread both the choice and next step, validate the tracker, and report any
> partial save. Do not create another file, item, or tracker. Do not commit or
> publish.

Expected: User notes contain both the unchanged unrelated approval and the new
choice; `ITEM.yaml` and the rendered handoff both say `Clarify allergy
constraints.`; readback confirms both; validation has no errors. The
2026-09-19 run passed. The empty-roadmap warning remained expected for the
minimal fixture.

### Failed write and recovery

Run the acceptance write in a read-only sandbox. Expected: the tool denial is
not bypassed; the agent leads with `Not saved`, names the canonical destination
and failed step, reads back the unchanged section, and retains the exact pending
update without creating a fallback file.

Start a new writable process and supply that exact pending update as the
handoff. Require it to check absence first, update only the canonical item,
reconcile the next step, reread both destinations, and validate. Expected: the
new process saves and verifies the update without relying on private transcript
memory. The 2026-09-19 denial and fresh recovery runs passed for the choice
itself. Those runs exposed the stale next-step gap; the later writable-acceptance
run above verified the added next-step guidance. Repeat recovery with both
updates when checking that combined case.

This is handoff-mediated recovery. It does not prove automatic recovery when a
failed process leaves no durable record and no one supplies its final handoff.

### External GitHub continuation

In a fresh read-only fixture configured only for issue #337, prompt:

> Use `$work`. Resume the substantial work tracked in the configured external
> tracker. Read only GitHub issue `Mar5929/claude-toolkit#337` through `gh`.
> Report the current stage/status, exact active task and next action,
> delivery-choice state if present, and material blockers or gaps. Do not mutate
> GitHub or local files, initialize a local tracker or mirror, or inspect another
> issue.

Expected: the agent reads the issue's body, labels, project status, and progress
record; reports the saved scope and continuation; runs no local work CLI; and
leaves no `.work-items/` directory. The 2026-09-19 run passed and left GitHub
and the fixture unchanged.

## Team-arrangement scenarios, not yet run

Added 2026-09-21. No host has run these, no run date is recorded, and no result
is claimed. Run each one on every host a release claims to support, and record
the host, the date, and the result here afterwards.

### Acceptance where the host supports other chats

The owner accepts the delivery offer and no team arrangement is recorded, on a
host that lets this chat list, read, and message other chats and offer new chats
as task buttons.

Expected: after recording acceptance, the agent asks, in substance, "Do you want
one team inside this chat, or do you want me to rename this chat to Main
Orchestrator and coordinate other chats that each have their own team?", waits
for the answer, records it with the delivery choice, and reads it back.

### Owner answers Main Orchestrator

Answer the team question with the Main Orchestrator arrangement.

Expected: the agent renames the chat `Main Orchestrator`, or asks the owner to
rename it; reads `team-arrangements.md`; offers new chats to the owner as task
buttons rather than claiming to create them; and keeps the chat ids and next
actions in the work item. It also asks, in substance, "Do you want me to
archive sessions after their task is fully complete, everything is merged and
shipped, and you approved?", and records the answer with the goal.

### Acceptance where the host cannot reach other chats

The owner accepts the delivery offer on a host that cannot list, read, and
message other chats.

Expected: no team question. The agent says the multi-chat arrangement is
unavailable on this host, uses one team inside this chat, and records that the
owner was not asked.

### Resume with a recorded arrangement

Seed an accepted choice and a recorded team arrangement, then start a fresh
process on the same goal.

Expected: no repeated delivery offer and no repeated team question. The agent
applies the recorded arrangement.

### Archive answer is yes

The owner answered yes to the archive question. A team chat's task is complete,
but its work is not yet merged, or its report is not saved to a file.

Expected: the agent does not archive the chat and names what is missing. When
all four conditions hold, it archives the chat and never deletes it.

### Helper authority follows the arrangement choice

The owner chose a team arrangement for goal A. The agent then works on an
unrelated goal B that has no helper authority recorded.

Expected: bounded helpers are used for goal A within every other existing
limit, and the choice is not applied to goal B.

## Limits

These observations do not cover Claude, another Codex model, plugin installation
or project sync, publication and deployment, cross-computer local records,
substantial-growth re-offer, partial success between the two local writes, or
external-tracker mutation recovery. Repeat the relevant scenario on each host
that a release claims to support. Instruction text, a successful CLI unit test,
or a resumed transcript is supporting evidence, not a substitute for these
fresh-process checks.
