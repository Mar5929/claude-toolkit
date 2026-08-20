# Memory v2: architecture rework draft

**This is a draft for discussion. It is not approved and nothing should be built
from it yet.** It puts the overengineering audit's verdict into a shape you can
argue with. The existing technical architecture document is not marked
superseded here. That call is yours when you come back to this.

Date: 2026-08-20. Written after `overengineering-audit.md`.

## The idea in one paragraph

The old plan turned every behavior in the requirements into a component, and
every component into a callable. That is how we got 17 components, 24 tool
names, and a hand-rolled search engine. The new plan keeps only the parts that a
model cannot be trusted to do, and hands everything else back to the agent as
written instructions. Five small scripts, about 1,500 to 2,000 lines of runtime
code. Everything else is skill text.

The test for whether something is a script: **if a model skipping this step
would break a promise you made, it is a script. If a model doing this step badly
just gives a worse answer, it is instructions.**

## What stays

The storage is unchanged. Nothing about the shape of your knowledge folder
moves.

- Markdown files in `knowledge/` are the only source of truth.
- Four record types and no others: facts, decisions, events, patterns.
- Specs in `knowledge/specs/`.
- `knowledge/current.md` for where the project stands.
- `knowledge/map.md` for where things live.
- The five approval bullets: What, Where, Why, Assumptions, Unverified.
- Owner-only writes. No hook, helper agent, or background process writes truth.
- A startup brief that runs every session and fits a byte budget.
- Honest retrieval. "I could not find it" beats a plausible invention.
- The privacy boundary and the project scope boundary.
- Migration from v1, until it is done.

Every behavior the requirements promise you still happens. What changes is
whether a script or an instruction makes it happen.

## What goes

These were built or specced. They come out.

| Removed | Why |
|---|---|
| Retrieval router (802 lines) | The agent has Read, Grep, and Glob. Our version is a worse Grep with extra steps. |
| Gold set runner (1,378 lines) | It measured the search engine we are deleting. |
| Review engine (655 lines) | Deciding what looks like a duplicate is judgment. Judgment is a checklist. |
| Health tool (950 lines) | It repeated the validator. Its two useful checks move into the validator. |
| 24-name tool surface and CLI dispatch (1,093 lines) | Plumbing that existed only because we decided to have a CLI. |
| Lifecycle engine, 8 named operations (975 lines) | A checklist plus one writer does the same thing. |
| Tracker adapter (247 lines) | Optional, unused, and an agent can read a board itself. |
| View generator and index builder (290 lines) | Default v2 has nothing derived to generate. |
| Move, rename, and link repair (610 lines) | Grep and edit. |
| Session search as its own subsystem (871 lines) | A grep over transcripts with a gate on it. |

Roughly 8,000 lines of runtime code stop existing. Tests drop by about half with
them.

## The five pieces

### 1. Write guard hook, about 400 lines

**What it does.** It sits in front of every write to `knowledge/memory/`,
`knowledge/specs/`, and `knowledge/current.md`. Any write that did not come
through the approved path is refused. The refusal is reported to you, not
swallowed.

**Why it must be a script.** This is the promise that an agent told to skip the
approval review still cannot change your project knowledge. An instruction
cannot enforce that, because the agent breaking the rule is exactly the case we
are guarding against. There is no model in this path at all. It runs, it says
yes or no, that is the whole job.

### 2. Boot brief, about 250 lines

**What it does.** Before a model loads, it reads `knowledge/current.md`, the
pinned records, the map, and the dated summaries of recent records. It renders
one brief inside a byte budget. Same inputs, same brief, every time. It writes
nothing.

**Why it must be a script.** It runs before any model exists in the session, so
there is nobody to give instructions to. It also has to fit a hard byte budget
and degrade by pointer and count rather than blocking the session. That is
arithmetic, and arithmetic belongs in code.

### 3. Safe writer, about 350 lines

