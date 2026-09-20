---
name: handoff
description: >-
  Save a temporary session handoff and write a checked, self-contained prompt for
  a fresh session to carry on from. Use when the owner says "write a handoff",
  "hand this off", "handoff prompt", "I'm going to clear context", "start a new
  session", "this session is getting long", "carry this over", "prompt for a new
  chat", or runs /handoff. Use the check on its own, with "/handoff check", when
  the owner has a handoff prompt from somewhere else and wants it verified.
  Update any active work tracker first, then run the installed knowledge-save
  or legacy remember review. Preserve the checked continuation under Session
  handoffs in current working memory when that system is configured.
---

# Handoff

A long session is about to end. Seven things have to happen, in this order, and
the order is the whole point.

1. **Update the active work item when one exists**, so the tracker carries the
   exact next step and blockers before context is cleared.
2. **Run the installed knowledge save review**, so anything worth keeping passes
   the project's placement test and owner approval.
3. **Wait for the save decision**, so nothing is written outside the meaning the
   owner approved.
4. **Draft a prompt a fresh session can start from**, carrying everything that
   was not saved. Its first line is a fixed notice that it is AI-generated, and
   the goal of the work comes right after.
5. **Check the draft before the owner sees it** and correct it.
6. **Preserve the checked continuation in Session handoffs** when working memory
   is configured, and verify its actual publication state.
7. **Show what changed and the finished prompt.**

Do the persistent review last and it gets skipped, because once the prompt is on
screen the session is over in the owner's head. Skip the check and the prompt
carries whatever this session believed, guesses included.

## Why this exists

The sessions that produce the most valuable understanding are the ones most
likely to lose it. A long exploration or planning session fills the context
window, the work gets handed to a fresh agent, and whatever did not make it into
the handoff prompt is gone the moment the old session ends. It never reaches
project knowledge, so nothing downstream ever sees it either.

Two things then go wrong with the prompt itself.

**The goal disappears.** The first session knew what the work was for and why it
mattered. The handoff prompt carries the next step, so the fresh session does a
piece of work with no idea what it serves, and the session after that knows even
less.

**Nothing checks it.** Whatever the writing session believed goes in as fact,
including what it worked out for itself. The next session reads that as settled,
passes it on, and the facts get less accurate each time the work is handed on.

Nothing can catch the moment the owner clears context. Claude Code's session-end
event fires on a clear, but it cannot stop the clear and it cannot say anything
to the agent. By the time it runs the context is already going. That is why this
is a command the owner types rather than a hook: typing it is the moment, and a
command carries its own instructions.

## Step 1: update the tracker when there is one

Read the project's tracker instructions. If an active work item exists, update
its exact next step, blockers or none, open decisions, and true stage and
status. Then read the item back or run the tracker's validation.

Preserve the goal-scoped agent-led delivery choice when one was made: accepted,
declined, or revoked, its source and date, authority limits, main-session lead, and next
actions. Do not infer a choice from activity or lose a decline when a new
session starts. A failed write is `not saved`; a successful write with failed
readback is `saved but not verified`. Name the exact pending write or verification
in the handoff.

- For local folders, use the installed `work` skill and its active-item state.
- For GitHub, update the verified issue and read its body, single Progress log,
  labels, and board status back.
- For another tracker, follow its project instructions.
- With no tracker or no active item, skip this step and say so in one line.

Do not assume `work-tracker` is installed, create a tracker, or copy current
status into project knowledge. The project lifecycle rule owns what belongs in
the tracker.

For PRD or design refinement, first save the document's updated text and bottom
Notes, including the exact resume point, approval boundaries, open questions
and who must answer, and remaining tasks. Verify the saved content itself. Link there
from the active item instead of repeating the document's open questions and
tasks. Other work remains in the item. Report any unsaved document changes in
the handoff. Follow work-guide's document-continuity guidance.

## Step 2: the persistent review

Read the installed `knowledge/knowledge-manual.md` to identify the active
layout and save procedure. A proposed PRD or a newer plugin cache does not
choose a project's installed path.

- With `<!-- claude-toolkit:knowledge-schema:2 -->` in that manual, use
  `knowledge/memory/current.md` and the installed `knowledge-save` skill.
- With the complete legacy layout (`SOUL.md`, the manual, `knowledge/project.md`,
  `knowledge/current.md`, memory/PRD/brainstorm folders), use `remember`.

