# R5: Is there a better way to build the project knowledge system?

Written 2026-09-16. Research only. Nothing here is a decision or an approval.

## What this file answers

The toolkit today meets the knowledge requirements with its own layer: six
skills, five hook scripts, one manual file, and two checker scripts. The
question is whether some other thing already does this job better.

The short answer: **no other product meets the hard constraints, but the two
harnesses now ship far more of the plumbing than the current toolkit layer
uses.** The biggest finding is that Codex has copied Claude Code's hook system
almost exactly, so one set of hook scripts can serve both harnesses. The second
biggest finding is that both harnesses now ship their own automatic memory, both
write without asking, and both should stay switched off here.

### The hard constraints I tested every option against

From `/home/user/claude-toolkit/knowledge/prds/knowledge-system.md`:

- Plain Markdown files in this Git repository are the only copy. No database.
  No background writer. (lines 456-462)
- The owner approves before anything lasting is written. (lines 703-744)
- It has to work in Claude Code and in Codex. (line 1588 onward)

### Words used below

- **Harness**: the program the agent runs inside. Claude Code and Codex are the
  two this project uses. The PRD defines the word at lines 74-78.
- **Hook**: a small program the harness runs by itself at a fixed moment, such
  as when a session starts. The harness runs it whether or not the agent decides
  to.
- **Skill**: a folder with a `SKILL.md` file. The harness reads its one-line
  description all the time, and loads the rest only when the skill is used.
- **Compaction**: when a session gets too long, the harness replaces the
  conversation with a summary. Things said only in conversation are lost.

---

## Section 1. Options table

Requirement 1 is "plain parts only": plain Markdown files in this repository are
the only copy, no database, no background writer
(`/home/user/claude-toolkit/knowledge/prds/knowledge-system.md` lines 456-462).

Requirement 10 is "approval before any write": every write to a memory file or a
PRD needs permission that covers that change, and silence is not approval
(same file, lines 703-744).

