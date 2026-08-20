---
name: remember
description: >-
  Decide where persistent information belongs, then save an approved memory
  record, specification change, or current-state update through the memory write
  coordinator. Use when the owner says remember, save, capture, record what we
  just did, or write this down; before a pull request opens; before a handoff or
  context reset; or at another settled completion point. Search the work tracker,
  rules, skills, specifications, memory, and references before proposing
  anything. Show short What, Where, Why, Assumptions, and Unverified bullets,
  wait for the owner, and write only what the owner approves.
---

# remember

This skill is the complete save workflow. It runs the memory system v2 save
pipeline end to end and it is the only workflow that reaches canonical project
knowledge.

The design authority behind it is the toolkit repository's
`knowledge/specs/memory-system.md`. That spec stays in the toolkit and is not
installed into projects. Work item P4-6 replaces the content of that file with
the approved v2 behavior at cutover. The path does not change, so keep citing
this path and read whatever it holds.

Three things are true of every save here, and none of them is negotiable:

1. **You never edit a canonical file.** `knowledge/memory/`, `knowledge/specs/`,
   and `knowledge/current.md` are written only by `memory.mjs`. A direct `Edit`,
   `Write`, or shell write into those paths is refused by a deterministic guard
   that names the operation you should have used.
2. **Every write is two calls.** A propose call writes a review file and changes
   nothing. An apply call writes, and only after the owner answers.
3. **Nothing saves itself.** No end-of-turn route, no end-of-session route, and
   no background process may propose or write a record. The owner asking is the
   only start.

## Step 0: know what this project's memory can do

Run this first, once per session, before you promise anything:

```text
node <plugin>/tools/memory.mjs capabilities
node <plugin>/tools/memory.mjs status
```

`capabilities` lists the operations this build carries, the approval mode, the
privacy boundary, and every degraded feature with its reason. `status` says what
memory holds right now and whether a recovery journal is waiting. If an
operation you need reports unavailable, say so plainly and do the reading part by
opening files directly. Never invent a command that `capabilities` did not list.

Every command below is `node <plugin>/tools/memory.mjs <operation>`. The
`<plugin>` path is wherever the second-brain plugin is installed for this
project.

## Step 1: search every current owner before you draft

Read, in this order:

1. the boot brief already loaded in this session, which carries the project
   identity, the current focus, and the pinned records;
2. `knowledge/current.md`, `knowledge/project.md`, and `knowledge/map.md`;
3. wherever the current work item is being tracked;
4. the relevant current rule, skill, specification, memory record, or reference;
   and
5. the project's always-loaded instructions.

Then search:

```text
node <plugin>/tools/memory.mjs search --query "<the meaning in plain words>"
node <plugin>/tools/memory.mjs spec-search --query "<same meaning>"
```

An open or closed work item may already own a ticket-specific decision. A
current file may already own a rule, procedure, behavior, fact, or source. Update
or link to that owner instead of creating a second copy.

Where the owner's machine has Obsidian tools installed (an Obsidian MCP server
or the `kepano/obsidian-skills` skills), use them to find, read, and search notes.
Reading and searching only. Every write goes through the coordinator, in the
fixed record shape, with ordinary relative Markdown links and `.md` extensions,
never Obsidian wikilinks, embeds, or extra properties.

Before choosing `domain` and `topics` values, read the project's existing
vocabulary rather than inventing one:

```text
node <plugin>/tools/memory.mjs status
```

Mention vocabulary to the owner only when your proposal adds, renames, or changes
the meaning of a term. Never show an unrelated wall of tags.

## Step 2: route the non-memory information out first

Most of what a session produces is not memory. Route it before you consider a
record:

- **Live work-item state** (goal, requirements, scope, progress, blockers,
  assignments, next step) stays wherever the work item is tracked. Never copy it
  into a record.
- **Standing agent behavior** goes in a rule or the output style.
- **A reusable agent process** goes in a skill.
- **Approved product or system behavior** goes in `knowledge/specs/`.
- **Outside source material** stays in the project's mapped reference area, which
  `knowledge/map.md` names. Only the approved conclusion drawn from it becomes a
  record, and that record links back to the source.
- **Raw conversation** stays in session history.
- **Current focus, blockers, next step, and handoff** go in
  `knowledge/current.md` through `update-current`, not into a record.

If the right home is a work item, a rule, or a skill, say so in one line and
follow the project's normal work process. Do not create a record as a temporary
substitute for a rule that has not been written yet.

Secrets, credentials, and personal information that this project's recorded
privacy boundary has not approved are refused. Do not stage them and do not paste
them into a proposal.

## Step 3: run the durable-information test

Ask all four:

1. **Will this still matter after the task or session?**
2. **Is it a stable fact, lasting event, decision, or state?** Difficulty,
   novelty, and conversation length do not count.
