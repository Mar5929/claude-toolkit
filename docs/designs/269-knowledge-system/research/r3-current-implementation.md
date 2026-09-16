# What the toolkit ships today for project knowledge, and how it maps to the PRD

Written for someone new to this repository. Every claim names a file and line
numbers. Paths are relative to `/home/user/claude-toolkit`.

The PRD audited against is `knowledge/prds/knowledge-system.md`. It has 1,951
lines. Its 30 numbered requirements start at line 456 and end at line 1795. The
closing "Potential paths to explore" section runs from line 1797 to line 1951.

Two words are used throughout:

- **Reminds** means the part prints text. The agent can ignore it.
- **Blocks** means the part stops the tool call. The agent must act.

---

## Section 1. Inventory

### 1.1 The plugin package

| Part | Path | Kind | Lines | What it does | Harness event or moment | Blocks or reminds | State kept, and where |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Plugin readme | `plugins/second-brain/README.md` | Markdown | 127 | Describes the package for a maintainer. Lists what gets installed into a project (lines 21-44) and what is deliberately absent (lines 115-121). | None. A person reads it. | Neither | None |
| Claude manifest | `plugins/second-brain/.claude-plugin/plugin.json` | JSON | 9 | Names the plugin `second-brain` at version `4.9.1` (lines 2-4). | Plugin load | Neither | None |
| Codex manifest | `plugins/second-brain/.codex-plugin/plugin.json` | JSON | 38 | Same name and version, plus a Codex store listing (lines 18-37). It points Codex at `./skills/` (line 17). It registers no hooks. | Plugin load | Neither | None |
| Startup loader | `plugins/second-brain/hooks/knowledge-session-start.mjs` | Node hook | 130 | Reads six files in a fixed order and prints them to stdout (lines 27-46, 82-116). It prints `SOUL.md`, `knowledge/README.md`, `knowledge/project.md` and `knowledge/current.md` whole, and prints only the list entries of the two indexes (lines 49-63). A missing file becomes a one-line note and the session continues (lines 88-101). | Claude `SessionStart`, matcher `startup\|resume\|clear\|compact` (`.claude/settings.json` lines 12-23). Codex `SessionStart` (`.codex/hooks.json` lines 4-18). | Reminds | None |
| Per-prompt reminder | `plugins/second-brain/hooks/memory-reminder.mjs` | Node hook | 75 | Prints a fixed 11-line block of policy pointers before every owner message (lines 36-48). It prints nothing unless `knowledge/README.md` starts with the marker `<!-- claude-toolkit:knowledge-manual -->` (lines 33-34, 51-59). | Claude `UserPromptSubmit`, no matcher (`.claude/settings.json` lines 53-63). Not registered for Codex. | Reminds | None |
| Pull-request hold | `plugins/second-brain/hooks/save-reminder.mjs` | Node hook | 210 | When a Bash command opens a pull request, it denies the command once and tells the agent to run `remember` first (lines 134-146, 179-202). If every changed path starts with `knowledge/` it prints a different message that sends the save to the default branch instead (lines 99-102, 148-167). | Claude `PreToolUse`, matcher `Bash` (`.claude/settings.json` lines 24-32). | Blocks, once per branch per session | Writes a JSON file per session under the OS temp folder, at `<tmp>/second-brain-save-reminder/<session-id>.json` (lines 104-132). Confirmed at runtime: `/tmp/second-brain-save-reminder/s2.json` was created. Nothing is written inside the repository. |
| Work-item hold | `plugins/second-brain/hooks/work-item-close.mjs` | Node hook | 125 | When a Bash command closes an issue or merges a pull request, it denies the command once and tells the agent to run `remember` (lines 75-87, 99-117). | Claude `PreToolUse`, matcher `Bash` (`.claude/settings.json` lines 33-37). | Blocks, once per work item per session | Writes `<tmp>/second-brain-work-item-close/<session-id>.json` (lines 45-73). Confirmed at runtime. |
| Command parser | `plugins/second-brain/hooks/command-parsing.mjs` | Node module | 71 | Shared helper. Strips heredocs and quoted text, splits a command line into segments, and holds the two pattern lists: `gh pr create` (line 70) and `gh issue close` or `gh pr merge` (line 71). | Imported by the two hold hooks | Neither | None |
| `recall` skill | `plugins/second-brain/skills/recall/SKILL.md` | Skill | 62 | Tells the agent how to walk the manual's find order and which source wins (lines 15-44). Says to answer from a `finalized` or legacy `current` PRD only (lines 35-38). | Agent chooses to invoke it | Reminds | None |
| `remember` skill | `plugins/second-brain/skills/remember/SKILL.md` | Skill | 148 | Six steps: gather candidates, search with `recall`, draft and wait, write only what was approved, run the builder and checker, log the decision (lines 36-136). Step 4 says an approved knowledge-only save commits to the default branch and is pushed (lines 106-109). | Agent invokes it, or a hold hook tells it to | Reminds | None. It appends lines to `knowledge/memory-self-improvement.md` (lines 124-132), but only when the owner proposes a change to what counts as memory. |
| Proposal template | `plugins/second-brain/skills/remember/references/proposal-template.md` | Reference | 131 | The one approved layout for a save proposal: a bold headline with an arrow, a block quote, and five bullets named `Why`, `Where`, `From`, `Unsure`, `Checked` (lines 25-35, 58-71). | Read by `remember` before proposing | Reminds | None |
| `retire` skill | `plugins/second-brain/skills/retire/SKILL.md` | Skill | 62 | Takes one file out of current use by superseding, retiring, or deleting it, and repairs links (lines 17-42). Never commits or pushes (line 62). | Agent invokes it | Reminds | None |
| `reflect` skill | `plugins/second-brain/skills/reflect/SKILL.md` | Skill | 71 | Reviews the whole folder for duplicates and contradictions (lines 15-36) and merges repeated lines in the self-improvement file into lessons (lines 38-50). | Agent invokes it | Reminds | None |
| `second-brain` skill | `plugins/second-brain/skills/second-brain/SKILL.md` | Skill | 196 | Detects what shape a project is in (lines 55-68), installs the system in nine steps (lines 70-94), converts a project off the older folder layout (lines 105-150), and renames `knowledge/specs/` to `knowledge/prds/` (lines 152-171). | Agent invokes it, or `project-init` calls it | Reminds | None |
| `session-search` skill | `plugins/second-brain/skills/session-search/SKILL.md` | Skill | 74 | Runs a read-only search of locally saved Claude Code CLI conversations (lines 17-56). Refuses an all-project search without an extra flag (lines 33-35). | Agent invokes it, normally after the project files find nothing | Reminds | None |
| Session search script | `plugins/second-brain/skills/session-search/scripts/search-sessions.mjs` | Node script | 658 | Does the actual read-only search over Claude Code CLI transcript files. | Run by the skill | Neither | None. It reads transcripts and writes nothing. |
| Index builder | `plugins/second-brain/tools/build-knowledge-index.mjs` | Node tool | 151 | Rewrites `knowledge/memory/memory-index.md` and `knowledge/prds/spec-index.md` (lines 28-54, 93-138). One line per file, taken from that file's `summary` field (lines 109-117). It validates nothing (line 13). It warns when it finds a subfolder and does not index it (lines 102-107). | Run by hand, or by `remember`, `retire`, `reflect` | Neither | Writes the two index files |
| Checker | `plugins/second-brain/tools/check-knowledge.mjs` | Node tool | 319 | Read-only. Checks the manual's SHA-256 (lines 32, 273-289), field names and values (lines 42-59, 134-175), the `summary` length limit (lines 31, 177-181), the size of `current.md` and `memory-self-improvement.md` (lines 29-30, 244-271), flat folders (lines 227-231), file naming (lines 235-239), supersede links (lines 188-210), a title heading (lines 212-215), and eight secret patterns (lines 69-79, 97-106). Exit 1 on any problem. | Run by hand, or by the skills | Neither. It reports only. | None. It never edits a file (lines 5-8). |
| Frontmatter parser | `plugins/second-brain/tools/frontmatter.mjs` | Node module | 116 | Reads the YAML block at the top of a knowledge file. Handles scalars and flat lists only, and reports anything else instead of guessing (lines 1-9). | Imported by the builder and the checker | Neither | None |

### 1.2 The templates the plugin installs into a project

