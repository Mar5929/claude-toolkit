# Field report: the second-brain memory librarian, four invocations in one session

Written 2026-08-04 for the `claude-toolkit` repository (`Mar5929/claude-toolkit`),
about the `second-brain` plugin's `memory-librarian` agent. DragonFly is that
plugin's pilot project, so this is what one heavy real session looked like.

This is an account of what happened, not a proposal. Where something went wrong
because of what the calling agent did rather than what the system does, it says
so.

## What the session was doing

Work item WI-003 phase 6 on the DragonFly Salesforce org merge. Ten subagents
compared two Salesforce orgs and wrote twelve documents, 7,601 lines. Along the
way the session made durable memory changes, which under
`.claude/rules/second-brain.md` must be written by the memory librarian rather
than by the main agent.

Four librarian invocations in about ninety minutes, all in the same git worktree.

## The four invocations

| # | Name | Job | Outcome |
| --- | --- | --- | --- |
| 1 | `memory-index-widen` | Widen two index lines because a memory folder had gained a third document | 3 files changed, all correct |
| 2 | `memory-phase6` | Write two new durable documents, one knowledge and one domain | Both written well, one factual error introduced, duplication introduced |
| 3 | `memory-premerge-review` | The read-only pre-merge duplicate and conflict review the rule requires | Long report, accurate, found the error from invocation 2 |
| 4 | `memory-basis-fix` | Correct one `Basis:` line | Running at the time of writing |

## What worked

**Placement was correct every time.** Every new document landed in the right
typed folder. Every nearest `README.md` index gained a one-sentence entry. The
`memory/domain/` area's index was created in the same change as that area's first
document, which the rule requires. Both new documents carried the mandatory
`Basis:` line. None of that needed a second pass.

**Links resolved.** Invocation 3 checked every relative link in the two new
documents plus eight surrounding index and memory files plus all twelve documents
in the comparison folder. It found no broken path. The calling agent did not
re-verify all of these, but did verify four of the report's other specific claims
directly against the files, and all four held exactly as reported.

**The structural-change boundary held.** Invocation 3 found four repairs that
would change the meaning of a durable document. It performed none of them. It
reported both paths, the exact truth in conflict, and its recommendation, and
marked each as needing the owner's visible approval. That is the rule working as
designed, and it is the single most valuable thing observed in the session.

**The review found real defects, not manufactured ones.** Three examples. A
sentence in a phase 4 document reading "found sharing rule components only for
these 47" that was demonstrably wrong when written, and was the reason six real
sharing rules stayed invisible. A work-item spec whose answered question said
"Red has 25, Blue has 21, Green has 4" as settled, while three still-open
questions thirty-five lines below said two of those three numbers were not
settled. A claim in a memory document that a second graphing tool would be
unnecessary, sitting against another session's branch that had just measured the
existing tool never opening 51 percent of the files.

## What went wrong

### 1. The librarian has no way to report back to the caller

The agent runs in the background. Its final text is not delivered to the session
that invoked it. For a write job that is survivable, because the caller can read
`git diff`. For invocation 3, whose entire product **is** a report, the caller
invoked a review and received nothing at all. The only signal was an idle
notification. The report had to be requested afterwards with an explicit
`SendMessage`, and only then arrived.

If the pre-merge review is going to stay in the rule as a required step, its
output has to reach the caller without the caller knowing to ask for it.

### 2. Going idle is not the same as having finished

This one caused a real, visible defect.

- `memory-phase6` was asked to write two documents. It went idle at 15:13:24.
- The caller sent it a follow-up message with more content to fold in.
- The caller committed the files at roughly 15:19 and pushed.
- `memory-phase6` edited one of those files again at 15:18 and went idle a second
  time at 15:19:04.
- Invocation 3 started, and found an uncommitted change in the working tree that
  it had not made and could not attribute.

The calling agent committed too early, and that part is the calling agent's
fault. But the only completion signal available is "agent is idle", the same
agent went idle twice for one job because it was sent a follow-up, and nothing
distinguishes "finished the thing you last asked" from "idle between messages".
A per-request completion signal, or a report that says "I have finished request
N", would have prevented it.

### 3. Nothing checks the librarian's facts before they land in memory

Invocation 2 wrote, into a durable knowledge document, "Nine months after the
manifest was written, read-only calls were run against Blue". The real gap was
four days. The manifests were generated on 2026-07-31 and the calls ran on
2026-08-04. Nine months is the gap since the sharing rules themselves were
created, on 2024-03-04, and the two got crossed.

That sentence was committed. It was caught only because a separate review
happened to read the same document later in the same session. On a project where
the pre-merge review runs on a different day, or where the document is not
touched again, it would have become project truth.