Invoke that installed save skill when available. If it is unavailable, report
the blocked review and carry candidates in the prompt without a lasting write.
The installed save skill owns placement, meaning approval, pending proposals,
link repair, and index rebuild. Do not restate or replace its policy here.
When no knowledge system is configured, skip to step 4 and put the useful
continuation in the prompt. Do not create a knowledge store for a handoff.
When the layout is partial, conflicting, or unknown, name the blocked save,
carry the material in the prompt, and recommend the installed knowledge setup
procedure (legacy: `project-sync`). Do not write both current paths or choose
one by modification date.

Review what this session produced: decisions the owner made, understanding that
took work to reach, constraints that were discovered, references that turned out
to matter, and anything that would have to be worked out again from scratch by
the next session.

**If nothing is worth saving**, say so in one line and go to step 4. Do not show
an empty table, and do not invent rows to fill one.

## Step 3: wait for the save-review result

The installed save skill follows the approval contract in
`knowledge/knowledge-manual.md`. Do not copy that contract here. Wait when it
requires the owner's answer. Continue only after it reports what was saved,
declined, or blocked.

Whatever the owner cuts or defers, and anything whose save failed, goes into
step 4 instead. Preserve the installed system's pending-save references without
creating a second queue. Do not retain material the owner explicitly asked to
forget or exclude from the handoff.

## Step 4: draft the prompt, and do not show it yet

The prompt is for an agent that knows nothing about this session. Write it as an
instruction to that agent, not as a summary of what happened here.

### Its first line is a fixed notice

Every handoff prompt starts with this sentence, word for word, on its own line:

```text
This handoff prompt is AI-generated and may contain hallucinations, skewed context, etc. Please evaluate accordingly.
```

It is the first line of every prompt this skill produces: a normal handoff, a
`/handoff check` result, a prompt written with no check, and a prompt written
after the checker failed. Never reword it, drop it, or move it lower. It is a
notice, not a claim, so the checker does not score it.

### Then the goal

Right after that line comes what the whole piece of work is trying to achieve,
why it matters, and where that is written down. Not the next step. The thing
the next step serves.

- **What we are trying to achieve**, in one or two plain sentences.
- **Why it matters**: the problem it solves, or what went wrong that started it.
- **Where it is written down**: the spec file, the work item, the ticket number,
  by path. If more than one file holds part of it, name each.

"Finish the change to `src/api.ts`" is a task, not a goal. "Cut the time the
export takes so the nightly job stops running past its window" is a goal. If a
reader cannot tell what the work is for, the goal is not there yet.

If the goal was only ever said in this conversation and is written in no file,
write it anyway and mark it as not confirmed against any file. Do not stop the
handoff to write it into the work item first, and do not refuse to produce a
prompt without one.

### Then the rest

- **The task.** What the new session is being asked to do next, its scope, and
  what finished looks like.
- **What to read first**, by path, in the order that makes sense. The work item
  or ticket, the plan, the files being changed.
- **Decisions made in this session that are not written down anywhere yet.**
  Call these out under their own heading. They are the part that disappears, and
  they include everything the owner declined or cut from the proposals in step 3. Say what was
  decided and, where it matters, why.
- **Open questions and constraints** the owner has raised and nobody has settled.
- **What to do first.** One concrete action, not a direction.

### Every fact carries where it came from

As you draft, keep a source for each factual claim. You will hand these to the
checker in step 5, and the ones that survive nothing become labels inside the
finished prompt. There are four kinds:

| Source kind | What it means |
|---|---|
| file | A path, a line, or what a file says. Checkable |
| repository | A branch, worktree, commit, pull request, ticket, or command output from this session. Checkable |
| owner | The owner said it in this conversation. Quote their actual words when you can |
| worked out | This session concluded it. Nothing recorded it |

Say plainly, inside the prompt, which facts were proposed in step 3 and were not
saved. The next session should know what remains temporary or unsaved.

**Do not show this draft to the owner.** It goes to step 5 first.

## Step 5: check the draft

Run the `handoff-verifier` agent, in the foreground, and wait for its report.
Its file is `agents/handoff-verifier.md` in this plugin.

Give it three things: the full text of the draft, the path of the repository,
and the source you kept for each claim. It has not seen this conversation and it
must not be told to trust anything it cannot open. That is what makes its answer
worth having.