| Part | Path (under `plugins/second-brain/skills/second-brain/references/templates/`) | Lines | What it is |
| --- | --- | --- | --- |
| Knowledge manual | `knowledge/README.md` | 270 | The whole runtime policy. Startup order (lines 13-20), the routing table (lines 26-42), trust order (line 48), the find order (lines 56-64), what to save (lines 97-108), what never to save (lines 110-127), file fields (lines 143-169), approval and proposal shape (lines 175-214), lifecycle (lines 218-242), self-improvement (lines 244-258), skill map (lines 262-270). Every project receives it byte for byte; the checker pins its SHA-256. |
| Agent role | `SOUL.md` | 23 | Placeholder prompts for who the agent is in this project. |
| Project framing | `knowledge/project.md` | 31 | Placeholder prompts for what the project is and where work is tracked. |
| Working memory | `knowledge/current.md` | 28 | Placeholder with five headings. Says it is capped at 2,000 characters (line 7). |
| Selection feedback | `knowledge/memory-self-improvement.md` | 27 | Two sections, `## Lessons` and `## Recent decisions`. Says it is capped at 8,000 characters (line 13). |
| Memory index seed | `knowledge/memory/memory-index.md` | 12 | Empty generated index. |
| PRD index seed | `knowledge/prds/spec-index.md` | 12 | Empty generated index. |
| Brainstorms folder | `knowledge/brainstorms/.gitkeep` | 1 | Keeps an empty folder in Git. |
| Obsidian settings | `knowledge/.obsidian/app.json` | 5 | Three relative-link settings. |

### 1.3 Parts outside the plugin that belong to the same system

| Part | Path | Kind | Lines | What it does | Moment | Blocks or reminds | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Spec-check reminder | `plugins/hooks-library/hooks/spec-check-reminder.mjs` | Node hook | 64 | Prints one reminder on the session's first file edit, asking whether the `spec-check` skill has run before building from a `knowledge/prds/` file (lines 54-63). | Claude `PostToolUse`, matcher `Edit\|Write\|NotebookEdit` (`.claude/settings.json` lines 41-52) | Reminds | Writes `<tmp>/claude-spec-check-reminder/<session-id>` (lines 44-52). Confirmed at runtime. |
| Direct-commit rule | `plugins/project-init/library/rules/general/knowledge-direct-commit.md` | Rule | 56 | A path-scoped rule (`paths: knowledge/**`, lines 1-4). An authorized save under `knowledge/` commits to the default branch and is pushed, in six steps (lines 17-43). Says what to do when a save cannot finish (lines 45-53). | Claude loads it when a `knowledge/` file is read | Reminds | None |
| Handoff rule | `plugins/project-init/library/rules/general/offer-context-handoff.md` | Rule | 29 | Says a handoff runs `remember` before the prompt is written (lines 10-15). | Loaded at startup | Reminds | None |
| Work-item stages rule | `plugins/project-init/library/rules/general/work-item-stages.md` | Rule | 133 | Owns the fourteen stages and the tracker update rules. The manual points at it instead of repeating it (`knowledge/README.md` line 70). | Loaded at startup | Reminds | None |
| Output style | `plugins/project-init/library/output-styles/plain-english.md` | Style | 88 | How the agent writes. Selected in `.claude/settings.json` line 2. | System prompt | Reminds | None |
| `handoff` skill | `plugins/session-skills/skills/handoff/SKILL.md` | Skill | 306 | Step 2 invokes `remember` (lines 21, 85). It detects the knowledge system by its complete layout: `SOUL.md`, `knowledge/README.md`, `knowledge/project.md`, `knowledge/current.md`, `knowledge/prds/`, `knowledge/memory/`, `knowledge/brainstorms/`, and the installed `remember` skill (lines 78-83). | Owner runs `/handoff` | Reminds | None |
| `grill-me` skill | `plugins/session-skills/skills/grill-me/SKILL.md` | Skill | 131 | Writes raw brainstorms to `knowledge/brainstorms/` and invokes `remember` at the end (lines 29-46, 114-120). | Owner runs `/grill-me` | Reminds | Writes a dated brainstorm file |
| `spec-check` skill | `plugins/session-skills/skills/spec-check/SKILL.md` | Skill | 101 | Reviews a `knowledge/prds/` file before building from it (lines 14-24, 74-75). | Owner runs `/spec-check` | Reminds | May edit the PRD after approval |
| Setup skill | `plugins/project-init/skills/project-init/SKILL.md` | Skill | 640 | Gate 3 offers the second brain as its own yes-or-no choice, writes the real `SOUL.md` and `project.md`, copies tools and hooks, registers them, and runs both tools (lines 242-306). | Owner runs `/project-init` | Reminds | Creates project files |
| Sync skill | `plugins/project-init/skills/project-sync/SKILL.md` | Skill | 809 | Audits an existing project. Classifies the knowledge layout as current, older, or none (lines 225-253), then checks every shipped part against the package (lines 255-277). | Owner runs `/project-sync` | Reminds | Reports first, then changes with approval |
| Machine sync skill | `plugins/project-init/skills/machine-sync/SKILL.md` | Skill | 291 | Removes the retired machine-wide activation rule and its Codex block (lines 63-66, 146-161). | Owner runs `/machine-sync` | Reminds | Changes machine files |
| System Guide startup hook | `plugins/system-guide/hooks/system-guide-session-start.mjs` | Node hook | 56 | Prints a one-line guide status when the guide is configured (lines 25-38). The second brain prints `System Guide is not configured.` only when the config is absent or disabled (`knowledge-session-start.mjs` lines 24-25, 71-80). | `SessionStart` | Reminds | None |
| Startup contract test | `tests/knowledge-startup-check.mjs` | Test | 457 | Locks the startup file order (lines 85-95), the loader's behavior (lines 113-166), Claude and Codex hook parity (lines 171-183), the root fallback text (lines 185-201), the manual's size and SHA-256 (lines 203-231), the proposal template's five labels and their order (lines 277-304), and 30 checker approval cases (lines 320-370). | Run by hand before a pull request | Neither | None |
| Installed copy test | `tests/installed-copy-check.mjs` | Test | 233 | Fails when a file under `.claude/` and its shipped original differ (lines 87-108). Maps the five hooks and three tools back to the plugin (lines 92-104). | Run by hand | Neither | None |

### 1.4 The installed copies in this repository

Every installed copy is byte for byte the same as its shipped original. This was
checked with `diff` for all five hooks (`.claude/hooks/knowledge-session-start.mjs`,
`memory-reminder.mjs`, `save-reminder.mjs`, `work-item-close.mjs`,
`command-parsing.mjs`), all three tools (`.claude/tools/build-knowledge-index.mjs`,
`check-knowledge.mjs`, `frontmatter.mjs`), `.claude/hooks/spec-check-reminder.mjs`,
and `knowledge/README.md`. All ten matched.

`tests/installed-copy-check.mjs` is what keeps them matching. Lines 87-108 say
where each installed file's original lives. Lines 59-64 pin `knowledge/README.md`
to the packaged template.

The registrations live in `.claude/settings.json` (65 lines) and
`.codex/hooks.json` (20 lines). Codex registers only the startup loader
(`.codex/hooks.json` lines 4-18), with `additionalContextLimit` 5000 (line 13).
Codex gets no per-prompt reminder, no pull-request hold, and no work-item hold.

---

## Section 2. Context cost

### 2.1 At session start

Measured by running the hook with the required fake input and
`CLAUDE_PROJECT_DIR=/home/user/claude-toolkit`:

```
echo '{"session_id":"x","hook_event_name":"SessionStart","source":"startup","cwd":"/home/user/claude-toolkit"}' | node .claude/hooks/knowledge-session-start.mjs
```

Result: exit code 0, **20,585 characters, 417 lines**. Nothing was written to a
file.

Where those characters come from:

| Piece | Characters | Source |
| --- | --- | --- |
| `SOUL.md` | 443 | Printed whole |
| `knowledge/README.md` | 13,395 | Printed whole. This is 65 percent of the total. |
| `knowledge/project.md` | 1,964 | Printed whole |
| `knowledge/current.md` | 1,847 | Printed whole |
| `knowledge/memory/memory-index.md` | 803 | Entry lines only. The whole file is 1,170. |
| `knowledge/prds/spec-index.md` | 1,594 | Entry lines only. The whole file is 2,186. |
| Labels, separators, and the System Guide line | about 539 | Added by the loader (`knowledge-session-start.mjs` lines 104, 113, 115) |

`tests/knowledge-startup-check.mjs` lines 211-214 cap the manual at 280 lines and
2,000 words. The manual is at 270 lines, so it is near that cap.

The loader fires on four source values: `startup`, `resume`, `clear`, and
`compact` (`.claude/settings.json` line 14). So the full 20,585 characters are
paid again after every context clear and every compaction, not only once.

### 2.2 Per user message

```
echo '{"session_id":"x","hook_event_name":"UserPromptSubmit","prompt":"hello","cwd":"..."}' | node .claude/hooks/memory-reminder.mjs
```

Result: exit code 0, **1,292 characters, 11 lines**, on every single message.
The text is fixed (`memory-reminder.mjs` lines 36-48). There is no matcher, so it
cannot tell a one-word answer from a design discussion.

Over a 100-message session that is 129,200 characters of identical text. The
hook's own comment defends this as a pointer rather than a copy
(`memory-reminder.mjs` lines 3-27), and the test caps the reminder's source text
at 1,600 characters (`tests/knowledge-startup-check.mjs` lines 415-418).