| Approach | What it is | Who maintains it | Fits req 1? | Fits req 10? | Works in Codex? | What it would replace | Verdict | Source |
|---|---|---|---|---|---|---|---|---|
| Claude Code auto memory (default setup) | Claude writes its own notes to `~/.claude/projects/<project>/memory/`, with a `MEMORY.md` index loaded into every session | Anthropic | No. The files sit outside the repository and are "machine-local... not shared across machines or cloud environments" | No. "Claude doesn't save something every session. It decides what's worth remembering" — no approval step exists | No. Claude Code only | `knowledge/memory/` and the index | **Reject.** The store is outside Git, machine-local, and written without asking, which breaks both hard rules at once. | https://code.claude.com/docs/en/memory fetched 2026-09-16; captured copy `/home/user/claude-toolkit/ai-external-knowledge/claude-code/memory.md` lines 345-410 |
| Claude Code auto memory pointed into the repo with `autoMemoryDirectory` | A setting that moves the auto-memory folder somewhere you choose | Anthropic | Partly. The value "must be an absolute path or start with `~/`", so you cannot commit a repo-relative path that works on every machine | No. Same: Claude still writes without asking | No | `knowledge/memory/` | **Reject.** No portable way to point it at a folder inside this repository, and the no-approval problem stays. | https://code.claude.com/docs/en/memory fetched 2026-09-16 (section "Storage location"); captured copy lines 376-382 |
| `CLAUDE.md` plus `.claude/rules/` (already used here) | Instruction files the harness loads at session start. Rules with a `paths:` field load later, when Claude reads a matching file | Anthropic | Yes. Plain Markdown in the repo | Not applicable. It is guidance, not a store | Codex reads `AGENTS.md`; Claude Code reads `CLAUDE.md` and can import `AGENTS.md` | Nothing. Keep | **Adopt part.** Path-scoped rules are the cheapest way to bring the save policy back exactly when a knowledge file is opened, and the current design does not use them. | https://code.claude.com/docs/en/memory fetched 2026-09-16 (sections "Organize rules with `.claude/rules/`" and "AGENTS.md"); captured copy lines 180-280 |
| Claude Code skills | `SKILL.md` folders. The description stays in context; the body loads only when used | Anthropic | Yes | Not applicable | Yes. Codex supports skills: `/home/user/openai/codex/docs/skills.md` | The six `second-brain` skills stay, in some grouping | **Adopt.** Already in use. The new part worth adopting is skill frontmatter hooks (see Section 3). | https://code.claude.com/docs/en/skills fetched 2026-09-16; captured copy `/home/user/claude-toolkit/ai-external-knowledge/claude-code/skills.md` lines 74-100, 500-520 |
| Claude Code command hooks | Small scripts the harness runs at fixed moments. There are 30-plus events, including `SessionStart` with a `compact` source, `PostCompact`, `PreToolUse`, `Stop`, `InstructionsLoaded`, and `FileChanged` | Anthropic | Yes. Scripts and Markdown in the repo | Yes, when used as a `PreToolUse` gate that returns `deny` | Yes, with nearly the same wire format (see next row) | The five hook scripts in `/home/user/claude-toolkit/.claude/hooks/` stay, but should use more events | **Adopt.** The current setup uses four of the events. `Stop`, `PostCompact`, and `PreToolUse` on `Write`/`Edit` would each close a gap. | `/home/user/claude-toolkit/ai-external-knowledge/claude-code/hooks.md` lines 1088-3403; https://code.claude.com/docs/en/hooks |
| Codex lifecycle hooks | Codex now has 12 hook events with the same names and nearly the same JSON as Claude Code | OpenAI | Yes | Yes. `PreToolUse` can return `permissionDecision: "deny"` | Yes, by definition | The Codex half of the toolkit, which today has no hooks | **Adopt.** This is the single biggest change since the PRD was written. One script can serve both harnesses. | `/home/user/openai/codex/codex-rs/hooks/src/lib.rs` lines 23-35 and 42-52; `/home/user/openai/codex/codex-rs/hooks/schema/generated/pre-tool-use.command.output.schema.json`; repo at commit `9771934`, cloned 2026-09-16 |
| Claude Code prompt hooks (`type: "prompt"`) and agent hooks (`type: "agent"`) | A hook that calls a model, or a small agent with file tools, and gets back `{"ok": true/false, "reason": "..."}` | Anthropic | Yes | Yes, on `PreToolUse` | No. Codex source lists only command and MCP handlers | Some of the judgment now written into hook scripts | **Adopt part, carefully.** Useful for one narrow question ("does this write match an approval on record?"). Requirement 29 warns against building a scorer, so do not use it to grade whether a search was good enough. | `/home/user/claude-toolkit/ai-external-knowledge/claude-code/hooks.md` lines 3404-3591; PRD lines 1683-1690 |
| Codex memories subsystem | A two-phase background pipeline. It summarizes past sessions with a model, stores results in a state database, writes files under `~/.codex/memories/`, and runs a consolidation sub-agent | OpenAI | No. It uses a state database, writes in the background, and keeps its own Git baseline under `~/.codex/memories/.git` | No. The consolidation agent "runs it with no approvals" | It is the Codex feature | `knowledge/memory/` | **Reject, and switch it off.** It is a database plus a background writer plus an unapproved write. That is three hard rules broken. Set `generate_memories = false` and `use_memories = false` under `[memories]` in Codex config. | `/home/user/openai/codex/codex-rs/memories/README.md` lines 29-120; `/home/user/openai/codex/codex-rs/config/src/types.rs` lines 299-357; `/home/user/openai/codex/codex-rs/config/src/config_toml.rs` line 465 |
| Anthropic memory tool (`memory_20250818`) | An API tool. Claude asks for file operations under `/memories`; your own program carries them out | Anthropic | Partly. You choose the storage, so it could be repo files | Partly. You could refuse writes in your handler, but you would be writing that handler | No | Nothing usable here | **Reject for this project.** It is for programs built on the API. Claude Code and Codex are finished programs; you cannot hand them your own tool handler. | https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool fetched 2026-09-16 |
| claude-mem | A community Claude Code plugin. Five hooks record what happens, a model compresses it, and results go into a Chroma vector database and SQLite | Alex Newman, community | No. Vector database plus SQLite | No. It records automatically | No. Claude Code only | The whole knowledge layer | **Reject.** Two databases and an automatic writer. It solves "remember everything cheaply", not "remember only what the owner approved". | https://github.com/thedotmack/claude-mem via search 2026-09-16; https://docs.claude-mem.ai/configuration |
| memsearch | A community memory layer backed by Markdown plus a Milvus vector database. Has plugins for Claude Code and Codex | Zilliz, community | No. Milvus is a database | No. It summarizes every session automatically | Yes, it has a Codex plugin | The find step (`recall`) | **Reject.** Markdown plus Milvus is still a second store, and requirement 29 says do not build a search engine to replace what the agent already does. | https://github.com/zilliztech/memsearch fetched 2026-09-16; PRD lines 1673-1676 |
| Mem0 | A hosted or self-hosted memory service you call from your own code | Mem0 (company) | No. Service plus vector store | No | Only through your own code | Nothing | **Reject.** A service, not files. The PRD already closed this door: the earlier Mem0 recommendation is "exploratory history", not a requirement (lines 1938-1942). | https://mem0.ai/blog/state-of-ai-agent-memory-2026 via search 2026-09-16; PRD lines 1938-1942 |
| Letta (formerly MemGPT) | A whole agent runtime with three memory layers. Agents edit their own memory blocks, and reorganize memory while idle | Letta (company) | No. Database-backed | No. The agent edits its own memory | No | The agent itself | **Reject.** It replaces the harness, not the knowledge layer. The owner wants Claude Code and Codex at the centre. | https://vectorize.io/articles/mem0-vs-letta fetched via search 2026-09-16; PRD lines 1810-1813 |
| Obsidian-style vault | Plain Markdown notes in a folder, with links between them, read in the Obsidian app | Obsidian (app), you (the notes) | Yes. Plain files | Not applicable. It is a file layout, not a rule | Yes. Files are files | Nothing. The PRD folder layout already includes a `.obsidian/` folder (line 189) | **Adopt part, already done.** The layout is fine. It adds no behavior, so it cannot on its own meet requirements 3, 9, 10, or 28. | PRD lines 142-200 |
| `AGENTS.md`-style single handbook | One long instruction file at the repo root that every agent tool reads | Community convention; Codex reads it | Yes | Not applicable | Yes. Claude Code can import it: `@AGENTS.md` in `CLAUDE.md`, or a symlink | Would replace nothing; `knowledge/README.md` already plays this part | **Adopt part.** Worth using the `@AGENTS.md` import so Codex and Claude Code read one file instead of two copies. Note that Claude Code recommends under 200 lines per instruction file, and `knowledge/README.md` is 270 lines. | https://code.claude.com/docs/en/memory fetched 2026-09-16 (sections "AGENTS.md" and "Write effective instructions"); `wc -l /home/user/claude-toolkit/knowledge/README.md` = 270 |
| Git pre-commit hook that checks frontmatter | A script Git runs before a commit is made. It can refuse the commit | Git; you write the script | Yes | Partly. It checks shape, not approval | Yes. Git does not care which agent made the change | Part of what `.claude/tools/check-knowledge.mjs` does | **Adopt part.** The checker already exists but nothing runs it by itself: `/home/user/claude-toolkit/.git/hooks/` holds no active hooks. A pre-commit hook catches a bad file no matter which harness wrote it. | `ls /home/user/claude-toolkit/.git/hooks/` shows only `.sample` files, checked 2026-09-16; https://git-scm.com/docs/githooks |
| Claude Code team memory stores (`CLAUDE_MEMORY_STORES`) | Mentioned once in the changelog as "mounted team memory stores" | Anthropic | Cannot tell | Cannot tell | Cannot tell | Possibly the shared part of `current.md` | **Reject for now.** It appears in one changelog line and in no documentation page. I could not confirm it exists as a supported feature. Do not design against it. | `/home/user/claude-toolkit/ai-external-knowledge/claude-code/changelog.md` line 2059 (release 2.1.172, June 10 2026); https://code.claude.com/docs/en/settings-reference fetched 2026-09-16 lists no such key |