It hands back a report with a verdict on the goal, a table of claims, anything
carried over from an earlier handoff, and anything it had to skip.

Then act on it:

| Verdict | What you do |
|---|---|
| `Wrong` | Correct the prompt to what the repository actually says. Note it in the short list |
| `Unchecked` | Leave the claim in and label it inside the prompt as not confirmed. Never delete it, never hedge the wording instead of labelling it |
| `Missing` (the goal) | Add the goal before going on. A prompt is never shown to the owner without one |
| `Skipped` | Say in the short list which check could not run and why |

Run the checker once, fix what it found, and go on. Only run it a second time if
you rewrote whole sections, and then only on what changed. This step happens
while the owner is trying to leave, so it does not become a loop.

If the checker fails, errors, or cannot be run at all, say so in one line, write
the prompt anyway, and say inside the prompt that it was not checked. The check
never blocks the handoff.

## Step 6: preserve the session handoff

For a requested handoff, preserve the checked continuation under the exact
heading `## Session handoffs` in the installed current-work file selected in
step 2. If no valid current-work destination was established, skip the write
and report why; still provide the full prompt. Add the heading if absent.
Keep multiple entries, including handoffs for other tasks. This is disposable working context, not lasting memory,
tracker status, or permission to continue an unapproved action. `/handoff check`
on its own does not capture an entry.

Reread current work immediately before editing and reconcile intervening
changes. Preserve other sections and other sessions' entries. Use a descriptive
third-level heading with a creation timestamp in UTC ISO 8601 form, for example
`### 2026-09-20T01:15:00.000Z | Export timing`. Sort known timestamps descending;
for equal timestamps put the newly captured entry first and preserve existing
ties in their previous order. Leave undated legacy entries below dated ones in
their existing order; do not invent their dates. Correcting an entry preserves
its creation time. Do not replace all older entries with this session's entry.

Each entry carries the goal/topic, where work stopped, the first next action,
material constraints and approval boundaries, unresolved questions, and actual
source task/session and owning-record links when available. Keep unchecked
claims labelled. Preserve useful standalone context when no work record
exists; do not create a tracker item merely to hold it. Keep the full useful
handoff inline when it fits. Where detail already lives in a work item or design
Notes, link to its exact continuation point instead of copying it. A bare
session link is not enough when the next agent cannot access that conversation.

Respect the installed whole-file limit: schema 2 is strictly under 5,000
characters; legacy is at most 2,000. If essential context will not fit, show a
concrete proposed arrangement using the existing owning records, with the
precise context and links that would remain here. If there is no suitable
record, say so and keep the full prompt available to the owner while resolving
placement. Do not silently truncate, delete earlier handoffs, create a separate
handoff store, or require one file per handoff. No automatic expiry is defined;
report retention decisions that need the owner.

Read the saved entry back, check ordering and preserved content, and follow the
project's normal documentation publication route. State separately what is
written locally and what is verified remotely. Preserve any failed publication
and exact retry step in the existing continuation record. A local file, local
task link, or unpushed commit is not proof that another checkout or computer
can read it. Respect explicit publication holds. Retry an unfinished publication
from the existing saved entry/commit; do not capture a duplicate or give it a
new creation time merely because the push failed.

When resuming, choose the handoff for the owner's requested task. Newest first
makes entries findable; it does not silently switch active work. For an
unqualified request to continue the latest handoff, use the first dated entry;
resolve ambiguity if it conflicts with the active task or several entries tie.
Open its owning records and recheck current state and approvals before acting.
Use the installed `knowledge-find` (legacy: `recall`) when more context is needed.

## Step 7: show the short list, then the prompt

Include the saved location and actual sharing state, or the exact unresolved
save/size problem, in the short notes. The owner sees those notes, then one
fenced block they can copy in one click. Nothing else above it, and nothing
below it but the one action they have to take. Before showing the block, confirm the fixed notice is still its first
line.

```markdown
Checked the handoff prompt: 2 fixed, 3 not confirmed.

- Fixed: the plan is at `knowledge/prds/export-timing.md`, not `docs/export-plan.md`
- Fixed: the branch is `issue-88-export-timing`, not `export-fix`
- Not confirmed: the goal is written in no file, only in this chat
- Not confirmed: "the nightly job times out at 40 minutes", nobody recorded it
- Not confirmed: the tests were never run in this session
```

One line each. If there are more than about six, group the small ones into a
single line and keep the ones that would change what the next session does.

