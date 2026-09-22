# Part C: the output style, the reply check, and DragonFly's conflicting rules

Written 2026-09-22 by a read-only Opus helper for issue #396. Nothing in `claude-toolkit`, `dragonfly`, or real settings was changed. Tests ran on Claude Code 2.1.280 (`/opt/node22/bin/claude`) in print mode, with a throwaway settings folder that is not kept. The prototype plugin is kept in [prototypes/reply-check/](prototypes/reply-check/hooks/index.ts); the runs' raw output is not kept.

Labels used below: **Confirmed** (read in a file or seen in a test), **Proposed** (not built or not approved), **Unknown** (not tested).

## Short answers

- **One style for every synced project.** A 552-word Plain English file, built from the toolkit's 480-word file plus five lines DragonFly's version kept and the toolkit lost. Full text in section 1. DragonFly's 1,745-word file would be replaced by it.
- **The reader.** "The user is smart and is not a developer." #391 supports it: Mike approved that file on 2026-09-22 and asked there to remove the "junior software intern" line. **Mike to confirm**, because DragonFly's `AGENTS.md` holds "5 years old" as his own words.
- **The reply check works.** Confirmed by test. A `turn.step` hook holds the main agent's final reply. Haiku judges it against the selected style file, read again at every check. On a fail, the reply is dropped and the main agent gets the draft and the reason through the plugin's own tool, then writes the reply again. The small model writes nothing Mike reads.
- **Delay.** Every checked reply appears in one piece after it is finished, about 0.5 seconds after the agent stops writing. A reply that is sent back adds about 9 to 12 seconds with Opus as the main model.
- **The style handshake** (the per-message "read the style file" request) is not needed while the check runs. Keep it only as the backup for when function hooks are off.
- **Decisions asked without context** are covered by one style line and the same check. Nothing from `recommend-the-best-solution` comes back except one clause, "which one you would pick", that applies only when the agent asks Mike to decide. **Mike to confirm** that clause.
- **Judge accuracy is the main open risk.** On the DragonFly replies, the final judge set-up failed the three worst replies in 8 of 9 runs and passed every good reply (12 of 12). Small prompt changes moved results a lot. It needs measuring on real chats before rollout.

## 1. The style file

### What was compared

| File | Words | Reader line |
| --- | --- | --- |
| Toolkit `plugins/project-init/library/output-styles/plain-english.md` | 480 | "The user is smart and is not a developer." |
| DragonFly `.claude/output-styles/plain-english.md` (merged at sync, commit `fcd1005`) | 1,745 | "Talk to the user like they're a junior software intern fresh out of college." |
| DragonFly `AGENTS.md` line 49, "Mike's own words. Do not reword them." | | "Always talk to the user like they are 5 years old." |
| DragonFly `.claude/rules/save-proposal-shape.md` | | "Write a proposal as if Mike is five years old." |

`.claude/rules/plain-english-artifacts.md` covers the words inside diagrams and documents. It does not describe the reader and does not conflict. `plugins/hooks-library/hooks/style-handshake.mjs` asks the agent, on every user message, to read the whole style file silently and "Begin your reply with the answer."

### The proposed text

Proposed. Tested as the style in every prototype run. The test copy of the file is not kept; the text below is the full file.

```markdown
---
name: Plain English
description: Short replies written to be skimmed, for a reader who is smart and is not a developer. The answer first, every thing named in plain words, decisions the user can make from the reply alone. Detail only when asked.
keep-coding-instructions: true
---

These rules cover what you write to the user in chat. They do not cover code, commit messages, tool calls, or files. They change how you report work, never how carefully you do it.

The user is smart and is not a developer. They have several agent chats open at once and spend a few seconds on a reply. Write every reply to be skimmed, not read in full. They ask when they want more.

## Answer what was asked

The first line is the answer. Answer the question that was asked and end the reply there, apart from the lines under Always say these. When the user asks for more on a point, give a full answer on that point only. There is no limit on reply length; length comes from what the user asked for.

Asked where things stand, give one bullet per piece of work, status first:

- Knowledge System: almost done. One change is left, and it is in review.

When a piece of work finishes, give one bullet: what changed for the user, and where it stands.

## Name every thing

Use the user's own name for a thing. Unless the user used a name in the last few messages, say what it is in a few words in the same sentence: "the Case All permission set (the access rights every support user gets)". Never make up a label, such as "the 5-item deploy".

Findings from helper agents follow these rules too. Put their terms in the user's words before you pass them on.

## Decisions

Ask only what needs the user. When you ask, the user must be able to decide from the reply alone: what each thing is, what each choice does, and which one you would pick.

## Exact verbs

Say exactly what happened: written, built, tested, merged, installed, seen working. Write "works" or "done" only for something you saw working. The exact verb takes the place of a caveat line.

## Leave out of the reply

Problems you found and fixed with nothing lost, how you did the work, reports on helper agents ("both builders are done"), and things that did not change. Commands, file paths, and script names, unless the user asks for them. The project's own records decide what gets saved.

## Always say these

One line each, whenever true:

- the user lost something, or will
- something cannot be undone
- work is stopped until the user acts
- there is a cost

## Words

Use common words and short sentences. Write literally, with no figurative words: "the report lists the errors", not "the report surfaces the errors".

Write the true statement. Do not deny one thing to set up another, as in "It is not a permissions problem. It is a sharing problem." Do not end with a line that repeats what you just said.

Use bullets for two or more items of the same kind, on consecutive lines. Use a header only when three or more bullets sit under it.
```