---

## Section 2. How each adopted option helps, in plain steps

### 2.1 Codex lifecycle hooks (new; the largest change)

**Which requirements:** 3 (reliable behavior without reminders), 25 (Codex),
13 (working memory), 28 (pending inbox).

**Why it matters.** The PRD's closing section says: "Do not assume Codex has the
same API or that ordinary hooks cannot track state or block actions"
(PRD lines 1829-1832). As of the Codex `main` branch at commit `9771934`, cloned
2026-09-16, Codex does have the same API, near enough to share scripts.

Codex's hook event list, from `/home/user/openai/codex/codex-rs/hooks/src/lib.rs`
lines 23-35:

```
PreToolUse, PermissionRequest, PostToolUse, PreCompact, PostCompact,
SessionStart, SessionEnd, UserPromptSubmit, SubagentStart, SubagentStop,
Stop, Interrupt
```

Codex's `SessionStart` takes the same `source` values as Claude Code's:
`startup`, `resume`, `clear`, `compact`, `fork`
(`/home/user/openai/codex/codex-rs/hooks/schema/generated/session-start.command.input.schema.json`).

Codex's `SessionStart` output uses the same JSON shape as Claude Code:
`hookSpecificOutput.hookEventName` plus `additionalContext`
(`/home/user/openai/codex/codex-rs/hooks/schema/generated/session-start.command.output.schema.json`).

Codex's `PreToolUse` output takes `permissionDecision` with values
`allow`, `deny`, `ask`, plus `permissionDecisionReason`, `additionalContext`,
and `updatedInput`
(`/home/user/openai/codex/codex-rs/hooks/schema/generated/pre-tool-use.command.output.schema.json`).
Those are the same names Claude Code uses
(`/home/user/claude-toolkit/ai-external-knowledge/claude-code/hooks.md` lines
1770-1790).

Codex's own source says it is copying Claude Code on purpose. The `Stop` output
schema carries this comment about the `reason` field:

> "Claude requires `reason` when `decision` is `block`; we enforce that semantic
> rule during output parsing rather than in the JSON schema."

(`/home/user/openai/codex/codex-rs/hooks/schema/generated/stop.command.output.schema.json`
line 27.)

**Steps.**