### 2.3 Per Edit

```
echo '{"session_id":"s5","hook_event_name":"PostToolUse","tool_name":"Edit",...}' | node .claude/hooks/spec-check-reminder.mjs
```

First call: exit 0, **390 characters**. Second call in the same session: exit 0,
**0 characters**. It writes a marker file at
`<tmp>/claude-spec-check-reminder/<session-id>` (lines 44-52), which is how it
stays quiet afterwards.

### 2.4 Per Bash command

Both `PreToolUse` hooks run on every Bash call, but they print nothing unless the
command matches.

| Command | `save-reminder.mjs` | `work-item-close.mjs` |
| --- | --- | --- |
| `git push origin main` | exit 0, 0 characters | exit 0, 0 characters |
| `gh pr create` (first time on this branch) | exit 0, **524 characters** of deny JSON | exit 0, 0 characters |
| `gh pr create` (second time, same session) | exit 0, 0 characters | exit 0, 0 characters |
| `gh issue close 1` | exit 0, 0 characters | exit 0, **551 characters** of deny JSON |

The deny JSON carries the message inside
`hookSpecificOutput.permissionDecisionReason` (`save-reminder.mjs` lines 169-177,
`work-item-close.mjs` lines 89-97).

`save-reminder.mjs` also shells out to `git` up to six times, but only after the
command matches (lines 188, 199, and 57-96).

### 2.5 Judgment on what repeats needlessly

1. **The per-message reminder is the largest avoidable cost.** 1,292 characters
   on every message, forever, saying the same thing. Much of it restates the
   manual that was already printed whole at startup: the routing lines
   (`memory-reminder.mjs` lines 39-40) repeat `knowledge/README.md` lines 26-42,
   and the never-save line (line 43) repeats manual lines 113-126.