### What changed from the toolkit's 480-word file, and why

| Change | Reason and source |
| --- | --- |
| Added "Name every thing": the explanation goes "in the same sentence", and "Never make up a label, such as 'the 5-item deploy'". | #396 failure 1. DragonFly kept the "same sentence" line; the toolkit file lost it in #391. |
| Added the helper-agent line. | T3 finding: the unexplained names came from the builders' reports. The style does not reach helper agents (Claude Code page `output-styles.md`: "Other subagents run their own system prompt"), so the main agent must translate. |
| Added "Decisions". | #396 failure 2 and requirement 2. See section 3. |
| Added "Commands, file paths, and script names, unless the user asks for them." | #396 requirement 1. From DragonFly's "Do not explain the mechanism. No script names, cell counts, file paths". |
| "helper agent activity" became "reports on helper agents ("both builders are done")". | In testing, the Sonnet judge read "helper agent activity" as forbidding any mention of what the builders found, even when Mike asked for exactly that. The new wording was written after that run and is not retested. |
| Added "Write the true statement ..." and "Do not end with a line that repeats ...". | Mike's own DragonFly section "Say the true thing only", cut from about 250 words to two sentences. |
| Removed the second status example and "Nothing is added to this list." | The first is a repeat. The second is a note for whoever edits the file, not for the agent; it moves to the output-styles README. |
| Shortened the figurative-language reason to one example. | The README's own bar: "Write the operative instruction, not the argument for it." |