1. Take an existing hook script, such as
   `/home/user/claude-toolkit/.claude/hooks/knowledge-session-start.mjs`.
2. Read the JSON on standard input as it does now. The field names match.
3. Write the reply JSON using `hookSpecificOutput.additionalContext`, which both
   harnesses accept.
4. Register the script twice: in `.claude/settings.json` for Claude Code, and in
   a `hooks.json` for Codex.
5. Test in both. Do not assume.

**What I could not verify.** Where a project-scoped Codex `hooks.json` lives.
Codex's own `docs/config.md` is four lines long and points at
`https://developers.openai.com/codex/config-reference`, and that whole domain is
blocked by this session's network proxy. From the test files I can see
`$CODEX_HOME/hooks.json` and a plugin path `<plugin-root>/hooks/hooks.json`
(`/home/user/openai/codex/codex-rs/app-server/tests/suite/v2/hooks_list.rs` lines
99-107). Somebody has to check the live documentation before building.

### 2.2 Switch off both harnesses' own memory

**Which requirements:** 1 (plain parts only), 10 (approval before any write),
29 (data boundaries: "No vendor's own memory categories replace the owner's
definitions", PRD lines 1725-1728).

Claude Code's auto memory is already off here.
`/home/user/claude-toolkit/.claude/settings.json` line 4 sets
`"CLAUDE_CODE_DISABLE_AUTO_MEMORY": "1"`, and
`/home/user/claude-toolkit/.claude/toolkit-sync.md` lines 254-259 record the
reason.

Codex's memory is **not** off, and it is on by default.
`/home/user/openai/codex/codex-rs/config/src/types.rs` lines 356-357 show the
defaults `generate_memories: true` and `use_memories: true`.

What Codex memory does, from
`/home/user/openai/codex/codex-rs/memories/README.md`:

- It starts by itself when a root session starts, and "runs asynchronously in
  the background" (lines 31-38). That is a background writer.
- It stores per-session extracts "back into the state DB" (line 63). That is a
  database.
- It "spawns an internal consolidation sub-agent" and "runs it with no
  approvals, no network, and local write access only" (lines 111-114). That is
  an unapproved lasting write.
- It keeps its own Git repository at `~/.codex/memories/.git` (lines 99-100).
  That is a second store the owner did not ask for.

**Steps.**

1. In the Codex config file, add a `[memories]` section.
2. Set `generate_memories = false` and `use_memories = false`.
3. Record the decision and the reason next to the Claude Code one in
   `.claude/toolkit-sync.md`.
4. Check the live Codex configuration reference for the exact key path before
   relying on it. I read the key names from the Rust source
   (`config_toml.rs` line 465 registers the top-level `memories` table), not from
   documentation, because the documentation site is blocked here.

### 2.3 Path-scoped rules for the save policy

**Which requirements:** 3 (guidance comes back when needed), 9 (saving is
frictionless), 29 (reminders stay small; the full manual is not reloaded on
every message — PRD lines 1703-1706).

Today, `/home/user/claude-toolkit/.claude/hooks/memory-reminder.mjs` prints a
reminder before **every** owner prompt. The script's own comments admit the
tension: "It asks the save question every turn and answers it 'usually not' in
the same breath" (lines 17-20).

A path-scoped rule is the cheaper shape. Claude Code loads a rule with a
`paths:` field only when Claude reads a file that matches:

> "Path-scoped rules trigger when Claude reads files matching the pattern, not
> on every tool use."

(https://code.claude.com/docs/en/memory fetched 2026-09-16, section
"Path-specific rules"; captured copy
`/home/user/claude-toolkit/ai-external-knowledge/claude-code/memory.md` line 218.)

**Steps.**

1. Create `.claude/rules/knowledge-writes.md`.
2. Give it frontmatter: `paths: ["knowledge/**/*.md"]`.
3. Put the save and approval policy in it, in short form.
4. The rule now enters context the first time a session opens any knowledge
   file, and not before.
5. Shrink or delete the every-prompt reminder once this is proven.

**Limit to state out loud.** I found no matching feature in Codex. Codex hooks
have no `paths` field in the event list I read. In Codex the same job falls to
`AGENTS.md` plus a `UserPromptSubmit` or `PreToolUse` hook.

### 2.4 Skill frontmatter hooks

**Which requirements:** 10 (approval before any write), 29 (narrow safeguards).

Claude Code lets a skill declare its own hooks. The harness registers them when
the skill is invoked and keeps them for the rest of the session:

> "Skill hooks: Claude Code registers them when you or Claude invoke the skill
> and keeps running them for the rest of the session, on turns after the skill's
> own turn as well. To have Claude Code remove a hook after its first successful
> run instead, set `once: true` on it."

(`/home/user/claude-toolkit/ai-external-knowledge/claude-code/hooks.md` line 668.)

**Steps.**

1. Add a `hooks:` block to the frontmatter of the `remember` skill.
2. Declare a `PreToolUse` hook matching `Write|Edit`, with
   `if: "Edit(knowledge/**)"`.
3. The hook returns `permissionDecision: "deny"` unless an approval record for
   this exact change exists (see Section 3.1).
4. Because the hook only exists once the skill has been invoked, ordinary work
   in the repository is never slowed down by it.

**Limit.** I could not find an equivalent in Codex. Codex skills exist
(`/home/user/openai/codex/docs/skills.md`) but that file is two lines and points
at the blocked documentation site. In Codex, register the same gate in the plugin
`hooks.json` instead, where it runs all the time.

### 2.5 The `Stop` hook as the end-of-turn save review

**Which requirements:** 3 and 9. Requirement 9 names five moments that force a
save review, one of which is "a turn ends after real work was done"
(PRD lines 669-680).

Nothing in the current setup fires at the end of a turn.
`/home/user/claude-toolkit/.claude/settings.json` registers `SessionStart`,
`PreToolUse` on `Bash`, `PostToolUse` on edits, and `UserPromptSubmit`. There is
no `Stop` entry.

Claude Code's `Stop` hook "Runs when the main Claude Code agent has finished
responding" and can return non-blocking guidance:

> "Use `additionalContext` when the hook is working as designed and giving Claude
> guidance, such as 'run the test suite before finishing'. It keeps the
> conversation going through the same loop protections as `decision: "block"`."

(`/home/user/claude-toolkit/ai-external-knowledge/claude-code/hooks.md` lines
2467 and 2556.)

Codex has the same event
(`/home/user/openai/codex/codex-rs/hooks/src/lib.rs` line 33).

**Steps.**

1. Add a `Stop` hook that reads `last_assistant_message` from its input.
2. If the turn changed files under `knowledge/` or closed work, return
   `hookSpecificOutput.additionalContext` telling the agent to run the save
   review.
3. Guard against loops. The input field `stop_hook_active` is `true` when the
   harness is already continuing because of a stop hook, and the harness "ends
   the turn after 8 consecutive blocks" anyway
   (same file, line 2477).

### 2.6 `SessionStart` with `source: "compact"`, plus `PostCompact`

**Which requirements:** 3 and 29. The PRD asks: "Which documented events can
reliably deliver startup guidance, recover it after context loss...?"
(PRD lines 1946-1948).

The answer, for Claude Code:

- `SessionStart` fires with `source: "compact"` after compaction
  (`hooks.md` lines 1098-1106). The current settings file already matches
  `startup|resume|clear|compact` (`/home/user/claude-toolkit/.claude/settings.json`
  line 13), so this part is already done.
- `PostCompact` fires after compaction and carries `compact_summary`, the summary
  the harness generated (`hooks.md` line 3023). It cannot change anything;
  it is for reacting.
- The root `CLAUDE.md` is re-read on its own: "Project-root CLAUDE.md survives
  compaction: after `/compact`, Claude re-reads it from disk and re-injects it
  into the session"
  (https://code.claude.com/docs/en/memory fetched 2026-09-16; captured copy line
  465).
- `InstructionsLoaded` fires with `load_reason: "compact"` when instruction files
  reload after compaction, and is for logging only: it "has no decision control"
  (`hooks.md` lines 1264-1298).

For Codex: `SessionStart` with `source: "compact"` exists
(`/home/user/openai/codex/codex-rs/hooks/schema/generated/session-start.command.input.schema.json`).
`PostCompact` exists but its outcome type is `StatelessHookOutcome`, which
carries only `should_stop` and `stop_reason` and no context field
(`/home/user/openai/codex/codex-rs/hooks/src/events/compact.rs` lines 44-49). So
in Codex, put the recovery text on `SessionStart`, not `PostCompact`.

### 2.7 A Git pre-commit check

**Which requirements:** 21 (indexes and the checker), 3 (a save is not complete
until its checks pass).

`/home/user/claude-toolkit/.claude/tools/check-knowledge.mjs` already exists.
Nothing runs it by itself: `/home/user/claude-toolkit/.git/hooks/` contains only
`.sample` files, checked 2026-09-16.

**Steps.**

1. Add a `pre-commit` script that runs `check-knowledge.mjs` when the staged
   files include anything under `knowledge/`.
2. Exit non-zero on failure, which stops the commit
   (https://git-scm.com/docs/githooks, `pre-commit`).
3. Ship the script through `/machine-sync`, because Git hooks are not committed
   with the repository by default.

**Honest limit.** A Git hook checks shape, not meaning. It can see that a
`summary` field is missing. It cannot see whether the owner approved the
sentence. Requirement 29 says the same thing: "A file that passes its checks is
not proof that what it says is right" (PRD lines 1691-1695).

---

## Section 3. Concrete cited patterns

### 3.1 Approval-gated writes with files and hooks only

**The mechanism.** A `PreToolUse` hook on `Write` and `Edit` returns
`permissionDecision: "deny"` unless the write matches an approval record.

Claude Code's documentation is explicit that this is the right tool for a hard
stop:

> "Claude treats them as context, not enforced configuration. To block an action
> regardless of what Claude decides, use a PreToolUse hook instead."

(https://code.claude.com/docs/en/memory fetched 2026-09-16; captured copy
`/home/user/claude-toolkit/ai-external-knowledge/claude-code/memory.md` line 26.)

**Three pieces that make this practical.**

1. **Scope the hook to the right paths with `if`, not with your own code.**
   The `if` field takes permission-rule syntax such as `"Edit(*.ts)"`, and "the
   hook command only runs if the tool call matches the pattern"
   (`hooks.md` line 430). So `if: "Edit(knowledge/**)"` means the hook never runs
   on ordinary code edits. Watch the depth rule: a one-segment pattern like
   `"Edit(src/**)"` matches only the top-level `src`; use `"Edit(**/src/**)"` for
   any depth (`hooks.md` line 437).

2. **Paths arrive absolute and already expanded.** "Claude Code expands `~` and
   relative paths before hooks run, so a hook that matches on paths can't be
   bypassed via `~` or a relative spelling of the same path" (`hooks.md` line
   1561). On Windows the separators are backslashes, and a check written with
   forward slashes silently matches nothing (`hooks.md` lines 1566-1568).

3. **The approval record is the marker.** The approval lives in
   `knowledge/memory-inbox.md`, which requirement 28 already defines: it holds
   "a reference that does not change; the destination and the operation; the
   exact card when one was shown... its state", with states
   `awaiting approval`, `approved, save unfinished`, and `blocked by conflict`
   (PRD lines 1629-1645). The hook reads that file and allows a write to a
   destination only when an entry for it reads `approved, save unfinished`.

**Two known holes in this gate.**

- A `PreToolUse` hook does not fire for files the owner pulls in with `@` in a
  prompt, "because Claude Code inserts their contents while building the prompt,
  so no PreToolUse hook fires for them" (`hooks.md` line 1550). That affects
  reads, not writes, so it is not fatal here.
- It also does not stop a write made through `Bash`, for example
  `echo ... >> knowledge/...`. You would need a second hook matching `Bash`. The
  repo already has that shape: `/home/user/claude-toolkit/.claude/hooks/save-reminder.mjs`
  is registered as a `PreToolUse` hook on `Bash`
  (`/home/user/claude-toolkit/.claude/settings.json` lines 24-31).

**The same pattern in Codex.** `PreToolUse` with `permissionDecision` of
`allow`, `deny`, or `ask`, plus `permissionDecisionReason`
(`/home/user/openai/codex/codex-rs/hooks/schema/generated/pre-tool-use.command.output.schema.json`).

**A documented example of judgment inside a hook.** If a simple file check is not
enough, Claude Code supports a `prompt` hook that sends the hook input to a model
and gets back `{"ok": true/false, "reason": "..."}`, and an `agent` hook that can
read files first (`hooks.md` lines 3404-3591). Use this narrowly. Requirement 29
says guidance about looking things up "starts with the lightest check that works"
and warns "Do not build something that scores whether the search was good enough"
(PRD lines 1683-1690).

### 3.2 Bringing guidance back after compaction

Four documented mechanisms, from cheapest to most work:

| Mechanism | What it does | Where documented |
|---|---|---|
| Root `CLAUDE.md` reload | Happens on its own. "after `/compact`, Claude re-reads it from disk and re-injects it into the session" | https://code.claude.com/docs/en/memory fetched 2026-09-16; captured copy line 465 |
| Path-scoped rules | Reload "as Claude reads files they apply to" | Same source, same line |
| `SessionStart` with matcher `compact` | Your script runs and returns `hookSpecificOutput.additionalContext` | `hooks.md` lines 1098-1106; already wired at `/home/user/claude-toolkit/.claude/settings.json` line 13 |
| `PostCompact` | Gives you `compact_summary`, the text the harness produced. Cannot change anything: "PostCompact hooks have no decision control" | `hooks.md` lines 3023 and 3036 |

**What is explicitly lost.** "If an instruction disappeared after compaction, it
was given only in conversation, lives in a nested CLAUDE.md that hasn't reloaded
yet, or is a path-scoped rule that hasn't matched a file since"
(memory page, fetched 2026-09-16; captured copy line 467). This is the exact
reason requirement 28's inbox has to be a file. Anything held only in the
conversation is gone.

**`PreCompact` is a poor place to write a save.** It can block compaction by
exiting 2, and "Blocking automatic compaction... If compaction was triggered to
recover from a context-limit error already returned by the API, the underlying
error surfaces and the current request fails" (`hooks.md` line 2991). Do
not put a knowledge save there.

**In Codex.** Use `SessionStart` with `source: "compact"`. Codex's `PostCompact`
carries no context field
(`/home/user/openai/codex/codex-rs/hooks/src/events/compact.rs` lines 44-49).

### 3.3 End-of-turn review triggers

| Trigger | How it fires | Notes |
|---|---|---|
| `Stop` hook | Fires when the main agent finishes responding. Gets `last_assistant_message` so you do not have to parse the transcript | "Does not run if the stoppage occurred due to a user interrupt" (`hooks.md` lines 2467-2468) |
| `Stop` with `additionalContext` | Continues the turn with guidance, labelled "Stop hook feedback" rather than a hook error | `hooks.md` line 2556 |
| `Stop` with `decision: "block"` | Forces the agent to keep working, with `reason` required | `hooks.md` line 2543 |
| Loop guard | `stop_hook_active` in the input, plus "Claude Code overrides the hook and ends the turn after 8 consecutive blocks" | `hooks.md` line 2477 |
| Background work guard | `background_tasks` and `session_crons` arrays let the hook tell "session is done" from "session is paused waiting for background work" | `hooks.md` line 2481 |
| `PostToolUse` on edits | Already used here for the spec-check reminder | `/home/user/claude-toolkit/.claude/settings.json` lines 42-51 |
| `FileChanged` | Fires when a watched file changes on disk, whatever wrote it | Limited: the matcher registers "each segment as a literal filename in the working directory". You cannot watch `knowledge/memory/memory-entries/*.md` with it (`hooks.md` lines 2794 and 2800) |

A documented third-party system that uses this exact shape: claude-mem wires five
hooks (`SessionStart`, `UserPromptSubmit`, `PostToolUse`, `Stop`, `SessionEnd`),
where `Stop` "summarizes the current session into structured memory" and
`SessionEnd` finalizes it
(https://github.com/thedotmack/claude-mem and https://docs.claude-mem.ai/configuration,
via search 2026-09-16). The wiring is worth copying. The automatic writing is not,
because requirement 10 needs approval first.

### 3.4 Plain-language skill invocation

Requirement 24 asks that the owner can ask for a knowledge operation in ordinary
words (PRD lines 1567-1587). The harness already does this.

- "the `description` helps Claude decide when to load the skill automatically"
  (`/home/user/claude-toolkit/ai-external-knowledge/claude-code/skills.md` line
  74).
- The field to use for trigger phrases is `when_to_use`: "Additional context for
  when Claude should invoke the skill, such as trigger phrases or example
  requests. Appended to `description` in the skill listing" (`skills.md` line
  341).