## Running the check on its own

`/handoff check` takes a handoff prompt the owner already has, from an earlier
session, another agent, or written by hand, and runs step 5 against it with no
persistent review and no drafting.

1. Ask for the prompt if the owner has not pasted it, and ask which repository
   it is about if that is not obvious.
2. Hand it to `handoff-verifier` exactly as given. You have no sources to attach,
   so say so: every claim arrives with no source offered.
3. Fix what came back `Wrong`, label what came back `Unchecked`, add the goal if
   it came back `Missing`, and put the fixed first line at the top if the prompt
   arrived without it.
4. Show the same short list, then the corrected prompt in one block.

Nothing is saved to project knowledge in this mode, and nothing about the current session
goes into the prompt. It is a check on somebody else's text.

## When the owner asks in their own words

They will not always type the command. "I'm going to clear context", "this is
getting long, write me something to paste into a new chat", "hand this off to a
fresh session" all mean the same thing. Run the same steps.

The rule that raises this before a loaded session is
`offer-context-handoff.md`. The installed knowledge save skill owns the
persistent review. This command is the convenient path, not the only one.

## How to write the prompt itself

Follow the project's output style. Two things that matter here in particular:

- **Say the literal thing.** Do not describe the accuracy problem with a figure
  of speech about a message getting garbled as it passes along. Say that facts
  get less accurate each time work is handed on, or do not mention it at all.
- **Label, do not hedge.** An unconfirmed fact gets marked "not confirmed"
  beside it. Do not soften it into "possibly" or "it seems" and leave the next
  session to guess which parts are solid.

## Edge cases

| Situation | What to do |
|---|---|
| Nothing in the session is worth saving | One line saying so, then draft, check, and show the prompt. Do not invent a proposal |
| The owner declines every lasting-memory proposal | Carry declined lasting-memory candidates into the temporary handoff unless the owner asked not to retain them; write no lasting knowledge |
| The owner approves some proposals and cuts others | Let the installed save skill save only the approved meaning. Carry the cut ones into the prompt |
| The owner edits a proposal | Let the installed save skill write only the edited meaning |
| The project has no project knowledge system | Skip steps 2 and 3, say so in one line, put everything worth keeping in the prompt |
| The save or index rebuild cannot be finished | Report the failure plainly and carry that item into the prompt as well, so it survives either way. Do not pretend it was saved |
| The goal is written in no file, only in this chat | It goes in the prompt, labelled not confirmed. Do not stop to write it into the work item first |
| The goal's pointer names a file or ticket that does not exist | The goal stays, labelled not confirmed against any file. Say so in the short list |
| The prompt was built from an earlier handoff prompt | Every fact carried over is checked from scratch. Being in a previous handoff is not a source |
| The checker fails, errors, or is unavailable | One line saying so, write the prompt anyway, and say inside it that it was not checked |
| The prompt is written with no check, or the checker failed | The fixed first line still goes at the top. It is not tied to the check |
| Nothing in the prompt can be confirmed, because the project is new and nothing is written down | Label everything, write the prompt, and say so in one line |
| The prompt claims tests or a build passed | The checker never runs them. With no command output from this session behind it, the claim is labelled not confirmed |
| `/handoff` is run twice in a row | Do not re-propose what was already saved. Propose only what changed since the first run, then draft and check again from the current state |
| The session is short and produced nothing | Say so. Write a short prompt if the owner still wants one. Do not pad it |
| The work is unfinished | Normal. That is what a handoff is for. Unfinished state goes in the prompt and wherever the work item is being tracked, never in project knowledge |
| The owner wants only the prompt, no persistent review | Their call. Say once that nothing will be saved, then draft, check, and show the prompt with everything carried inside it |
| The owner wants the prompt with no check | Their call. Say once that nothing in it will have been verified, then write it |
| Another session is working in the same repository | Say which worktree and branch this session was in, so the next one does not assume it owns the checkout |

## What this is not

It is not a summary of the session. `/session-summary` answers a different
question: which of the owner's requests are where. This answers "how does
somebody else pick this up". If the owner wants both, run both; they do not
overlap.

It does not decide what is worth keeping. The installed `remember` skill owns
that policy, and the owner answers every proposal that requires approval.

The checker does not decide what belongs in the prompt either. It checks what is
there against what is in the repository, and it never removes a claim.