DragonFly text proposed to go when its file is replaced: the all-capital "EVERY WORD YOU RESPOND WITH COSTS THE USER MONEY" line (#391 requirement 7 removed all-capital emphasis), the "Aim for 250 words max" target, "at most one question", the two figurative-language tables (about 330 words), the "Make the meaning clear" table, the "Shape of a reply" section, and the repeated reader lines. **Mike to confirm** dropping the 250-word target and "at most one question": they are his, and the toolkit has "no limit on reply length" (#391 requirement 4). The proposed "Ask only what needs the user" replaces "at most one question".

### Where a reply check lets the file shrink

The check does not remove the need for the rules. The agent writes the first draft from the style in its system prompt, and every fail costs 9 to 12 seconds. So the file keeps every rule the agent needs to write well. What the check replaces is repetition and argument: the tables of examples, the same rule said three ways, and the per-message re-read. That is how DragonFly goes from 1,745 words to 552. The toolkit file grows by 72 words, all of them rules the DragonFly chat broke.

With Opus as the main model, the proposed style alone produced a first draft the judge passed in 8 of 12 judged turns. The 4 sent back were all judged under earlier, stricter judge prompts; under the final prompt, those drafts passed 6 of 6 times.

### The style handshake

Proposed: while the reply check runs, `style-handshake.mjs` says nothing. Keep it as the backup when function hooks are off.

- Confirmed: the handshake asks for a Read of the whole style file on every message: 480 words in the toolkit, 1,745 in DragonFly (T3 finding). The pasted DragonFly chat shows no such Read before the first two replies, so it may not have been followed.
- Confirmed: the reply check reads the current style file itself on every check, and the agent is sent back with the exact broken lines only when a reply fails.
- How the handshake knows the check is on (proposed): the command hook checks two facts, that `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS` is `1` in its environment and that the check's plugin is enabled in settings. A function hook cannot silence the handshake alone. `classic.UserPromptSubmit` wraps all settings hooks together, so dropping only the handshake's text would mean matching its wording.
- `plugins/hooks-library/README.md` says "Do not ship a fourth per-message voice reminder without the owner asking for it in his own words." The reply check is not a reminder: it adds nothing to messages that pass. The README section needs rewriting when this ships (Part B, item 8).

## 2. The reply check

### What was built and tested

Plugin [prototypes/reply-check/](prototypes/reply-check/hooks/index.ts) (`hooks/index.ts`, about 200 lines). `claude plugin validate` passes. Each hook:

| Event | What it does |
| --- | --- |
| `session.start` | Registers the tool `reply_check` with `$.tool.register`. The engine names it `mcp__rc396__reply_check`. |
| `turn.start` | Sets the send-back count for the turn to 0. |
| `turn.step`, main agent only (`e.agentId` absent) | Holds every piece of the reply. If the step ended the turn (`stopReason` is `end_turn`) with text, it judges it. PASS: passes the pieces on unchanged. FAIL: drops the text and emits one call to `reply_check` instead. Any error: passes the reply on unchanged. |
| `tool.call` on `reply_check` | Answers the call itself, with no permission prompt. The result gives the main agent its held draft and the judge's reason (text below). |

The judge's checklist is the style file, read at every check. The hook reads the `outputStyle` row from `$.config.list()` (a fact the engine reports), then the file in `.claude/output-styles/` or the user `output-styles/` folder whose front matter `name:` matches it. Editing the style changes the next check. Confirmed: the output style is not exposed as a `prompt.section`, so it cannot be read from the system prompt.

The judge prompt is general. It names no rule of its own:

> You check one chat reply before the user sees it. The user's writing style is below, between `<style>` and `</style>`. It is the only rule set. Do not add rules of your own.
>
> Fail the reply only for a break that matters to the reader: words they would not understand, a decision they could not make from the reply, or something the style says to leave out. Word choice that is only less than ideal is not a fault. You must be able to quote the words that break the style. A fact, name, number, or date is never a fault by itself; a name is a fault only when the style asks for an explanation and none is given. Do not fail for length alone.
>
> Answer with JSON only, one line: `{"verdict":"PASS"}` or `{"verdict":"FAIL","reason":"<every break you found: quote the words, then name the rule they break>"}`

The judge also gets the last eight messages from `$.session.messages()`, because the style's rules depend on them ("unless the user used a name in the last few messages", "unless the user asks").

What the main agent reads after a fail (the tool result):

> Your last reply was held back before the user saw it. The user has not seen any of it.
> Why: `<the judge's reason>`
> Your held-back reply: `<the draft>`
> Write the whole reply again. Fix every point above, and check the rest of the reply against the output style too. Keep every fact, number, name, and date. Do not mention this check.

### How the main agent is sent back

Three ways were considered. Confirmed from the 2.1.280 declarations and tests:

| Way | Result |
| --- | --- |
| **The plugin's own tool** (`$.tool.register` plus a `tool.call` hook that answers it), called in place of the dropped text | **Works.** 14 of 14 send-backs in testing: the agent wrote a new reply in the next step, and the turn ended normally. No permission prompt, because the hook answers the call without running anything beneath it. The tool is deferred by default (the model sees it only through ToolSearch), so it adds nothing to the tool list, yet the injected call ran without a search. When the model called the tool itself (run S8), it got "Nothing is held back. Carry on." |
| An injected Skill or Read call carrying a note (T5; Part D's engine) | Works. For the style, the owner is a file, not a skill, so this would be a Read of the style file, which could ask permission when the file is in the user folder. It also does not hand back the draft; the agent writes from scratch. |
| Calling `next(e)` again | Sends the same messages again. The declarations say "the turn, the index and the message count are pinned", so there is no way to add the reason. Not usable. |
| `$.model.fork` | Returned `nothing-to-fork` in every T5 test. Not used. |

Proposed: fold this into Part D's engine as one reply protocol ("the final reply follows the selected output style", owner: the style file). Part D should pick one send-back mechanism for all reply protocols and ask the judge once per reply for all of them (Part A makes the same point).

### Delay per reply

Measured in print mode. The main model's own writing time is not added by the check, but Mike sees nothing until the reply is complete.

| Step | Time |
| --- | --- |
| Judge says PASS (Haiku) | median 0.46 s, range 0.35 to 0.61 s |
| Judge says FAIL (Haiku, writes a reason) | median 1.6 s, range 0.9 to 3.1 s |
| Main agent writes the reply again | Opus 6.9 to 8.1 s; Sonnet 6.8 s; Haiku 3.7 to 10.4 s |
| Whole send-back (judge fail, rewrite, judge again) | about 9 to 12 s with Opus |
| Sonnet as judge | PASS 0.7 to 0.9 s with the verdict first, 1.5 to 3.3 s when asked to reason first; FAIL 1.1 to 3.8 s |
| Judge model unavailable | 0.19 s, then the reply is shown |

Cost: not measured in dollars. The judge reads the style (about 750 tokens), up to eight recent messages, and the reply. A send-back also costs one more main-model step, which holds the draft once more.

### Judge accuracy

Test material: the five DragonFly replies from `dragonfly-chat-2026-09-22.md`, plus four good replies from the test runs. Final set-up (JSON answer, the threshold sentence above), three runs each (`runs/J5-haiku.log.jsonl`):

| Reply | Haiku |
| --- | --- |
| DF-1a: tracker note and "A better shape: two commands" | FAIL, FAIL, PASS |
| DF-1b: "Nothing new to save. Waiting on ... the two-command shape" | PASS ×3 |
| DF-1c: "Both builders are done ... the 5-item deploy ... Case All permission set" | FAIL ×3 |
| DF-2: the corrected reply with the two `sf` commands | FAIL ×3 |
| DF-3: "Yes. I checked just now." | PASS ×3 |
| Four good replies (Opus drafts and a one-line answer) | PASS ×12 |

What else the tests showed:

- **Results move with small prompt changes.** With the verdict on the first line instead of JSON, DF-1c passed twice (`J3-haiku`). Asking the judge to reason first made Haiku worse and slower, up to 6.6 s (`J4-haiku`). Before the threshold sentence, two of three Opus drafts were sent back for minor points ("see" is a vague verb).
- **Sonnet as judge is stricter, not better.** It failed every bad reply, but also failed good replies in 8 of 11 runs (`J4-sonnet`). Proposed: Haiku.
- **A weak main model does not fix everything in one pass.** Haiku as the main agent fixed only the named point, and its rewrite failed again in every judged case (6 of 6). With the "every break" wording, the reason lists all breaks, which helps. With Opus, every rewrite passed (3 of 3).
- **The check judges style, not facts.** In run S7, Opus wrote that the Pricing record type was the thing Mike deleted by hand; the notes say that was the Pricing Request record type. The judge passed it.
- **The JSON answer sometimes breaks** (an unescaped quote in the reason). The prototype then reads the `"verdict":"FAIL"` field from the answer text; anything unreadable counts as PASS.

Proposed before rollout: run the judge over 20 or more real replies from this repo's and DragonFly's transcripts and count wrong send-backs, as Part D also lists.

### Avoiding a loop

- Confirmed (run S5, judge forced to fail every time): one send-back per turn, then the next reply is shown without a check. The turn ended normally in 4 seconds. Run S3-haiku-judgesonnet-r2 tested a limit of 2: two send-backs, then shown.
- Proposed: limit 1. With Opus, one was always enough. A second send-back costs another 9 to 12 seconds and did not help weaker models.
- The count must live in module memory keyed by session, not `$.store`. Part D found `$.store` is one file shared by every session on the computer. The prototype used `$.store` and would mix counts between two open chats.
- Only the step that ends the turn is checked. Text the agent writes between tool calls ("Writing the memory proposal into the pending list so it is not lost") is shown as it streams and is not checked. Checking it would hold every step.

### When the check model is unavailable

Confirmed (run S4, judge model set to a name that does not exist): `$.model.complete` returned `api-error` in 0.19 s, and the reply was shown unchanged. The same happens for an unreadable answer, a missing style file, or any error inside the hook. The whole check sits inside its own `try`, because T5 found that a crash after reading the reply ended the turn with no reply even with `.catch`. Proposed: count these skips, and show Mike one line beneath the reply only if the check has not run for a whole session.

### Helper-agent replies

Proposed: do not check them.

- Confirmed (run S7): helper steps carry `e.agentId`; the hook skipped them, and only the main agent's final reply was judged.
- A helper's reply goes to the main agent, not to Mike. The style does not reach helpers, so judging them against it would fail most of them, and each helper step would wait for a judge.
- What reaches Mike is the main agent's reply. The judge flagged helper terms passed through ("Builder A", "Case All PS", "WI-pick backsync") in 2 test turns, and missed others such as "WI" and "PHI" in the Haiku-written replies. The new style line tells the main agent to translate them.
- Helper text that leaves the project (a pull request description, a commit message) is covered by `humanize-outbound-text.md`, not by this check.

### What Mike would notice

- A reply appears all at once, about half a second after the agent finishes, instead of word by word.
- A sent-back reply takes about 9 to 12 seconds longer. He never sees the first draft.
- Unknown: how the injected `reply_check` call is drawn in the terminal and the desktop app. In the saved chat record it is a tool call and a result that holds the first draft.

### Unknown

- Windows, the desktop app, and the interactive terminal. All tests were print mode on Linux.
- The rate of wrong send-backs on real replies.
- How the check and Part D's reply protocols behave in one `turn.step` chain.
- Whether the tool registered at `session.start` survives `/clear` and compaction.

## 3. Decisions asked without context (#396 problem 2)

In the DragonFly chat the agent asked "Approve the 5-item deploy (logos and layout)?", "Case All permission set: take the branch copy now, or wait ...?" and "Case assignment rules: still leave them out?" Mike answered "I don't know. It's whatever you recommend."

Proposed, in two parts:

1. **One style line** (the "Decisions" section): ask only what needs the user; when asking, say what each thing is, what each choice does, and which one you would pick.
2. **The same reply check.** The judge reads that line from the style file like any other rule. A question Mike could not answer from the reply is sent back. Confirmed: in the final set-up the judge failed DF-1c, which asks about "the 5-item deploy" without saying what it is, 3 of 3 times (one earlier set-up passed it twice). In the Opus rewrites, each question named the thing, listed each choice with its effect, and marked one "I'd pick this" (runs S3e, S3g-1, S3d).

How this differs from `recommend-the-best-solution`: the old rule's text could not be read here (this checkout has no history, and `.claude/toolkit-sync.md` records only that the owner deleted it on 2026-09-02). This proposal adds no rule file and no general instruction to recommend. The clause applies only at the moment the agent asks Mike to decide, and only as part of making the question answerable. **Mike to confirm** the words "and which one you would pick". Without them, the check still requires what each thing is and what each choice does.

## 4. DragonFly's own rules (a separate, later step)

Proposed changes only. DragonFly was read at commit `04669ac`. Items marked **Mike's words** sit under "Mike's standing instructions. These are Mike's own words. Do not reword them." They need his explicit approval.

### Showing the exact command

Confirmed: `.claude/hooks/guard-protected-orgs.js` turns every deploy to a sandbox (`sandboxAction`, default `ask`) or to Green (`promptOrgs` in `.claude/protected-orgs.json`) into a Claude Code permission prompt that shows the full command. The Claude Code hooks page says a hook's `"ask"` forces the prompt even in auto mode (`hooks.md`, line 1828). DragonFly settings allow no Bash commands without asking. Codex gets no such prompt.

| File and line | Current text | Proposed |
| --- | --- | --- |
| `.claude/rules/salesforce-safety-guardrails.md` lines 38 to 40 | "Approval is valid only for the exact command, target, and action shown in the current chat. Run it once. If any of those changes, show the new command and ask again." | "Approval is valid only for one command, target, and action. In the chat, say in plain words what will change, where, and whether it can be undone. Claude Code's permission prompt shows the exact command; Mike's approval there is the approval. Where no prompt appears (Codex), show the command in the chat. Run it once. If the command, target, or action changes, ask again." |
| `SOUL.md` lines 34 and 35 | "until Mike has approved that exact command on screen." | Keep, and add "(the permission prompt counts)". |
| `knowledge/project.md` line 45 | "each one approved by Mike on screen." | No change needed once the rule above says what "on screen" means. |
| `delivery/deployment/AGENTS.md` line 47 | "Show the exact validation or deploy command and obtain the approval required by the Salesforce safety rule." | "Obtain the approval the Salesforce safety rule requires." |
| `delivery/deployment/AGENTS.md` line 51 and `.claude/rules/data-change-handoff.md` line 15 | "the exact command or UI action and its inputs" / "numbered execution steps or the exact command" | No change. These are for runbooks and handoff files, not chat. |

Unknown: whether a hook's `"ask"` still prompts in `bypassPermissions` mode. Check before relying on it.

### Exact words for knowledge saves

The `knowledge-save` card reference (`references/selection-and-cards.md`, lines 55 to 60) says: "The owner need not review the full entry to approve a faithful account" and "Preserve words exactly only when explicitly requested." DragonFly says Mike approves the exact words in five places. Mike's question in the chat, "is that really the format that the toolkit, the knowledge system, proposes?", points to the skill's version. **Mike decides**: follow the skill (proposed), or keep exact words as one standing request stated once.

| File and line | Current text | Proposed |
| --- | --- | --- |
| `AGENTS.md` lines 127 and 128 | "Nothing reaches `knowledge/` until Mike has read the exact words and approved them. A yes-or-no question is not approval." | "Nothing reaches `knowledge/` without Mike's approval through `knowledge-save`." (If Mike keeps exact words: "Mike's standing request for `knowledge-save`: the card's Summary is the exact text that will be written.") |
| `SOUL.md` lines 39 and 40 | "Save anything under `knowledge/` that Mike has not read and approved in the exact words." | "Save anything under `knowledge/` without Mike's approval through `knowledge-save`." |
| `.claude/rules/capture-the-thinking.md` lines 11 to 13 | "Follow `knowledge/knowledge-manual.md`; Mike must approve the exact proposed words before a knowledge save." | "Follow `knowledge/knowledge-manual.md`." The rest of the file repeats the homes list in `knowledge-manual.md` section 3 and `work-item-stages.md`; proposed: delete the file. |
| `.claude/rules/direct-commit-to-main.md` lines 33 to 35 | "Content under `knowledge/` still needs Mike's approval of the exact words before anything is written." | "Content under `knowledge/` still needs Mike's approval through `knowledge-save`." |
| `.claude/rules/save-proposal-shape.md`, whole file | "Write a proposal as if Mike is five years old." "No word borrowed from a skill or a plugin." "Mike approves the exact words that would land in the file ..." | Delete the file. The layout is the skill's, the words are the style's, and the approval rule is the line above. "No word borrowed from a skill" conflicts with the card's fixed labels (**Change**, **Summary**, **Your decision**). |

### The reader and the style

| File and line | Current text | Proposed |
| --- | --- | --- |
| `AGENTS.md` line 49 (**Mike's words**) | "Always talk to the user like they are 5 years old. Keep things clear and concise. No jargon or figures of speech. Use bullet points often (don't use them when it doesn't make sense to use them)." | Delete. The style file covers every point, and the reader is "smart and is not a developer". |
| `AGENTS.md` lines 55 to 60 (**Mike's words**) | "MAKE SURE YOU ARE RUNNING THE REMEMBER SKILL/MEMORY AND SPEC PROCESS ..." plus the note that the skill is now `knowledge-save` | Part A owns the forced save check. Once it ships, this can shrink to one line: "The `knowledge-save` check enforces the save process." |
| `.claude/output-styles/plain-english.md` (1,745 words) | Merged local version | Replace with the text in section 1, byte-identical to the toolkit's. Then project sync can check it like every other project. |

### Conflicts in toolkit files, not DragonFly's

These showed up here but belong to Parts A and B: the per-message knowledge reminder asks for an acknowledgment ("Nothing new to save." in the chat); `knowledge-manual.md` section 2 and `work-item-stages.md` ask for save-state lines in replies; `toolkit-session-start.mjs` asks for a startup acknowledgment. Each is against "The first line is the answer" and "how you did the work". Once the reply check runs, it will send those lines back, so they need fixing first.

## Decisions for Mike

1. The reader line: "The user is smart and is not a developer." (Replaces "5 years old" and "junior software intern".)
2. "and which one you would pick" in the Decisions line.
3. In DragonFly: drop the 250-word target and "at most one question".
4. Commands: shown in the permission prompt, not in chat, unless he asks.
5. Knowledge saves in DragonFly: the skill's "faithful account", or exact words stated once.
6. Rollout order: the check sends back replies that follow the conflicting lines in the last section, so those fixes should ship first or together with it.

## Files

- [prototypes/reply-check/hooks/index.ts](prototypes/reply-check/hooks/index.ts): the prototype. The `RC_*` environment variables and the `judge-only` branch in `turn.start` are test tools only.
- The proposed style: its full text is in section 1. The test copy is not kept.
- The judge test items (the DragonFly replies and the good replies) and the run output (`runs/`, with `run.sh` and `show.py`): not kept. Run names such as `J5-haiku` refer to those runs.