2. **The manual is printed whole even when the session never saves anything.**
   13,395 characters. The PRD asks for a small map that leads to detail
   (line 484: "Detailed rules, templates, and knowledge are opened when they are
   needed"). Today there is no small map; there is the whole manual.
3. **The whole load repeats on compaction.** The matcher includes `compact` and
   `clear` (`.claude/settings.json` line 14). There is no session state that says
   "the manual was already read", so a compaction pays the full 20,585 characters
   again. The PRD names exactly this in its design questions (lines 1940-1942).
4. **`knowledge/current.md` and `knowledge/project.md` are printed whole every
   time,** 3,811 characters together, even on a resumed turn where the agent
   already has them.
5. **The two indexes print only their entry lines,** which is a real saving of
   959 characters against printing them whole. That part is well done
   (`knowledge-session-start.mjs` lines 8-11, 49-63).

---

## Section 3. Requirement map, requirements 1 to 30

"Met" means something shipped does this today. "Missing" means nothing shipped
does it, or something shipped does the opposite.

### R1. Plain parts only (PRD lines 456-470)

- **Current parts:** everything is Markdown, Node hooks, skills and Git. See the whole of Section 1. `plugins/second-brain/README.md` lines 115-121 say no database, no embeddings, no background writer.
- **Met:** the "plain parts only" constraint. The owner can edit any file by hand. The checker never edits (`check-knowledge.mjs` lines 5-8), and neither does `session-search` (`SKILL.md` lines 68-70).
- **Missing:** nothing rebuilds links after an owner renames a file. The checker only checks link targets for `supersedes` and `superseded_by` (`check-knowledge.mjs` lines 197-210). Ordinary body links are unchecked in a project. `tests/link-check.mjs` exists only in this repository and is not shipped. The rule that a repair which could change meaning must be asked about first exists nowhere in the shipped files; the manual only says broken-link repairs need no approval (`knowledge/README.md` lines 211-212).
- **Drift:** none.

### R2. The agent follows this system (PRD lines 475-506)

- **Current parts:** the startup loader, the per-prompt reminder, the manual, and the root `CLAUDE.md` fallback.
- **Met:** the three files do reach the agent. The loader prints them (`knowledge-session-start.mjs` lines 27-46). Codex gets the same loader (`.codex/hooks.json` lines 4-18). The root file carries a fallback route (`CLAUDE.md`, "Project knowledge" section, enforced by `tests/knowledge-startup-check.mjs` lines 185-201).
- **Missing:** (a) there is **no completion check**. Nothing verifies that the contents reached the agent, and nothing holds back work when a read did not finish. (b) There is **no one-line confirmation**. The word "confirm" appears in `knowledge/README.md` only at lines 162 and 199, neither about a startup confirmation. (c) There is **no small map**; the whole manual is printed. (d) Nothing brings guidance back when it goes missing mid-session except the fixed 1,292-character reminder.
- **Drift, confirmed:** the startup order is **SOUL, manual, project** (`knowledge-session-start.mjs` lines 28-34; `knowledge/README.md` lines 15-17). R2 asks for **SOUL, project, manual** (PRD line 480). `tests/knowledge-startup-check.mjs` lines 85-95 locks today's order, so changing it fails a test.

### R3. Reliable behavior without reminders (PRD lines 508-573)

- **Current parts:** three hooks that print or deny, and skills that ask the agent to check itself (`remember/SKILL.md` lines 111-122).
- **Met:** two moments are genuinely enforced. A pull request is held once per branch, and a work-item close is held once per item. The checker gives a real pass or fail for file shape.
- **Missing:** every other outcome in R3 lines 518-526 is unenforced. Nothing checks that the shared context was read, that the inbox was checked (no inbox exists), that a source was cited, or that a save review happened at the end of a turn with real work. There is no session state at all beyond "this branch was already held" and "this work item was already held".
- **Drift:** the hooks' own comments admit this. `save-reminder.mjs` lines 12-16 say the rule "is context, not enforcement, so an agent can read it and open the pull request anyway".

### R4. Picks up where the last left off (PRD lines 575-585)

- **Current parts:** `knowledge/current.md`, printed whole at startup.
- **Met:** the file exists, is loaded first-class, and the manual says it is disposable (`knowledge/README.md` line 18). Writing it needs no approval (`knowledge/README.md` lines 211-212).
- **Missing:** no template section for parallel sessions. The shipped template has Objective, Work item, Blocked on, Next step, Picked up this session (`templates/knowledge/current.md` lines 9-28). R13 asks for Project goal, Active work with one subsection per item, and General project to-dos (PRD lines 824-828). Nothing tells the agent to re-read the file and merge other sessions' entries before rewriting it (PRD line 852).
- **Drift:** the file sits at `knowledge/current.md`. The PRD puts it at `knowledge/memory/current.md` (PRD line 133, line 1283).

### R5. Check memory first (PRD lines 587-597)

- **Current parts:** the `recall` skill and the manual's find order.
- **Met:** `recall/SKILL.md` lines 19-43 give a workable order, and its description (lines 3-10) tells the agent to use it at the start of troubleshooting.
- **Missing:** nothing makes the check happen. R5 line 592 asks for one decision per request ("could long-term project knowledge affect this answer?"); no shipped file states that decision rule. Nothing lets already-read current sources satisfy the check.
- **Drift:** R5 line 594 names `knowledge/memory/memory-entries/terminology-glossary.md`. No glossary file ships. `recall/SKILL.md` line 27 says "the project's glossary when one exists", and the manual says "use any glossary" (`knowledge/README.md` line 64). Neither creates one.

### R6. Cite the source (PRD lines 599-608)

- **Current parts:** `recall/SKILL.md` lines 48-51 ("Name the source file... Do not answer from an index line alone") and the manual line 64 ("Name the source").
- **Met:** the instruction exists in two places.
- **Missing:** nothing requires the citation to sit on the line right below the finding (PRD line 601), and nothing requires a session name and date for a past session, or a capture date for outside documentation (PRD line 602). `session-search/SKILL.md` line 59 asks for session and date, which is the closest thing. No check of any kind.

### R7. Speaks the project's language (PRD lines 610-650)

- **Current parts:** two passing mentions of a glossary.
- **Met:** almost nothing.
- **Missing:** no glossary file, no glossary template, no five-column table shape (PRD lines 637-639), no direct link from a knowledge map, no rule that keeps the glossary out of the generated index, and no rule that the checker skips it. A `find` for any file with "glossar" in its name returns only `ai-external-knowledge/claude-code/glossary.md`, which is captured vendor documentation and unrelated.
- **Drift:** if a glossary file were added at `knowledge/memory/terminology-glossary.md` today, the checker would demand all nine memory fields on it (`check-knowledge.mjs` lines 42-45), which R7 line 620 says it must not.

### R8. Read the real documentation first (PRD lines 652-667)

- **Current parts:** the routing row `Outside sources | ai-external-knowledge/ or delivery files` (`knowledge/README.md` line 39), and this repository's own rule `.claude/rules/claude-code-docs-first.md`.
- **Met:** the folder convention, and in this repository a real rule pointing at it. `plugins/project-init/library/rules/general/ai-external-knowledge.md` (50 lines) ships the general convention.
- **Missing:** the outside-documentation index is not generated. `build-knowledge-index.mjs` lines 28-54 build two indexes only, both under `knowledge/`. `ai-external-knowledge/README.md` in this repository is written and maintained by a separate tool, `.claude/tools/capture-claude-code-docs.mjs`, which is this repository's own file (`tests/installed-copy-check.mjs` line 84). Nothing puts the external index in the startup map, and the find order does not mention it (`knowledge/README.md` lines 56-64).

### R9. Saving is frictionless (PRD lines 669-701)

- **Current parts:** `remember`, the proposal template, the two hold hooks, and the direct-commit rule.
- **Met, in part:** three of the five forced moments have something behind them. A pull request is held (`save-reminder.mjs` lines 179-202). A work-item close is held (`work-item-close.mjs` lines 99-117). A handoff runs `remember` first (`offer-context-handoff.md` lines 10-15; `handoff/SKILL.md` lines 21, 85). The owner saying "remember this" is in the skill description (`remember/SKILL.md` lines 3-9). The default-branch push is specified in detail (`knowledge-direct-commit.md` lines 17-43) and repeated in the skill (`remember/SKILL.md` lines 106-109).
- **Missing:** the fifth moment, "a turn ends after real work was done", has nothing behind it. The `Stop` event is not registered anywhere in `.claude/settings.json`. Nothing says a routine review with nothing to save must stay silent; the reminder instead pushes the question on every message and answers "usually not" (`memory-reminder.mjs` line 47), which is a different thing. Nothing preserves an unanswered card, because no inbox exists.
- **Drift:** `remember/SKILL.md` lines 86-90 say "Nothing is queued, cached for later". R9 lines 680 and R28 require exactly that an unanswered proposal be kept.

### R10. Approval before any write (PRD lines 703-744)

- **Current parts:** the manual's approval block (`knowledge/README.md` lines 175-214), `remember/SKILL.md` lines 71-90, the proposal template.
- **Met:** the core rule is clear and repeated. Silence is not approval (`knowledge/README.md` lines 207-208). Helper agents cannot approve (line 177). Five things are exempt in the PRD; the manual exempts four of them (line 211: `current.md`, work items, index rebuilds, broken-link repairs). Drafting permission for a PRD is partly covered by `remember/SKILL.md` lines 72-73 ("If the owner already authorized this exact save, proceed to step 4").
- **Missing:** nothing records who gave drafting permission, where, when, and for what (PRD line 709). The fifth exemption, keeping selection feedback current, is covered separately (`knowledge/README.md` lines 248-253). The conversion-after-the-fact exception exists (`second-brain/SKILL.md` lines 110-112).
- **Drift, confirmed:** the manual says "**Nothing** writes, updates, moves, merges, supersedes, retires, or deletes memory or a specification without the owner's clear approval" (`knowledge/README.md` line 175). R10 line 717 adds a per-project setting that turns the approval step off for memory writes. No setting, no file, and no code supports that today. A `grep` for any approval-off setting in the plugin finds nothing.
- **Drift, confirmed:** `remember/SKILL.md` line 89 says "If the owner edits the meaning, use those words exactly." R10 line 713 says the opposite by default: "use the corrected understanding as the approved scope... An ordinary correction does not require copying the owner's words into the saved entry", and verbatim applies only when the owner explicitly asks.

### R11. What counts as memory (PRD lines 746-780)

- **Current parts:** the manual's save test (`knowledge/README.md` lines 97-108), and `knowledge/memory-self-improvement.md` in this repository.
- **Met:** points 1 and 3 of the three-point test are there. Manual line 104: "relevant to the project itself". Manual line 105: "provided by the user or worked out by both the user and the agent together". Manual line 106 carries the past-fix carve-out. `tests/knowledge-startup-check.mjs` lines 238-245 assert all three.
- **Missing:** point 2, significance, is not stated as a test. The word "significant" does not appear in the manual's save test. The named exception for a significant problem the agent found and fixed alone (PRD line 754) is not in the manual. The `type: event` episode, with its card appearing unprompted at the end of a task (PRD lines 761-767), is not in the manual or in `remember`; `event` exists only as an allowed `type` value (`check-knowledge.mjs` line 39).

### R12. What never counts (PRD lines 782-800)

- **Current parts:** the manual's never-save list (`knowledge/README.md` lines 110-127), repeated in shorter form by the reminder (`memory-reminder.mjs` line 43).
- **Met:** most of the list. Tool calls and searches (line 115), scratch reasoning and dropped ideas (line 116), edit logs and sub-agent activity (line 117), code copies (line 118), existing-system explanations (line 119), a procedure (line 120), open tasks (line 122), live status (line 123), stale information (line 124), secrets (line 125). The secret rule is also enforced by code (`check-knowledge.mjs` lines 69-79).
- **Missing:** four bullets have no home in the manual. The exception for a trap in this project's own tools (PRD line 785). The exception for a wrong idea that already spread (PRD line 787). The "read this first" pointer (PRD line 792). The story behind a standing instruction (PRD line 793). All four were approved and recorded in `knowledge/memory-self-improvement.md` lines 53-58, but they never reached the shipped manual.

### R13. Working memory (PRD lines 802-914)

- **Current parts:** `knowledge/current.md`, its template, and the checker's size limit.
- **Met:** the file exists, is read at every session start, is overwritten not appended (`templates/knowledge/current.md` line 3), and holds no lasting fact (lines 4-5).
- **Missing:** the required three-section shape (PRD lines 824-828). The rule to merge other sessions' entries before rewriting (PRD line 852). The rule to check an entry against its owning record before relying on it (PRD line 853). The rule that a to-do does not create a tracker item (PRD lines 834-838). The label for an unchecked finding (PRD line 853).
- **Drift, confirmed:** the size limit is **2,000 characters** (`check-knowledge.mjs` line 29, repeated in `templates/knowledge/current.md` line 7). R21 line 1469 sets **5,000**. This repository's own `knowledge/current.md` is already 1,847 characters, which is 92 percent of the shipped cap while holding one active item.
- **Drift:** the path. Today `knowledge/current.md`; the PRD wants `knowledge/memory/current.md`.

### R14. Memory file shape (PRD lines 916-1003)

- **Current parts:** the manual's field list (`knowledge/README.md` lines 143-169) and the checker (`check-knowledge.mjs` lines 42-59, 134-175).
- **Met:** nine of the twelve required fields, with the same allowed values. `type` has the same five values (`check-knowledge.mjs` line 39 against PRD line 932). `status` has the same three for memory (line 34 against PRD line 933). `confidence` has the same three (line 40 against PRD line 936). Optional fields match the PRD's list almost exactly (lines 51-59 against PRD lines 953-965). Dates are validated as real calendar dates (lines 88-95). A title heading is required (lines 212-215). Lowercase hyphenated filenames are required (lines 235-239).
- **Missing and in direct conflict:** three required fields from R14 are absent from the checker's required list, and two of them are **rejected as unknown fields**.

  | PRD field | PRD line | Checker today |
  | --- | --- | --- |
  | `group` | 931 | Optional only (`check-knowledge.mjs` line 52) |
  | `context` | 935 | **Not known at all.** A file carrying it fails. |
  | `updated_at` | 938 | **Not known at all.** A file carrying it fails. |

  This was confirmed by running the checker against a test project holding a
  PRD-shaped memory file. It printed two failures: "has an unknown field
  `context`" and "has an unknown field `updated_at`", exit code 1. The word
  `updated_at` does not appear anywhere inside `plugins/second-brain/`.
- **Missing:** the whole topic-folder model. R14 line 918 allows one topic folder per topic area. The checker fails any subfolder under `knowledge/memory/` (`check-knowledge.mjs` lines 227-231), the builder refuses to index one (`build-knowledge-index.mjs` lines 102-107), and the setup skill states the folder is flat (`second-brain/SKILL.md` line 52). Also missing: the guidance to split a topic and the rule to keep the split files together.
- **Drift:** the folder. Today `knowledge/memory/`; the PRD wants `knowledge/memory/memory-entries/` with `memory-index.md` and `current.md` outside it (PRD lines 128-136).

### R15. How the words are written (PRD lines 1044-1118)

- **Current parts:** the output style file, the proposal template's writing rules (lines 73-79), `remember/SKILL.md` lines 76-78.
- **Met:** plain language is asked for in three places. The style file is selected in settings.
- **Missing:** nothing tells a skill or a helper agent to read the active output style before writing a saved file (PRD lines 1100-1109). `.claude/rules/plain-english-artifacts.md` covers diagrams and generated documents, not memory files. The three questions before writing (PRD lines 1078-1082) are absent. The instruction that a memory file has no fixed length limit (PRD line 1069) is absent, and so is the PRD-specific writing standard (PRD lines 1084-1098).

### R16. Requirements documents (PRD lines 1120-1233)

- **Current parts:** `knowledge/prds/`, the checker's spec rules, the manual's PRD section (`knowledge/README.md` lines 129-137), the `spec-check` skill.
- **Met:** one living document per feature area (manual line 133). The old `specs/` name and its rename path (manual line 131, `second-brain/SKILL.md` lines 152-171). The four statuses plus legacy `current` (`check-knowledge.mjs` line 38). The approval-field rule is fully built and heavily tested: an unapproved proposed PRD may omit both fields, one alone fails, a blank pair fails, a bad date fails (`check-knowledge.mjs` lines 128-148; `tests/knowledge-startup-check.mjs` lines 320-370, which run 30 cases).
- **Missing:** the folder shape for a big area, `knowledge/prds/<area>/<area>.md` with children (PRD line 1127), is impossible today because the checker fails subfolders (`check-knowledge.mjs` lines 227-231). The seven-part PRD shape (PRD lines 1144-1151) is not written down anywhere shipped. `updated_at` is required by PRD line 1195 but is an unknown field to the checker. `group` is required by PRD line 1195 but is optional to the checker. Automatic quiet upkeep after shipped work (PRD lines 1162-1168) is not a shipped instruction; `remember` still runs the full propose-and-wait flow.
- **Drift, confirmed:** the manual says `finalized` "is settled after the build" (`knowledge/README.md` line 134). `remember/SKILL.md` lines 17-19 say the same: "edit the same file to `finalized` once the build is done". `check-knowledge.mjs` lines 35-37 say the same in a code comment. R16 line 1130 says `finalized` means "its requirements are approved and ready for solution design or building", and line 1211 repeats it. The owner settled this on 2026-09-15 (PRD line 1130).
- **Drift, confirmed:** `memory-reminder.mjs` line 40 is worse. It tells the agent on **every message** that a PRD "is edited to status: `current` once it describes what was actually built", and that "Only a current PRD is settled truth". `current` is a legacy status the checker still accepts (line 38) but the manual calls legacy (line 134). The index builder's blurb says the same (`build-knowledge-index.mjs` lines 47-51), and so does the startup loader's label for the PRD index (`knowledge-session-start.mjs` line 43).

### R17. Procedures become skills (PRD lines 1235-1245)

- **Current parts:** the routing table row `Repeatable procedure | A skill` (`knowledge/README.md` line 29), the never-save bullet (line 120), `remember/SKILL.md` line 141.
- **Met:** the routing rule and the refusal to save a procedure as memory. `tests/knowledge-startup-check.mjs` lines 240-245 assert both halves.
- **Missing:** nothing says where a project skill goes (`.claude/skills/<name>/SKILL.md`), nothing says the knowledge save card is not used for a skill, and nothing hands the proposal to a skill-authoring process. The rule that traps live in the skill next to the steps (PRD line 1241) is absent.

### R18. Where information goes (PRD lines 1247-1314)

- **Current parts:** the manual's routing table (`knowledge/README.md` lines 26-42), thirteen rows.
- **Met:** most of the table. Ten of the PRD's rows have a match, including `SOUL.md`, rules, skills, PRDs, System Guide, memory, `current.md`, the tracker, brainstorms, outside sources, and session history.
- **Missing rows:** the pending inbox (PRD line 1284), the glossary (PRD line 1285), build order and delivery roadmap (PRD line 1288), which PRD requirements a work item delivers (PRD line 1289), how one work item gets built (PRD line 1290). The four-row "easy to mix up" test (PRD lines 1299-1304) is absent. The rule to test each piece on its own and split a mixed note (PRD line 1297) is absent.
- **Drift:** the manual's row `Unchecked grill-me exploration | knowledge/brainstorms/` (line 38) names one skill by name, and puts brainstorms under `knowledge/`. The PRD puts `brainstorms/` at the project root (PRD lines 124, 158-159, 1292). The shipped template creates `knowledge/brainstorms/.gitkeep`. There is no root `brainstorms/` folder in this repository.

### R19. The find order (PRD lines 1316-1383)

- **Current parts:** the manual's find block (`knowledge/README.md` lines 56-64) and `recall/SKILL.md` lines 19-44.
- **Met:** all five tiers, in the same order and with the same meaning. Tier 1 `current.md`, tier 2 rules, tier 3 skills, tier 4 indexes and their files, tier 5 session search. "Indexes are maps, not evidence: open the file" (manual line 64) matches PRD line 1367. The conflict order matches PRD line 1133 (`knowledge/README.md` line 48; `recall/SKILL.md` lines 53-57).
- **Missing:** the rule that already-read current information satisfies a tier (PRD line 1323). The external-knowledge scan inside the lookup (PRD lines 1344-1349). The rule to name what was searched when tier 4 finds nothing (PRD line 1369) is in `recall/SKILL.md` line 59 for the whole lookup, not per tier. The pending inbox is not excluded as a tier, because there is no inbox.
- **Drift:** `recall/SKILL.md` line 21 says "stop at the first answer". PRD line 1351 is stricter: stop only when the evidence "answers the question, covers enough, and is recent enough", and a working-memory entry that leaves something out does not end the search (line 1352).

### R20. The save card (PRD lines 1385-1456)

- **Current parts:** `remember/references/proposal-template.md` (131 lines) and the manual's copy of the contract (`knowledge/README.md` lines 180-204).
- **Met:** a fixed, readable, non-code-fenced card exists and is enforced by a test. Proposals are numbered (template lines 81-88). The card says memory or spec in words, not by folder path (template lines 39-50). The "wait, nothing is written on silence" rule is there (template lines 126-131).
- **Missing:** destination headings such as `Proposed memory saves` and `Proposed PRD saves`, and the horizontal divider that separates proposals from the answer (PRD lines 1394-1397). The four-part card: `Change`, `Summary`, `Your decision` (PRD lines 1402-1404). The rule that the owner can approve by number or approve all (PRD line 1404) is close but worded differently (template line 87).
- **Drift, confirmed and direct:** PRD lines 1409-1411 say "Do not require a fixed list of `Why`, `Where`, `From`, `Unsure`, and `Checked` bullets." The template requires exactly those five, in that exact order (template lines 30-34, 58-71). The manual repeats the requirement (`knowledge/README.md` lines 188-189). `tests/knowledge-startup-check.mjs` lines 277-296 fails the build if any label is missing or reordered, and lines 397-401 fail any other file that repeats all five. So the PRD's instruction cannot be followed without changing a test.
- **Drift:** PRD lines 1425-1426 say do not attach an unexplained `Unsure` line and settle the question first. The template makes `Unsure` a required bullet that must never be left out (template line 68).

### R21. Indexes and the checker (PRD lines 1458-1510)

- **Current parts:** `build-knowledge-index.mjs` and `check-knowledge.mjs`.
- **Met:** two indexes are generated from the files' own `summary` field, never hand-written (`build-knowledge-index.mjs` lines 9-13, 109-117). The output is deterministic: files are sorted by name (line 67). A non-`current` status is shown in brackets on the line (lines 79-80). A short header points at files (lines 119-128). Rebuild and check after every change is stated in the manual (lines 233-240) and in the skills. A failing check means the save is unfinished (`remember/SKILL.md` lines 118-120). The checker is read-only.
- **Missing, and this is large:**
  - **No grouping.** R21 line 1462 requires headings taken from each file's `group` field. `build-knowledge-index.mjs` never reads `group`; it reads only `summary` and `status` (lines 113-114). The result is one flat list.
  - **No links.** R21 line 1463 requires "a link to the source file". The builder writes a backtick-quoted filename, not a Markdown link (`build-knowledge-index.mjs` line 81). Seen in the live file: ``- `github-account-for-pushes.md`: ...`` (`knowledge/memory/memory-index.md` line 12).
  - **No third index.** The outside-documentation index is not generated.
  - **No child PRDs.** Nothing indents a child under its parent, because subfolders are refused.
  - **No read-back.** R21 line 1471 requires reading the saved change back and checking it against the approved meaning and the output style. `remember/SKILL.md` lines 111-122 run the two tools and stop there.
- **Drift, confirmed:** the `summary` limit is **250 characters** (`check-knowledge.mjs` line 31). R21 line 1469 sets **200**. Four files in this repository already break the PRD limit: `knowledge/memory/github-account-for-pushes.md` at 225, `knowledge/memory/knowledge-manual-voice.md` at 241, `knowledge/prds/folder-instruction-files.md` at 229, `knowledge/prds/guided-delivery.md` at 211.
- **Drift, confirmed:** `current.md` is capped at **2,000** characters (line 29) against the PRD's **5,000** (line 1469).
- **Drift, confirmed:** the PRD index is named `spec-index.md` (builder line 42). R21 line 1460 names it `prd-index.md` and says "The PRD index used to be called `spec-index.md`."
- **Drift, confirmed:** the builder's PRD blurb says "Only a current PRD is settled truth" (builder lines 50-51), which contradicts R16's `finalized`.

### R22. Keeping current truth clean (PRD lines 1512-1535)

- **Current parts:** the manual's lifecycle block (`knowledge/README.md` lines 218-242), the `retire` skill, the `reflect` skill.
- **Met:** update, supersede, retire and delete all exist with clear steps. "Age alone is never a reason" (manual line 229, PRD line 1521). Supersede writes both directions and repairs links (manual lines 223-225; `retire/SKILL.md` lines 27-38), and the checker enforces the pairing (`check-knowledge.mjs` lines 188-196). `reflect/SKILL.md` lines 21-36 lists ten things to look for without being asked.
- **Missing:** the rule that the agent proposes cleanup unprompted is in `reflect`'s description but nothing triggers it. The rule about a memory nobody will look up again (PRD line 1522) is absent. Consolidation with verification before removing originals (PRD line 1520) is only partly in `reflect/SKILL.md` lines 62-65.
- **Drift, confirmed:** the manual gives **three** reasons to delete a whole file: "only a duplicate made by mistake, a secret, or something never true" (`knowledge/README.md` line 227). R22 line 1520 gives **four**, adding "a redundant original after approved consolidation". `retire/SKILL.md` line 23 says "name the allowed reason", which inherits the three.

### R23. Learning what to save (PRD lines 1537-1565)

- **Current parts:** `knowledge/memory-self-improvement.md`, its template, the manual's section (lines 244-258), `remember/SKILL.md` lines 30-34 and 124-136, `reflect/SKILL.md` lines 38-50.
- **Met:** this requirement is the closest to done. `remember` reads the feedback before selecting candidates (lines 30-34). It logs only when the owner proposes a change to what counts as memory (line 126). The feedback is operational state and needs no approval (line 134). A lesson that disagrees with the manual loses and the disagreement is said out loud (lines 32-33). Lessons stay in this project (manual lines 256-258). "Never invent a reason" (line 131). `reflect` consolidates repeated lines (lines 42-45). The checker enforces the 8,000-character cap (`check-knowledge.mjs` line 30).
- **Missing:** nothing. The PRD itself says this file and its cap are a starting point, not a requirement (PRD lines 1894-1906).

### R24. Request knowledge operations in plain language (PRD lines 1567-1586)

- **Current parts:** six skill descriptions, which is how Claude Code decides when a skill applies.
- **Met:** four of the six outcomes have a skill with a description written in ordinary words. Find what the project knows: `recall/SKILL.md` lines 3-10. Review for saving: `remember/SKILL.md` lines 3-9. Review one out-of-date file: `retire/SKILL.md` lines 3-6. Review for duplicates and contradictions: `reflect/SKILL.md` lines 3-6. Explain whether knowledge is set up: `second-brain/SKILL.md` lines 3-9. Find missing context in history: `session-search/SKILL.md` lines 3-8.
- **Missing:** "review pending proposals" (PRD line 1573) has no home, because no inbox exists. Nothing tells the agent to pick only the operations that apply rather than running all of them.

### R25. Codex (PRD lines 1588-1597)

- **Current parts:** `.codex/hooks.json`, the Codex manifest, `AGENTS.md`.
- **Met:** Codex gets the same startup loader with the same matcher and a 5,000-token context allowance (`.codex/hooks.json` lines 4-18). Parity is enforced by `tests/knowledge-startup-check.mjs` lines 171-183. The Codex manifest exposes the skills folder (`.codex-plugin/plugin.json` line 17). `AGENTS.md` is one pointer line to `CLAUDE.md`, enforced at `tests/knowledge-startup-check.mjs` lines 197-200. The saved files are plain Markdown, so both harnesses read the same thing.
- **Missing:** Codex has **no** per-prompt reminder, **no** pull-request hold, and **no** work-item close hold. `.codex/hooks.json` registers exactly one hook. So in Codex, three of the five save moments have nothing behind them at all. Nothing in any setup report says so, which PRD line 1592 requires.

### R26. Built the way Claude Code's documentation says (PRD lines 1599-1615)

- **Current parts:** `.claude/rules/claude-code-docs-first.md` (this repository only), `ai-external-knowledge/claude-code/` with about 180 captured pages.
- **Met:** the hooks use documented shapes. The deny response uses `hookSpecificOutput.permissionDecision` (`save-reminder.mjs` lines 169-177). `SessionStart` and `UserPromptSubmit` print to stdout. All hooks fail open on error (`save-reminder.mjs` lines 204-209; `memory-reminder.mjs` lines 71-73; `knowledge-session-start.mjs` lines 124-128).
- **Missing:** no design document names the page each part followed (PRD line 1609). The rule that requires reading the page first is not shipped to other projects; it is listed in `OWN_FILES` (`tests/installed-copy-check.mjs` lines 80-83), because only this repository has the captured pages.

### R27. Installed once, turned on per project, and checked (PRD lines 1617-1627)

- **Current parts:** `project-init` Gate 3, `project-sync`, `second-brain/SKILL.md`.
- **Met:** installed once as a marketplace plugin, turned on per project by explicit yes (`project-init/SKILL.md` lines 270-306). The nine setup steps finish in one pass (`second-brain/SKILL.md` lines 70-94), ending with both tools passing (lines 93-94). Running it again later is `project-sync`, which reports before changing anything (`project-sync/SKILL.md` lines 225-277). The checker is the self-check, and it names every problem with its file and rule.
- **Missing:** nothing reports **which version** is running (PRD line 1621). The version `4.9.1` sits only in the two manifests and is not written into the project or compared by the checker. The manual's SHA-256 is the closest thing to a version check (`check-knowledge.mjs` lines 32, 283-288), and it gives a yes-or-no answer, not a version.

### R28. Pending memory inbox (PRD lines 1629-1667)

- **Current parts:** none.
- **Met:** nothing.
- **Missing:** everything. There is no `knowledge/memory-inbox.md` anywhere in the repository; a `find` for any file with "inbox" in its name returns nothing. No entry format, no three states, no cross-session pickup, no removal on completion.
- **Drift, direct:** `remember/SKILL.md` lines 86-87 say "Nothing is queued, cached for later, or written on silence". That is the opposite of R28's core rule at line 1640: "Once a proposal has been shown to the owner and he has not answered it, keep it here without being asked."

### R29. Preserve agent judgment with narrow safeguards (PRD lines 1669-1752)

- **Current parts:** the whole design, by accident rather than by plan.
- **Met, and this is the requirement the current build fits best:** there is no search engine and no reasoning engine. The agent picks its own terms and tools. The safeguards are narrow: two once-only holds and one read-only checker. The hooks say plainly that they only remind and never decide, write, or approve (`save-reminder.mjs` lines 5-6; `work-item-close.mjs` lines 12-13). Temporary session state is kept out of the repository, in the OS temp folder, exactly as PRD lines 1732-1735 ask.
- **Missing:** the stronger side of R29. R29 line 1689 says writes to lasting files get stronger checks: the approval must cover the change actually being made. Nothing checks that. The checker validates file shape only, never whether the content matches what was approved.
- **Drift:** R29 line 1707 says "Reminders stay small; the full manual is not reloaded on every message. The owner should barely notice the rules being enforced." The per-message reminder is 1,292 characters on every message, and the full manual is reloaded on every compaction.

### R30. Integration with the toolkit OS (PRD lines 1754-1795)

- **Current parts:** the System Guide boundary, the tracker boundary, `handoff`, `grill-me`, `spec-check`.
- **Met:** the boundaries are carefully drawn and tested. The second brain never imports a System Guide path and reports only the off state (`knowledge-session-start.mjs` lines 65-80; `plugins/second-brain/README.md` lines 59-71). `remember` routes an existing-system explanation to the guide and refuses to use memory as a fallback (`remember/SKILL.md` lines 44-49). The tracker owns status (`docs/toolkit-map.md` lines 268-270). `handoff` runs the tracker update first, then `remember` (`handoff/SKILL.md` lines 10, 21). `docs/toolkit-map.md` lines 306-311 and 381-401 explain why these look redundant and are not.
- **Missing:** the delivery process does not hand the scope of finished work to the knowledge review; the two hold hooks simply deny a command and let the agent work it out. Knowledge reports no completion back to any process. There is no link from this PRD's rows to the matching requirement numbers in the operating-system PRD.

---

## Section 4. Weaknesses observed

### 4.1 Reminds only, at the moments that matter most

Five of the six shipped hooks and all six skills only print text. The only real
blocks are two once-per-session denials of a shell command. Every requirement
about what the agent must read, check, cite, or route rests on the agent
choosing to comply. `save-reminder.mjs` lines 12-16 say this out loud: the rule
"is context, not enforcement, so an agent can read it and open the pull request
anyway. The owner then finds out at the end of the session that an approved save
never landed."

### 4.2 Repetition

- 1,292 characters of the same reminder on every message (measured).
- 20,585 characters reloaded on every compaction and clear (measured).
- The routing table exists three times: `knowledge/README.md` lines 26-42, `memory-reminder.mjs` lines 39-44, and in shorter form in each skill.
- The proposal contract exists twice: `knowledge/README.md` lines 180-204 and `remember/references/proposal-template.md` lines 25-71. `tests/knowledge-startup-check.mjs` lines 372-405 exists only to stop a third copy appearing.
- The trust order exists in `knowledge/README.md` line 48, `recall/SKILL.md` lines 53-57, `memory-reminder.mjs` line 40, `build-knowledge-index.mjs` lines 47-51, and `knowledge-session-start.mjs` line 43. Four of those five say `current`; the manual says `finalized`. One change to the status meaning has to be made in five places, and it was not.

### 4.3 No state, so nothing can know what already happened

The only session state is two lists of strings in the OS temp folder: which
branches were already held, and which work items were already held
(`save-reminder.mjs` lines 104-132; `work-item-close.mjs` lines 45-73). Nothing
records that the manual was read, that a lookup was done, that a save review ran,
or that a proposal is waiting. This is why R2's completion check, R3's outcomes,
and R28's inbox have nothing behind them.

### 4.4 Overlaps

- `remember` and `retire` both write files and both run the same two tools. `retire/SKILL.md` line 30 calls back into `remember` for the replacement, so a supersede crosses two skills.
- `reflect` calls both `remember` and `retire` (`reflect/SKILL.md` line 63), so a folder review can be three skills deep.
- `recall` is invoked by `remember` step 2 (`remember/SKILL.md` line 59), so a save always runs a find.
- The pull-request hold and the `handoff` skill target nearly the same moment. `docs/toolkit-map.md` lines 381-389 argues they are different moments, which is true, but both end in "run `remember`".
- `spec-check-reminder` (hooks-library) and `work-item-close` (second-brain) both exist to stop a PRD going stale, at opposite ends of the same work.

### 4.5 Plain-language requests that would not reach a skill

R24 asks for six outcomes in ordinary words. Two would not land today:

- "What is still waiting for my answer?" There is no inbox and no skill description mentions pending proposals. `remember`'s description (lines 3-9) lists triggers, none of which is reviewing what is pending.
- "What does PCO stand for here?" No glossary exists, so `recall` would fall through to tier 4 with nothing to find and then to `session-search`.

A third is fragile. "Is my knowledge set up correctly?" reaches `second-brain`,
whose description leads with "Set up, adopt, detect, convert, explain, or
maintain" (line 3). That works, but the answer it gives cannot name a version.

### 4.6 Things that contradict "guide the agent, let it judge"

R29 line 1684 says guidance should start with the lightest check that works, and
line 1699 says do not watch or control every action just because it is possible.
Three shipped parts push the other way:

- The per-message reminder asks the save question on every single turn and then answers it "usually not" (`memory-reminder.mjs` line 47). The hook's own comment (lines 17-20) says that without the default of no, "a command-shaped nudge makes an agent propose a save on turns that call for none". That is a known failure being managed with more text rather than removed.
- The proposal template forbids judgment about the card's shape: same labels, same order, every time (template lines 3-7), and `remember/SKILL.md` line 81 repeats it. R20 line 1410 explicitly releases that constraint.
- `recall/SKILL.md` line 21, "stop at the first answer", turns the find order into a script rather than a judgment.

### 4.7 A structural conflict that blocks the PRD's data model

The flat-folder rule is written into four places: `check-knowledge.mjs` lines
227-231 (fails), `build-knowledge-index.mjs` lines 102-107 (warns and skips),
`second-brain/SKILL.md` line 52, and `project-sync/SKILL.md` lines 227-247. The
PRD needs topic folders under `memory-entries/` (line 918) and child PRD folders
(line 1127). Nothing in the current build can hold either.

---

## Section 5. Parts worth keeping, as they are or nearly so

1. **`tools/frontmatter.mjs` (116 lines).** One parser shared by the builder and
   the checker, so they cannot disagree about what a file says (lines 6-8). It
   reports what it does not understand instead of guessing. Keep as is.

2. **The secret patterns in the checker (`check-knowledge.mjs` lines 69-79,
   97-106).** Eight patterns, each a shape that is hard to produce by accident.
   This is the one rule the PRD says must be enforced by code rather than trust
   (PRD line 795), and it is. The failure message also tells the owner to rotate
   the credential (lines 100-102). Keep as is.

3. **The checker's read-only promise (`check-knowledge.mjs` lines 5-8), and the
   test that proves it.** `tests/knowledge-startup-check.mjs` line 364 asserts the
   file on disk is byte-identical after a check run. Keep as is.

4. **The PRD approval-field logic (`check-knowledge.mjs` lines 128-148).** It
   separates permission to save a draft from approval of the requirements, which
   is exactly R16 lines 1195-1203. Thirty test cases cover it
   (`tests/knowledge-startup-check.mjs` lines 320-370). Keep as is, and only add
   `group` and `updated_at` to the field lists.

5. **Fail-open behavior in every hook.** `knowledge-session-start.mjs` lines
   16-17: "knowledge setup must never be able to wedge a session." Every hook
   catches and exits 0. Verified at runtime: every hook returned exit 0,
   including on unmatched input. Keep as is.

6. **`entriesOnly()` in the startup loader (`knowledge-session-start.mjs` lines
   49-63).** Prints the index entries and drops the human-facing header. Saves
   959 characters at every start, measured. The comment at lines 8-14 explains
   why the listings are "deliberately unsatisfying": enough to make an agent open
   the right file, never enough to answer from. Keep the idea whatever replaces
   the loader.

7. **Session state in the OS temp folder, never in the repository**
   (`save-reminder.mjs` lines 104-132). This is R29 lines 1732-1735 already built.
   Keep the placement; the contents need to grow.

8. **`knowledge-direct-commit.md` (56 lines).** Six numbered steps for landing a
   save on the default branch from a worktree, including what to do when the push
   is refused (lines 51-53) and never using `git add -A` (line 35). R9 line 685
   names this rule as the owner of that procedure. Keep as is.

9. **The knowledge-only branch detection (`save-reminder.mjs` lines 85-102,
   148-167).** It compares the branch against the default branch, and if every
   changed path starts with `knowledge/` it says the branch does not need a pull
   request at all. It counts committed work only, so one stray build file cannot
   confuse it (lines 80-84). Small, specific, and it catches a real mistake.

10. **`memory-self-improvement` as a whole (R23).** Template, manual section,
    read step, write step, consolidation step, and an enforced cap. It is the one
    requirement met end to end. Keep the mechanism even if the file moves.

11. **The System Guide boundary (`knowledge-session-start.mjs` lines 65-80).**
    The second brain reports only an explicit off state and never imports a
    sibling plugin's path. A malformed config is left alone so the guide plugin
    can report it, because calling it off would hide the problem. Keep as is.

12. **`session-search` and its script.** Read-only, smallest scope first, refuses
    an all-project search without a second flag (`SKILL.md` lines 33-35), never
    writes a result into knowledge (line 70). It is a separate concern from the
    rest and would survive any rebuild unchanged.

---

## Section 6. Everything that depends on the second brain's names and files

A rename or a move breaks each of these. They are grouped by what they depend on.

### 6.1 Depends on the skill name `remember`

| File | Lines | What it does |
| --- | --- | --- |
| `plugins/session-skills/skills/handoff/SKILL.md` | 10, 21, 83, 85, 104, 106, 276-279, 302 | Invokes `remember`, waits for its result, and lists what to do for every answer the owner can give |
| `plugins/session-skills/skills/grill-me/SKILL.md` | 24, 114-120 | Invokes `remember` at the end of the interview |
| `plugins/session-skills/README.md` | 172, 196-198 | Describes both of the above |
| `plugins/project-init/library/rules/general/offer-context-handoff.md` | 10, 22, 25, 28 | A handoff runs `remember` first |
| `.claude/rules/offer-context-handoff.md` | same | Installed copy of the rule |
| `plugins/second-brain/hooks/save-reminder.mjs` | 138 | Deny message names `remember` |
| `plugins/second-brain/hooks/work-item-close.mjs` | 79 | Deny message names `remember` |
| `plugins/second-brain/hooks/memory-reminder.mjs` | 46, 47 | Reminder names `remember` twice |
| `plugins/second-brain/skills/reflect/SKILL.md` | 63 | Calls `remember` for approved writes |
| `plugins/second-brain/skills/retire/SKILL.md` | 30 | Calls `remember` to write the replacement |
| `knowledge/README.md` line 265, template line 265 | | Skill map row |
| `docs/toolkit-map.md` | 24, 40, 56, 251, 286, 395, 408 | Catalog rows and boundary notes |
| `plugins/project-init/skills/project-sync/SKILL.md` | 256 | Audits the skill by name |
| `tests/knowledge-startup-check.mjs` | 257-274, 299-303 | Reads `remember/SKILL.md` and asserts its section order and phrases |
| `README.md` | 134 | Repository tree |

### 6.2 Depends on the other five skill names

`recall`, `retire`, `reflect`, `second-brain`, `session-search` are named in:
`knowledge/README.md` lines 264-270 (and the identical template lines);
`docs/toolkit-map.md` lines 24, 39-44, 250-253;
`plugins/project-init/skills/project-sync/SKILL.md` lines 256-257;
`plugins/second-brain/README.md` lines 82-91;
`plugins/second-brain/skills/recall/SKILL.md` line 60 (names `session-search`);
`plugins/second-brain/skills/retire/SKILL.md` line 11 (names `reflect`);
`plugins/second-brain/skills/reflect/SKILL.md` line 63 (names `retire`);
`plugins/second-brain/skills/second-brain/SKILL.md` line 25;
`plugins/second-brain/.codex-plugin/plugin.json` line 17;
`.claude-plugin/marketplace.json` lines 23-25;
`.agents/plugins/marketplace.json`;
`README.md` lines 133-135, 265;
`tests/knowledge-startup-check.mjs` lines 272-274 (reads `recall/SKILL.md`).

### 6.3 Depends on the file path `knowledge/README.md`

`knowledge-session-start.mjs` lines 31, 89; `memory-reminder.mjs` lines 33, 37;
`save-reminder.mjs` line 140; `work-item-close.mjs` line 81;
`check-knowledge.mjs` lines 273-288; all six SKILL.md files;
`CLAUDE.md` "Project knowledge" section; `AGENTS.md` by way of `CLAUDE.md`;
`handoff/SKILL.md` lines 80, 106; `grill-me/SKILL.md` line 116;
`project-sync/SKILL.md` lines 227, 255, 342;
`project-init/SKILL.md` line 272; `setup-flow.md` lines 167, 295;
`tests/installed-copy-check.mjs` lines 59-64;
`tests/knowledge-startup-check.mjs` lines 38-39, 203-231.

### 6.4 Depends on the manual's exact bytes

`check-knowledge.mjs` line 32 holds the SHA-256
`2f0d1a53bc234a7695631f41c412cafcdd535185d0c29bd67c13f4d695fa678e`.
`tests/knowledge-startup-check.mjs` lines 215-216 recompute it and compare.
`tests/installed-copy-check.mjs` lines 59-64 compare the installed copy to the
template. **Any one-character change to the manual requires updating the hash in
`check-knowledge.mjs` in the same change.**

### 6.5 Depends on the manual's marker comments

The manual carries ten markers. `<!-- claude-toolkit:knowledge-manual -->` at
line 1 is read by `memory-reminder.mjs` lines 34, 55 to decide whether to print
at all, by `second-brain/SKILL.md` line 62 to detect a current project, by
`project-sync/SKILL.md` lines 227-228, and by `tests/knowledge-startup-check.mjs`
lines 207, 446. The nine `knowledge-policy <name>` pairs (`routing`, `trust`,
`find`, `save-test`, `never-save`, `file-shapes`, `approval`, `lifecycle`,
`skill-map`) are counted at `tests/knowledge-startup-check.mjs` lines 217-230 and
their contents are asserted at lines 233-255. Line 393 fails any other file that
carries a `knowledge-policy ` marker.

### 6.6 Depends on the six startup file paths and their order

`tests/knowledge-startup-check.mjs` lines 85-95 asserts the exact list and order:
`SOUL.md`, `knowledge/README.md`, `knowledge/project.md`, `knowledge/current.md`,
`knowledge/memory/memory-index.md`, `knowledge/prds/spec-index.md`. Lines 113-134
assert they appear in the output in that order and exactly once each.
`knowledge/README.md` lines 13-20 lists the same six for the reader.
`handoff/SKILL.md` lines 78-83 detects the system by a similar list.
`grill-me/SKILL.md` lines 29-37 detects it by four of them.
`project-init/SKILL.md` line 296 and `setup-flow.md` lines 294-295 describe it.

### 6.7 Depends on the index filenames

`spec-index.md` is written by `build-knowledge-index.mjs` line 42, read by
`knowledge-session-start.mjs` line 42, skipped by `check-knowledge.mjs` line 301,
seeded as a template, asserted at `tests/knowledge-startup-check.mjs` lines 92,
105, 159-165, and named in `docs/toolkit-map.md` and `README.md` line 129.
`memory-index.md` appears in the same places. **Renaming `spec-index.md` to
`prd-index.md`, which R21 line 1460 requires, touches at least eight files.**

### 6.8 Depends on the tool paths

`node .claude/tools/build-knowledge-index.mjs` and
`node .claude/tools/check-knowledge.mjs` appear as literal commands in:
`knowledge/README.md` lines 236-237 (and template);
`remember/SKILL.md` lines 114-115; `retire/SKILL.md` lines 49-50;
`reflect/SKILL.md` line 17; `second-brain/SKILL.md` lines 43-45, 93-94;
`knowledge-direct-commit.md` lines 32-33; `project-sync/SKILL.md` lines 257-258,
271; `CLAUDE.md` Tools table; `README.md` lines 129-130, 219;
`plugins/second-brain/README.md` lines 96-97;
`tests/installed-copy-check.mjs` lines 103-104.

### 6.9 Depends on the hook filenames

`tests/installed-copy-check.mjs` lines 92-98 lists all five by name.
`.claude/settings.json` lines 18, 30, 35, 47, 58 registers five by path.
`.codex/hooks.json` lines 10-11 registers one by path.
`tests/knowledge-startup-check.mjs` lines 171-183, 407-419 reads two by path.
`project-sync/SKILL.md` lines 100-122 audits them by script name, and line 121
warns that `memory-reminder.mjs` sits under the same event as a retired style
hook and must be kept.
`machine-sync/SKILL.md` line 161 names `memory-reminder` as the replacement for
a retired machine rule.
`README.md` lines 123-130 draws them in the tree.

### 6.10 Depends on the proposal template's five bullet labels

`tests/knowledge-startup-check.mjs` lines 277-296 asserts `Why:`,
`Where:`, `From:`, `Unsure:`, `Checked:` exist in that order.
Lines 397-401 fails any other file under `CLAUDE.md`, `AGENTS.md`, `README.md`,
`docs/`, `.claude/rules/`, or the three named plugins that contains all five.
`knowledge/README.md` lines 188-189 names them.
`plugins/second-brain/skills/remember/references/proposal-template.md` lines
30-34, 58-71 defines them. **Following R20 line 1410 means changing this test.**

### 6.11 Other

- `.claude/settings.json` lines 8-10 enables `second-brain@claude-toolkit` by name, and line 4 sets `CLAUDE_CODE_DISABLE_AUTO_MEMORY` to `1`.
- `.claude-plugin/marketplace.json` lines 23-25 and `.agents/plugins/marketplace.json` register the plugin name and source path. `CLAUDE.md` line 29 says to update both when adding or renaming a plugin, and `plugins/CLAUDE.md` line 81 repeats it. `docs/CLAUDE.md` lines 21-24 says the map must be updated in the same change that renames a plugin or a skill.
- `tests/orphan-check.mjs` and `tests/link-check.mjs` walk every Markdown file, so a moved file with an unfixed link fails them.
- `plugins/system-guide/` reads `.system-guide.json` and shares the lookup tier. `knowledge/prds/system-guide.md` describes the pairing. `tests/system-guide-integration.test.mjs` and `tests/experience-system-guide.test.mjs` touch the shared behavior.
- `.claude/toolkit-sync.md` lines 137-140, 177-185, 207-214 is this repository's setup record and names the hooks, the indexes, and the parallel-save problem.
- `archive/second-brain-v1/` holds the retired version. `docs/toolkit-map.md` lines 173-186, 221-249 explains it is history and not current truth.

---

## Appendix. Files read for this audit

Plugin: `plugins/second-brain/` in full (readme, both manifests, five hooks, six
skills and their references, three tools, nine templates).
Installed copies: `.claude/hooks/` (six files), `.claude/tools/` (four files),
`.claude/settings.json`, `.claude/rules/` (nine files), `.claude/output-styles/`,
`.claude/toolkit-sync.md`, `.codex/hooks.json`.
Project knowledge: `knowledge/README.md`, `project.md`, `current.md`,
`memory-self-improvement.md`, `memory/` (four files), `prds/spec-index.md`,
`prds/knowledge-system.md` in full.
Other plugins: `project-init` (skills and the general rules library),
`session-skills` (handoff, grill-me, spec-check, readme), `work-tracker`
(readme, work skill), `system-guide` (readme, hook), `hooks-library` (readme,
spec-check-reminder).
Docs and tests: `docs/toolkit-map.md`, `docs/CLAUDE.md`, `tests/` (all six).
Runtime: all six hooks executed with fake stdin and measured.