- There is a budget. "the combined `description` and `when_to_use` text is
  truncated at 1,536 characters in the skill listing to reduce context usage"
  (`skills.md` line 340). Put the main case first.
- Only the description sits in context. "In a regular session, skill
  descriptions are loaded into context so Claude knows what's available, but
  full skill content only loads when invoked" (`skills.md` line 513).
- A skill's body stays in context after it loads, and "Claude Code does not
  re-read the skill file on later turns, so write guidance that should apply
  throughout a task as standing instructions rather than one-time steps"
  (`skills.md` line 518). That matters for the `remember` skill, which is 148
  lines.

**What this replaces.** Nothing has to be built for plain-language invocation.
Write the descriptions well. That is the whole mechanism.

---

## Section 4. Honest limits

### 4.1 Things nobody has solved

**Proving that an agent actually read something.** Requirement 2 asks the system
to check "that all three reads finished: the contents of each file reached the
agent and were read" (PRD lines 278-280). No harness offers this.
`InstructionsLoaded` gets close but only covers `CLAUDE.md` and
`.claude/rules/*.md`, and it "has no decision control. They can't block or modify
instruction loading" (`hooks.md` lines 1264 and 1297). It tells you a file was put
into context. It cannot tell you the agent used it.

**Proving that the right knowledge was consulted.** You can count tool calls. You
cannot tell from outside whether a search was the right search. The PRD already
accepts this: "A confirmation is bookkeeping; it does not prove the agent
understood anything, or that the answer was any good" (PRD lines 1683-1687).