3. **Does an existing owner already hold it?** If yes, name that owner and either
   add evidence to it or link to it.
4. **Would leaving it out cause a repeated explanation or the same wrong
   action?**

Questions 1, 2, and 4 must be yes. Question 3 must end in a named existing home
or a clear reason a new record is needed. If the test fails, the answer is NOOP.

## Step 4: run the future-agent interpretation test

Ask all five of a draft record, before you show it to anyone:

1. Does it carry the minimum complete information needed to understand and use
   the meaning correctly?
2. Can it be understood without the conversation that produced it?
3. Are its scope, evidence, authority, and uncertainty plain?
4. Could a reasonable reader take a broader, narrower, or different meaning than
   the owner intends?
5. Does it carry background, speculation, implied conclusions, recommendations,
   or related information that is not needed?

If question 4 or 5 is yes, narrow the wording before review or make it a NOOP. A
statement does not qualify because it is true or because it is related.

## Step 5: choose NOOP or a record type

NOOP is the normal outcome. A call that would change no byte stores nothing:

```text
node <plugin>/tools/memory.mjs noop --reason "<one plain sentence>"
```

Otherwise pick one type. Each is one independently correctable or supersedable
meaning, one file, in the folder matching its type:

| Type | Holds | Extra requirement |
| --- | --- | --- |
| `fact` | A durable state of the world for this project | none beyond the core |
| `decision` | A choice and why it should not be reopened | body sections: context, decision, reason, rejected options, consequences |
| `event` | Something that happened, including completed work | an exact `occurred_at`, or an explicit range or uncertainty statement |
| `pattern` | A repeated shape drawn from other records | a non-empty `based_on` list naming those records |

Every record carries `id`, `type`, `status`, `epistemic_status`, `recorded_at`,
`approval`, at least one `evidence` entry, a descriptive H1, and one approved
summary sentence directly under the H1. The starting shapes are in the plugin's
`templates-v2/records/` folder. Copy one rather than writing front matter from
memory.

Clauses that need different evidence, different truth status, or different
effective dates are separate records. Context and rationale that cannot change
on their own may stay with the meaning.

## Step 6: fix provenance, entities, and scope

- **Evidence.** A write with no recoverable evidence is refused. Each entry names
  `source_type`, a `locator`, and when it was observed. A locator is a work-item
  reference, a commit, a file path, a test result, a report, or a native session
  reference. It is never a transcript copy.
- **A second source for unchanged meaning** is another evidence entry on the
  existing record, not a second record.
- **A conflicting meaning** stays its own record, with its own truth status and
  evidence, linked through `conflicts_with`. Never quietly overwrite one with the
  other.
- **An inference or pattern** names the records it rests on in `based_on`.
- **A negative statement** names the scope you actually searched.
- **A generated view is never primary evidence.**
- **Scope.** Everything you write belongs to this project root. A path that
  resolves outside it, or into another project's scope, is refused.

## Step 7: search duplicate meaning and the entity timeline

Before proposing, check the record does not already exist in another shape:

```text
node <plugin>/tools/memory.mjs search --query "<the meaning>"
node <plugin>/tools/memory.mjs timeline --entity "<entity>"
node <plugin>/tools/memory.mjs related --id <record-id>
```

Read what comes back. A near duplicate points at CONFIRM, MERGE, or an evidence
entry. A record that used to be true and is not any more points at SUPERSEDE. A
record that was wrong when written points at CORRECT.

## Step 8: choose the lifecycle operation

| Operation | Use it when |
| --- | --- |
| NOOP | Nothing durable. The default |
| ADD | A genuinely new durable meaning |
| CONFIRM | The meaning is unchanged and you have fresh evidence for it |
| CORRECT | The record was wrong when it was written |
| SUPERSEDE | The record was true and a successor replaces it |
| RETIRE | The record ends with no direct successor |
| MERGE | Two records carry the same meaning with compatible status and dates |
| DELETE | The record is accidental, corrupt, a surplus duplicate, or a privacy removal |

Retired and superseded records stay on disk for history and timeline questions.
Deleting is not how you end a record that was once true.

## Step 9: stage the file and run the propose call

Write the staged Markdown outside every canonical path. Use
`.memory/staged/<name>.md`, which is local, ignored by Git, and never canonical.

Then run one propose call. These are the exact commands:

```text
node <plugin>/tools/memory.mjs add --type fact|decision|event|pattern --file <staged.md> [--dest <path>] [--why "<text>"] --propose
node <plugin>/tools/memory.mjs confirm --id <record-id> --evidence <locator> [--source-type <name>] --propose
node <plugin>/tools/memory.mjs correct --id <record-id> --file <corrected.md> --reason "<text>" [--keep-pin] --propose
node <plugin>/tools/memory.mjs supersede --old-id <record-id> --file <successor.md> [--dest <path>] [--why "<text>"] --propose
node <plugin>/tools/memory.mjs retire --id <record-id> --reason "<text>" --phrase "<exact text>" [--phrase ...] [--exempt "<path>: <reason>"] --propose
node <plugin>/tools/memory.mjs merge --ids <id>,<id> --survivor <id> --pin keep|drop --propose
node <plugin>/tools/memory.mjs delete --id <record-id> --reason "<text>" [--privacy] --propose
node <plugin>/tools/memory.mjs pin --id <record-id> [--why "<text>"] --propose
node <plugin>/tools/memory.mjs unpin --id <record-id> [--why "<text>"] --propose
node <plugin>/tools/memory.mjs update-current --trigger handoff|focus-change|completed-work --file <staged.md> --propose
```

A propose call changes no canonical file. It returns `status`
`awaiting-approval`, a `proposal_id`, the destination, the record id, a
`content_hash`, the source hashes, the pin statement where there is one, the five
bullets, and the path of the review file under `.memory/review/`.

If the propose call is refused, read the reason code and fix the cause. Do not
retry the same call with a wider boundary and do not route around the refusal.

## Step 10: show the five bullets and wait

Show one group per separately routed meaning, and nothing else:

```text
1. <plain name>
   - What: <the exact meaning or operation>
   - Where: <the canonical destination>
   - Why: <the repeated explanation or wrong action this prevents>
   - Assumptions: <every assumption, or None>
   - Unverified: <every unchecked claim, or None>
```

Keep every path, number, date, and name the owner needs to decide. Offer the
owner four actions: keep, change, edit, or skip. Tell them the Edit action opens
the complete proposal at `.memory/review/<proposal-id>.md`, that they may change
that file directly, and that a plain confirmation afterwards approves the file as
it then stands. They never have to repeat their edits in chat.

**What is not approval:** silence, an unclear reply, a request to see the full
text, a helper agent, a hook, a provider, and any background process. There is no
force flag and no non-interactive approval mode. No reply means no write, and you
keep no hidden queue for later.

Do not show full file text, front matter, or a diff unless the owner asks.
Asking to see the text is not approval.

Approval covers the meaning in the five bullets. It does not permit extra claims,
sources, assumptions, reasoning, examples, or background. If drafting needs
anything new, cancel and show a revised proposal.

## Step 11: apply the approved transaction

On keep or a confirmed edit, run the same operation again with the proposal id
and the hash of the exact reviewed contents. Where the owner edited the review
file, compute the hash from the file as it now stands:

```text
node <plugin>/tools/memory.mjs <same operation> --apply --proposal <id> --content-hash <hash>
```

The coordinator rechecks the proposal hash, every cited source hash, the
destination, the record id, and the pin statement. If any of those moved since
the review, it refuses with `approval/stale-proposal` or `approval/source-changed`
and the review goes back to the owner. That is correct behavior, not an error to
work around.

On skip, remove the review file and write nothing:

```text
node <plugin>/tools/memory.mjs cancel --proposal <id>
```

## Step 12: report what actually changed

A successful apply returns `changed_paths`, the record id, any pin removed, the
artifacts rebuilt, the validation result, and the journal state. Report:

- every path written, moved, or removed;
- anything the owner skipped;
- any warning tied to the changed files.

One approved write is one reported operation even when it touched several files.

The transaction rebuilds any derived artifact this project has separately
approved and this change affects. A default project has none, so
`artifacts_rebuilt` comes back empty and that is correct. Run
`node <plugin>/tools/memory.mjs rebuild-views` only when the owner asks for a
regeneration on its own.

A failed transaction restores every preimage, reports `write/validation-failed`
or `write/link-repair-failed`, and returns `changed_paths: []`. Nothing changed.
Say that plainly. Never report a save that did not finish, and never open a pull
request as though persistent information was stored.

If a call reports `write/journal-present`, an earlier transaction stopped part
way. The next `memory.mjs` call recovers it and reports the recovery. Let it run
before you try the write again.

## Record what we just did

"Record what we just did" starts this same workflow. It is a request, not an
approval, and it skips nothing above.

**Split the work before you propose anything.** Separate the requested work into
the meanings it actually contains. Unclear scope, an unverified outcome, and work
holding more than one separately meaningful event each become their own proposed
meaning, and each one runs its own five-bullet review. The split falls on the
atomic record boundary: one independently correctable or supersedable meaning.

Each completed-work event is an `event` record and states all six of these:

1. **When the work happened.** `occurred_at` is required. If the exact time is
   unknown, write the explicit range or the uncertainty statement.
