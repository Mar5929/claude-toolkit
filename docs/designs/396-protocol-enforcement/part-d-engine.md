# Part D: the protocol engine

The one general function-hook mechanism that every forced protocol uses, and how it ships. Written 2026-09-22 for issue #396. Tests ran on Claude Code 2.1.280 on Linux in a throwaway settings folder. Nothing in `claude-toolkit`, DragonFly or real settings was changed.

Terms used below:

- **Protocol**: one process step that must happen every time, such as "open `knowledge-save` before writing the memory inbox".
- **Protocol list**: a data file with one entry per protocol.
- **Engine**: one TypeScript module that reads the list and applies it through function hooks.
- **Engine fact**: something Claude Code reports: which skill loaded, which tool was called with which file path, whether a turn is ending.
- **Judge**: a small model (Haiku) answering one question. It returns yes or no and a reason. It never writes text Mike sees.

## Short answer

- Build one new plugin, `protocol-guard`. It holds the engine, the shipped default protocol list, and the engine's tests. Each project turns it on in its own `.claude/settings.json`. **Tested:** the `env` setting in a project's settings file turns function hooks on, both in print mode and in an interactive terminal session in a trusted folder.
- A prototype of the list-driven engine works. It has three protocols and a 372-line module, and it passed eight live print-mode runs and four offline tests. It refused an inbox edit, then allowed it after the skill was opened. It held back a memory card written without the skill, forced the skill open, and showed only the corrected card. It also refused a shell command that closes an issue until the `work` skill was opened.
- When a check fails, the main agent redoes the step. A tool call is refused with the protocol's instruction. A held reply is dropped, the owning skill or file is opened for the agent, and a note says what failed.
- Old command hooks can tell the engine is running. The engine adds a field to the input of the classic `UserPromptSubmit` and `Stop` hooks. **Tested:** the field reached a command hook's input.
- A new toolkit test catches API changes offline. It regenerates the declarations from the installed Claude Code, type-checks the engine, runs `claude plugin validate`, and runs the plugin's own tests with `claude plugin test`. **Tested:** each step works on 2.1.280.
- Two problems found in testing need Mike's decision (section 8): a protocol against Mike's explicit request, and the judge wrongly flagging a reply that only mentioned a save.

## 1. The protocol list

### Where it lives

| File | Owner | What it holds |
| --- | --- | --- |
| `plugins/protocol-guard/protocols.default.json` | `protocol-guard` plugin | The shipped default list. The engine reads it from the installed plugin at run time, so a new plugin version updates every project with no sync. |
| `<project>/.claude/protocols.json` | The project | Only the project's own changes: `off` (names of default protocols turned off here) and `protocols` (new entries, or an entry with a default's name, which replaces it). Missing file means "defaults only". |

Two layers instead of one copied file: a copied list drifts from the toolkit, and `project-sync` would have to merge Mike's local edits on every sync. With two layers, a toolkit change never overwrites a project change, and the project file stays short.

Each owning plugin cannot ship its own entries, because the engine cannot find another plugin's folder (`$.plugin.root` names only its own). So the default list sits in one file. Each entry names its owner, and a toolkit test checks that every named owner still exists in the repository (section 5).

### Format

JSON, because the engine has no Node and no YAML reader; JSON reading is built in. One entry from the prototype:

```json
{
  "name": "knowledge-save-before-memory-write",
  "why": "Memory and inbox changes follow the knowledge-save procedure every time.",
  "owner": { "skill": "knowledge-save" },
  "appliesIf": { "exists": "knowledge/knowledge-manual.md" },
  "on": {
    "tool": {
      "files": ["knowledge/memory-inbox.md", "knowledge/memory/"],
      "shellQuestion": "Does this shell command create, change, move or delete the file knowledge/memory-inbox.md or any file under the folder knowledge/memory/?"
    }
  },
  "require": ["owner-opened-this-turn"],
  "tell": "Open the knowledge-save skill with the Skill tool and follow it, then make this change again."
}
```