**Judging whether a written fact is true.** This project already learned this the
expensive way. On 2026-08-04 a memory agent wrote "nine months after the manifest
was written" into a committed file when the real gap was four days, "and **it had
been given both dates in its instructions**"
(`/home/user/claude-toolkit/knowledge/brainstorms/2026-08-04-memory-system-cost-and-correctness.md`
lines 71-74). The right facts were in front of it. No schema, no checker, and no
source layer would have caught that. Only a reader who knows the subject catches
it.

**Shared state across machines.** Both harnesses' own memory is per-machine.
Claude Code: "Auto memory is machine-local... Files are not shared across
machines or cloud environments" (memory page fetched 2026-09-16; captured copy
line 398). Codex stores under `~/.codex/memories/`
(`/home/user/openai/codex/codex-rs/memories/README.md` line 100). Git is the only
mechanism here that crosses machines, which is exactly why requirement 9 insists
a save is "finished only when the file is on the default branch and pushed"
(PRD line 678).

**Two sessions editing the same shared file.** Requirement 13 needs parallel
sessions to merge into `current.md` without erasing each other (PRD lines
858-861). No harness helps with this. Codex's own memory pipeline had to solve
the same problem with a lock: it "claims a single global phase-2 lock before
touching the memories root"
(`/home/user/openai/codex/codex-rs/memories/README.md` lines 85-86). A file-based
system here has to either take a lock, or make every session read before it
writes, or use append-only files that Git merges cleanly.

