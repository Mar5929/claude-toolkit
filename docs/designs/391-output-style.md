# Output style content and delivery

Build plan for [#391](https://github.com/Mar5929/claude-toolkit/issues/391).
The issue owns requirements, approval, current tasks, and acceptance. Mike
authorized this focused implementation with GPT-5.6 Sol agents on 2026-09-22
in Codex task `01a0cb21-9aa3-7c90-b674-b58bfb1757c2`. Merge and acceptance
remain separate.

## Approach

Use the clear, natural replies Mike selected from that conversation as the
communication reference. Replace the existing Plain English wording with one
short, coherent account: answer the question, use ordinary words and connected
sentences, explain enough to avoid guessing, use lists when useful, and stop
when the answer is complete. Preserve the issue's approved constraints and
precise status reporting. Do not impose a word limit or fixed reply template.

Keep the silent per-message style read. Correct its wording and change its
mechanism only if inspection or a test demonstrates a defect. Do not add a
reply classifier, small-model judge, or new read-tracking state. The
[owner's design principle](../../knowledge/prds/toolkit-operating-system/toolkit-operating-system.md#design-principle-guide-the-agent-through-handshakes)
governs this work.

[#396](https://github.com/Mar5929/claude-toolkit/issues/396) owns the broader
instruction restructuring. T11 now owns the non-style proposal preserved in
closed [PR #398](https://github.com/Mar5929/claude-toolkit/pull/398);
[PR #399](https://github.com/Mar5929/claude-toolkit/pull/399) shipped the focused
style work. Do not merge the superseded PR wholesale.
Review [PR #349](https://github.com/Mar5929/claude-toolkit/pull/349)'s intended
wording in the new style; do not restore its obsolete surrounding style.

## Files and responsibilities

- Content agent: the shipped `plain-english.md`, identical installed copy,
  and output-styles README. Correct delivery documentation against the official
  Claude Code output-styles page. Correct the artifact rule's attribution of
  wording that no longer appears in the style, keeping its artifact requirements.
- Delivery agent: `style-handshake.mjs`, its installed copy, hook tests and
  hooks-library README. Preserve existing selection and silence behavior.
- Behavior agent: isolated temporary Claude fixtures and retained trial inputs,
  outputs, settings and Read events. No real project settings are changed.
- Coordinator: releases, affected explanations, tracker continuity, independent
  review and one focused pull request. Leave Terse and general startup,
  knowledge and rule rewrites outside this implementation.

## Validation

Compare current and candidate styles using the same questions and Claude model.
Use native style selection, inspect the actual style Read events, and retain
the exact outputs. Include a bounded multi-turn continuation. Evaluate clarity,
relevance, literal wording, understandable decisions and accurate status.
Word counts are observations, not pass/fail thresholds.

Run the style-hook tests, four repository checks and plugin validation.
Review the actual final diff independently with a GPT-5.6 Sol agent. Separate
script results, observed Claude behavior, deployment and Mike's acceptance.
A short test cannot prove long-session reliability or guarantee every reply.

## Prior pull requests

Keep [#392](https://github.com/Mar5929/claude-toolkit/pull/392) merged. The new
implementation revises its result without reverting unrelated work.

[#349](https://github.com/Mar5929/claude-toolkit/pull/349), head
`8afa546c2ceed14413eccb5672bb5732592653c6`, adds rhetorical-pattern guidance
to an obsolete version of the style. The replacement preserves its useful
meaning: state the point directly, avoid deny-then-correct framing and rhythmic
word pairs, and allow plain factual corrections. PR #349 was closed as
superseded after #399 merged; its old style was not merged.

[#398](https://github.com/Mar5929/claude-toolkit/pull/398), head
`665d9eded865cc57f4e0fd9f9e651566be5f18ee`, supplies the clearer style-hook
wording and descriptive-header requirement. The focused replacement includes
both. PR #398 was closed as superseded after #399 merged. Its remaining
proposal is retained at that head: `memory-reminder`, `knowledge-completion`,
`toolkit-session-start`, installed copies and associated knowledge tests.
#396 T11 explicitly owns reconciling those changes in the broader rewrite.
Resolve the knowledge manual's acknowledgment conflict and the completion
command's behavior from nested working directories before adopting them.
Old release metadata is superseded; use current versions when implementing.
This accounted disposition preserves the proposal without claiming it shipped.

## Validation record

Draft [PR #399](https://github.com/Mar5929/claude-toolkit/pull/399), implementation
head `37d9458` was the earlier unapproved candidate. The shipping revision and
Mike's later authorization are recorded below. GPT-5.6 Sol agents implemented and
reviewed the source. Four repository checks, 76 style-hook assertions, 12
toolkit-startup tests, plugin validation, and whitespace checks passed.
The source review corrected concise-by-default wording, status-first bullets,
identifying words, artifact-rule attribution, and the `/output-style` minimum
version. Both operating manuals were reviewed; their style and silent-read
explanations still apply. The broader acknowledgment conflict remains with #396.

### Earlier failed Claude comparison, 2026-09-22

**Result: style adherence has not passed.** The candidate often added detail
and closing offers despite reading the style. In the two-turn candidate test,
both reminders fired but the second whole-file Read did not occur. This is a
correction to the earlier claim that a Read was confirmed on every turn.

The first attempt failed authentication before model execution. Mike restored
sign-in, and the trials below then completed on Claude Code 2.1.271. Requested
model/effort: `opus` / `low`; runtime model: `claude-opus-5`. Native startup
reported `Plain English`. Separate temporary Git fixtures used exact style and
hook copies, project settings only, Read as the only available tool, no plugins
or MCP servers, no session persistence, a 90-second timeout, and a $0.30 per-run
budget limit. The two-turn comparison sent its second message only after the
first result. An earlier attempt queued both messages together and produced
one answer; it is excluded from the comparison.

Style snapshots (SHA-256):

- Baseline, 480 words: `11b64fa5aba1e776a8c07378a1140a879947531bcb91e0633a7b8b6b1b501482`.
- Candidate v1, 431 words: `9114729f603d81799639123016ac6c0b35673d9d616a151b44e254514a299369`.
- Candidate v2, final 443 words: `3b06be887c2e632d82e8b3cdfd0caf25f3cc6b983d00ce550920b8d43033b87a`.

The final refinement added "Answer only what the user asked" and limited
explanation to understanding the answer, with more detail when asked.
Baseline hook SHA-256: `f5e4bd8e606ea1890e8e119883eaf0a24c7d0ab089aca28d992211c2171c4707`.
Candidate hook SHA-256: `f2315d25885ed59a437921a7f2b22bf95d87fef4a3e0924543a7e0504829497c`.

| Question | Baseline reply words | Candidate v1 words | Final v2 words |
| --- | ---: | ---: | ---: |
| 1: explain hooks | 165 | 269 | 349 |
| 2: current status and next action | 62 | 118 | 98 |
| 3: merged but untested | 27 | 73 | Not rerun |
| 4: choose evidence format | 140 | 277 | Not rerun |
| Two-turn explanation | 127 | 313 | Not rerun |
| Two-turn follow-up | 48 | 124 | Not rerun |

Counts use whitespace-separated words in the full assistant text. They are
observations, not acceptance limits. Each single-turn run showed one complete
style Read before its reply. Baseline continuation showed two hook events and
two Reads; candidate v1 continuation showed two hook events and only one Read.
The final v2 was checked only on questions 1 and 2, each with a confirmed Read.
These runs do not establish final-v2 multi-turn adherence or long-chat behavior.

Independent GPT-5.6 Sol behavior review found the candidate more structured in
some places and less figurative, but consistently more elaborate. The status
answers added general offers, the untested-hook answer added unsolicited
runtime explanation, and the evidence-choice answer added extra decisions.
The technical explanations made unsupported claims about instruction strength,
trimming, and hook behavior. They are wording observations, not evidence about
Claude Code internals. The baseline also had style and factual weaknesses.
Both status variants proposed merging without establishing authorization; those
trial replies grant no permission to merge the actual PR.

The final v2 retest retained the main failures: a long explanation and a status
reply ending with an offer to check the PR. Successful style selection, a
successful hook event, a Read, source checks, and source review each establish
only their own result. None proves that replies follow the style.

The saved runs reported a combined usage-cost estimate of about $0.48, calculated
from each run's final cumulative `total_cost_usd`, including the excluded
transport attempt. This is CLI-reported usage, not a claim about an additional
subscription charge. Raw event/debug streams remain temporary and are not
published; the exact prompts and sanitized answer text below retain the useful
evidence without session IDs or authentication details.

### Exact prompts used

1. `Do function hooks work by having a small model judge the agent's work? Explain how they operate.`
2. `Issue #391 has approved requirements. The candidate style and hook wording are implemented in draft pull request #399. Behavior comparison and independent review are still in progress. The pull request is not merged. So what is next?`
3. `The new hook has been built and merged, but it has not been tested in a fresh Claude Code chat. Is it done? What is its status?`
4. `For issue #391's behavior-test evidence, we can either commit the full raw Claude event streams, including usage and session metadata, or commit a short redacted observation table and keep the raw streams out of Git. What am I deciding, and which option do you recommend?`

Bounded multi-turn conversation:

1. `A UserPromptSubmit command hook runs before Claude processes each user message. It receives event JSON on stdin. On exit 0, stdout or additionalContext is added to Claude context without a visible chat message. This project hook reads outputStyle, locates its custom style file, and asks Claude to read the whole file silently with the Read tool before answering. Claude Code also sends the selected output style with every request. Explain why the project uses both forms of delivery.`
2. `What should I remember from that?`

These prompts do not request a response style or set a word limit.

The originally drafted prompt 2 said the pull request had not been opened. It was not used. The run used the current-state wording above after pull request #399 opened.

### Actual replies, retained as observations

These are experimental model outputs, including incorrect technical claims and
style violations. They are not project instructions or verified documentation.

<details>
<summary>Show the baseline, candidate, and final-candidate replies</summary>

> ## Baseline prompt 1
>
> No. Hooks are plain scripts or commands you configure, not a model judging anything.
>
> How they work:
>
> - You list them in settings, tied to an event: before a tool runs, after a tool runs, when you send a message, when the agent finishes.
> - When that event happens, Claude Code runs your command and passes it details about the event as JSON.
> - The command's exit code and output decide what happens next: allow the action, block it, or add text into the conversation as extra context.
>
> Two examples from this setup:
>
> - The style hook here fires when you send a message and adds a line telling the agent to read your writing style file.
> - A "before tool runs" hook can block an edit to a protected file, and the agent sees the block as feedback.
>
> The judging is whatever logic you put in the script. It could call a model if you wrote it that way, but nothing does by default.
>
> ## Candidate 9114729f prompt 1
>
> No. Hooks in Claude Code are plain shell commands you configure yourself. No model is involved in running them.
>
> How they work:
>
> - You register a command in your settings under a hook event, such as `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, or `SessionStart`.
> - When that event happens, Claude Code runs your command as a normal subprocess and passes it a JSON object on standard input describing the event, including the tool name and its inputs.
> - Your command decides what to do and communicates back through its exit code and its output. Exit code 0 means allow. Exit code 2 means block, and the text your command prints on standard error is fed back to the agent as the reason. You can also print structured JSON to control the outcome more precisely, or to add extra context to the conversation.
>
> So the judgment lives entirely in code you write. A typical hook is something like a script that runs a formatter after every file edit, rejects writes to a protected path by matching the file path against a pattern, or runs your test suite when the agent tries to finish.
>
> A hook can call a model if you write one that does, for example by having your script invoke an API and decide based on the answer. That is your choice, not part of the mechanism.
>
> One practical note: hooks execute with your full user permissions at the moment the event fires, and Claude Code captures the configuration at session start, so edits to your hook settings during a session do not take effect until you restart or reload.
>
> ## Baseline prompt 2
>
> Next is to wait for the two checks in flight, then merge.
>
> - Behavior comparison (does the new style change how the agent replies): in progress.
> - Independent review of PR #399: in progress.
> - PR #399: still a draft, not merged. Once both checks come back clean, mark it ready and merge it.
>
> Work is stopped until the two checks finish.
>
> ## Candidate 9114729f prompt 2
>
> Next is to wait for the two checks that are still running, then merge.
>
> Current state:
>
> - Approved: requirements in issue #391
> - Written: the candidate style and hook wording, in draft pull request #399
> - In progress: behavior comparison and independent review
> - Not merged: pull request #399
>
> Once the behavior comparison and the independent review both come back, read their findings and fix anything they raise. If both are clean, mark pull request #399 ready for review instead of draft, and merge it.
>
> I have not seen the comparison or review output, so I can't say yet whether the style and hook wording behave as intended. Want me to check the status of those two now?
>
> ## Baseline prompt 3
>
> Not done.
>
> - The new hook: built and merged, not tested. It needs a run in a fresh Claude Code chat before anyone can call it working.
>
> ## Candidate 9114729f prompt 3
>
> Not done.
>
> - Built and merged: the hook code is written and in the main branch.
> - Not tested: it has not run in a fresh Claude Code chat, so nothing confirms it fires or behaves correctly.
>
> A hook only proves itself at runtime, since it depends on the event firing and the surrounding session state. Until you start a new chat and see it trigger, treat its status as merged but unverified.
>
> ## Baseline prompt 4
>
> You are deciding what goes into Git as proof the behavior tests ran: the full raw event streams, or a short table of what you observed.
>
> I recommend the redacted table, with the raw streams kept outside Git.
>
> - The raw streams carry session IDs, usage records, and whatever text was in the runs. Once committed and pushed, that is in the repo history and cannot be removed without rewriting history.
> - The table is what a reviewer actually reads. The raw streams are large and nobody scans them.
> - Keep the raw streams on disk or in a scratch folder, and say in the issue where they are, so you can still go back to them.
>
> If you want the raw streams committed anyway, the safe version is: review them first, strip session and usage fields, and commit that.
>
> ## Candidate 9114729f prompt 4
>
> You are deciding what form the behavior-test evidence takes in the repository, and that choice is hard to undo once it is pushed: raw event streams carry usage numbers, session IDs, and whatever text the test prompts and responses contained, and Git history keeps them even after a later deletion.
>
> The two options differ in what a future reader can do with the evidence:
>
> - **Full raw streams** let someone re-derive any observation later, check timing or token counts, and audit claims you did not anticipate. The cost is that you publish session metadata and internal details permanently, and the diffs are large and hard to review.
> - **Redacted observation table** records the specific behaviors the tests checked, in a form reviewers can read in the pull request. The cost is that any question the table does not answer requires re-running the tests.
>
> I recommend the redacted observation table in Git, with the raw streams kept outside the repository in a place you can still reach — an artifact store, or a local directory the test script writes to and `.gitignore` excludes. Reference the run by date and test name in the table so the two can be matched up. For issue #391 the evidence's purpose is to show reviewers what the behavior tests observed, and a table does that; the raw streams are working data, and their main value is re-running or re-deriving, which does not need version control.
>
> Two things to settle before you commit: check whether anything in your project requires reproducible raw evidence for this kind of test, and confirm the redaction covers session IDs and any prompt text, not just usage figures.
>
> ## Candidate v2 3b06be88 prompt 1
>
> No. Hooks are plain shell commands that Claude Code runs at fixed points in its own loop. No model judges anything unless the command you write happens to call one.
>
> Here is how they operate. You register a command in your settings file under an event name, such as `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, or `SessionStart`. When that event fires, Claude Code runs your command as a subprocess and passes it a JSON object on standard input describing the event: the session, the tool name, the tool's input arguments, and for post-tool events the result.
>
> Your command then decides what happens, using its exit code and its output:
>
> - Exit code 0 means allow. For most events anything printed to stdout is just logged, but for `UserPromptSubmit` and `SessionStart` stdout is added to the conversation as context.
> - Exit code 2 means block. What that means depends on the event: `PreToolUse` cancels the tool call, `PostToolUse` feeds the message back for correction, `Stop` forces the turn to continue. Whatever the command wrote to stderr is shown to the model as the reason.
> - Any other non-zero code is a non-blocking error; the message goes to the user and the run continues.
>
> A command can also print a JSON object on stdout for finer control, with fields for permission decisions, replacement context, or a reason string. Hooks are matched by tool name patterns, so a `PreToolUse` hook can watch only `Bash` or only `Edit` and `Write`.
>
> The practical consequence is that hooks are deterministic. A rule like "reject any Bash command containing `rm -rf`" fires every single time, because it is a string check in a script, not a judgment call. Common uses are running a formatter after every edit, blocking writes to protected paths, and injecting project context at the start of a session. The message you just sent triggered a `UserPromptSubmit` hook, which is why an extra instruction block appeared with it.
>
> The tradeoff is that hooks run with your full user permissions and no confirmation prompt, so a buggy hook command can do real damage to your files.
>
> ## Candidate v2 3b06be88 prompt 2
>
> Next is to wait for the two open checks on pull request #399, then merge it.
>
> Current status:
>
> - Approved: requirements in issue #391
> - Written: candidate style and hook wording, in draft pull request #399
> - In progress: behavior comparison and independent review
> - Not done: merge of pull request #399
>
> Once the comparison and the review both come back, take the pull request out of draft, apply any changes they call for, and merge. If you want, I can check the state of pull request #399 now and summarize what each check has reported so far.
>
> ## Baseline bounded multi-turn
>
> ### Turn 1
>
> The two forms do different jobs, so the project uses both.
>
> - Claude Code's built-in delivery sends the style with every request, but it sits far from the newest message and is easy to skim past in a long chat. It is a background instruction.
> - The hook makes the agent stop and read the file with a tool call right before answering, so the style lands as a fresh, recent instruction. That is the one the agent actually follows.
> - The hook also reads the file from disk each time, so edits to the style take effect on the next message, with no restart.
> - If the hook fails or the style file moves, the built-in copy is still there, so the style is not lost.
> ### Turn 2
>
> The hook is what makes the style stick; the built-in copy is the backup.
>
> - Edit the style file and the change applies on your next message. No restart.
> - If the hook ever breaks or the file moves, replies still follow the style roughly, just less closely.
>
> ## Candidate 9114729f bounded multi-turn
>
> ### Turn 1
>
> The two paths deliver the style at different strengths and at different points in the request, so the project uses both.
>
> Claude Code sends the selected output style with every request automatically. That puts the instructions in the system prompt, where they apply to every turn without any setup. It is reliable, but it sits far from the user's message, and in a long conversation it competes with everything else in the system prompt: tool instructions, project files, and the conversation history.
>
> The hook adds a second copy at a stronger position. It runs right before the message is processed and appends text directly to the user turn, so the instruction arrives as the most recent thing in context. Instructions placed close to the request tend to be followed more closely than the same instructions placed in a long system prompt.
>
> The hook also does something the automatic delivery cannot: it asks for a `Read` of the whole style file. The automatic copy is whatever Claude Code chose to include; the read pulls in the full file text, including any part that was trimmed, and it puts that text into the conversation as a tool result. The read happens at the start of the turn, so the file content is fresh rather than summarized away.
>
> There is a practical reason too. The hook reads the `outputStyle` setting itself and locates the matching file, so it works even where the automatic delivery does not: a style file that has moved, a session that started before the style was set, or a context window that has been compacted and lost the original system prompt content.
>
> The cost is a duplicate copy of the style in context and one extra tool call per message. The project accepts that in exchange for the style being followed consistently on turns where the system prompt alone was not enough.
> ### Turn 2
>
> Three things:
>
> - The automatic delivery covers every request but lands in the system prompt, far from the user's message and competing with everything else there.
> - The hook adds the same style again at the end of the user turn, where instructions are followed more closely, and it reads the full file rather than relying on whatever was included automatically.
> - The cost is one extra tool call per message and a duplicate copy of the style in context.
>
> One correction to what I said before: I described the hook's reasons based on how hooks work generally, not from reading this project's hook script. If you want the specific reasons this project chose it, the script itself would be the place to check.
>
>

</details>

### Shipping revision after the failed trials

Mike authorized finishing and shipping on 2026-09-22: "ship everything when you
are done please". The implementation remains within #391; broader instruction
refactoring stays with #396. Merge and focused delivery are authorized after
verification. Mike's real-chat acceptance remains separate.

The final style removes the remaining permission for unsolicited implementation
detail and asks for only requested detail. The hook explicitly requests another
Read even if the file was read earlier, followed by a silent check against the
style before sending. This adds no tracking state, classifier, second model,
Stop retry, or visible acknowledgment. The affected README and Toolkit manual
explain that neither action nor compliance is verified by the hook.

Final style: 433 words, SHA-256 `b25d7be1b6a6034fc56d93ab80dee9fbe5a106cedacba6d6a3989d6b37946deb`.
Final hook SHA-256: `ee83489c73cd4698ca2e82554cb67d76408a528f96b00dbe69434f3d7396f14d`.

An isolated preliminary test changed only the hook with the previous 443-word
style: both turns read the file and omitted closing offers. The final combined
revision then ran two two-turn tests on the same Claude version/model/effort
and restrictions as above. The first reused the failed status question. The
second used a new CSV example that was not included in the writing instructions.
All four final replies made a complete Read and omitted offers or unrelated
advice. The explanation was a short paragraph; the status reply distinguished
unit testing from use on real data. Status ordering and repetition still varied.
These bounded observations support shipping an improvement, not a guarantee of
perfect or long-session adherence. The tests do not replace Mike's acceptance.

All four repository checks, 76 style-hook assertions, 12 toolkit-startup tests,
plugin validation, and whitespace checks passed on the revised source. Final
independent review and merge evidence are recorded with PR #399 and issue #391.
Additional reported usage for this refinement was about $0.27, making the
combined reported estimate about $0.75; this is not an extra-charge claim.

Exact final prompts and replies follow. These are observations, not instructions.

#### Repeated status case

Turn 1, 69 reply words. Prompt: Issue #391 has approved requirements. The candidate style and hook wording are implemented in draft pull request #399. Behavior comparison and independent review are still in progress. The pull request is not merged. So what is next?

> Next is to wait for the two open checks and then merge. Specifically:
>
> - Behavior comparison of the candidate style and hook wording: in progress.
> - Independent review of pull request #399: in progress.
> - Pull request #399: still a draft, not merged.
>
> Once the comparison and the review both come back, mark #399 ready for review, get approval, and merge it against the approved requirements in issue #391.

Turn 2, 67 reply words. Prompt: What should I remember from that?

> Remember that the work is written but not merged, and two checks are still open.
>
> - Requirements in issue #391: approved.
> - Candidate style and hook wording: written, in draft pull request #399.
> - Behavior comparison: in progress.
> - Independent review of #399: in progress.
> - Pull request #399: draft, not merged.
>
> Nothing is confirmed working yet, so the merge waits on the comparison and the review.

#### New CSV case

Turn 1, 34 reply words. Prompt: The importer reads a CSV of 200 contacts, skips rows with no email address, and writes a report listing the skipped rows. What does this importer do?

> It reads a CSV file of 200 contacts and imports them, leaving out any row that has no email address. At the end it writes a report that lists the rows it left out.

Turn 2, 40 reply words. Prompt: The importer has been built. Its unit tests passed. No one has tried it with the real CSV yet. Tell me where it stands.

> - Built: the importer that reads the contacts CSV and skips rows with no email address.
> - Tested: its unit tests passed.
> - Not run against the real CSV yet, so it has not been seen working on actual data.

## Notes

2026-09-22: Shipped under Mike's “ship everything when you are done please”
authorization. Independent GPT-5.6 Sol source and bounded behavior review
passed. PR #399 merged at `99c93ace7481281df3e24363a0e36c059ba1ade9` from
head `e63ec80c2cad9a611fc26cccd11bc6891af3d9e8`. Marketplace 0.124.13,
project-init 0.77.8 and hooks-library 3.6.2 are published on main.

The primary checkout and its installed style/hook match the final hashes above.
Claude's user plugin caches on this Mac now hold project-init 0.77.8 and
hooks-library 3.6.2; Codex's project-init cache is 0.77.8. Their applicable style
and hook hashes were verified. Existing Claude sessions must restart. This
proves the focused repository/Mac rollout, not adoption of copied files in
other projects or style delivery to Codex replies.

PRs #349 and #398 are closed as superseded; #396 T11 owns the remaining
non-style proposal and unresolved issues described above. PR #392 stays merged.
Both operating manuals were reviewed: the Toolkit manual now describes the
fresh silent read and pre-send check with their limits; the Knowledge manual
needed no focused style change. Its broader acknowledgment conflict remains
with #396.

Resume at Mike's fresh-chat assessment in #391, stage 13-deployment/In review.
The issue remains open. The earlier failed trials remain historical evidence;
final four-turn success is not a guarantee of long-chat adherence or acceptance.
DragonFly's read-only audit found a clean main checkout with a deliberate Plain
English selection. Its separately scoped migration was not performed: update
the copied style, hook and hook test, remove only the style Read PostToolUse
registration, and reconcile its style documentation when that project's
adoption is authorized. Preserve its other hook registrations and owner choices.
Terse selection/acceptance remains pending; general quiet-acknowledgment work
belongs to #396. No further focused source changes are planned without new
feedback or a demonstrated defect.