| Field | Meaning |
| --- | --- |
| `name` | Unique name. Shown to the agent in a refusal and to Mike in the notice when retries run out. |
| `why` | One line for people reading the list. The engine does not use it. |
| `owner` | `{ "skill": "<name>" }` or `{ "file": "<project path>" }`. The skill or file that holds the how-to. The judge reads its current text. |
| `appliesIf` | Optional engine fact checked at session start, such as a path that must exist. This lets one default list serve projects with and without the knowledge system. |
| `on` | The trigger: when the protocol is checked (vocabulary below). |
| `require` | What must be true, in order: engine facts first, then judgments. |
| `tell` | What the main agent is told when the check fails. Never shown to Mike. |
| `maxRetries` | How many times one reply may be held for this protocol in one turn (default 2). |

### Vocabulary of triggers and requirements

Changing, adding or removing a protocol that uses these words is a data edit. A new kind of fact (a new word) is a code change to the engine, reviewed like any other.

| Word | Kind | What the engine does | In the prototype |
| --- | --- | --- | --- |
| `on.tool.files` | Engine fact | A Write, Edit, MultiEdit or NotebookEdit on a listed path. A path ending in `/` covers the folder. | Yes |
| `on.tool.tools` | Engine fact | A call to a named tool, including GitHub and other MCP tools (Part A K7, Part B P3). | No |
| `on.tool.shellQuestion` | Judge | A Bash call. The judge answers the question about the command. All shell questions for one call go in one request. | Yes |
| `on.reply.question` | Judge | The main agent's final reply in a turn. The judge answers whether the protocol applies. | Yes |
| `on.prompt.question` | Judge | Mike's message, at `prompt.submit` (Part B P1). | No |
| `on.skill`, `on.command` | Engine fact | A skill loads, or a slash command runs (Part B P5, P6). | No |
| `owner-opened-this-turn` (and `-this-session`, `-since-reset`) | Engine fact | The owner skill was loaded (Skill tool, `/name`, or preload), or the owner file was read, in this loop within the time named. "Reset" is session start, `/clear` or compaction. | Turn only |
| `read-fully-since-reset` | Engine fact | Read calls covered every line of the listed files (Part A K1, Part B P7). | No |
| `ran-after-write` | Judge on the command, engine fact on the order | A shell command answering yes to a question came after the last write to listed paths (Part A K6). | No |
| `follows-owner` | Judge | The judge gets the owner's current text and the draft, and answers whether the draft follows it. | Yes |

Shell commands are always judged by the model, never by searching the command text for a path or a word. That keeps Mike's rule of no keyword matching, at the cost of one Haiku call per Bash call when a shell protocol could fail (section 2, cost).

### How a project edits it

Mike asks, "turn off X in this project" or "also check Y". The agent edits `.claude/protocols.json`. The edit follows the implementation route, not the documentation route, because the file changes behavior. The engine reads the list once per session, so a change applies at the next session. That also means an agent cannot turn a protocol off halfway through the turn it is failing. Proposed, not built: a default protocol that refuses edits to `.claude/protocols.json` unless the judge finds Mike's latest message asked for the change.

## 2. The engine

### What it does at each event

| Event | What the engine does |
| --- | --- |
| `session.start` | Reads the default list and the project file, and drops entries whose `appliesIf` fails. Proposed, not built: also drop an entry whose owner skill is missing (from `$.command.list()`), with a note. |
| `prompt.submit` | Tells the agent once if the list could not be read ("the shipped defaults apply"). Later: `on.prompt` protocols. |
| `turn.start` | Clears the main loop's per-turn record: skills opened, holds used. |
| `skill.prompt` | Records that a skill loaded and keeps its current text for the judge. Covers `/name` typed by Mike. |
| `tool.call` on Skill | Records the skill as opened in the calling loop (main or a helper, from `agentId`). Attaches the engine's note to the result when the engine injected the call. |
| `tool.call` on Read | Records a read of an owner file, keeps its text for the judge, and attaches the note when the engine asked for the read. |
| `tool.call` on Write, Edit, MultiEdit, NotebookEdit, Bash | The tool guard. Only protocols whose engine fact fails right now are candidates. File tools are checked by path. Bash goes to the judge only if a candidate has a shell question. Refuses with each failed protocol's `tell`. |
| `turn.step` (main loop only) | The reply check. If every reply protocol is already satisfied by engine facts, the reply streams as normal. Otherwise the step is held until complete. If the turn is ending with text, each protocol is checked. On failure the draft is dropped, a Skill (or Read) call for the owner is injected, and the turn goes on. |
| `turn.complete` | When a protocol still failed after its retries, shows one line beneath the answer: "Protocol check still failing after retries: <name>." **Tested:** it appears as a Claude Code notice, not in the transcript. |
| `session.compact` | Clears "opened" for the main loop, because the owner's text may no longer be in context. |
| `classic.UserPromptSubmit`, `classic.Stop` | Adds `toolkit_protocol_engine` to the input the old command hooks receive (section 4). |