### 4.2 Things that depend on the model's judgment, whatever you build

- **Whether something is worth remembering.** Requirement 11 defines what counts.
  A rule cannot apply it; a reader has to.
- **Where a piece of information belongs.** Requirement 18's routing table is 20
  rows of meaning. Memory, PRD, skill, rule, tracker, brainstorm, captured
  documentation. A script can check that a file landed in a valid folder. It
  cannot check that it landed in the right one.
- **Whether an approval covers this particular change.** A hook can check that an
  approval record exists for a destination. Whether the owner's yes stretches to
  the sentence actually written is a reading question. The PRD says so:
  "The agent works out what the content means, and the owner approves that
  meaning" (PRD lines 1691-1695).
- **Whether a fact is still current.** Requirement 19 says a status label "does
  not on its own prove how the system behaves today" (PRD line 1370). Only
  looking at the live system settles it.

### 4.3 What I could not verify in this session

1. **Codex's official documentation.** `developers.openai.com` is blocked by this
   session's network proxy. Everything I report about Codex comes from the source
   at commit `9771934`, cloned 2026-09-16. Source can be ahead of, or different
   from, what ships in a released build. Check the live documentation before
   building.
2. **Where a project-scoped Codex `hooks.json` goes.** Test files show
   `$CODEX_HOME/hooks.json` and `<plugin-root>/hooks/hooks.json`. I found no
   repository-root path.