The librarian was given both dates explicitly in its task prompt. It still
combined the wrong pair. Nothing between "librarian writes" and "text is in
memory" looks at whether the arithmetic is right.

### 4. Duplication was created at write time and caught only at review time

The rule's `Repetition` section bans a second copy of content that can drift, and
requires a pointer instead. Invocation 2 wrote two documents that between them
reproduced, in full, content already owned by `org-knowledge/comparison/`: six
component names, an exact creation timestamp, a field-by-field table, and two
read-by field lists. Invocation 3 found it and counted four current documents
holding the same 2026-08-04 findings.

Both invocations were the same agent type with the same rule loaded. The write
step had every fact in front of it and did not ask whether any of it already had
a home. The review step, reading the same rule, found it in one pass. The check
is cheap and it is only wired into the second half.

Worth noting the caller's contribution: the task prompt for invocation 2 supplied
the tables and the numbers to write. So the librarian was following instructions.
That points at a real question below.

### 5. Two librarians alive in one worktree at once, and the rule says nothing about it

At one point `memory-phase6` and `memory-premerge-review` were both live in the
same worktree, and the second one was told it was read-only. It then found a
modified file. Its report spent several hundred words establishing that it had
not made the change, using file modification times, which was correct but is
work no agent should have to do.

`.claude/rules/second-brain.md` says the librarian writes only in the session's
own worktree. It says nothing about more than one librarian in that worktree at
the same time, and nothing about a read-only invocation running while a write
invocation is still going. The pre-merge review's whole value rests on being able
to say what is in the tree and why, and that guarantee does not currently exist.

### 6. What the librarian is for is not settled

For invocation 2 the calling agent supplied the exact content: the tables, the
numbers, the `Basis:` value, the files to cite, even which existing document to
link to and in which direction. The librarian supplied the placement, the index
entries, the link mechanics and the prose.

That may be the intended division, and there is an argument for it: the main
agent holds the truth, the librarian holds the schema. If so, the plugin's
documentation should say it plainly, because the current framing ("Organize and
write owner-approved specifications and durable project memory") reads as though
the librarian decides what the document says.

If it is not the intended division, then the librarian needs to be given the
source material and asked to work out what is durable, which is a different and
much harder job, and would have made mistakes 3 and 4 more likely rather than
less.

Two data points either way. The librarian did add real value beyond formatting:
it found and used a control case nobody gave it (one org's sharing rule counts
matching between manifest and snapshot, which is what makes the other org's
mismatch readable as a retrieve gap rather than an org fact). And it also
introduced the one factual error in the session.

### 7. The review is expensive and runs often

Invocation 3 read at least twenty files in full, plus twelve comparison documents,
plus two branches' diffs. On this project most pull requests contain a memory
change, so the rule as written puts that cost on most pull requests. It earned it
this time. Whether it earns it on a pull request that adds one index line is a
different question, and the rule currently does not distinguish them.

## Suggestions, offered as starting points rather than answers

1. **Give the librarian a delivery path for its report.** At minimum for the
   pre-merge review, whose product is the report itself. The caller should not
   have to know to ask.
2. **Add a completion signal per request**, so a caller can tell "done with what
   you asked" from "idle". The commit-too-early defect in this session came
   straight out of not having one.
3. **Add a fact check to the write step**, or state plainly that the caller owns
   correctness. Right now neither is true and a wrong number reached a commit.
4. **Move the duplicate check earlier.** Before writing a document, search for
   the facts it is about to state. The review already does exactly this and
   proved it works in one pass.
5. **Say what happens when two librarians are live in one worktree**, or forbid
   it. A read-only review that cannot account for the working tree is weaker than
   it looks.
6. **Write down the division of labour** between main agent and librarian, in the
   plugin's own documentation, in one sentence.
7. **Consider scaling the pre-merge review to the size of the change.** A full
   review for a new durable document, something lighter for an index line.

## Where the evidence is

Everything above is in the DragonFly repository, on branch
`worktree-wi003-phase6-comparison`, pull request 33 on `Mar5929/DragonFly`.

| What | Where |
| --- | --- |
| The two documents invocation 2 wrote | `memory/knowledge/salesforce-metadata-retrieve/the-discovery-manifest-records-what-the-org-reported.md`, `memory/domain/average-daily-census.md` |
| The "nine months" error and its correction | commits `6b18eb4` then `19c1d29` |
| The package-count inconsistency the review found, and its fix | commit `ac31e4a` |
| The rule all four invocations were working under | `.claude/rules/second-brain.md` |
| The agent definition | `.claude/agents/memory-librarian.md` |