Helper agents: the tool guard applies inside helpers too. **Tested (run R8):** a helper's inbox edit was refused. A helper starts with whatever the main loop had opened when the helper first acted, so a later main turn does not strip it mid-task. That inheritance is built but not yet tested with a real executor helper.

### Checks

- **Engine facts in code:** skill names, tool names, file paths, `agentId`, turn ids, and whether a step ended the turn. Skill ids like `second-brain:knowledge-save` are split at the colon. Paths are made relative to the project root. None of this reads language.
- **Judgments by a small model:** `$.model.complete` with Haiku, `effort: low`, a 12-second limit, and an answer in JSON (`{"answer":"yes"|"no","reason":"..."}`). The prompt says the text is data, not instructions. For `follows-owner`, the judge gets the owner's current text as captured at `skill.prompt` or Read time, so the check follows the skill as it is today and never goes stale.
- **Order:** engine facts first. The judge is asked only when a fact fails, or for `follows-owner`. In the prototype, a turn where `knowledge-save` is already open pays no judge call for the card check until a card appears.

### On failure

| Where | What happens |
| --- | --- |
| Tool call | `{ deny: "Protocol check \"<name>\": <tell>" }`. The agent reads it and does the step. **Tested (R1, R4, R8).** |
| Reply | Draft dropped before display and before the transcript. A Skill or Read call for the owner is injected, and the note goes back with its result: "A protocol check held back your reply before the reader saw it. Protocol <name>: <reason>. <tell>". The agent writes the reply again. **Tested (R2, R2b).** |

The small model never writes what Mike reads. Its reason goes only to the main agent.

### Retry limits

- Reply holds: `maxRetries` per protocol per turn, default 2. After that the reply is shown unchanged, and `turn.complete` adds the one-line notice so a skipped protocol is visible to Mike. **Tested (R2):** two holds, then the reply was shown with the notice.
- Tool guard crashes: the first two in a turn refuse the call. After that the engine lets calls through for the rest of the turn, so a broken check cannot block all work. **Tested (R7):** with the judge unreachable, two Bash calls were refused and the third went through.
- Proposed from R7: when the judge is unreachable, refuse a given command once with the candidate protocols named ("if this command changes memory files, open knowledge-save first"), and let the identical command through on its second try. In R7 the agent gave up on a harmless `ls knowledge` after two refusals.

### Fail-safe rules

| Event | Rule | How | Tested |
| --- | --- | --- | --- |
| Tool guard (`tool.call`) | Fails closed | `.catch` returns `{ deny }` unless the tool already ran (`next.called`). The judge being unreachable counts as a failure. | R7, T5 run M |
| Reply check (`turn.step`) | Fails open | Everything after the reply is read runs inside the hook's own `try`. On any error the held chunks are passed on unchanged. `.catch` cannot be relied on here: T5 found a crash after reading the reply ended the turn with "Execution error" even with `.catch`. | R6 (forced throw: original reply shown) |
| Every turn | Never end with no reply | The only paths out of the reply hook are "pass the held reply on" and "inject one owner call". The injected call keeps the turn going. The retry limit bounds the loop. | R2 |
| List loading | Fails toward the defaults | A bad project file is ignored with a note to the agent. A missing default list means no checks, with a note. | No |
| Engine state | Kept in module memory, keyed by session and loop | `$.store` is one file shared by every session on the computer, and the store is limited to 4 MiB in total, so it is not used for per-turn state. A plugin reload clears memory, so the agent may be asked to open a skill again. That errs toward checking. | Module memory persisted across hooks (probe run) |