2. **The exact tool or system involved,** by its exact name.
3. **A plain description, written in the words a later search would use.**
4. **What was done.**
5. **The material result.**
6. **Links to the available evidence:** the work-tracker item, the commit, the
   changed files, the test result, the source report, or the native session
   reference.

Preserve the search wording and aliases that were part of the work, including a
tool's role or product family alongside its exact name. **An alias never replaces
the exact name.** Carry both.

**Never put these in the record:** a transcript, a raw command log, tool-by-tool
history, hidden reasoning, or routine activity. Link to the evidence instead.

**Nothing here happens on its own.** No end-of-turn route, no end-of-session
route, and no background process may propose or write a completed-work event. An
explicit owner request is the only way this starts. If a hook, an agent, or a
schedule asks for one, refuse and say why.

**When the approved event changes the current focus, the blockers, or the next
step, the same transaction updates `knowledge/current.md`,** and the owner sees
both in one review. Do not make a second call for it, and do not let the event
land while the current state goes stale.

## Update knowledge/current.md

`knowledge/current.md` has exactly four H2 sections, all required: **Current
focus**, **Blockers**, **Next step**, **Handoff**. It also carries an `updated`
date in front matter, which the coordinator stamps on every write. Startup
compares that date to the 72 hour window and warns when it is stale.

A staged file that drops any of the four sections is refused with
`record/schema-invalid`. Write all four every time, even when one is short.

There are exactly three triggers, and no other route writes this file:

```text
node <plugin>/tools/memory.mjs update-current --trigger handoff --file <staged.md> --propose
node <plugin>/tools/memory.mjs update-current --trigger focus-change --file <staged.md> --propose
node <plugin>/tools/memory.mjs update-current --trigger completed-work --file <staged.md> --propose
```

`handoff` is an explicit handoff. `focus-change` is an approved change of current
focus. `completed-work` belongs to an approved completed-work event, and that
event's own transaction performs the update.

Continuity content links to the live work item. It never restates the tracker's
live status, and the tracker never restates continuity content.

## Promote unreviewed research

A research or spike report lives in the project's mapped reference area, which
`knowledge/map.md` names. Storing it there is not a save and does not make it
project truth. The reference says whether it has been reviewed or verified, the
work item links to it, and it links back.

Promoting any conclusion out of that report into a fact, decision, event,
pattern, specification, rule, or skill runs this whole workflow, with no
shortcut. Until the owner approves it:

- the report stays labeled unreviewed;
- it never appears as an approved decision, a memory record, or a specification;
  and
- later work links to the reference package rather than copying its contents.

Never mix unchecked research into an approved decision. When the report and a
conclusion drawn from it both pass the durable-information test, propose them as
separate items with separate approval.

## When this runs

- the owner asks to remember, save, capture, or record something;
- the owner asks to record what we just did;
- a pull request is about to open;
- a session is about to hand off or clear context; or
- another settled completion point has a persistent result.

Do not run it after every message, commit, or small fix. One review may cover
several nearby completion moments when the result has not changed. When nothing
qualifies, say so in one line and continue.

Information that would be lost if the session ended is proposed when it appears,
not held back for a tidier moment. If approval does not arrive, nothing is
written and you keep no queue of things to save later.

## Edge cases

- **Nothing passes the tests:** say so in one line, run `noop --reason`, and
  write nothing.
- **An existing record already owns it:** name that record and either add an
  evidence entry or link to it. Do not copy it.
- **The home is unclear:** show the candidate routes with their assumptions. Do
  not guess.
- **One request carries several kinds of information:** split it into separate
  five-bullet groups with separate approval choices.
- **A closed or external work item owns the decision:** link to it. Being closed
  or outside the repository is not a reason to create a record.
- **The owner asks for full text:** show it, then wait for approval.
- **Two current records conflict:** show the exact conflict, keep both, link them
  through `conflicts_with`, and change neither meaning.
- **Saved memory conflicts with code or observed behavior:** show both, and
  propose CORRECT or SUPERSEDE with evidence.
- **A claim is still unchecked:** keep its `epistemic_status` honest, at
  `inferred`, `suspected`, or `unknown`, until the owner confirms it.
- **A pin is involved:** SUPERSEDE, RETIRE, and DELETE drop the old pin in their
  own transaction. CORRECT drops it unless the owner re-approves the corrected
  wording with `--keep-pin`. MERGE requires an explicit `--pin keep|drop`. A
  successor is never pinned automatically.
- **The guard refuses a write:** you used the wrong route. Read the operation it
  names and use that. Never work around it.
- **A migrated record is missing v2 metadata:** that is a `record/legacy-gap`
  warning, never a failure. The next approved touch upgrades it, and the missing
  fields appear in that review.