3. **Whether Codex memory is on in the owner's installed Codex build.** I read a
   default of `true` in source. I did not run Codex.
4. **`CLAUDE_MEMORY_STORES`.** One changelog line names it
   (`/home/user/claude-toolkit/ai-external-knowledge/claude-code/changelog.md`
   line 2059). The settings reference at
   https://code.claude.com/docs/en/settings-reference, fetched 2026-09-16, lists
   only `autoMemoryEnabled`, `autoMemoryDirectory`, `claudeMd`, and
   `claudeMdExcludes`. I could not confirm it is a supported feature.
5. **The `origin/claude/claude-mem-comparison-k1j7f5` branch.** The task named it
   as holding an earlier claude-mem comparison. It does not. Its newest commit is
   `b705b8e`, "Log three todos: PR memory hook, session-start rules hook, rule
   audit", dated 2026-08-01, and it changes only `TODO.md`. Searching the whole
   branch for "claude-mem" returns nothing. The branch is 15 commits of older
   toolkit history, not a comparison. Its `TODO.md` does contain two ideas that
   match findings above: a hook that starts the memory review after a pull
   request is opened, and a `SessionStart` hook that loads the project rules.
6. **Anthropic's own writing on long-running agents.** `anthropic.com` is blocked
   by this session's proxy. I used the same material as restated on
   https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool,
   fetched 2026-09-16, which sets out a three-step pattern: an initializer
   session creates the progress file and feature checklist, later sessions open
   by reading them, and every session updates the progress log before it ends.
   That is the same shape as `knowledge/memory/current.md` in requirement 13.
7. **Third-party tools.** I did not install or run claude-mem, memsearch, Mem0,
   or Letta. Their descriptions come from vendor pages and search results fetched
   2026-09-16. Star counts and version numbers in those pages are marketing
   figures I did not check.

### 4.4 One thing worth weighing that is not in the table

The current layer prints a reminder before every owner prompt
(`/home/user/claude-toolkit/.claude/hooks/memory-reminder.mjs`, registered at
`/home/user/claude-toolkit/.claude/settings.json` lines 53-62). The reminder is
about 20 lines of policy text on every message.

This repository has already removed one every-message hook for this exact reason.
`/home/user/claude-toolkit/.claude/rules/README.md` line 74 records that `style-reminder`
"re-stated the style on every message; the owner removed it later that month as
per-message overhead for an instruction the harness already re-delivers".

Path-scoped rules (Section 2.3) and the `Stop` hook (Section 2.5) between them
cover the same ground and cost nothing on a turn that never touches knowledge.
That is a real candidate for cutting, and it is the kind of trade the design
exercise the PRD asks for should decide (PRD lines 1918-1936).