### Cost and delay (measured)

- Judge calls took 0.46 to 1.06 seconds each (debug log, Haiku 4.5).
- A plain one-sentence reply took 2.9 seconds with one judge call (R3), against 2.3 seconds for the same prompt when the check stopped before the judge (R6).
- A held reply appears all at once after the judge, not word by word. Replies stream normally when no reply protocol can fail.
- R2b (card without the skill, one hold and one layout retry) took 21 seconds. R2 (the retries ran out) took 37 seconds.
- Each Bash call pays one judge call when a shell protocol is not yet satisfied. R4 had three Bash calls and three judge calls.

## 3. Which plugin ships it, and how it is turned on

**Proposed: a new plugin, `protocol-guard`.** Contents: `.claude-plugin/plugin.json`, `hooks/hooks.json` (`{ "modules": ["./engine.ts"] }`), `hooks/engine.ts`, `protocols.default.json`, `tests/*.test.ts`, `tsconfig.json`, `README.md`. No skills and no always-loaded text.

Why not the other homes:

- **`hooks-library`**: its hooks are files copied into a project and registered in settings. A function-hook module cannot be copied; it loads only from an enabled plugin. Putting it there would load the engine wherever `hooks-library` is enabled, and every change to an early-access API would bump a plugin that also carries the Salesforce guards.
- **`second-brain`**: the engine serves the style, the work tracker and git steps too, not only knowledge.
- `plugins/AGENTS.md` says to ask whether a skill belongs in an existing plugin before adding one. This is not a skill. It fits the table row "a whole reusable system": its own README, marketplace entry, `project-init` offer, and a row in `docs/toolkit-map.md`.

Changes and version bumps (per `plugins/AGENTS.md`, "Bump versions"):

- New `plugins/protocol-guard/.claude-plugin/plugin.json`, version `0.1.0`, with `author`. `claude plugin validate` warns without one.
- `.claude-plugin/marketplace.json`: a new entry, and `metadata.version` from `0.124.11` to `0.125.0`.
- **Conflict to settle:** the root `AGENTS.md` says to update `.agents/plugins/marketplace.json` (Codex) when adding a plugin. Codex cannot run function hooks, and Mike decided Codex gets instructions only. Proposed: leave it out of the Codex marketplace and say why in the plugin README.
- `project-init` (`project-sync` and `project-init` skills, `setup-flow.md`): a new step that enables the plugin and sets the variable in the project's settings. Bump its versions.
- `hooks-library` and `second-brain`: the command hooks that step aside (section 4). Bump their versions.
- `plugins/AGENTS.md`, `README.md`, `docs/toolkit-map.md`, `knowledge/toolkit-manual.md`: name the plugin. The manual says only when protocols are checked, not how.

**Turning it on (tested):** `project-sync` writes both keys into the project's `.claude/settings.json`:

```json
"env": { "CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1" },
"enabledPlugins": { "protocol-guard@claude-toolkit": true }
```

- Print mode: the module loaded from project settings (probe run 1).
- Interactive terminal, folder already trusted: the module loaded (probe run 2, with `script` as the terminal).
- The settings reference says project `env` applies "after you trust the workspace, or at startup in `-p` mode" (`settings-reference.md`, "When Claude Code applies env values"). **Unknown:** whether a first session in a not-yet-trusted folder loads the module after trust is accepted, or only after a restart.
- `machine-sync` does not need to set the variable. The user-settings route (T5 run N) would turn function hooks on for every installed plugin on the computer, including plugins from other publishers. Machine-sync only makes sure the marketplace and plugin are installed.
- **Risk:** a later release may add this variable to the list that project settings cannot set (`settings-reference.md`, "Variables Claude Code ignores in env"). The drift test and the notice in section 4 would show it.

## 4. Backup: old command hooks when the setting is off

**Tested:** a module that wraps `classic.UserPromptSubmit` and `classic.Stop` and calls `next({ ...e, toolkit_protocol_engine: ... })` changes the input the settings command hooks receive. A command hook printed the field's value in both events. The chain order is "managed hooks, then modules, then the other settings hooks" (declaration of `ClassicEventOf`), so the module sits above the project's own hooks.