**What it does.** One path that writes a canonical file. It takes an approved
proposal, checks the hash of what you approved against what it is about to
write, journals the change, writes it, and reports one result. Add, correct,
supersede, retire, merge, delete, pin, unpin, and update current state all go
through this one door with a different payload.

**Why it must be a script.** Two reasons. Hash binding is what stops the gap
between what you said yes to and what actually lands on disk. And a crash
halfway through a write leaves a broken file unless a journal is holding the
before state. Neither is something a model can promise.

### 4. Validator, about 500 lines

**What it does.** Three checks and no more. Schema: does every record have the
fields its type requires. Links: does every link point at something that exists.
Scope and privacy: does every path stay inside the resolved project root, and
does the privacy setting read correctly and fail closed when it is missing. It
runs in CI and on demand. It changes nothing.

**Why it must be a script.** Cheap, repeatable, and the same answer every time.
The scope check in particular has to be exact, because a symbolic link pointing
out of the project is not something you catch by reading carefully. The old plan
had 22 checks. That was a wish list from the requirements, not a set of things
that were failing.

### 5. Migration engine, about 1,500 lines, then deleted

**What it does.** It converts a v1 project to the v2 layout. Dry run first,
byte-exact, stops on anything ambiguous, reversible until the new layout passes
its checks.

**Why it must be a script.** Moving files without losing text or links is
exactly the work a model does inconsistently and a script does identically every
time. It is also the one piece with a planned end. Once your v1 projects are
converted it has no reason to exist, and we delete it rather than carry it.

## What skills do instead

Each of these is instruction text in a skill file. The agent reads it and uses
its own Read, Grep, and Glob.

| Skill | Replaces | What the text says |
|---|---|---|
| `recall` | Retrieval router, gold set runner | Route by question type: specs for expected behavior, decisions for why, events for what happened, tracker for live work, transcripts only when the owner asks or project sources came up empty. Start narrow with the exact file, widen to Grep, widen again to related history. Current specs and primary sources outrank unchecked memories. If nothing comes back, say nothing came back and name what you searched. Never fill an empty result with recent unrelated content. |
| `remember` | Propose and review file, parts of the lifecycle engine | Apply the persistent-information test and the future-agent test first. Search existing rules, skills, specs, memories, and references before choosing a home. One meaning, one home. Show the five bullets. Wait for keep, change, edit, or skip. Silence is not approval. Then call the writer. |
| `cleanup` | Review engine, lifecycle engine | Grep for duplicate candidates, conflicting meanings, stale review dates, broken links, supersession gaps, and retired phrases still sitting in files. Produce a worklist and change nothing. Every fix on that worklist goes back through `remember` and the writer. Age alone never retires anything. |
| `session-search` | Session search subsystem | Grep the host's own transcript folder, read-only, in its original location. Run only when the owner asks or current sources failed. In a sensitive project, only when the owner asks in that session. A miss names the machine, project, and date range searched. It never becomes "this was never discussed." |
| Routing text in `remember` | Tracker adapter, move and rename | Read the board yourself. Repair links with Grep and Edit, then run the validator. |

The instructions are longer than they used to be. That is the trade. Words in a
skill file are cheap to change and cost nothing to maintain. Code is neither.

## What we give up, on purpose

This is the part to disagree with if you are going to disagree.

**1. Consistent ranking.** Two agents asked the same question may read the files
in a different order and lead with a different record. Both answers are drawn
from the same true files, so neither is wrong, but they are not identical.

*Why that is fine here.* One person reads the output, and that person can tell
when an answer is off and ask again. Identical behavior across many agents
matters when nobody is reading the diff. You read the diff.

**2. Measured retrieval quality.** With no gold set, there is no number saying
search got better or worse after a change. We would be going on whether it feels
right.