Proposed use:

- The engine sets `toolkit_protocol_engine` to `{ "version": "0.1.0", "active": ["<protocol names>"] }`.
- Each old command hook that has a function-hook replacement checks the field. If the protocol that replaces it is in `active`, it skips that part and keeps the rest. Example: `memory-reminder.mjs` keeps its short reminder line but drops its card instructions when `knowledge-save-before-memory-card` is active.
- With the variable off, or the module failing to load, the field is absent and every old hook runs as today. The field shows that the engine is running at that moment, not only that a setting was written.
- Visible failure: if `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS` is `1` but the field is absent, `toolkit-session-start.mjs` tells the agent once that protocol checks are not running, and the agent tells Mike. Proposed; not built. The engine would also need to stamp `classic.SessionStart`.
- Which old hooks step aside, and which parts, is decided by Parts A, B and C. This part supplies only the mechanism.

## 5. Keeping up with an early-access API

The declaration header says "EARLY ACCESS: this surface may change between releases without notice." Proposed: `tests/protocol-guard-check.mjs`, a fifth check, run before a pull request that touches `plugins/protocol-guard/` and after every Claude Code update. Each step was run by hand here:

1. Find `claude`. If it is missing, as on a Codex-only machine, say so and skip. Do not fail.
2. Compare `claude --version` with the version recorded in the plugin README as last tested. A newer version prints "re-run the print-mode tests".
3. Regenerate the declarations into a temporary folder: `claude -p "/plugin-types"`. **Tested:** it works in print mode and wrote a file byte-identical to T5's.
4. Type-check `hooks/engine.ts` and the tests against those declarations with `tsc --noEmit`. **Tested:** passes on 2.1.280. A renamed event or field fails here.
5. `claude plugin validate plugins/protocol-guard`, and compare its "hooks:" line with the expected event list. **Tested:** it lists every event and every `$` call.
6. `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude plugin test plugins/protocol-guard`. This runs the plugin's `*.test.ts` offline, with the model, files and tools answered by the test. **Tested:** 4 of 4 pass in 0.44 seconds.
7. Check the list: valid JSON, unique names, only known vocabulary words, and every `owner.skill` exists as a `SKILL.md` under `plugins/`.

`tests/AGENTS.md` and its table get the new row. Steps 3 to 6 need Claude Code. Steps 1, 2 and 7 need only Node.

## 6. Testing plan

### Done here (print mode, Sonnet as the main model, Haiku as judge)

| Run | What | Result |
| --- | --- | --- |
| Probe 1 | Project `env` turns function hooks on, print mode; classic field injection | Module loaded; the field reached `UserPromptSubmit` and `Stop` command hooks |
| Probe 2 | Same, interactive terminal, trusted folder | Loaded; field reached both hooks |
| R1 | Inbox Edit without the skill | Refused; agent opened `knowledge-save`, followed it, and its card passed `follows-owner` |
| R2 | Card without the skill, Mike's prompt demands a different layout | Held twice, then passed with the notice. The agent sided with the prompt and told the reader about the check |
| R2b | Card without the skill, no layout given | Held; skill forced open; first redo failed `follows-owner`; second redo passed. Only the final card was shown. The dropped drafts are not in the transcript |
| R3 | Plain question | Judge said no card; reply shown unchanged; 4 s |
| R4 | `./gh issue close 12` (stand-in script) | Judge said yes; refused; agent opened `work` and asked for approval, as the stand-in skill says |
| R6 | Forced error inside the reply check | Original reply shown |
| R7 | Judge unreachable (bad model id) | Two Bash calls refused, third allowed; agent gave up on a harmless `ls` |
| R8 | Helper agent edits the inbox | Helper's Edit refused. The main reply, which only mentioned the blocked save, was wrongly judged a card and held once |
| Offline | `claude plugin test`, 4 tests | All pass |

### Still to do here before build review

- Tighten the reply question after R8 and measure false alarms on real replies: the five DragonFly replies, and 20 or more ordinary replies from this repo's transcripts.
- A real `knowledge-save` executor helper after the main loop opened the skill (inheritance).
- `/clear`, compaction, and a background-task turn (does it raise `turn.start`?).
- Both reply protocols held in one step, and a style check (Part C) in the same `turn.step` chain.
- The `appliesIf` path when the knowledge system is missing, and owner-missing handling.

### Must be tested by Mike

- **Windows, terminal:** the module loads from project `env`. Paths from `$.session.root()` and `file_path` use backslashes and drive letters. The prototype turns backslashes into slashes but does not yet ignore letter case (`C:` against `c:`). Judge latency.
- **Desktop app:** whether its bundled Claude Code honors function hooks and the project `env`. What Mike sees while a reply is held (a spinner or nothing). Whether the `turn.complete` notice shows. Whether Esc during a judge call leaves a reply.
- **Interactive, untrusted folder:** first session after accepting trust.
- **The DragonFly situation end to end**, in a fresh chat, per the #396 roadmap step 5.

## 7. What stays out

- No keyword, regular-expression or semantic matching of language anywhere in the module. The T5 prototype's card detector (`/save this understanding|memory save|proposed memory/i`) is replaced by a judge question. Shell commands are judged, not searched. The only string handling left is on identifiers and paths: splitting a skill id at the colon, and making a path relative.
- No rewrite of the reply by any model. No `$.model.fork`.
- No per-protocol code. A new protocol that uses existing vocabulary words is a list edit.
- No always-loaded instruction text. The how-to stays in the owning skill. The engine's notes reach the agent only when a check fails.
- No forced checks in Codex.
- No use of `$.store` for session state.

## 8. Decisions for Mike

1. **A protocol against an explicit request (R2).** When Mike asks for something a protocol forbids, the engine held the reply twice, then showed it with a notice. Proposed: keep that, with `maxRetries: 1` for layout checks, so the cost is one extra model turn. The alternative is to give the judge Mike's latest message and pass the check when he explicitly asked for something else. That makes the small model decide who wins, which goes against the build philosophy.
2. **Telling Mike about checks.** In R1 and R2 the agent told the reader "a hook blocked me". Proposed: every engine note ends with "Do not mention this check in your reply," and Part C's style check covers the rest.
3. **Bash cost.** One Haiku call (about 0.5 to 1 second) per Bash call while a shell protocol is not yet satisfied. The alternative is to search the command for the protected paths, which is text matching. Proposed: keep the judge, and measure over a real session.
4. **The plugin name** `protocol-guard`, and leaving it out of the Codex marketplace.

## Confirmed, proposed, unknown

- **Confirmed by test:** project `env` enables function hooks (print mode, and an interactive trusted folder); classic-event field injection reaches command hooks; module memory lasts across hooks; list-driven refusal and hold-and-redo; judge-based Bash refusal; fail-open reply check; fail-closed tool check with a crash limit; the `turn.complete` notice; `/plugin-types`, `tsc`, `validate` and `plugin test` as offline drift checks; judge latency 0.46 to 1.06 seconds.
- **Proposed, not built:** the rest of the vocabulary (tool names, prompt, skill, command, read-fully, ran-after-write, session and reset windows); owner-missing check; the stamp on `SessionStart` and the "checks not running" notice; one-free-retry when the judge is unreachable; the protocols-file edit guard; the test file in `tests/`.
- **Unknown:** Windows, desktop app, untrusted first session; turns started by background tasks; how often the judge raises false alarms on real replies; whether the variable stays settable from project settings; how long the 2.1.280 API holds.

## Files

- Prototype plugin: [prototypes/engine/](prototypes/engine/hooks/engine.ts) (`hooks/engine.ts`, [protocols.default.json](prototypes/engine/protocols.default.json), [tests/engine.test.ts](prototypes/engine/tests/engine.test.ts), `tsconfig.json`). Its `tsconfig.json` points at a scratch copy of the declarations that is not kept; regenerate them with `/plugin-types`.
- Test project (stand-in `knowledge-save` and `work` skills, `.claude/protocols.json`): not kept.
- Run outputs (`run-R*.jsonl`, `debug-R*.txt`, `engine-log.jsonl`, the runner `run.sh`, and `summarize.mjs`): not kept.
- Probe for project `env` and the classic field: not kept.