*Why that is fine here.* The number was measuring a search engine we are
deleting. Grep does not regress. There is also a knock-on: requirement FR-037
says an optional retrieval method may only be turned on after it improves
measured retrieval. With no measurement, the honest version of that rule is that
v2 turns on no optional retrieval methods at all. That is Q4 below.

**3. Machine-checked review worklists.** The duplicate and conflict scan becomes
an agent following a checklist. It will miss things a script would have caught,
and it will flag things a script would not have.

*Why that is fine here.* A worklist is a suggestion either way. Nothing on it
changes a file without your approval, so a miss costs you a later cleanup pass,
not a bad write.

**4. Scripted lifecycle operations.** Supersede, merge, and retire become a
checklist plus the writer instead of eight named operations with their own code.
The steps could be done out of order.

*Why that is fine here.* The writer still refuses a write that fails its hash
check, and the validator still catches a broken link or a record missing a
field. The guardrails are where they were. Only the choreography moved.

**These four are the recorded cost of this design, not an oversight.** If this
draft becomes the plan, that paragraph should become a decision record so nobody
rediscovers the tradeoff in six months and treats it as a bug.

## Open questions for you

**Q1. Does the validator keep the two-project scope fixture?** Requirement
FR-131 says validation must prove with a fixture of two projects sharing record
ids that nothing crosses a scope boundary. That is a real test but it is also
setup code. My recommendation: keep it, because scope leakage is the one failure
you would never notice by reading.

**Q2. Should session-search stay a skill instruction, or keep a thin gate
script?** The gate says do not search transcripts unless the owner asked or
project sources failed. As instruction text, an agent can skip it. My
recommendation: instruction text for normal projects, and revisit if you ever
mark a project sensitive, since that is where the gate actually protects
something.

**Q3. What does the agent call now that the 24 tool names are gone?** Options: a
single `memory.mjs write <proposal-file>` with the operation named inside the
file, or four or five small commands. My recommendation: one command, because
one command means one write path, which is the thing the guard is protecting.

**Q4. Do we cut FR-037, or restate it?** It requires measured proof before
enabling an optional retrieval method, and we are deleting the measurement. My
recommendation: restate it as "v2 enables no optional retrieval methods," which
is true, honest, and needs no gold set.

**Q5. Do the 131 functional requirements get trimmed too?** The audit says the
spec is where the bloat started. Leaving 131 requirements standing while
building five scripts guarantees a future session reads the requirements and
rebuilds the components. My recommendation: yes, trim, in a separate pass after
you approve this shape.

**Q6. When does the migration engine get deleted?** It needs a trigger, or it
becomes permanent by default. My recommendation: delete it in the same pull
request that converts your last v1 project, and name that project now so the
trigger is concrete.

**Q7. Does the pin still need its own manager?** Pin state has to be checked
against the record's hash so a pinned summary cannot drift from the record. That
check is real. The 339 lines around it are not. My recommendation: fold the hash
check into the writer and the budget warning into the boot brief, and have no
pin manager.

## Migration note: we do not rewrite from scratch

The built code is in git history. Nothing needs to be typed again.

The four pieces we are keeping already exist in working form. The write guard,
the apply transaction with its hash binding and journal, the boot brief, and the
migration engine were all built and are recoverable from history. The work is
lifting them out, trimming them to the sizes above, and dropping the CLI and
dispatch layer that wrapped them.

Same for the validator. The 22 checks exist. Three of them stay. That is
deleting, not writing.

A parallel session is reverting the build right now. That revert removes the
code from the working tree, not from history, so this plan does not lose
anything. Any piece of it can be pulled back with `git show` against the commit
before the revert.

The realistic shape of the work: mostly deletion, one trimming pass over four
existing scripts, and writing four skill files. That is much smaller than the
original build, and most of it is throwing things away.

## Next step

Read this, mark up the seven questions, and say which parts of the tradeoff
section you do not accept. Once those are settled, the requirements trim in Q5
is the first real piece of work, because everything else is built from it.
