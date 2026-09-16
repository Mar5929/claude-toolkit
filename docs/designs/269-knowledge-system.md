# Solution design: the project knowledge system


## 1. What this document is

This is a draft solution design. It is written for the owner, Mike, to approve
or change. It is not approval to build.

The work item is GitHub issue 269 on the `Claude-Toolkit-Project` board.

The requirements document it designs from is
`knowledge/prds/knowledge-system.md`. That document has `status: proposed` and
the issue carries stage label `02-refinement`. Some of its requirements still
have open questions. This design does not settle them and does not change the
document's status. The second half of this document lists every open question
for the owner to answer.

Three sources describe the wanted behavior, and they sometimes disagree. The
order for settling a disagreement is fixed:

1. A later clear instruction from Mike wins over everything.
2. The approved walkthrough wins over the requirements document. The
   walkthrough is the six-part picture of one session that Mike approved on
   2026-09-15.
3. The requirements document comes last of the three.

Where this design follows the walkthrough against the requirements document, it
says so on the line.

Words used in a fixed way throughout:

| Word | What it means here |
| --- | --- |
| Harness | The agent program running the session. Claude Code and Codex are the two this toolkit supports. |
| Hook | A script the harness runs at a fixed moment, such as session start or just before a tool call. |
| Skill | A folder holding a `SKILL.md` file of instructions the agent loads when it needs them. |
| Rule file | A Markdown file under `.claude/rules/` that the harness puts into the agent's context. |
| Plugin | A package of skills, hooks, and scripts that a person installs once and turns on per project. |
| Frontmatter | The settings block at the top of a Markdown file, between two lines holding only `---`, written in YAML. |
| Matcher | The string in a hook's registration that says which event sources or tool names the hook runs for. |
| Compaction | The harness replacing the conversation so far with a summary, to free room in the context window. |
| Subagent | A separate agent a session starts for one delegated job, with its own context window. |
| Marker | A small record on disk that says something already happened in this session. |

## 2. What the knowledge system solves

The owner should not have to hold the state of the project in his own head. The
agent holds it for him. That is the goal in one sentence, from the requirements
document's "Why this exists".

The rest of that section and "How the owner works" give these facts:

- The agent should know more than the owner about what has been going on in
  this project.
- Every new session should feel like the same agent, not a stranger who has to
  be caught up.
- Remembering too little means the owner explains the same thing twice.
  Remembering carelessly is worse, because a later agent believes information
  that is out of date and acts on it.
- The owner runs several agent sessions at the same time, in the integrated
  terminals of one VS Code project. Sessions use different models and different
  harnesses.
- The work is mostly requirements gathering, solution design, and reasoning, so
  a session's context window fills quickly. A session may be compacted, cleared,
  or replaced while other sessions keep working.
- The owner never reminds an agent to look something up, never says where
  information belongs, and never repeats the save rules.
- He approves what is saved as lasting knowledge, and he approves anything
  proposed for removal.
- Loading every instruction at the start of a session and hoping the agent still
  has it in mind later does not meet the requirement. Guidance has to arrive at
  the moment the agent needs to find, propose, write, update, or remove
  information.

Six ways the system fails, and what this design does about each:

| Failure | Cause | What the design does |
| --- | --- | --- |
| The agent repeats a question the project already answered | It did not look | A standing rule that says when to look, `knowledge-find` that says how, and a startup map that shows what exists |
| Something worth keeping is lost | Nobody proposed a save | Four moments the harness raises (pull request, work-item close, manual compaction, handoff), a nudge when many files changed, and standing guidance for the rest |
| Wrong or unapproved text enters the store | A hand edit, or a save without a yes | Lasting files can be written only after `knowledge-save` is loaded; the checker runs after every write; approval stays the agent's duty under the skill's rules |
| A saved file never reaches other sessions | It was left on a branch | The existing `.claude/rules/knowledge-direct-commit.md`, plus `knowledge/memory-inbox.md`, which keeps the save until the push is verified |
| Guidance is gone after compaction | The context was summarized | Rule files are re-injected from disk, the startup hook runs again on compaction, and invoked skill bodies are re-attached |
| Startup is heavy | Everything loads at once | One hook prints a short map under a fixed character budget; the detail lives in skills and loads on demand |

The last row is not a preference. It is measured. On 2026-09-16 the shipped
startup hook printed 20,585 characters in this repository. Claude Code caps a
hook output string at 10,000 characters and replaces the rest with a short
preview and a file path (`ai-external-knowledge/claude-code/hooks.md`, section
"JSON output"). So today the knowledge manual does not reach the agent at
startup at all unless the agent opens the file itself. The character budget in
this design is the condition for requirement 2's startup reads to happen.

## 3. Design philosophy

The owner's brief, in plain form: keep the capable agent at the center. The
parts around it deliver the right text at the right moment, refuse a small
number of specific mistakes, and check files. They never do the agent's
thinking.

### Three kinds of control

Every part of this design is one of three kinds. The kind is named for every
part in section 4 and again in section 6.

- **ENFORCE.** The harness makes it happen or refuses to let it happen. The
  agent cannot skip it.
- **GUIDE.** The right text reaches the agent at the moment it applies. The
  agent may still ignore it.
- **JUDGE.** The agent decides with its own reasoning. Nothing checks the
  decision.

### Which one a thing gets

ENFORCE is used for three things only:

1. Writes to lasting files, meaning anything under
   `knowledge/memory/memory-entries/` or `knowledge/prds/`.
2. The four visible moments where a missed save would cost the owner trust:
   opening a pull request, closing a work item, manual compaction, and the
   after-write check.
3. File checks: required fields, allowed values, size limits, links, and
   secrets.

GUIDE is used for lookups, citations, choosing candidates, wording, the
destination table, and the quiet review at the end of a turn with real work.

JUDGE is used for relevance, search, what counts as memory, the wording of a
card, and which home a piece of information belongs in.

This split follows requirement 29, which says to begin with a small set of
safeguards aimed at the failures that damage trust, and to add restrictions only
after a failure that actually happened.

### What this design refuses to build

| Refused | Why |
| --- | --- |
| A scorer that grades the agent's search | Requirement 29: "Do not build something that scores whether the search was good enough." |
| A program that reads the agent's replies to check whether a review happened | Requirement 29 and requirement 3's "How reliability is demonstrated". A quiet review with nothing to say produces no text to read. |
| A service or an MCP server for knowledge operations | Requirement 1: plain parts only. A service is a second reasoning layer. |
| A database | Requirement 1: every piece of knowledge is a plain text file in the repository, and those files are the only copy. |
| A background writer | Requirement 1 and requirement 10. Anything that writes without approval breaks the approval rule. Claude Code auto memory and the Codex memory pipeline are both turned off for this reason. |

### One honest sentence about the per-turn review

Requirement 9 asks for a save review at the end of every turn that did real
work, and requirement 3 says that review is required even when it produces
nothing the owner sees. A review that finds nothing produces no observable
output, so no harness can prove it happened. It is therefore GUIDE, not
ENFORCE. The Stop nudge and the four enforced moments are what catch a missed
review. The design says this, and the setup report every project receives says
it too.

## 4. The parts

`ENF` means ENFORCE. `GDE` means GUIDE. Context cost is characters added to the
agent's context.

| Kind | Name and path | Purpose | Control | When it runs or loads | Context cost | Documentation page followed |
| --- | --- | --- | --- | --- | --- | --- |
| File | `SOUL.md` | What the agent is responsible for in this project | GDE | Printed by the startup hook | About 450 characters at start | None. Plain Markdown. |
| File | `knowledge/project.md` | What the project is, its resources, its tracker, and the `memory_approval` setting in frontmatter | GDE | Printed by the startup hook | About 1,000 characters at start | None. Plain Markdown. |
| File | `knowledge/README.md` | The manual, also called the map: where each kind of information lives, the find order, the save moments, the approval rule, the file list, the skills | GDE | Printed by the startup hook | Under 4,000 characters at start | None. Plain Markdown. |
| File | `knowledge/memory/current.md` | The shared overview of active work across sessions | GDE | Printed by the startup hook | Under 5,000 characters, capped by the checker | None. Plain Markdown. |
| File | `knowledge/memory-inbox.md` | Unanswered cards and approved saves that did not finish | GDE | Heading and state lines printed at start; entries opened on demand | About 60 characters per entry at start | None. Plain Markdown. |
| File | `knowledge/memory/memory-index.md` | Generated index of memory topics | GDE | Printed at start when short | Up to about 1,500 characters | None. Plain Markdown. |
| File | `knowledge/prds/prd-index.md` | Generated index of requirements documents | GDE | Printed at start when short | Up to about 1,500 characters | None. Plain Markdown. |
| File | `ai-external-knowledge/README.md` | Generated index of captured outside documentation | GDE | Path printed at start; opened during a lookup | One line at start | None. Plain Markdown. |
| File | `knowledge/memory/memory-entries/` | Memory topic files and topic folders | ENF on shape | Opened on demand | Zero until opened | None. Plain Markdown. |
| File | `knowledge/memory/memory-entries/terminology-glossary.md` | The project's words and what they refer to | GDE | Printed whole at start when under 2,000 characters, else its path | Up to 2,000 characters | None. Plain Markdown. |
| File | `knowledge/prds/` | Requirements documents, parent and child | ENF on shape | Opened on demand | Zero until opened | None. Plain Markdown. |
| File | `knowledge/memory-selection-feedback.md` | What the owner accepts and rejects as memory | GDE | Read by `knowledge-save` | Zero until read; capped at 4,000 characters | None. Plain Markdown. |
| File | `brainstorms/` | Unchecked exploration at the project root | GDE | Opened on demand | Zero | None. Plain Markdown. |
| Rule | `.claude/rules/knowledge-system.md` | The standing obligations, about 25 lines | GDE | Every session, and re-injected from disk after compaction | About 1,200 characters per request | `ai-external-knowledge/claude-code/memory.md`, section "Organize rules with `.claude/rules/`" |
| Rule | `.claude/rules/knowledge-files.md` | Six lines that apply when a knowledge file is read, scoped by `paths: knowledge/**` | GDE | When the agent reads a file under `knowledge/` | About 400 characters, and zero until then | `ai-external-knowledge/claude-code/memory.md`, section "Path-scoped rules" |
| Skill | `knowledge-find` | How to look something up and how to cite it | GDE | When the agent or the owner invokes it | Description always; body about 3,000 characters when invoked | `ai-external-knowledge/claude-code/skills.md`, section "Frontmatter reference" |
| Skill | `knowledge-save` | The whole save path: candidates, home, card, approval, write, check, push | GDE | When the agent or the owner invokes it | Description always; body about 6,000 characters when invoked | `ai-external-knowledge/claude-code/skills.md`, sections "Frontmatter reference" and "Add supporting files" |
| Skill | `knowledge-review` | Whole-folder review for duplicates, conflicts, and retirement | GDE | On request, or after a migration | Description always; body about 3,000 characters when invoked | `ai-external-knowledge/claude-code/skills.md`, section "Frontmatter reference" |
| Skill | `knowledge-setup` | Turn the system on in a project, migrate the layout, repair, and report | GDE | On request, or from `/project-init` and `/project-sync` | Description always; body about 5,000 characters when invoked | `ai-external-knowledge/claude-code/skills.md`, section "Frontmatter reference" |
| Hook | `hooks/startup-map.mjs`, `SessionStart` | Print the startup map in a fixed order under a fixed budget | ENF on delivery | Session start, resume, clear, compaction, fork | Up to 9,500 characters per start | `ai-external-knowledge/claude-code/hooks.md`, section "SessionStart" |
| Hook | `hooks/save-moment-gate.mjs`, `PreToolUse` | Hold a pull request, a work-item close, or `work finish` until the save skill ran | ENF | Before the matching tool call | Zero unless it denies, then about 220 characters | `ai-external-knowledge/claude-code/hooks.md`, sections "PreToolUse" and "Common fields" |
| Hook | `hooks/knowledge-write-guard.mjs`, `PreToolUse` | Refuse a write to a lasting file until the save skill ran, and always inside a subagent | ENF | Before `Edit` or `Write` under the lasting paths | Zero unless it denies, then about 200 characters | `ai-external-knowledge/claude-code/hooks.md`, section "PreToolUse input" |
| Hook | `hooks/knowledge-after-write.mjs`, `PostToolUse` | Run the checker and rebuild the affected index after a knowledge write | ENF | After `Edit` or `Write` under `knowledge/` or `ai-external-knowledge/`, and after every `Bash` call | Zero on a clean write; about 300 characters on a failure | `ai-external-knowledge/claude-code/hooks.md`, section "PostToolUse" |
| Hook | `hooks/session-review-nudge.mjs`, `Stop` | Raise the review moment that no command announces | GDE | At the end of each turn | Zero unless it prints, then about 250 characters | `ai-external-knowledge/claude-code/hooks.md`, section "Stop" |
| Hook | `hooks/compact-hold.mjs`, `PreCompact` | Hold a manual compaction once, so the review happens before the context is summarized | ENF | On `/compact` only | Zero unless it holds | `ai-external-knowledge/claude-code/hooks.md`, section "PreCompact" |
| Tool | `tools/build-knowledge-index.mjs` | Generate the three indexes | ENF on format | From the after-write hook, or by hand | Zero | None. A Node script. |
| Tool | `tools/check-knowledge.mjs` | Check fields, values, size limits, links, and secrets. Read-only | ENF | From the after-write hook, the pre-commit hook, or by hand | Zero | None. A Node script. |
| Tool | `tools/frontmatter.mjs` | The shared frontmatter parser | ENF on parsing | Imported by the other two tools | Zero | None. A Node module. |
| Tool | `tools/session-marker.mjs` | Write the marker that says `knowledge-save` was invoked | ENF on recording | From a dynamic context injection line in the `knowledge-save` body | Zero | `ai-external-knowledge/claude-code/skills.md`, section "Dynamic context injection" |
| Tool | `.githooks/pre-commit` | Run the checker on staged knowledge files and refuse a failing commit | ENF | On every `git commit` in an equipped project | Zero | Git documentation for `core.hooksPath` |
| State | `${CLAUDE_PLUGIN_DATA}/sessions/<session_id>.json` | The few session facts the hooks share | ENF on storage | Written and read by the hooks | Zero | `ai-external-knowledge/claude-code/plugins-reference.md`, section "Persistent data directory" |
| Setting | `.claude/settings.json`: `enabledPlugins`, `autoMemoryEnabled: false` | Turn the plugin on and Claude Code auto memory off | ENF | Session load | Zero | `ai-external-knowledge/claude-code/memory.md`, section "Auto memory" |
| Setting | Codex `config.toml`: `memories.generate_memories`, `memories.use_memories` | Turn the Codex memory pipeline off | ENF | Session load | Zero | Codex source at commit 9771934, `codex-rs/config/src/types.rs` |

Two notes on the table.

A plugin cannot ship a `.claude/rules` file and cannot ship CLAUDE.md text
(`ai-external-knowledge/claude-code/plugins-reference.md`, section "What a
plugin cannot ship"). The two rule files are therefore written into each project
by `project-init` and `project-sync` from the shipped rule library. For Codex,
both texts sit in one "Knowledge system" section of the root `AGENTS.md`.

Every hook script is written once and registered twice: in the plugin's
`hooks/hooks.json` for Claude Code, and declared in the plugin manifest for
Codex, with `.codex/hooks.json` as the fallback. Codex uses the same twelve
event names and the same JSON output keys, so one script reads both inputs.

## 5. A session, start to finish

This section walks the six parts of the approved walkthrough. For each step it
names the part that does it and what the owner sees.

### Part 1. Read the required startup files

| Step in the walkthrough | Part that does it | What the owner sees |
| --- | --- | --- |
| The owner opens a session | The harness | Nothing |
| Project instructions, rules, and skills are available | `.claude/rules/knowledge-system.md` and the four skill descriptions load | Nothing |
| The startup reading steps reach the agent before the reads | `startup-map.mjs` prints the files themselves, so the reading is already done when the agent's first turn begins | Nothing |
| Read `SOUL.md`, then `knowledge/project.md`, then `knowledge/README.md`, in that order | `startup-map.mjs` prints them in that order in one stream | Nothing |
| The completion check | The hook's last line states which files were delivered, or names the file that is missing | Nothing |
| "I've read the knowledge manual." | The agent, following the hook's last line and the standing rule | One short line, once, at a new session start |

The order is a fact about the bytes the hook printed, not a request to the
agent. This is the design's answer to requirement 2's completion check, and it
is one of the open questions in the second half: requirement 2 asks for proof
that the contents "were read", and no harness can produce that proof.

### Part 2. Understand the request and current work

| Step | Part | What the owner sees |
| --- | --- | --- |
| Read `knowledge/memory/current.md` | `startup-map.mjs` printed it whole | Nothing |
| Check `knowledge/memory-inbox.md` for unanswered proposals and unfinished saves | `startup-map.mjs` printed each entry's heading and state line; the agent opens the entries that matter | Nothing, unless something is pending |
| The owner's request arrives | The owner | The owner's own message |
| Decide once whether long-term project knowledge could change the answer | The agent, guided by `.claude/rules/knowledge-system.md` | Nothing |
| If yes, find the source through the glossary and `knowledge/memory/memory-index.md` | `knowledge-find` | Nothing |
| Use an existing work item, or ask before creating one | The work tracker's own process, not this system | The question "Would you like me to create a work item for this?" when it applies |
| The briefing | The agent | A short briefing naming the records it used |

### Part 3. Use relevant knowledge to do the work

| Step | Part | What the owner sees |
| --- | --- | --- |
| Confirm the applicable guidance is present | The standing rule, and `.claude/rules/knowledge-files.md` when a knowledge file is read | Nothing |
| Resolve the project's shorthand | `knowledge/memory/memory-entries/terminology-glossary.md`, printed at start when small | Nothing |
| Open only the additional sources needed | `knowledge-find`, using the three indexes | Nothing |
| Decide whether the evidence is enough | The agent | A focused question when a gap remains |
| Cite the source under each finding | The standing rule and `knowledge-find` | The file path on the line below each finding |
| Do the work | The project's own delivery process | The work |
| Keep changed work state in its record | The tracker for item state; `knowledge/memory/current.md` for shared context | One short line confirming the overview was updated |

### Part 4. Decide what to save from the work

| Step | Part | What the owner sees |
| --- | --- | --- |
| The review happens at its moment | `save-moment-gate.mjs` for a pull request and a work-item close; `compact-hold.mjs` for manual compaction; `session-review-nudge.mjs` for a turn with real work; the skill description for "save this" | Nothing, until there is something to show |
| Establish the current rules before proposing | `knowledge-save` body and its reference files | Nothing |
| Consider prior owner feedback | `knowledge/memory-selection-feedback.md` | Nothing |
| Decide whether anything needs an update | The agent | Nothing on a quiet review |
| Choose the home | The requirement 18 table in `knowledge/README.md` | The home named on the card |
| Decide whether new approval is needed | `knowledge-save`, reading `memory_approval` in `knowledge/project.md` frontmatter | A card, or a one-line report when the approval step is off |
| Show the card | `knowledge-save`, using `references/card-format.md` | The card, under its destination heading |
| Write the entry in the inbox in the same reply | `knowledge-save` | Nothing |
| Pre-write check, then write | `knowledge-write-guard.mjs` allows the write because the skill ran | Nothing |
| Check the saved result and rebuild the index | `knowledge-after-write.mjs`, `check-knowledge.mjs`, `build-knowledge-index.mjs` | Nothing on success |
| Commit and push to the default branch | `knowledge-save`, following `.claude/rules/knowledge-direct-commit.md` | One line naming what was saved and where |
| Remove the completed inbox entry | `knowledge-save` | Nothing |

### Part 5. Fix knowledge problems when needed

| Step | Part | What the owner sees |
| --- | --- | --- |
| The agent finds a fault | Any step | Nothing |
| Establish the repair rules | `knowledge/README.md` and `knowledge-review` | Nothing |
| A clear mechanical repair, such as links after a rename or an index rebuild | `knowledge-save` lifecycle reference and `build-knowledge-index.mjs` | Nothing, or one line |
| A changed meaning, an unclear destination, or deleted content | Part 4's approval path | A card |
| A setup fault | `knowledge-setup` | The setup report |
| Verify and return to the interrupted step | `check-knowledge.mjs` | Nothing on success |

### Part 6. Hand off and resume

| Step | Part | What the owner sees |
| --- | --- | --- |
| Run the review before a handoff or a context clear | `knowledge-save`, invoked by the `handoff` skill and by `.claude/rules/offer-context-handoff.md` | Any card the review produces |
| Update `knowledge/memory/current.md` and the tracker | `knowledge-save` and the tracker | One line |
| Keep unanswered proposals and unfinished saves recoverable | `knowledge/memory-inbox.md`, reread before editing | Nothing |
| Check that the next session can actually see the saved state | `knowledge-save`, verifying the push | A short handoff, or a plain statement of what is not yet shared |
| A new session picks the work up | Part 1 and Part 2 again | The confirmation line, then the briefing |
| Recover each pending save by its recorded state | `knowledge-save`, reading the inbox entry | The card again for an unanswered proposal; nothing extra for an approved unfinished save |

`/clear` cannot be held. Claude Code's `SessionEnd` hook fires on a clear but
cannot block it and cannot say anything to the agent
(`ai-external-knowledge/claude-code/hooks.md`, section "SessionEnd"). A
deliberate clear is covered by `.claude/rules/offer-context-handoff.md` and the
`/handoff` command, which run the review before the prompt is written.

### The designed process

```mermaid
flowchart TD
    A[Session starts, resumes, is cleared, compacted, or forked] --> B[startup-map.mjs prints the map in order, under 9,500 characters]
    B --> C[".claude/rules/knowledge-system.md loads, and reloads from disk after compaction"]
    C --> D[Agent gives one confirmation line at a new session start]
    D --> E{Could saved project knowledge change this answer?}
    E -- No --> H[Do the work]
    E -- Yes, already read and current --> H
    E -- Yes, source needed --> F[knowledge-find: glossary, indexes, then the file itself]
    F --> G[Answer with the source path under each finding]
    G --> H
    H --> I{"Is this a save moment?"}
    I -- "Pull request or work-item close" --> J["ENFORCED: save-moment-gate.mjs denies the command"]
    I -- "Manual compaction" --> K["ENFORCED: compact-hold.mjs holds /compact once"]
    I -- "Turn with real work, or handoff, or owner asks" --> L[GUIDED: session-review-nudge.mjs, the rule, or the owner]
    J --> M[knowledge-save]
    K --> M
    L --> M
    I -- No --> H
    M --> N{"Does this update need new approval?"}
    N -- Yes --> O[Show the card and write the inbox entry in the same reply]
    O --> P{Owner answers?}
    P -- No answer --> Q[Entry stays 'awaiting approval' in the inbox]
    P -- Rejects --> R[Record the feedback, remove the entry]
    P -- Approves --> S[Pre-write check]
    N -- "No: drafting permission, shipped-work upkeep, or memory_approval off" --> S
    S --> T["ENFORCED: knowledge-write-guard.mjs allows the write only after knowledge-save ran, and never inside a subagent"]
    T --> U[Write the file]
    U --> V["ENFORCED: knowledge-after-write.mjs runs check-knowledge.mjs and build-knowledge-index.mjs"]
    V --> W{Checks pass?}
    W -- No --> X[Save unfinished, reported, entry kept in the inbox]
    W -- Yes --> Y["Commit and push to the default branch, then ENFORCED: .githooks/pre-commit rechecks staged files"]
    Y --> Z[One line: what was saved and where. Remove the completed inbox entry]
    Z --> H
    Q --> H
    R --> H
    X --> H
```

## 6. Each part in detail

### 6.1 The knowledge files

All of these are plain Markdown in the project repository, committed to the
default branch. They are the only copy of what they hold. This is requirement 1.

#### `SOUL.md`

What it is: what the agent is responsible for in this project. It sits at the
project root, not under `knowledge/`.

Mechanism: an ordinary file. It reaches the agent because `startup-map.mjs`
prints it first. Documentation page: none needed; it is not a harness feature.

When: printed at every session start, resume, clear, compaction, and fork.

Written by: `knowledge-setup` with the owner. Approval: the owner.

Control: GUIDE. Context cost: about 450 characters at start.

What can go wrong: the owner edits it and it grows past its share of the
budget. Recovery: the overflow rule in `startup-map.mjs` replaces it with a
"Read this now" line, so nothing is silently cut.

Codex: same, printed by the same script.

#### `knowledge/project.md`

What it is: what the project is, the real systems it uses, their names and IDs,
the folders that matter, and where work is tracked.

It also carries one frontmatter field this design adds:
`memory_approval: required` or `memory_approval: off`. `required` is the
default. `off` is the per-project setting requirement 10 gives the owner, which
turns the approval step off for writes to memory only. It never covers a
requirements document.

When the setting is `off`, a memory file still records who authorized it. The
value is `approved_by: Mike Rihm, standing approval (approval step off)` and
`approval_date` is the date of the write. This is an open question for the
owner; requirement 14 leaves no honest value for those two fields when the
approval step is off.

Mechanism: an ordinary file. Printed by `startup-map.mjs`. Control: GUIDE, plus
one ENFORCE: `check-knowledge.mjs` accepts that exact `approved_by` phrase only
when the project file says `memory_approval: off`.

Context cost: about 1,000 characters at start.

Codex: same file, read the same way.

#### `knowledge/README.md`, the manual

What it is: one file that says where each kind of information lives and what the
rules are. The requirements document calls it the manual; requirement 2 calls
the same thing a small map. This design keeps both names for one file.

Today's copy is 13,395 characters, which is 65 percent of the startup output
that overflows the 10,000-character cap. It is rewritten to stay **under 4,000
characters**. Templates, field tables, and step-by-step procedures move into the
skills' reference files, which load only when a skill is invoked.

Content outline, with the character budget for each part:

| Part | What is in it | Budget |
| --- | --- | --- |
| Title and one purpose line | "The knowledge manual" and one sentence | 100 |
| Where information goes | The requirement 18 routing table, verbatim, question in the left column and home in the right | 1,900 |
| The find order | Five lines, one per tier of requirement 19, plus one line saying an index entry is a pointer | 450 |
| The save moments | Five lines: a work item finishes or closes, a pull request is about to be opened, a handoff or context clear is coming, a turn ends after real work, and the owner says to save | 350 |
| The approval rule | Three lines: every write to a memory file or a requirements document needs permission that covers that change; silence is not approval; five things need no asking (rebuild an index, repair a clear broken link, write `current.md`, keep the feedback file, keep the inbox) | 350 |
| The file list | One line per file, with its path and one phrase | 450 |
| The skills | One line per skill: what it does and when to reach for it | 300 |
| Pointer lines | Where the field rules and templates live, and the direct link to `knowledge/memory/memory-entries/terminology-glossary.md` | 100 |

Total budget: 4,000 characters. Whether the requirement 18 table fits verbatim
inside 1,900 characters is to prove during the build; if it does not, the table
stays whole and another part shrinks, because requirement 18 says the full table
is given to the agent in every project.

Mechanism: an ordinary file, printed third by `startup-map.mjs`. It is a managed
copy: the toolkit owns its text, and `tests/installed-copy-check.mjs` fails when
the shipped original and a project's copy stop matching.

Control: GUIDE. Context cost: under 4,000 characters at start.

What can go wrong: the manual grows again and pushes the startup output over
budget. Recovery: `check-knowledge.mjs` fails a manual over 4,000 characters, so
the growth is caught at the commit that causes it.

Codex: same file, printed by the same script.

#### `knowledge/memory/current.md`

What it is: the shared overview across all sessions in this project. The
project goal and next milestone, then one section per active work item with its
goal, where the work stands, the next step, the blocker or None, its to-dos, and
a link to its detailed record. Then general project to-dos.

It is not lasting memory. A wrong line costs little and the owner can fix it by
hand. A stale file costs a lot more, so the agent rewrites it as work happens,
without asking, and says in one line that it did.

Mechanism: an ordinary file, printed fourth by `startup-map.mjs`.

Control: GUIDE on its content. ENFORCE on its size: `check-knowledge.mjs`
refuses a file over 5,000 characters.

Context cost: up to 5,000 characters at start.

What can go wrong: two sessions overwrite each other's entries. Recovery:
`.claude/rules/knowledge-files.md` says to reread a shared file before editing
it, and `.claude/rules/knowledge-direct-commit.md` fetches before it commits.
Neither is proof. This is a named limit.

Codex: same.

#### `knowledge/memory-inbox.md`

What it is: proposals the owner has not answered, and approved saves that did
not finish. One `##` heading per entry, keyed by a reference that does not
change. States are `awaiting approval`, `approved, save unfinished`, and
`blocked by conflict`.

Each entry holds: the stable reference; the destination and the operation; the
exact card when one was shown; which harness it was shown in and that
conversation's ID; the source and its date; the last update; the state; and the
next step or blocker. For automatic upkeep of a requirements document where no
card was shown, it holds the specific update owed, where the permission came
from, and links to the agreed scope and the delivery evidence.

Timing: the entry is written locally in the same reply that shows the card, and
pushed at the next push or at the handoff. Writing it later loses the card if
the session dies first.

Mechanism: an ordinary file. `startup-map.mjs` prints only each entry's heading
and its state line, so a heavy entry costs nothing at startup. The agent opens
the entry that matters.

Control: GUIDE. Keeping the inbox up to date is one of the five things
requirement 10 allows without asking.

Context cost: about 60 characters per entry at start.

What can go wrong: the entry is never written, so a card is lost when the
session ends. Recovery: none after the fact. Writing in the same reply is what
narrows the window to one reply.

Codex: same.

#### The three generated indexes

`knowledge/memory/memory-index.md`, `knowledge/prds/prd-index.md`, and
`ai-external-knowledge/README.md`.

What they are: generated lists. Entries grouped under short headings taken from
each file's `group` field. Each entry is one line: a link to the source file,
then that file's `summary` copied word for word. The index adds nothing of its
own. Memory files whose `status` is not `current`, and requirements documents
whose `status` is not `finalized`, carry their status on the line. The
glossary is excluded from the memory index. In the requirements-document index,
a child sits under its parent, indented one level. Two lines of header at most.

`ai-external-knowledge/README.md` is hand-written today. It becomes generated
from each captured topic's entry page, whose frontmatter supplies `group` and
`summary`.

Mechanism: written by `tools/build-knowledge-index.mjs`. Never edited by hand.

Control: ENFORCE on format. The tool is the only writer, and
`check-knowledge.mjs` fails a hand edit that does not match a rebuild.

Context cost: the two `knowledge/` indexes are printed whole at start when each
is short, else only their path. `ai-external-knowledge/README.md` is a path at
start and is opened during a lookup.

What can go wrong: a Git merge of two branches leaves an index wrong with no
reported conflict. Recovery: the fixed sort rule means the same files always
produce the same bytes, and any write under `knowledge/` triggers a rebuild.

Codex: same tool, run by the same hook where the event fires, and by the skill
by hand where it does not.

#### `knowledge/memory/memory-entries/`

What it is: one home per topic area. One Markdown file by default, or a topic
folder holding related files when an approved split says so. Each file carries
the twelve required frontmatter fields of requirement 14: `summary`, `group`,
`type`, `status`, `source`, `context`, `confidence`, `created_at`,
`updated_at`, `tags`, `approved_by`, `approval_date`.

Topic folders and child requirements documents are impossible in the tools
shipped today. `check-knowledge.mjs` fails on a subfolder,
`build-knowledge-index.mjs` warns and skips it, and two skills state the flat
rule. All four change in the build.

Control: ENFORCE on shape, through `check-knowledge.mjs`,
`knowledge-write-guard.mjs`, and `.githooks/pre-commit`. JUDGE on content:
nothing checks whether a saved fact is true.

Codex: same files. The write guard works there too, by parsing the patch text.

#### `knowledge/memory/memory-entries/terminology-glossary.md`

What it is: a title, one purpose sentence, and one alphabetical table with the
columns Term / aliases, Plain meaning, Refers to, Watch out, Source / date. It
is not a memory topic. It has no memory fields and is left out of the memory
index.

Requirement 7 says the agent uses its meanings "from the first message of every
session". This design meets that by printing the glossary whole at startup when
it is under 2,000 characters. A larger glossary prints only its path, and the
agent must open it. That limit is named in the setup report.

Control: GUIDE. Context cost: up to 2,000 characters at start.

Codex: same.

#### `knowledge/prds/`

One requirements document per feature area, or a folder holding a parent and its
children. Required fields: `summary`, `group`, `area`,
`status`, `source`, `created_at`, `updated_at`, `tags`. `approved_by` and
`approval_date` are both absent on an unapproved `proposed` draft and both
required once the requirements are approved.

Control: ENFORCE on fields, through `check-knowledge.mjs`. The existing approval
logic in that tool already separates permission to write a draft from approval
of the requirements, and thirty test cases cover it. Both are kept.

Codex: same.

#### `knowledge/memory-selection-feedback.md`

What this owner accepts and rejects as memory, so later proposals improve. A
table of date, candidate, outcome, and the owner's stated reason, or "no reason
given". Capped at 4,000 characters. It replaces today's
`knowledge/memory-self-improvement.md`, which is capped at 8,000. It is guidance
about how the agent works, not a fact about the project, so keeping it current
needs no approval. Control: GUIDE on content, ENFORCE on size. Codex: same.

#### `brainstorms/`

Unchecked exploration, at the project root, outside `knowledge/`. Nothing in it
is project truth. Control: GUIDE. Codex: same.

### 6.2 The two rule files

A plugin cannot ship a rule file
(`ai-external-knowledge/claude-code/plugins-reference.md`, section "What a
plugin cannot ship"). Both files are written into a project by `project-init`
and `project-sync`, from the shipped rule library at
`plugins/project-init/library/rules/general/`.

#### `.claude/rules/knowledge-system.md`

What it is: the standing obligations, about 25 lines, no `paths` frontmatter, so
it loads in every session.

Mechanism: an unscoped rule file. Documentation page:
`ai-external-knowledge/claude-code/memory.md`, section "Organize rules with
`.claude/rules/`". Unscoped rules load at session start with the same priority
as `.claude/CLAUDE.md`, and they are re-injected from disk after compaction
(`ai-external-knowledge/claude-code/context-window.md`, section "What survives
compaction"). That re-injection is why the standing obligations sit here and not
only in hook output: hook-added context is summarized away with the rest of the
conversation.

The 25 lines, by meaning:

1. This project runs the knowledge system, and the manual is at
   `knowledge/README.md`.
2. The three startup files arrive from the startup hook; do not read them again.
3. Give the one-line confirmation at a new session start only, never on a
   resumed turn.
4. Before answering anything that rests on project knowledge, decide once
   whether saved knowledge could change the answer.
5. That decision holds while the scope and the relevant information stay the
   same; another tool call is not a reason to decide again.
6. When the answer is yes, look it up in the manual's find order.
7. Put the source path on the line under each finding, every time.
8. Resolve the project's shorthand from the glossary before searching.
9. An index line is a pointer. Open the file.
10. A `proposed` requirements document does not prove what the system does
    today.
11. Save moment one: a work item finishes or closes.
12. Save moment two: a pull request is about to be opened.
13. Save moment three: a handoff or a context clear is coming.
14. Save moment four: a turn ends after real work was done.
15. Save moment five: the owner says to save something.
16. Run `knowledge-save` at those moments; it carries the rules, the templates,
    and the approval path.
17. Never write under `knowledge/memory/memory-entries/` or `knowledge/prds/`
    except through that skill.
18. `knowledge/memory/current.md` and `knowledge/memory-inbox.md` are the
    agent's to keep, without asking.
19. Reread a shared file before replacing it, and preserve other sessions'
    entries.
20. An approved save goes straight to the default branch, under
    `.claude/rules/knowledge-direct-commit.md`.
21. Say "saved locally, not yet pushed" when the push has not happened yet.
22. A helper agent reports candidates and never writes knowledge.
23. When the context was condensed, reuse what is still present and reopen the
    manual before the next knowledge operation.
24. `knowledge-find`, `knowledge-review`, and `knowledge-setup` in one line each.
25. Where the detail lives: the manual, then the skill's reference files.

Control: GUIDE. It enforces nothing. Context cost: about 1,200 characters in
every request, in every session, including inside a subagent, because subagents
load the CLAUDE.md hierarchy and project rules
(`ai-external-knowledge/claude-code/sub-agents.md`, section "What loads at
startup"). The Explore and Plan subagents are the exception: they load no rules,
so for them `knowledge-write-guard.mjs` is the only cover.

What can go wrong: the rule is present and the agent still does not look
something up. Nothing catches that. It is a named limit, and requirement 3's
representative sessions are how it is tested.

Codex: the same text, as part of one "Knowledge system" section in the root
`AGENTS.md`. Codex re-renders `AGENTS.md` after compaction, so the guidance
returns there too.

#### `.claude/rules/knowledge-files.md`

What it is: six lines that matter only when the agent has a knowledge file open.
Its frontmatter is `paths: knowledge/**`.

Mechanism: a path-scoped rule. Documentation page:
`ai-external-knowledge/claude-code/memory.md`, section on `paths` frontmatter. A
path-scoped rule loads when Claude reads a file matching the pattern and costs
nothing until then. After compaction it reloads only when a matching file is
read again, which is correct here: the six lines matter only at that moment.

The six lines:

1. Write a lasting file only through `knowledge-save`.
2. An index line is a pointer; open the file before using what it says.
3. A `proposed` requirements document proves nothing about today.
4. Put the source path under each finding.
5. Reread a shared file before editing it, and keep other sessions' entries.
6. The field rules and the templates are in `knowledge-save`'s reference files.

There is no field table here. Requirement 18 says each home's rules are written
in one place, and that place is the skill's references.

Control: GUIDE. Context cost: about 400 characters, and zero until a file under
`knowledge/` is read.

Codex: weaker. Codex has no path-scoped rules, and nested `AGENTS.md` loads only
along the path from the project root to the working directory. These six lines
therefore sit in the same root `AGENTS.md` section as the standing rule, which
means Codex pays their cost in every session instead of only when a knowledge
file is opened.

### 6.3 The four skills

All four live in `plugins/second-brain/skills/`. All four are model-invocable
and user-invocable, so requirement 24's plain-language requests reach them
through their descriptions, and `/second-brain:knowledge-save` reaches them by
name.

Mechanism and documentation page for all four:
`ai-external-knowledge/claude-code/skills.md`, sections "Frontmatter reference"
and "Add supporting files". A skill's name and description load at session start
and cost about 300 characters each per request. The body loads only when the
skill is invoked, and then stays across turns. After compaction, Claude Code
re-attaches the most recent invocation of each skill, keeping the first 5,000
tokens, so the rules that matter most go at the top of each body.

#### `knowledge-find`

Replaces the shipped `recall` and `session-search` skills.

Description names: picking up work, a question about a decision or a required
behavior, troubleshooting, and the moment before a multi-step procedure.

Body outline:

1. The five tiers of requirement 19, with one line on what each source is for.
2. Resolve the project's shorthand from the glossary before tier 4.
3. The citation format of requirement 6: the finding, then the source path on the
   line below; a session name and date for something found in history; a page
   path and capture date for outside documentation.
4. The tie-break of requirement 16: a `finalized` requirements document wins on
   required behavior, the System Guide wins on how the parts fit together, the
   live system wins on what exists now, and memory never beats any of the three.
5. Scan `ai-external-knowledge/README.md` during the lookup and open the
   captured page before relying on it.
6. When tier 4 finds nothing, say so and name what was searched.

Reference files: `references/source-roles.md` (what each tier is for and what it
cannot settle), `references/session-search.md` (how to run the history search),
and `scripts/search-sessions.mjs` (read-only, Claude Code history only).

Control: GUIDE. Context cost: description always; body about 3,000 characters
when invoked.

Codex: same skill folder. The history search is Claude Code only and reports
itself unavailable in Codex.

#### `knowledge-save`

Replaces `remember`, `retire`, and the writing half of `reflect`.

Description names: remember, save, write this down, a fixed problem, before a
pull request, before a handoff, a finished work item, a shipped change, and
something out of date or duplicated.

The body's first line is a dynamic context injection line. It runs
`node "${CLAUDE_PLUGIN_ROOT}/tools/session-marker.mjs"`, which writes the marker
that `save-moment-gate.mjs` and `knowledge-write-guard.mjs` read. Documentation
page: `ai-external-knowledge/claude-code/skills.md`, section "Dynamic context
injection". The command runs every time the skill is invoked, on both the
`/skill-name` path and the model-invoked path. It must always exit 0, because a
failed injected command aborts the whole invocation and the agent then sees
nothing.

Body outline:

1. Gather candidates from the work since the last review.
2. Drop candidates by requirements 11 and 12, and by
   `knowledge/memory-selection-feedback.md`.
3. Route each survivor by the requirement 18 table, and name the home.
4. Check the existing topic file or folder, and check the inbox for a proposal
   that already covers it.
5. Decide the approval path: a card, recorded drafting permission, shipped-work
   upkeep, or `memory_approval: off`.
6. Show the cards in the requirement 20 shape, under their destination headings.
7. Write the inbox entry in the same reply.
8. On approval, run the pre-write check, then write with the templates.
9. Read back the saved change and compare it with the approved operation,
   meaning, and scope.
10. Let `knowledge-after-write.mjs` run the checker and rebuild the index; run
    both tools by hand when that hook did not fire.
11. Commit and push to the default branch under
    `.claude/rules/knowledge-direct-commit.md`.
12. Update the inbox and the feedback file.
13. Report in one line, or stay quiet, as requirements 9 and 16 say.

Reference files: `references/card-format.md` (the requirement 20 card, which
replaces today's five-bullet `Why` / `Where` / `From` / `Unsure` / `Checked`
template), `references/memory-file.md`, `references/prd-file.md`,
`references/glossary-row.md`, `references/inbox-entry.md`,
`references/lifecycle.md` (update, supersede, retire, merge, delete), and
`references/feedback-entry.md`.

Control: GUIDE on its own. It becomes the only allowed way to write a lasting
file because `knowledge-write-guard.mjs` refuses every other way.

Context cost: description always; body about 6,000 characters when invoked.

What can go wrong: the agent invokes the skill, writes nothing, and the gate
opens. The gate proves an invocation after the branch's last commit, not a good
review. Named limit.

Codex: same skill. Codex has no dynamic context injection, so the marker is
written by a plain `node` step the body tells the agent to run. That is weaker:
it proves the command ran, not that the body was read.

#### `knowledge-review`

Replaces the folder-wide half of `reflect`.

Description names: a whole-folder review, duplicates, contradictions, cleanup,
and the check after a layout migration.

Body outline: read every memory topic and requirements document; list
duplicates, conflicts, and retirement candidates; consolidate the feedback file;
propose every change through `knowledge-save`, never writing directly.

Reference file: `references/review-checklist.md`.

Control: GUIDE. Context cost: description always; body about 3,000 characters
when invoked.

Codex: same.

#### `knowledge-setup`

Replaces `second-brain`.

Description names: set up, turn on, check, repair, explain, and bring up to
date.

Body outline: detect what state the project is in; equip it in one approved
step; migrate an older layout with link repair; turn Claude Code auto memory off
with `autoMemoryEnabled: false`; turn the Codex memory pipeline off; enable the
Git pre-commit hook with `core.hooksPath`; write the two rule files and the
`AGENTS.md` section; run the delivery proof; report `equipped <version>` or name
the failed check and every Codex gap.

Reference files: `references/templates/` (one per knowledge file),
`references/migration.md`, `references/codex-delivery.md`, and
`references/proof.md`.

Control: GUIDE, running ENFORCE settings. Context cost: description always; body
about 5,000 characters when invoked.

Codex: same skill; its report names each gap.

### 6.4 The six hooks

Every hook is `type: "command"` in exec form:
`"command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/hooks/<name>.mjs"]`. Every
one catches its own errors and exits 0, so a broken knowledge setup can never
stop a session. Every one writes only to the session-state folder or to a
generated index. They are registered in the plugin's `hooks/hooks.json` for
Claude Code, and declared in the plugin manifest for Codex, with
`.codex/hooks.json` as the fallback.

#### `startup-map.mjs`, `SessionStart`

Matcher: `startup|resume|clear|compact|fork`.

Documentation page: `ai-external-knowledge/claude-code/hooks.md`, section
"SessionStart". A `SessionStart` hook's plain stdout is added to the agent's
context before the first prompt. Only `command` and `mcp_tool` handlers run on
this event, and `mcp_tool` handlers are skipped at launch, so this is a
`command` handler. Hooks for one event run in parallel with no guaranteed order,
so one script prints the whole map rather than several scripts printing parts of
it.

Input fields read: `session_id`, `source`, `cwd`.

Output: plain text on stdout, exit 0.

Print order:

1. One line: `Knowledge system <plugin version>, session source <source>`.
2. `SOUL.md`, whole.
3. `knowledge/project.md`, whole.
4. `knowledge/README.md`, whole.
5. `knowledge/memory/current.md`, whole.
6. `knowledge/memory-inbox.md`: each entry's `##` heading and its state line
   only.
7. `knowledge/memory/memory-index.md` and `knowledge/prds/prd-index.md`, whole
   when each is short, else its path.
8. `knowledge/memory/memory-entries/terminology-glossary.md`, whole when it is
   under 2,000 characters, else its path.
9. The System Guide line: the entry page named in `.system-guide.json`, or
   `System Guide is not configured.` when that file is absent or turned off. A
   malformed config is left alone so the System Guide plugin can report it.
10. The last line: either the instruction to give the one-line confirmation, or
    the name of the missing file plus the instruction not to confirm.

Budget: 9,500 characters, because Claude Code caps a hook output string at
10,000 and replaces anything above it with a preview and a file path.

Overflow rule: when printing a file whole would push the output over budget,
the hook prints, in that file's place and in that file's position in the order,
the single line `Read <path> now, before the confirmation.` The order never
changes. A missing file prints `[missing: <path>]`.

Housekeeping: on every run, the hook deletes session-state files older than 30
days.

Control: ENFORCE on delivery. What the agent does with the text is GUIDE.

Context cost: up to 9,500 characters, once per session start, resume, clear,
compaction, and fork.

What can go wrong, and the recovery:

| Problem | Recovery |
| --- | --- |
| A `/clear` or a conversation switch while the hook is still running discards its output | The hook runs again on the new source, so nothing is lost |
| A file is missing | The map names it, the agent withholds the confirmation, and only dependent work pauses |
| The map is summarized away by compaction | The hook matches `compact` and runs again |
| The agent skips the confirmation | Visible in requirement 3's representative sessions. Nothing enforces it |

Codex: same. Codex `SessionStart` fires on the same five sources and carries
`hookSpecificOutput.additionalContext`. Two fixes in the build: `.codex/hooks.json`
and `.claude/settings.json` both leave `fork` out of the matcher today, and
`additionalContextLimit` must be raised from 5,000 to at least 9,500, because in
Codex that value is a spill-to-disk threshold, not an allowance.

#### `save-moment-gate.mjs`, `PreToolUse`

Matchers and `if` filters:

| Matcher | `if` filter | What it catches |
| --- | --- | --- |
| `Bash\|PowerShell` | `Bash(gh pr create *)` | Opening a pull request from the command line |
| `Bash\|PowerShell` | `Bash(gh issue close *)` | Closing a work item from the command line |
| `Bash\|PowerShell` | `Bash(work finish *)` | Finishing a local work item |
| `mcp__github__create_pull_request` | none | Opening a pull request through the GitHub MCP tool |
| `mcp__github__issue_write` | none | Closing an issue through the GitHub MCP tool |

The two MCP matchers matter because in web and remote sessions the agent opens
pull requests with `mcp__github__create_pull_request`, not `gh pr create`.
Without them the gate would be silent exactly where this repository's owner
works most. `mcp__github__issue_write` also creates and edits issues, so the
hook reads `tool_input` and holds only when the state is being set to closed.

Documentation page: `ai-external-knowledge/claude-code/hooks.md`, sections
"PreToolUse", "Common fields" (the `if` filter), and the MCP tool naming rules.
The `if` filter is best-effort for Bash: Claude Code runs the hook whenever it
cannot tell what a command line will do, so the script re-checks the command
itself. The `if` patterns use the two-star form, because a single-segment
pattern matches only under the working directory root since v2.1.214. Codex has
no `if` field at all and ignores one silently, so the script's own filtering is
the real filter on both harnesses.

Input fields read: `session_id`, `cwd`, `tool_name`, `tool_input.command` for a
shell call, `tool_input` for the MCP calls, and `agent_id` when present.

Output on a hold:

```json
{ "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "This command is a save moment. Invoke knowledge-save, finish the review, then run the command again." } }
```

Release condition: the session-state file holds a `save_skill_at` timestamp that
is newer than the branch's last commit, read with `git log -1 --format=%ct`. A
session that saved, then committed more work, is held again.

Control: ENFORCE. It enforces that `knowledge-save` was invoked after the last
commit. It does not enforce that the review was any good.

Context cost: zero unless it denies, then about 220 characters.

What can go wrong: a pull request opened in a browser, or a command form the
script does not recognize. Recovery: none. Named limit. Merging a pull request
raises no hold, by the owner's 2026-09-03 decision; instead, at the pull-request
review `knowledge-save` writes one inbox entry that says upkeep of the
requirements document is owed when that pull request merges, so the next
session's startup lines and the Stop nudge carry it.

Windows: the matcher includes `PowerShell` and the script knows the PowerShell
command forms, because on Windows without Git Bash, Claude Code does not register
the Bash tool at all. Codex runs `commandWindows` through `cmd.exe`, not
PowerShell; the value shipped today is PowerShell syntax and is fixed in the
build. Codex otherwise behaves the same, through `PreToolUse` on the shell tool.

#### `knowledge-write-guard.mjs`, `PreToolUse`

Matcher: `Edit|Write`. `if` filters: `Edit(**/knowledge/memory/memory-entries/**)`,
`Write(**/knowledge/memory/memory-entries/**)`, `Edit(**/knowledge/prds/**)`,
and `Write(**/knowledge/prds/**)`.

Documentation page: `ai-external-knowledge/claude-code/hooks.md`, section
"PreToolUse input". For a file tool, `tool_input.file_path` is always absolute,
with `~` and relative paths already expanded, so the rule cannot be dodged by
spelling the path differently. On Windows the separators are backslashes, so the
script normalizes them before matching.

Input fields read: `session_id`, `cwd`, `tool_name`, `tool_input.file_path`, and
`agent_id` with `agent_type` when present.

Two deny conditions:

1. `agent_id` is present. A subagent never writes lasting knowledge, whatever
   the marker says. Plugin and settings hooks do run inside subagents, and the
   input carries `agent_id` and `agent_type`
   (`ai-external-knowledge/claude-code/sub-agents.md`).
2. The session-state file holds no `save_skill_at` for this session.

Output on a deny: the same `permissionDecision: "deny"` output as the gate, with
the reason "Lasting knowledge is written through knowledge-save, which carries
the approval rules and the templates. Invoke it first."

Control: ENFORCE on the path. It enforces that the skill's rules are in context
at the moment of the write. It cannot see approval; no hook can. That is the
design's largest named limit and it appears in the setup report.

Context cost: zero unless it denies, then about 200 characters.

What can go wrong: a write made through Bash, with `sed`, a heredoc, or
`python -c`, never reaches an `Edit` or `Write` matcher. The guard does not cover
it. `knowledge-after-write.mjs` catches the file afterwards, which is a check,
not a refusal. This is stated in the setup report.

A stronger option exists and is not built now: deny unless
`knowledge/memory-inbox.md` holds a matching `approved, save unfinished` entry
for that exact destination, which would make the inbox an approval ledger.
Requirement 29 says to add a restriction only after a failure that happened, so
this is recorded as the next step if an unapproved write ever lands.

Codex: enforced there too. Codex fires `PreToolUse` for `apply_patch` with the
matcher aliases `Write` and `Edit`, so the same matcher string works. Its
`tool_input` is one field, `command`, holding the whole patch text with no file
list, so the script reads the `*** Update File:` and `*** Add File:` lines out of
the patch.

#### `knowledge-after-write.mjs`, `PostToolUse`

Two registrations:

1. Matcher `Edit|Write`, with `if` filters `Edit(**/knowledge/**)`,
   `Write(**/knowledge/**)`, `Edit(**/ai-external-knowledge/**)`, and
   `Write(**/ai-external-knowledge/**)`.
2. Matcher `Bash`, with no `if`. The script runs
   `git status --porcelain -- knowledge/ ai-external-knowledge/`, compares the
   result with what it saw on its last run, and exits silent when nothing
   changed. That costs about 10 milliseconds per Bash call. It also reads
   `tool_response.bashEditDiff` as a hint when the harness supplies it; that
   field needs v2.1.269 or later, is in public beta, and is best effort, so it is
   a hint and never a gate.

Documentation page: `ai-external-knowledge/claude-code/hooks.md`, section
"PostToolUse". `hookSpecificOutput.additionalContext` puts text beside the tool
result, where the agent reads it.

Input fields read: `session_id`, `cwd`, `tool_name`, `tool_input.file_path`,
`tool_response`.

What it does: runs `check-knowledge.mjs` on the written file, and rebuilds the
affected index with `build-knowledge-index.mjs` when the file sits under
`memory-entries/`, `prds/`, or a captured topic.

Output: nothing on a clean write. On a failure, `additionalContext` naming the
file, the rule it broke, and the sentence "the save is unfinished until this
passes".

Control: ENFORCE. Every knowledge write is checked and the index follows,
without the agent remembering to run anything.

Context cost: zero on a clean write; about 300 characters on a failure.

Why not `FileChanged`: that event watches the disk and fires whatever wrote the
file, which would have covered the Bash hole. It returns no
`additionalContext`, so a failed check would never reach the agent, and its
matcher is a literal filename in the working directory rather than a glob. It
may be added later as a silent index rebuild for the owner's own hand edits.

Codex: same event and the same JSON keys. The `if` field does not exist there,
so the script's own path filter does the work on every tool call.

#### `session-review-nudge.mjs`, `Stop`

Documentation page: `ai-external-knowledge/claude-code/hooks.md`, section
"Stop". `hookSpecificOutput.additionalContext` continues the turn and is
labelled feedback rather than an error. Claude Code ends the turn after 8
consecutive blocks.

Input fields read: `session_id`, `cwd`, `stop_hook_active`. The Stop input
carries no tool count and no list of changed files, and the transcript file lags
the live conversation, so the count comes from Git.

What it does:

1. Exits silent when `stop_hook_active` is true.
2. On the first Stop of a session, records a baseline of HEAD and the dirty
   paths in the session-state file.
3. On later Stops, counts files changed since `save_skill_at`, ignoring anything
   under `knowledge/` and the state folder.
4. When the count crosses 10, returns `additionalContext` once: "<n> files
   changed since the last knowledge review. This is a save moment under the
   manual. Invoke knowledge-save, or say why not."
5. Once per session, when `knowledge/memory-inbox.md` holds an entry in state
   `approved, save unfinished`, returns one line naming it.

Control: GUIDE. It raises the requirement 9 moment that no owner words and no
command announce. It never blocks.

Context cost: one `git status` per turn; about 250 characters when it prints.

What can go wrong: in a shared checkout it cannot tell this session's changes
from another session's. It errs toward printing. The nudge is capped per
session, so a false count costs one message.

Codex: weaker. The Codex `Stop` output has no `additionalContext` field at all.
The only way to say anything is `decision: "block"` with a reason, which forces
the turn to continue. So in Codex the nudge fires as a block at most once per
session, and the session-state file prevents a second one. That is an open
question for the owner: accept one forced continuation per session in Codex, or
leave Codex without the nudge.

#### `compact-hold.mjs`, `PreCompact`

Matcher: `manual` only. Auto compaction is never held, because blocking a
recovery compaction can fail the request.

Documentation page: `ai-external-knowledge/claude-code/hooks.md`, section
"PreCompact". `PreCompact` can block with exit 2 or `decision: "block"`.

Input fields read: `session_id`, `trigger`.

What it does: holds `/compact` once per session, with the message "A context
clear is a save moment. Refresh current.md and run the knowledge review, then
compact again." It writes `compact_held: true` into the session-state file, so
the second `/compact` goes through.

Control: ENFORCE, once. Context cost: zero unless it holds.

What can go wrong: `/clear` cannot be held at all. `SessionEnd` fires on a clear
but cannot block it and cannot speak to the agent. The deliberate clear is
covered by `.claude/rules/offer-context-handoff.md` and the `/handoff` command
instead, which run the review before the prompt is written.

Codex: to prove during the build. Codex has `PreCompact` with the same `manual`
and `auto` matchers, but its `PreCompact` output schema carries only `continue`,
`stopReason`, `suppressOutput`, and `systemMessage`, so whether a hold works
there is a build-time check.

### 6.5 The tools and the Git hook

All four scripts live in `plugins/second-brain/tools/` and run as
`node "${CLAUDE_PLUGIN_ROOT}/tools/<name>.mjs"`. Projects keep no copies, so
nothing can drift. This repository's own `CLAUDE.md` tool row and step 4 of
`.claude/rules/knowledge-direct-commit.md` change from `.claude/tools/...` to
the plugin path, and `tests/installed-copy-check.mjs` changes with them.

#### `build-knowledge-index.mjs`

What it is: the only writer of the three indexes. It groups by each file's
`group` field, sorts groups and files by one fixed rule so the same input always
produces the same bytes, keeps a topic folder's files under one heading, indents
a child requirements document under its parent, leaves out the glossary and the
inbox, and puts a status label on any memory that is not `current` and any
requirements document that is not `finalized`.

Control: ENFORCE on format. What can go wrong: a Git merge leaves an index wrong
with no reported conflict; the fixed sort rule and the after-write rebuild are
the recovery. Codex: same script, run from the same hook or by the skill.

#### `check-knowledge.mjs`

What it is: a read-only checker. It never edits a file, and a test asserts the
file on disk is byte-identical after a run. Both are kept.

What it checks: the required fields and allowed values of requirements 14 and
16; `context` and `updated_at`, which today it wrongly rejects as unknown
fields; the `memory_approval: off` form of `approved_by`; `summary` under 200
characters; `knowledge/memory/current.md` under 5,000 characters;
`knowledge/memory-selection-feedback.md` under 4,000 characters;
`knowledge/README.md` under 4,000 characters; that links resolve; the eight
secret patterns; and that the inbox is not indexed.

It stops enforcing the flat-folder rule, which today makes the requirements
document's own layout impossible.

Output: exit 1, naming the file and the rule it broke.

Control: ENFORCE. Codex: same script, run by hand from the skill where the
after-write hook does not fire.

#### `frontmatter.mjs`

The shared frontmatter parser, imported by the other two tools, so they cannot
disagree about what a file says. It reports what it does not understand rather
than guessing. Kept as it is today.

#### `session-marker.mjs`

What it is: the script that writes `save_skill_at` and `branch` into the
session-state file. It runs from the dynamic context injection line at the top
of the `knowledge-save` body, on every invocation, on both the typed and the
model-invoked path. It always exits 0.

Why not a `PostToolUse` hook on the `Skill` tool: `PreToolUse` and `PostToolUse`
do fire for the Skill tool when the model invokes a skill, but a typed
`/skill-name` bypasses those events, and the Skill tool's `tool_input` schema is
undocumented. The injection line covers both paths. The Skill hook is the
fallback if the injection line turns out not to work.

Control: ENFORCE on recording. It is the evidence the gate and the write guard
read.

Codex: weaker. Codex has no Skill tool and no dynamic context injection, so the
body's last step tells the agent to run one `node` command. That proves the
command ran, not that the body was read.

#### `.githooks/pre-commit`

What it is: a Git pre-commit hook, tracked in the project repository, enabled by
`knowledge-setup` with `git config core.hooksPath .githooks`. It runs
`check-knowledge.mjs` on the staged files under `knowledge/` and
`ai-external-knowledge/` and refuses the commit when a check fails.

Why it is here: nothing runs the checker automatically today. The after-write
hook gives the agent early feedback; this is the last line before knowledge is
published, it covers both harnesses, and it covers the owner's own hand edits,
which is what requirement 21 asks for. Git is one of the five parts requirement
1 allows.

Control: ENFORCE. What can go wrong: it also refuses the owner's own bad commit.
That is the intent, and it is flagged for the owner.

Codex: same. A Git hook does not care which harness made the commit.

### 6.6 The session state

What it is: one small JSON file per session, holding the few facts the hooks
share.

Location: `${CLAUDE_PLUGIN_DATA}/sessions/<session_id>.json` in Claude Code,
which resolves to `~/.claude/plugins/data/<id>/`, a per-plugin folder outside
the repository that survives plugin updates
(`ai-external-knowledge/claude-code/plugins-reference.md`, section "Persistent
data directory"). In Codex the folder is `~/.claude-toolkit/sessions/`. Never
inside the repository. This is requirement 29's data boundary: session
bookkeeping is temporary state, never a lasting fact about the project.

Fields:

| Field | What it holds | Written by | Read by |
| --- | --- | --- | --- |
| `save_skill_at` | Epoch seconds when `knowledge-save` was last invoked | `session-marker.mjs` | `save-moment-gate.mjs`, `knowledge-write-guard.mjs`, `session-review-nudge.mjs` |
| `branch` | The branch that was checked out at that moment | `session-marker.mjs` | `save-moment-gate.mjs` |
| `stop_baseline` | HEAD and the dirty paths at the session's first Stop | `session-review-nudge.mjs` | `session-review-nudge.mjs` |
| `nudged_at_count` | The changed-file count at the last nudge | `session-review-nudge.mjs` | `session-review-nudge.mjs` |
| `compact_held` | Whether the manual compaction hold already fired | `compact-hold.mjs` | `compact-hold.mjs` |
| `inbox_nudged` | Whether the unfinished-save line already fired this session | `session-review-nudge.mjs` | `session-review-nudge.mjs` |

Housekeeping: `startup-map.mjs` deletes entries older than 30 days on every run.

Control: ENFORCE on where it lives. Context cost: zero. It never reaches the
agent's context.

What can go wrong: a subagent's hook input may carry the parent's `session_id`,
which would let a helper agent pass on the parent's marker. Whether it does is
to prove during the build. If it does, the write guard keys on `session_id`
together with `agent_type`. Either way, the guard already denies any lasting
write when `agent_id` is present, so the marker is not the only cover.

When function hooks ship, this file and the three `PreToolUse` and `PostToolUse`
scripts that read it are the parts to move in-process. Nothing else changes.
Function hooks do not exist in any official source today, so they are named here
once, as an unverified future, and nothing in this design depends on them.

### 6.7 The settings

| Setting | Value | Why | Page followed |
| --- | --- | --- | --- |
| `.claude/settings.json` `enabledPlugins` | `{"second-brain@claude-toolkit": true}` | Turns the plugin on for this project, which is requirement 27's one approved step | `ai-external-knowledge/claude-code/plugins-reference.md` |
| `.claude/settings.json` `autoMemoryEnabled` | `false` | Claude Code auto memory writes files on its own judgment with no approval step, lives outside the repository, and is not shared with Codex. Requirements 1 and 10 rule it out | `ai-external-knowledge/claude-code/memory.md`, section "Auto memory" |
| `.claude/settings.json` hook entries | none | The hooks come from the plugin's `hooks/hooks.json`. Projects keep no copies | `ai-external-knowledge/claude-code/plugins-reference.md`, section "Hooks" |
| Codex `config.toml` `memories.generate_memories` and `memories.use_memories` | `false` | Codex ships its own memory pipeline on by default, with a store and a background consolidation agent that writes without approval. Same reason as auto memory | Codex source at commit 9771934 |
| Codex `.codex/hooks.json` `additionalContextLimit` | at least `9500` | In Codex this value is the threshold above which output spills to a file. Today it is 5,000, below the startup budget | Codex source at commit 9771934 |
| `knowledge/project.md` frontmatter `memory_approval` | `required` or `off` | The approval setting lives in a project file, not in settings, so both harnesses read the same value | None. Plain Markdown. |

Which Codex config layer holds the memory settings, project or user, is to prove
during the build.

## 7. Requirement map

`ENFORCED` means a part of the harness makes it happen or refuses to let it
happen. `GUIDED` means text reaches the agent at the moment it applies.
`JUDGED` means the agent decides and nothing checks the decision. Most rows are
a mix, and the strongest control is named first.

| Requirement | Parts | Control | The check that proves it | Known limit |
| --- | --- | --- | --- | --- |
| 1. Plain parts only | Every part in section 4 | ENFORCED by construction | List every part. Each is a Markdown file, a rule file, a hook, a skill, or Git. A Node script is part of the hook or skill that runs it | Someone adds a service later. Section 4 is the record of what exists |
| 2. The agent follows this system | `startup-map.mjs`, `.claude/rules/knowledge-system.md`, the four skills | ENFORCED on delivery, GUIDED on use | Run `claude --init-only --debug-file`, read the log, and confirm the map printed in order and ended with its last line, with no spill notice | Delivery is not proof of reading. Requirement 2's "confirm the contents were read" cannot be met and is an open question |
| 3. Reliable behavior without reminders | All six hooks, the two rules, `knowledge-save`, the setup report | ENFORCED at the four moments, GUIDED for lookups and the per-turn review | Requirement 3's representative sessions on both harnesses: a fresh session, a long conversation with the context condensed, a task switch, and parallel sessions | A quiet review cannot be observed. Named in the design and in every setup report |
| 4. Picks up where the last left off | `knowledge/memory/current.md`, `startup-map.mjs`, `knowledge-find` | GUIDED | Work in one session, close it, open a fresh session two days later and ask what was being worked on | A stale `current.md` reads as current. The nudge counts changed files, not stale text |
| 5. Check memory first | `.claude/rules/knowledge-system.md`, `knowledge-find` | GUIDED, JUDGED on relevance | Ask about something already saved. The answer comes from the file and names it | The agent can decide "no" wrongly. No checker for judgment, by requirement 29 |
| 6. Cite the source | The standing rule, `knowledge-find`, `.claude/rules/knowledge-files.md` | GUIDED | Ask for something saved. The line below the finding is the file path | A missing citation is caught only by reading the answer |
| 7. Speaks the project's language | `terminology-glossary.md`, `startup-map.mjs`, `knowledge-save` | GUIDED | Use a known term and an unfamiliar one. Both resolve without a question | A glossary over 2,000 characters prints only its path and must be opened. Named in the setup report |
| 8. Read the real documentation first | `ai-external-knowledge/README.md`, `knowledge-find`, `build-knowledge-index.mjs` | ENFORCED on index format, GUIDED on use | Ask for something a captured topic covers without naming the folder. The page is opened and cited with its capture date | Capture dates can be ignored. `.claude/rules/ai-external-knowledge.md` still applies |
| 9. Saving is frictionless | `knowledge-save`, `save-moment-gate.mjs`, `session-review-nudge.mjs`, `compact-hold.mjs`, `.claude/rules/knowledge-direct-commit.md` | ENFORCED at three moments, GUIDED at the other two | Finish work with a candidate. One word of approval writes the file and the reply ends with it pushed | A push can fail. The skill says so and the inbox keeps the save. Batching several decisions into one push is an open question |
| 10. Approval before any write | `knowledge-save`, `knowledge-write-guard.mjs`, `memory_approval` in `knowledge/project.md` | ENFORCED on the write path, GUIDED on approval itself | Show a card, say nothing back. The card stays in the inbox as `awaiting approval` and nothing is written | No hook can see approval. The read-back and the inbox rules reduce the risk; they do not remove it |
| 11. What counts as memory | `knowledge-save`, `knowledge/memory-selection-feedback.md` | JUDGED, GUIDED | Give three candidates: a temporary schedule change, a supported decision, a routine step the agent did alone. Only the decision is proposed | Over-proposing. The feedback file corrects it over time |
| 12. What never counts | `knowledge-save`, `check-knowledge.mjs` secret patterns | ENFORCED for secrets, JUDGED for the rest | Run the list against one session's candidates. Everything matching a bullet is dropped before a card | A secret in a form the eight patterns miss |
| 13. Working memory | `knowledge/memory/current.md`, the standing rule, `startup-map.mjs`, `check-knowledge.mjs` | ENFORCED on size, GUIDED on upkeep | Two parallel sessions update the overview. A third finds both items and neither update erased the other | Two sessions can still overwrite each other. Reread-before-write is guidance, not a lock |
| 14. Memory file shape | `check-knowledge.mjs`, `knowledge-after-write.mjs`, `.githooks/pre-commit`, `references/memory-file.md` | ENFORCED | Write one memory file. Every required field is present with an allowed value and the checker passes | The `approved_by` value when the approval step is off needs the owner's answer |
| 15. How the words are written | `knowledge-save` (a pointer to the output style), the Plain English style file | GUIDED, JUDGED | Hand a saved memory to someone who was not in the conversation. They can say what is true in one read | Jargon in a saved file. The read-back step is the only check |
| 16. Requirements documents | `check-knowledge.mjs` field logic, `knowledge-save` upkeep path, `save-moment-gate.mjs` on work-item close | ENFORCED on fields, GUIDED on upkeep | Ship an authorized change affecting two areas. Both documents are updated, checked, committed, and pushed with no new approval question | "When work ships" is read as: the work item is closed as done, or its pull request is merged. That reading is an open question |
| 17. Procedures become skills | `knowledge-save` routing, the requirement 18 table | GUIDED | Teach a repeatable procedure. A project skill is offered, not a memory file | No skill-authoring process exists to hand it to. Named as a dependency |
| 18. Where information goes | The requirement 18 table in `knowledge/README.md`, `knowledge-save` | GUIDED, JUDGED | Hand the agent one item of each kind. Each lands in the right home and the card names the home | The wrong home is possible. The card shows it before the write, so the owner can see it |
| 19. The find order | `knowledge-find`, the standing rule | GUIDED, JUDGED | Ask about active work, a past decision, a required behavior, and a vendor capability. Each answer is grounded in the right source | Tiers can be skipped. By design nothing scores the search |
| 20. The save card | `references/card-format.md` | GUIDED | Present one memory card and one requirements-document card after an ordinary answer. Each has its own heading and number, and approving one moves only that one | The card layout can drift. A card review is part of requirement 3's sessions |
| 21. Indexes and the checker | `build-knowledge-index.mjs`, `check-knowledge.mjs`, `knowledge-after-write.mjs`, `.githooks/pre-commit` | ENFORCED | Rebuild all three indexes twice with unchanged sources. The bytes match. Break a required field and try to save: the save is reported unfinished and the rule is named | In Codex the after-write hook's coverage is to prove during the build; the pre-commit hook covers both harnesses |
| 22. Keeping current truth clean | `references/lifecycle.md`, `knowledge-review`, `knowledge-save` | GUIDED | Approve combining two overlapping topic files. Content, history, and links survive and the originals are removed without asking again | A duplicate nobody notices. The whole-folder review runs on request only |
| 23. Learning what to save | `knowledge/memory-selection-feedback.md`, `knowledge-save` | GUIDED, ENFORCED on size | Reject a proposal with a reason. A later session drops or reshapes a similar candidate. Reject another with no reason: no reason is invented | Invented reasons. The template's "no reason given" line prevents that |
| 24. Request knowledge operations in plain language | The four skill descriptions | GUIDED | Ask for each outcome in ordinary words with no command name. The right skill runs | A description too weak to match. `/skill-doctor` shows which skills go unused |
| 25. Codex | Every part, registered for Codex; the setup report | ENFORCED where the Codex event exists, reported where it does not | Run the same session in Codex. Every step gives the same result, or the setup report names the gap | Requirement 25 asks for "the same result in Codex". Some gaps cannot close. The honest check is "same, or named" |
| 26. Built the way the documentation says | Every part names its page in sections 4 and 6 | ENFORCED by review | Pick any part. Open the page named. The part matches the page | The captured pages are twelve days old and twelve releases behind. The build refreshes the capture first and re-reads `hooks.md` and `skills.md` |
| 27. Installed once, turned on per project, and checked | `knowledge-setup`, `project-init`, `project-sync`, the delivery proof | ENFORCED by the proof | Turn it on in a fresh project with one yes. The report says equipped and names the version. Turn it on in a second project without a yes: nothing changes there | Old copies left behind in a project. `project-sync` removes them after the proof passes |
| 28. Pending memory inbox | `knowledge/memory-inbox.md`, `knowledge-save`, `startup-map.mjs` state lines, `session-review-nudge.mjs` | GUIDED, ENFORCED on delivery of the state lines | Leave one card unanswered and interrupt one approved save. A fresh session in the other harness finds both, finishes the approved one without asking, and removes only that entry | The entry can fail to be written. Writing it in the same reply as the card narrows the window to one reply |
| 29. Preserve agent judgment with narrow safeguards | The whole design. Only the gate, the write guard, the checker, and the compaction hold refuse anything | ENFORCED by the design's own limits | Section 3's refused list, checked against what the build ships | Someone adds a scorer later. Section 3 is the record |
| 30. Integration with the toolkit OS | `save-moment-gate.mjs` on work-item close, tracker links in `current.md`, the upkeep path in `knowledge-save` | ENFORCED at item close, GUIDED elsewhere | Run a question that needs no work item, then a tracked change that ships behavior. Each record has one owner and no second store appears | The tracker's completion command could change. The `if` patterns are the only coupling |

## 8. Codex

Codex is the second harness. A harness is the program the agent runs inside.
Claude Code is the first one. Requirement 25 (PRD lines 1588 to 1597) says the
system must work in both, and that a behavior Codex cannot do is named in the
design and in every project's setup report.

Every Codex fact below comes from the Codex source code at commit `9771934`,
read on 2026-09-16 and recorded in
`/tmp/claude-0/-home-user-claude-toolkit/4fcf9e21-6c96-5d1c-816b-828bcf2822e5/scratchpad/research/r2-codex-capabilities.md`.
The Codex documentation site is blocked from this machine, so the source is the
only evidence. Codex releases fast: ten alpha releases in the five days before
2026-09-16. Every fact is re-checked at build time.

Claude Code facts name a captured page under
`ai-external-knowledge/claude-code/`.

One decision applies to every row of the table: every hook script is written once. Codex
has twelve hook events with Claude Code's event names and Claude Code's JSON
key names (`hookSpecificOutput.additionalContext`, `permissionDecision` with
`allow`, `deny`, `ask`). One script reads the same input JSON and prints the
same output JSON on both harnesses. The script is registered in the plugin's
`hooks.json` for Claude Code and in `.codex/hooks.json` for Codex.

### 8.1 Each part in Codex

"Same" means Codex does what Claude Code does. "Weaker" means Codex does part of
it, and the row says which part is missing. "Not present" means Codex has no
mechanism at all.

| Part | Codex mechanism | Same, weaker, or not present | What the setup report says |
| --- | --- | --- | --- |
| `startup-map.mjs` (SessionStart) | `SessionStart` in `.codex/hooks.json`, sources `startup`, `resume`, `clear`, `compact`, `fork`; prints through `hookSpecificOutput.additionalContext` | Same. Codex re-renders the root `AGENTS.md` after compaction as well. Doc page followed for the Claude Code half: `ai-external-knowledge/claude-code/hooks.md` | "Startup map: working. It prints nothing until you trust the hooks on this machine." |
| `.claude/rules/knowledge-system.md` (standing rule, about 25 lines) | One "Knowledge system" section of the root `AGENTS.md` | Same. Codex loads the root `AGENTS.md` at start and re-renders it after compaction | "The standing rules live in AGENTS.md, not in a rules folder." |
| `.claude/rules/knowledge-files.md` (path-scoped to `knowledge/**`, six lines) | The same six lines, inside the one "Knowledge system" section of the root `AGENTS.md` | Weaker. Codex has no path-scoped rules. Nested `AGENTS.md` loads only along the path from the project root to the current working directory, so a file read under `knowledge/` does not pull anything in. The six lines are paid in every Codex session instead of only when a knowledge file is opened | "The file rules are always loaded in Codex, and load on demand in Claude Code." |
| `knowledge-find`, `knowledge-save`, `knowledge-review`, `knowledge-setup` | Skills. Codex reads `SKILL.md` folders with `name` and `description` frontmatter and supports explicit naming | Same. Which path Codex uses, `.agents/skills/` copies or the plugin from `.agents/plugins/marketplace.json`, is a build-time proof | "All four skills are available. Ask for them in plain words or by name." |
| `save-moment-gate.mjs` (PreToolUse on the shell tool) | `PreToolUse` on the shell tool, `permissionDecision: "deny"` with a reason | Same for shell commands. Weaker for pull requests opened through the GitHub MCP tool: whether Codex fires `PreToolUse` for MCP tools is a build-time proof | "The save moment gate holds `gh pr create`, `gh issue close`, and the work-item finish command." |
| `save-moment-gate.mjs` on `mcp__github__create_pull_request` and `mcp__github__issue_write` | Unproven | To prove during the build | Named as a gap until proven. |
| `knowledge-write-guard.mjs` (PreToolUse on Edit and Write) | `PreToolUse` fires for the file tool `apply_patch`, with the matcher aliases `Write` and `Edit` | Weaker in one way only. The Codex input is a single field, `command`, holding the whole patch text with no file list. The guard script reads the `*** Update File:` and `*** Add File:` lines out of that text. Blocking works the same | "Hand edits to memory files and PRDs are refused on both harnesses until the knowledge-save skill has run." |
| `knowledge-after-write.mjs` (PostToolUse on Edit, Write, and Bash) | `PostToolUse` with the same block-and-reason shape | Same, subject to the `apply_patch` payload proof. The Bash branch runs `git status --porcelain -- knowledge/ ai-external-knowledge/` and needs no tool-specific field | "The checker runs after every knowledge write. A failure is reported to the agent and the save is unfinished until it passes." |
| `session-review-nudge.mjs` (Stop) | Codex `Stop` accepts `decision: "block"` with a reason and nothing else | Weaker. Codex `Stop` has no `additionalContext`, so there is no quiet way to speak. A nudge becomes a forced continuation of the turn, and there is no documented loop cap. See 8.4 | "In Codex the end-of-turn review nudge interrupts the turn once per session instead of adding a quiet note." |
| `compact-hold.mjs` (PreCompact, manual only) | Codex has a compact event | To prove during the build: whether Codex `PreCompact` can block, and whether it can tell manual compaction from automatic compaction | Named as a gap until proven. |
| Session state `${CLAUDE_PLUGIN_DATA}/sessions/<session_id>.json` | A folder under the home directory: `~/.claude-toolkit/sessions/` | Same. Neither harness offers a store; both hand the hook a session id | "Session bookkeeping is kept outside the repository." |
| `build-knowledge-index.mjs`, `check-knowledge.mjs`, `frontmatter.mjs` | Plain Node scripts. Git and Node do not care which harness ran them | Same | "The index builder and the checker are the same programs on both harnesses." |
| `session-marker.mjs` (records that `knowledge-save` ran) | Codex has no Skill tool and no dynamic context injection, so the last step of the `knowledge-save` body runs one `node` command that writes the marker | Weaker. It proves the command ran, not that the skill body was read. If the agent stops early, no marker is written and the gate stays shut, which is the safer outcome | "In Codex the save gate is released by a command inside the save skill, not by the harness." |
| `.githooks/pre-commit` (Git pre-commit hook) | Git, enabled by `core.hooksPath` | Same. It runs the checker on staged files under `knowledge/` and `ai-external-knowledge/` and refuses the commit on a failure | "Git refuses a commit that carries a knowledge file breaking the field rules." |
| Knowledge files (`SOUL.md`, `knowledge/project.md`, `knowledge/README.md`, `knowledge/memory/current.md`, `knowledge/memory-inbox.md`, `knowledge/memory/memory-entries/`, `knowledge/prds/`, `knowledge/memory-selection-feedback.md`, `brainstorms/`) | Plain Markdown in Git | Same. This is the whole point of requirement 1 (PRD line 456) | "The files are the same files. Either harness can read and write them." |
| Turning the harness's own memory off | `[memories]` in the Codex config: `generate_memories = false`, `use_memories = false` | Same intent, different setting name. Claude Code uses `autoMemoryEnabled: false`. See 8.3 | "Codex's own memory pipeline is switched off in this project." |
| Plugin delivery | Codex plugin manifests support a `hooks` key | Prefer plugin-declared hooks on both harnesses, with `.codex/hooks.json` as the fallback. To prove during the build | Names which of the two is in use. |

### 8.2 The trust rule

Codex runs no hook until the person trusts it on that machine. Trust is stored
per content hash. Editing a hook makes Codex ask again. If the person picks
"continue without trusting", the hooks are silently inert: no startup map, no
gate, no write guard, and no message saying so.

This is the single largest difference between the two harnesses, because a
freshly cloned repository starts with the whole system switched off and looking
normal.

What the design does about it:

- `knowledge-setup` tells the owner, in the setup report, to trust the hooks,
  and says what an untrusted session looks like: no startup map, and the first
  line of the map missing from the session.
- The startup map's first line is a version line. Its absence is the owner's
  and the agent's signal that the hooks did not run.
- Whether a plugin-declared hook needs the same trust approval as a project
  hook is a build-time proof. It decides whether the plugin's `hooks.json` or
  `.codex/hooks.json` is the delivery path for Codex.
- Whether `codex exec`, the non-interactive run, needs
  `--dangerously-bypass-hook-trust` is a build-time proof. It decides whether
  the setup proof run can check hook delivery at all.

### 8.3 Switching off the Codex memory pipeline

Codex ships its own memory system, on by default. It has two settings under
`[memories]` in the Codex config: `generate_memories` and `use_memories`. It
summarizes past sessions with a model, stores results in a state database,
writes files under `~/.codex/memories/`, and runs a consolidation sub-agent with
no approvals.

That breaks three things at once:

| What it does | Requirement it breaks | PRD line |
| --- | --- | --- |
| Keeps a state database | Requirement 1, plain parts only | 456 |
| Writes in the background | Requirement 1, no background writer | 456 |
| Writes without asking | Requirement 10, approval before any write | 703 |

Decision: `knowledge-setup` sets `generate_memories = false` and
`use_memories = false` for an equipped project, and the setup report says so.
This matches what the toolkit already does with Claude Code auto memory, which
is off in this repository today.

Where the setting lives, the project config or the user `config.toml`, is a
build-time check.

### 8.4 The Stop difference

On Claude Code, a `Stop` hook can return `hookSpecificOutput.additionalContext`.
The turn ends normally and the text reaches the agent as feedback
(`ai-external-knowledge/claude-code/hooks.md`).

On Codex, `Stop` has no `additionalContext`. The only way to say anything is
`decision: "block"` with a reason, which forces the turn to continue. There is
no documented loop cap.

Decision: in Codex, `session-review-nudge.mjs` fires as a block at most once per
session. It fires when the changed-file count crosses the threshold, or when
`knowledge/memory-inbox.md` holds an approved save that never finished. The
session-state file under `~/.claude-toolkit/sessions/` records that it fired, so
a second block is impossible.

This is a real difference in what the owner sees. In Claude Code the nudge is a
quiet note. In Codex the turn keeps going and the agent answers the nudge before
the owner gets the reply. Flag for Mike: accept the one forced continuation, or
leave Codex with no end-of-turn nudge at all.

### 8.5 The missing `if`, and what replaces it

Claude Code hook entries take an `if` field written in permission-rule syntax,
such as `Edit(**/knowledge/prds/**)` or `Bash(gh pr create *)`. The harness
checks it before spawning the hook process
(`ai-external-knowledge/claude-code/hooks.md`).

Codex has no `if` field, and no `once` field. An `if` written into a Codex
handler is read and silently ignored.

Decision: every guard script does its own path and command filtering in its
first lines and exits fast when nothing matches. The Claude Code `if` entries
stay, as an optimization that saves spawning a process, never as the only
filter. A script that depended on `if` would be unguarded in Codex.

The cost in Codex is one short Node process per tool call. Measured equivalent
on Claude Code today: the two shipped `PreToolUse` hooks return zero characters
and exit 0 on a non-matching command.

One Claude Code detail that the `if` patterns depend on: a single-segment
pattern matches only under the working directory root. The design uses
`Edit(**/knowledge/prds/**)` and
`Write(**/knowledge/memory/memory-entries/**)`, with the leading `**/`, so a
worktree or a nested checkout still matches. This changed in Claude Code
v2.1.214 and is in the test plan.

### 8.6 The Codex facts to prove during the build

Twelve proofs. Each is a short run with a written result. None of them changes
the shape of the design; each one decides a delivery detail or becomes a named
gap in the setup report.

| # | What to prove | What it decides |
| --- | --- | --- |
| 1 | A plugin-declared hook runs in Codex without a separate trust prompt | Plugin `hooks.json` or `.codex/hooks.json` as the Codex delivery path |
| 2 | `codex exec` runs, or refuses to run, untrusted hooks without `--dangerously-bypass-hook-trust` | Whether the setup proof run can check hook delivery in Codex |
| 3 | The `apply_patch` `PreToolUse` payload carries only `{"command": <patch text>}` and never a file path | The shape the write guard parses |
| 4 | Codex `PreCompact` can block, and can tell manual from automatic compaction | Whether `compact-hold.mjs` exists in Codex or is a named gap |
| 5 | Whether `generate_memories` and `use_memories` live in the project config or the user `config.toml` | Which file `knowledge-setup` writes |
| 6 | A nested `AGENTS.md` is re-read when the working directory changes mid-session | Confirms the decision to keep all rule text in the root `AGENTS.md` |
| 7 | `additionalContextLimit` at 10,000 delivers the whole startup map, and what a spill looks like | Whether the 9,500-character budget is enough in Codex |
| 8 | Codex finds the four skills through `.agents/skills/` copies, through the plugin, or both | What `knowledge-setup` installs for Codex |
| 9 | `commandWindows` runs through `cmd.exe`, not PowerShell, on the owner's Windows machines | Fixes the shipped PowerShell syntax in `.codex/hooks.json` |
| 10 | The manifest fields in `.agents/plugins/marketplace.json` are the ones Codex reads | Whether the plugin registers at all in Codex |
| 11 | The Codex IDE extension and the Codex app show the hook trust review | Whether hooks run outside the terminal at all |
| 12 | A `Stop` block in Codex does not loop when the session-state file blocks a second one | Whether the Codex review nudge is safe to ship |

Two more Codex facts are fixes, not proofs, and are listed in section 9:
`CODEX_PROJECT_DIR` does not exist and its fallback in two shipped hooks is dead
code; `.codex/hooks.json` and `.claude/settings.json` both leave `fork` out of
the `SessionStart` matcher.

---

## 9. What changes from today

The inventory is
`/tmp/claude-0/-home-user-claude-toolkit/4fcf9e21-6c96-5d1c-816b-828bcf2822e5/scratchpad/research/r3-current-implementation.md`,
written 2026-09-16 against the files on disk.

One measured fact decides most of this section. The shipped startup hook
was run with the required fake input and printed **20,585 characters**. Claude
Code caps hook output at 10,000 characters per string; above the cap the text
goes to a file and the agent gets a path and a preview
(`ai-external-knowledge/claude-code/hooks.md`). So today the manual does not
reach the agent at startup unless the agent opens the file itself. The
9,500-character budget in the new design is not a preference. It is the
condition under which requirement 2's startup reads happen at all.

### 9.1 Hooks

| Current part | Keep, change, or drop | Reason | Requirement served |
| --- | --- | --- | --- |
| `plugins/second-brain/hooks/knowledge-session-start.mjs` | Change: rewritten as `startup-map.mjs` | Prints 20,585 characters, over the 10,000 cap. Wrong file order. No budget, no version line, no inbox lines, no glossary, no `fork` source | 2 (PRD line 475), 3 (line 508), 7 (line 616), 28 (line 1629) |
| `entriesOnly()` inside that hook (prints index entry lines only) | Keep the idea in `startup-map.mjs` | Saves 959 characters at every start, measured. Its own comment says the listings are deliberately unsatisfying: enough to make the agent open the right file, never enough to answer from | 19 (line 1316) |
| The System Guide boundary inside that hook | Keep as is | It reports only an explicit off state and never imports the System Guide plugin's paths. A malformed config is left alone so the guide's own plugin reports it | 30 (line 1754) |
| `plugins/second-brain/hooks/memory-reminder.mjs` (UserPromptSubmit) | Drop | 1,292 characters on every message, measured; 129,200 characters over a 100-message session. It restates the manual that startup already delivered, and it tells the agent on every message that a PRD becomes `current`, which requirement 16 replaced with `finalized`. This repository already removed `style-reminder` for the same reason | 29 (line 1707) |
| `plugins/second-brain/hooks/save-reminder.mjs` | Change: folded into `save-moment-gate.mjs` | The once-per-branch hold was bypassed in an audited session. The gate is now released by evidence that `knowledge-save` ran after the branch's last commit | 3 (line 524), 9 (line 674) |
| The knowledge-only branch detection inside `save-reminder.mjs` | Keep, moved into `save-moment-gate.mjs` | It compares the branch against the default branch and, when every committed change is under `knowledge/`, says the branch needs no pull request. It counts committed work only, so one stray build file cannot confuse it | 9 (line 678) |
| `plugins/second-brain/hooks/work-item-close.mjs` | Change: folded into `save-moment-gate.mjs` | One gate, one piece of evidence, instead of two hooks with two temp folders | 3 (line 524), 16 (line 1162) |
| `plugins/second-brain/hooks/command-parsing.mjs` | Keep as a shared helper for `save-moment-gate.mjs` | The `if` filter is best effort and absent in Codex. The parser strips heredocs and quoted text and confirms the segment | 26 (line 1599) |
| Gate coverage of `gh pr create` and `gh issue close` only | Change: add `mcp__github__create_pull_request` and `mcp__github__issue_write` | In web and remote sessions the agent opens pull requests through the GitHub MCP tool, not `gh`. Without this the gate is silent exactly where the owner works most. On `mcp__github__issue_write` the gate reads `tool_input` and holds only when the state is being set to closed | 3 (line 524), 9 (line 674) |
| Nothing registered on `PreToolUse` for Edit and Write | Add `knowledge-write-guard.mjs` | Nothing stops a hand edit to a memory file or a PRD today | 10 (line 703), 29 (line 1689) |
| Nothing registered on `PostToolUse` for knowledge writes | Add `knowledge-after-write.mjs` | The checker and the index rebuild depend on the agent remembering to run them | 21 (line 1469) |
| Nothing registered on `Stop` | Add `session-review-nudge.mjs` | The fifth save moment, "a turn ends after real work", has nothing behind it | 9 (line 674) |
| Nothing registered on `PreCompact` | Add `compact-hold.mjs`, manual compaction only | Automatic compaction is never held, because blocking a recovery compaction can fail the request | 9 (line 674) |
| `plugins/hooks-library/hooks/spec-check-reminder.mjs` | Keep, unchanged | It is a different plugin and a different moment: the first file edit of a session, asking whether `spec-check` ran before building from a PRD | 16 (line 1120) |
| Fail-open behavior in every hook | Keep as is | Every hook catches its own errors and exits 0. Verified at runtime for all six. Knowledge setup must never be able to wedge a session | 29 (line 1669) |
| Session state in the OS temp folder | Change: move to `${CLAUDE_PLUGIN_DATA}/sessions/<session_id>.json`, and `~/.claude-toolkit/sessions/` in Codex | The placement rule stays, the contents grow. Requirement 29 (PRD line 1732) already asks for this placement. `${CLAUDE_PLUGIN_DATA}` is documented at `~/.claude/plugins/data/<id>/`. `startup-map.mjs` deletes entries older than 30 days | 29 (line 1732) |
| `CODEX_PROJECT_DIR` fallback in two shipped hooks | Drop | The variable does not exist in Codex. The fallback is dead code | 26 (line 1599) |
| `fork` missing from the `SessionStart` matcher in `.claude/settings.json` and `.codex/hooks.json` | Change: add `fork` | A forked conversation starts with no map | 2 (line 475) |

### 9.2 Skills

| Current part | Keep, change, or drop | Reason | Requirement served |
| --- | --- | --- | --- |
| `recall` | Change: merged into `knowledge-find` | One find procedure instead of two entry points | 19 (line 1316), 24 (line 1567) |
| `session-search` skill | Change: merged into `knowledge-find` as tier 5 | It is the last tier of the same find order | 19 (line 1316) |
| `session-search/scripts/search-sessions.mjs` | Keep as is, as a reference script under `knowledge-find` | Read-only, smallest scope first, refuses an all-project search without a second flag, never writes a result into knowledge | 29 (line 1669) |
| `remember` | Change: merged into `knowledge-save` | The save, the retire, and the write half of the folder review share the card, the approval path, the checker, and the push | 9 (line 669), 10 (line 703) |
| `retire` | Change: merged into `knowledge-save` as the lifecycle branch | Today a supersede crosses two skills, because `retire` calls back into `remember` for the replacement | 22 (line 1512) |
| `reflect`, folder-wide half | Change: renamed `knowledge-review` | A plain name for a whole-folder review | 22 (line 1512), 24 (line 1567) |
| `reflect`, write half | Change: merged into `knowledge-save` | Today `reflect` calls both `remember` and `retire`, so a folder review can be three skills deep | 22 (line 1512) |
| `second-brain` skill | Change: renamed `knowledge-setup`, plus the layout migration and the delivery proof | Requirement 27 (PRD line 1617) asks the setup to report which version is running. Nothing reports a version today | 27 (line 1617) |
| `remember/references/proposal-template.md` | Drop, replaced by a card reference under `knowledge-save` | Requirement 20 (PRD line 1410) says do not require a fixed list of `Why`, `Where`, `From`, `Unsure`, `Checked` bullets. The template requires exactly those five in that order | 20 (line 1385) |
| The five-bullet rule inside `knowledge/README.md` | Drop | Same reason. It is the manual's copy of the same contract | 20 (line 1385) |
| `handoff`, `grill-me`, `spec-check` skills in other plugins | Change: the skill name they invoke | They all invoke `remember`, which no longer exists. See 9.4 | 9 (line 674), 30 (line 1754) |

### 9.3 Tools, templates, tests, rules, settings, the manual, and this repo's copies

| Current part | Keep, change, or drop | Reason | Requirement served |
| --- | --- | --- | --- |
| `tools/frontmatter.mjs` | Keep as is | One parser shared by the builder and the checker, so they cannot disagree about what a file says. It reports what it does not understand instead of guessing | 21 (line 1458) |
| `tools/check-knowledge.mjs`, secret patterns | Keep as is | Eight patterns, each a shape that is hard to produce by accident. Requirement 12 (PRD line 795) says this is the one rule enforced by code, and it is. The failure message tells the owner to rotate the credential | 12 (line 782) |
| `tools/check-knowledge.mjs`, read-only promise | Keep as is | A test asserts the file on disk is byte-identical after a run | 29 (line 1669) |
| `tools/check-knowledge.mjs`, PRD approval-field logic | Keep, and add fields | It already separates permission to draft from approval of the requirements, with 30 test cases. Add `group` and `updated_at` to the field lists | 16 (line 1195) |
| `tools/check-knowledge.mjs`, unknown-field rejection of `context` and `updated_at` | Change: both become known, and `updated_at` becomes required | Confirmed by running the checker against a PRD-shaped memory file: two failures, exit 1. Requirement 14 (PRD lines 935 and 938) requires both | 14 (line 916) |
| `tools/check-knowledge.mjs`, flat-folder rule | Change: allow topic folders under `memory-entries/` and child PRD folders under `prds/` | Requirement 14 (PRD line 918) and requirement 16 (PRD line 1127) both need folders. The flat rule is written into four places and blocks the PRD's data model | 14 (line 918), 16 (line 1127) |
| `tools/check-knowledge.mjs`, `summary` limit of 250 characters | Change to 200 | Requirement 21 (PRD line 1469). Four files in this repository already break the new limit and are fixed in the migration | 21 (line 1469) |
| `tools/check-knowledge.mjs`, `current.md` limit of 2,000 characters | Change to 5,000 | Requirement 21 (PRD line 1469). This repository's own file is at 1,847 characters with one active item | 13 (line 802), 21 (line 1469) |
| `tools/check-knowledge.mjs`, manual SHA-256 pin | Keep the mechanism, update the value | The manual is rewritten, so the hash changes in the same change. See 9.4 | 27 (line 1617) |
| `tools/check-knowledge.mjs`, glossary handling | Add: the glossary is exempt from the nine memory fields | Requirement 7 (PRD line 620). Today the checker would demand all nine fields on a glossary file | 7 (line 610) |
| `tools/build-knowledge-index.mjs` | Change: grouped output, Markdown links, a third index, child PRDs indented, a two-line header | Requirement 21 (PRD lines 1460 to 1466). Today it produces one flat list with backtick filenames and a nine-line header, and it warns and skips any subfolder | 21 (line 1458), 8 (line 652) |
| `tools/build-knowledge-index.mjs`, PRD blurb "Only a current PRD is settled truth" | Drop | Requirement 16 (PRD line 1211) says a PRD never uses the word `current` | 16 (line 1120) |
| Template `knowledge/README.md` (270 lines, 13,395 characters) | Change: rewritten as a map under 4,000 characters | It is 65 percent of the startup output today. Requirement 2 (PRD line 484) says detailed rules and templates are opened when they are needed. The detail moves into skill references | 2 (line 475) |
| Template `SOUL.md` | Keep as is | 443 characters, placeholder prompts filled in at setup | 2 (line 475) |
| Template `knowledge/project.md` | Change: add the frontmatter field `memory_approval` with the values `required` or `off` | Requirement 10 (PRD line 717) allows the owner to turn the approval step off for memory writes. Nothing supports it today. The frontmatter is where both harnesses can read it | 10 (line 717) |
| Template `knowledge/current.md` | Change: move to `knowledge/memory/current.md`, new three-section shape, cap 5,000 | Requirement 13 (PRD lines 804 and 824 to 828) | 13 (line 802) |
| Template `knowledge/memory-self-improvement.md` | Change: renamed `knowledge/memory-selection-feedback.md`, table shape, cap 4,000 characters | Requirement 23 (PRD line 1556) leaves the home to the design. The mechanism is the one requirement met end to end today and is kept whole | 23 (line 1537) |
| Template `knowledge/prds/spec-index.md` | Change: renamed `knowledge/prds/prd-index.md` | Requirement 21 (PRD line 1460) | 21 (line 1458) |
| Template `knowledge/memory/memory-index.md` | Keep the file, change the generated format | Same builder rewrite | 21 (line 1458) |
| Template `knowledge/brainstorms/.gitkeep` | Change: `brainstorms/` moves to the project root | Requirement 18 (PRD line 1292) | 18 (line 1247) |
| Template `knowledge/.obsidian/app.json` | Keep as is | Three relative-link settings. It adds no behavior and costs nothing | 1 (line 456) |
| New template `knowledge/memory-inbox.md` | Add | Requirement 28 (PRD line 1629). Nothing exists today | 28 (line 1629) |
| New template `knowledge/memory/memory-entries/terminology-glossary.md` | Add | Requirement 7 (PRD line 612). No glossary ships today | 7 (line 610) |
| New generated `ai-external-knowledge/README.md` | Change: generated by the builder from topic entry pages | Requirement 21 (PRD line 1460) makes it the third index. Today it is hand-written by this repository's own capture script | 8 (line 652), 21 (line 1458) |
| `tests/knowledge-startup-check.mjs` | Change: large rewrite | It locks the old startup order, the manual's byte count and hash, the five proposal bullet labels that requirement 20 removes, and the Codex parity of one hook. All four move | 2, 20, 21, 25 |
| `tests/knowledge-startup-check.mjs`, the 30 checker approval cases | Keep as is, and extend | They cover requirement 16's approval-field rule exactly | 16 (line 1195) |
| `tests/installed-copy-check.mjs` | Change: the hook and tool rows go away when the project copies go | Hooks and tools run from the plugin. The rule-file rows stay | 27 (line 1617) |
| `tests/link-check.mjs`, `tests/orphan-check.mjs` | Keep as is | They walk every Markdown file, so the migration's moved files and repaired links are checked by them | 1 (line 465) |
| `.claude/rules/knowledge-direct-commit.md` | Keep, with one path change | Six numbered steps for landing a save on the default branch from a worktree, including what to do when the push is refused. Requirement 9 (PRD line 685) names this rule as the owner of the procedure. Step 4 names `.claude/tools/...`, which moves to the plugin path | 9 (line 678) |
| `.claude/rules/offer-context-handoff.md` | Change: the skill name it invokes | It names `remember` four times | 9 (line 674) |
| `.claude/rules/work-item-stages.md` | Keep as is | It owns the stages and the tracker rules. The manual points at it instead of repeating it | 30 (line 1754) |
| New `.claude/rules/knowledge-system.md` (about 25 lines) | Add, shipped from `plugins/project-init/library/rules/general/` | Standing obligations that survive compaction, because unscoped rules are re-injected from disk. A plugin cannot ship a rules file, so `project-init` and `project-sync` write it into the project | 3 (line 508), 5 (line 587), 9 (line 669) |
| New `.claude/rules/knowledge-files.md` (six lines, `paths: knowledge/**`) | Add, same library | Path-scoped rules load when the agent reads a matching file and cost nothing otherwise | 18 (line 1247), 19 (line 1367) |
| `.claude/settings.json` hook entries | Drop from projects | Every Claude Code hook comes from the plugin's `hooks.json` | 27 (line 1617) |
| `.claude/settings.json` `CLAUDE_CODE_DISABLE_AUTO_MEMORY` | Keep, or change to `autoMemoryEnabled: false` | Both are documented in `ai-external-knowledge/claude-code/memory.md`. Claude Code auto memory stays off: it writes outside the repository, machine-local, without asking | 1 (line 456), 10 (line 703) |
| `.codex/hooks.json`, one hook registered | Change: every hook script registered, `additionalContextLimit` raised from 5,000 to 10,000, `fork` added, `commandWindows` rewritten for `cmd.exe` | Requirement 25 (PRD line 1588). Three of the five save moments have nothing behind them in Codex today | 25 (line 1588) |
| `.claude/tools/` and `.claude/hooks/` copies in this repository | Drop | Hooks and tools run from the plugin. The rule copies and the output-style copy stay, and `tests/installed-copy-check.mjs` keeps them matching | 27 (line 1617) |
| `.claude/toolkit-sync.md` | Change: record the new setup | It is this repository's setup record and names the hooks, the indexes, and the parallel-save problem | 27 (line 1617) |
| `docs/toolkit-map.md` | Change: the skill and hook rows | It names `remember` at seven line numbers and the other five skills at three more. `docs/CLAUDE.md` says the map is updated in the same change that renames a plugin or a skill | 30 (line 1754) |
| `.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json` | Change: keep the plugin name `second-brain`, update the skill list | `CLAUDE.md` says to update both | 27 (line 1617) |
| `archive/second-brain-v1/` | Keep, untouched | History, never current truth | none |

### 9.4 The rename and dependency list

Everything below breaks when a name or a path changes. The list is
`r3-current-implementation.md` section 6. The build plan carries it as a
checklist, because a missed row is a file that silently names something that no
longer exists.

| What it depends on | Files that must change | Count |
| --- | --- | --- |
| The skill name `remember` | `plugins/session-skills/skills/handoff/SKILL.md` (lines 10, 21, 83, 85, 104, 106, 276 to 279, 302); `plugins/session-skills/skills/grill-me/SKILL.md` (lines 24, 114 to 120); `plugins/session-skills/README.md` (lines 172, 196 to 198); `plugins/project-init/library/rules/general/offer-context-handoff.md` (lines 10, 22, 25, 28) and its installed copy `.claude/rules/offer-context-handoff.md`; the deny messages in `save-reminder.mjs` line 138 and `work-item-close.mjs` line 79; `memory-reminder.mjs` lines 46 and 47; `reflect/SKILL.md` line 63; `retire/SKILL.md` line 30; `knowledge/README.md` line 265 and the template's line 265; `docs/toolkit-map.md` (lines 24, 40, 56, 251, 286, 395, 408); `plugins/project-init/skills/project-sync/SKILL.md` line 256; `tests/knowledge-startup-check.mjs` (lines 257 to 274, 299 to 303); `README.md` line 134 | 15 files |
| The other five skill names (`recall`, `retire`, `reflect`, `second-brain`, `session-search`) | `knowledge/README.md` lines 264 to 270 and the template; `docs/toolkit-map.md` lines 24, 39 to 44, 250 to 253; `project-sync/SKILL.md` lines 256 to 257; `plugins/second-brain/README.md` lines 82 to 91; `recall/SKILL.md` line 60; `retire/SKILL.md` line 11; `reflect/SKILL.md` line 63; `second-brain/SKILL.md` line 25; `plugins/second-brain/.codex-plugin/plugin.json` line 17; `.claude-plugin/marketplace.json` lines 23 to 25; `.agents/plugins/marketplace.json`; `README.md` lines 133 to 135 and 265; `tests/knowledge-startup-check.mjs` lines 272 to 274 | 13 places |
| The path `knowledge/README.md` | `knowledge-session-start.mjs` lines 31 and 89; `memory-reminder.mjs` lines 33 and 37; `save-reminder.mjs` line 140; `work-item-close.mjs` line 81; `check-knowledge.mjs` lines 273 to 288; all six `SKILL.md` files; `CLAUDE.md`; `AGENTS.md` by way of `CLAUDE.md`; `handoff/SKILL.md` lines 80 and 106; `grill-me/SKILL.md` line 116; `project-sync/SKILL.md` lines 227, 255, 342; `project-init/SKILL.md` line 272; `setup-flow.md` lines 167 and 295; `tests/installed-copy-check.mjs` lines 59 to 64; `tests/knowledge-startup-check.mjs` lines 38 to 39 and 203 to 231 | 18 places |
| The manual's exact bytes | `check-knowledge.mjs` line 32 holds the SHA-256 `2f0d1a53bc234a7695631f41c412cafcdd535185d0c29bd67c13f4d695fa678e`; `tests/knowledge-startup-check.mjs` lines 215 to 216 recompute and compare; `tests/installed-copy-check.mjs` lines 59 to 64 compare the installed copy to the template. Any one-character change to the manual updates the hash in the same change | 3 files |
| The manual's marker comments | `<!-- claude-toolkit:knowledge-manual -->` at line 1 is read by `memory-reminder.mjs` lines 34 and 55, `second-brain/SKILL.md` line 62, `project-sync/SKILL.md` lines 227 to 228, and `tests/knowledge-startup-check.mjs` lines 207 and 446. Nine `knowledge-policy:<name>` marker pairs (`routing`, `trust`, `find`, `save-test`, `never-save`, `file-shapes`, `approval`, `lifecycle`, `skill-map`) are counted at lines 217 to 230 and their contents asserted at lines 233 to 255. Line 393 fails any other file carrying a `knowledge-policy:` marker | 5 files |
| The six startup file paths and their order | `tests/knowledge-startup-check.mjs` lines 85 to 95 assert the exact list and order, and lines 113 to 134 assert each appears once in the output; `knowledge/README.md` lines 13 to 20; `handoff/SKILL.md` lines 78 to 83; `grill-me/SKILL.md` lines 29 to 37; `project-init/SKILL.md` line 296; `setup-flow.md` lines 294 to 295 | 6 files |
| The index filename `spec-index.md` | `build-knowledge-index.mjs` line 42; `knowledge-session-start.mjs` line 42; `check-knowledge.mjs` line 301; the seed template; `tests/knowledge-startup-check.mjs` lines 92, 105, 159 to 165; `docs/toolkit-map.md`; `README.md` line 129 | 8 files |
| The tool paths `.claude/tools/build-knowledge-index.mjs` and `.claude/tools/check-knowledge.mjs` | `knowledge/README.md` lines 236 to 237 and the template; `remember/SKILL.md` lines 114 to 115; `retire/SKILL.md` lines 49 to 50; `reflect/SKILL.md` line 17; `second-brain/SKILL.md` lines 43 to 45 and 93 to 94; `knowledge-direct-commit.md` lines 32 to 33; `project-sync/SKILL.md` lines 257 to 258 and 271; this repository's `CLAUDE.md` Tools table; `README.md` lines 129 to 130 and 219; `plugins/second-brain/README.md` lines 96 to 97; `tests/installed-copy-check.mjs` lines 103 to 104 | 12 places |
| The five hook filenames | `tests/installed-copy-check.mjs` lines 92 to 98; `.claude/settings.json` lines 18, 30, 35, 47, 58; `.codex/hooks.json` lines 10 to 11; `tests/knowledge-startup-check.mjs` lines 171 to 183 and 407 to 419; `project-sync/SKILL.md` lines 100 to 122, where line 121 warns that `memory-reminder.mjs` shares an event with a retired style hook and must be kept; `machine-sync/SKILL.md` line 161; `README.md` lines 123 to 130 | 7 files |
| The five proposal bullet labels | `tests/knowledge-startup-check.mjs` lines 277 to 296 assert `**Why:**`, `**Where:**`, `**From:**`, `**Unsure:**`, `**Checked:**` in that order, and lines 397 to 401 fail any other file that contains all five; `knowledge/README.md` lines 188 to 189; `remember/references/proposal-template.md` lines 30 to 34 and 58 to 71 | 3 files |
| Everything else named in the audit | `.claude/settings.json` lines 8 to 10 enable `second-brain@claude-toolkit` by name and line 4 sets `CLAUDE_CODE_DISABLE_AUTO_MEMORY`; `tests/orphan-check.mjs` and `tests/link-check.mjs` walk every Markdown file, so a moved file with an unrepaired link fails them; `plugins/system-guide/` reads `.system-guide.json` and shares the lookup tier, with `tests/system-guide-integration.test.mjs` and `tests/experience-system-guide.test.mjs` touching the shared behavior; `.claude/toolkit-sync.md` lines 137 to 140, 177 to 185, 207 to 214 | 8 files |

Two more path changes come from the round-one consolidation: the
`knowledge-direct-commit.md` step 4 command and this repository's `CLAUDE.md`
tool rows both change from `.claude/tools/...` to the plugin path, once the
project copies are removed.

### 9.5 The layout migration for an equipped project

The PRD's folder layout does not exist on disk in any project yet. Two projects
are equipped today: this repository and DragonFly. Both are on the old layout,
and the checker enforces the old layout, so the move and the tool change happen
in the same step.

The migration runs inside `project-sync`, is approved per project before
anything moves, and reports what it will do first.

| Step | What moves | What breaks if it is skipped |
| --- | --- | --- |
| 1 | `knowledge/current.md` to `knowledge/memory/current.md` | The startup map reads a file that is not there |
| 2 | `knowledge/memory/*.md` to `knowledge/memory/memory-entries/`, leaving `memory-index.md` and `current.md` outside it | The memory index and the working memory get indexed as memory entries |
| 3 | `knowledge/prds/spec-index.md` to `knowledge/prds/prd-index.md` | Two index files, one stale |
| 4 | `knowledge/memory-self-improvement.md` to `knowledge/memory-selection-feedback.md`, with the new table shape and the 4,000-character cap | The save skill reads a file that is not there |
| 5 | `knowledge/brainstorms/` to `brainstorms/` at the project root | Brainstorms sit inside the folder the checker walks |
| 6 | Create `knowledge/memory-inbox.md` and `knowledge/memory/memory-entries/terminology-glossary.md` from the templates | Requirements 28 and 7 have no file |
| 7 | Add `memory_approval: required` to the `knowledge/project.md` frontmatter | The checker cannot tell a standing approval from a missing one |
| 8 | Add `updated_at` and, where it is known, `context` to every existing memory file and PRD | The rewritten checker fails every existing file |
| 9 | Shorten every `summary` over 200 characters. Four files in this repository are over today: `knowledge/memory/github-account-for-pushes.md` at 225, `knowledge/memory/knowledge-manual-voice.md` at 241, `knowledge/prds/folder-instruction-files.md` at 229, `knowledge/prds/guided-delivery.md` at 211 | The checker fails four files |
| 10 | Repair every link to a moved file, under requirement 1 (PRD line 462). A repair that could change meaning is asked about first | `tests/link-check.mjs` and `tests/orphan-check.mjs` fail |
| 11 | Remove `.claude/hooks/` and `.claude/tools/` copies and the hook entries in `.claude/settings.json` | Two copies of every hook run at once |
| 12 | Rebuild all three indexes and run the checker | The indexes still name the old paths |

Order matters in two places. Step 8 comes before step 12, because the checker
fails on a missing `updated_at`. Step 10 comes after every move, because a link
cannot be repaired to a file that has not moved yet.

---

## 10. Riskiest assumptions and the small tests that prove them first

Each row is about one hour of work and produces a written result. These run
before the build, not during it. A failed assumption changes a delivery detail
and is recorded; none of them changes the shape of the design.

| Assumption | Why it matters | The one-hour test | Pass condition |
| --- | --- | --- | --- |
| One `SessionStart` hook can print about 9,500 characters, in order, on both the `startup` and the `compact` source | The whole of requirement 2 rests on hook delivery counting as the startup reads. The current hook prints 20,585 characters and is truncated | Run `claude --init-only --debug-file <path>` in a test project, then read the log. Repeat after `/compact` | The last expected line of the map appears in the log, in order, with no "Persisted tool result" notice, on both sources |
| A dynamic context injection line in the `knowledge-save` body runs on both invocation paths and writes the marker | The gate and the write guard read that marker. A typed `/knowledge-save` bypasses the Skill tool events, so a `PostToolUse` marker would miss it | Invoke the skill by model choice, then by typing the command. Check the session-state file after each | The marker file exists after both. The injected command exits 0 in both cases, including when it fails, because a failed injected command aborts the whole invocation |
| `PostToolUse` fires for the Skill tool | This is the fallback marker, if injection does not work | Invoke the skill by model choice with a logging `PostToolUse` hook matching `Skill` | The hook fires and the input carries a usable skill name in `tool_input` |
| An `if` pattern of `Edit(**/knowledge/prds/**)` matches from the project root and from a worktree | A single-segment pattern matches only under the working directory root, changed in Claude Code v2.1.214. The wrong pattern leaves the write guard silent | Edit a file under `knowledge/prds/` in the primary checkout and again in a sibling worktree, with the guard registered | The guard denies in both places |
| Plugin `hooks.json` scripts run, with `${CLAUDE_PLUGIN_ROOT}` resolving to the installed plugin | Nothing is copied into projects any more, so a broken plugin path means no hooks at all | Install the plugin from this marketplace in a clean test project. Run a session | Every registered hook runs and the scripts find their own folder |
| Unscoped rule files are re-injected after compaction | Requirement 3 (PRD line 508) asks for guidance that comes back after context loss. The standing rule is what delivers it | Start a session, fill it, run `/compact`, then ask the agent to quote a line that appears only in `.claude/rules/knowledge-system.md` | The agent can quote it without opening the file |
| `${CLAUDE_PLUGIN_DATA}` exists and is writable at `~/.claude/plugins/data/<id>/` | The session-state file lives there. Requirement 29 (PRD line 1732) keeps it out of the repository | Write and read a file from a hook script | The file is created outside the repository and survives the session |
| A subagent's hook input carries the parent's `session_id`, plus `agent_id` and `agent_type` | The write guard must refuse a helper agent's write even when the parent's marker exists | Start a helper agent that tries an `Edit` under `knowledge/memory/memory-entries/` | The guard denies, because `agent_id` is present, whatever the marker says |
| A `PostToolUse` hook on Bash with no `if` costs about 10 milliseconds per call | It runs on every Bash command in the session, so the cost is paid constantly | Time 100 Bash calls with and without the hook registered | The added time per call is small enough that the owner does not notice it |
| `FileChanged` with `watchPaths` fires for a file the agent changed with a Bash command | Only for a later silent index rebuild after the owner's hand edits. It cannot carry the checker's result, because that event returns no `additionalContext`, so a failed check would never reach the agent, and it watches literal filenames | Register a watch on one file and change it with `sed` | The hook fires. If it does not, the feature is dropped, and nothing in the design changes |
| `tool_response.bashEditDiff` is present on a `PostToolUse` Bash hook | It is a hint that makes the Bash branch cheaper. It is beta, best effort, and requires v2.1.269 or later | Edit a file with a heredoc and print the hook input | The field is present. If it is absent, the Bash branch uses `git status --porcelain` alone, as designed |
| A Git pre-commit hook enabled by `core.hooksPath` runs the checker and refuses a bad commit | It runs at the moment a knowledge file is committed, and it covers the owner's own hand edits and both harnesses | Stage a memory file with a missing `updated_at` and commit | The commit is refused and the message names the file and the rule |
| `PreCompact` with the matcher `manual` holds `/compact` and is never registered for `auto` | Blocking an automatic recovery compaction can fail the request | Run `/compact` with the hook registered, then fill a session until automatic compaction runs | Manual compaction is held once. Automatic compaction is never held |
| A `Stop` hook returning `additionalContext` does not loop | The nudge runs at the end of every turn | Register the nudge, cross the threshold, and let the turn end | The nudge appears once. `stop_hook_active` is true on the second entry and the hook exits silent |

The twelve Codex proofs in section 8.6 are part of this list and are run in the
same pass. They are kept in section 8 because each one decides a Codex delivery
detail or becomes a line in the setup report.

Three things nobody has solved, in this project or anywhere else. They stay
JUDGE, and the representative sessions in section 11 are the only check on them:

| Unsolved | What it means in practice |
| --- | --- |
| Proving a file was read and used | Hook delivery proves the text arrived. Nothing proves the agent used it |
| Proving the right knowledge was consulted | A count of tool calls is not evidence. Requirement 3 (PRD line 553) says so directly |
| Judging whether a written fact is true | This repository's own 2026-08-04 brainstorm holds the example: an agent wrote "nine months" with the right dates in front of it |

---

## 11. Testing plan against requirement 3

Requirement 3's check (PRD lines 546 to 554) sets this plan. It says: run
representative sessions on every supported harness, a fresh session, a long
reasoning conversation with context condensed, a task switch, and parallel
sessions changing shared knowledge. Include a known fact, a correction needing
approval, an already-approved save, a low-value detail that must stay out, a
failed save, and a handoff. The owner gives no reminders during the test. Write
down the failures and the gaps. Reading a rule, calling a tool, or increasing a
counter does not on its own pass this check.

### 11.1 The five representative sessions

Each session runs on Claude Code and again on Codex. Ten runs in total.

| Session | How it is set up | What it is testing |
| --- | --- | --- |
| Fresh session | A new session in an equipped test project with a seeded knowledge folder | The startup map arrives whole and in order, the agent gives the one-line confirmation, and the first question is answered from the seeded knowledge with a source path |
| Long session with compaction | A long reasoning conversation, then `/compact`, then more work in the same session | Guidance comes back: the standing rule re-injects from disk, the startup map prints again on the `compact` source, and the agent still follows the save rules afterwards |
| Task switch | One task finishes, a different task starts in the same session | The lookup for the second task actually happens. Requirement 3 (PRD line 521) says a check done for an earlier task does not cover a different task |
| Parallel sessions | Two sessions in two worktrees change `knowledge/memory/current.md` and save a memory entry at about the same time | Neither session loses the other's entry. Each rereads the shared file before writing it, and the direct-commit rule's fetch step is followed |
| Codex session | The same four sessions again in Codex, in a trusted and an untrusted state | Every Codex row in section 8.1 behaves as written, and the untrusted state is visible |

### 11.2 The seeded situations

The six situations from requirement 3's check are seeded into the sessions
above. Each one has an expected outcome written before the run.

| Situation | How it is seeded | Expected outcome |
| --- | --- | --- |
| A known fact | One memory entry in the seeded folder answers a question the owner asks in plain words | The agent answers from that file and puts the source path on the line under the finding. It does not answer from the index line alone |
| A correction needing approval | The owner corrects something the agent said, in a way that changes a saved entry | A save card appears in the requirement 20 shape: a numbered topic name, `Change`, `Summary`, `Your decision`. Nothing is written before the owner answers. The corrected meaning is the approved scope; the owner's exact words are copied only if he asks for that |
| An already-approved save | The owner approved a save in the previous turn, and the session continues | The write happens without a second approval question. The read-back runs. The one-line report says whether it was pushed or is local only |
| A low-value detail | A passing detail about a tool call or a dropped idea comes up during the work | No card appears for it. Requirement 12 (PRD line 782) keeps it out. If a card does appear, the run is a failure and the reason goes in the feedback file |
| A failed save | The push is made to fail, or the checker is made to fail on the written file | The save is reported as unfinished, the entry stays in `knowledge/memory-inbox.md` with its state, the dependent task waits, and the unrelated task carries on. Requirement 3 (PRD line 556) allows exactly this |
| A handoff | The owner says he is about to clear context, or runs `/handoff` | The knowledge review runs before the handoff prompt is written. Pending inbox items are read and the ones that matter are named in the prompt |

### 11.3 How each session is run

| Kind of run | Command or method | What it can and cannot show |
| --- | --- | --- |
| Hook delivery proof | `claude --init-only --debug-file <path>`, then read the log | Shows the startup map arrived whole and in order. Shows nothing about what the agent did with it |
| Scripted two-turn runs | `claude -p` with two turns: one that triggers the gate, one after the save skill ran | Shows the gate denying once and allowing after. Good for the enforced parts, which are the parts a script can see |
| Hand sessions | A person runs the session and reads the replies | The only way to check a citation, a card's shape, a quiet review, or a judgment call. Requirement 3 (PRD line 553) rules out counting tool calls instead |
| Parallel run | Two hand sessions in two worktrees, started within a minute of each other | The only way to see a lost write |
| Codex runs | The same, in Codex, with the hooks trusted and then untrusted | Shows the trust rule's effect, which no Claude Code run can show |

The enforced parts are checked by the scripted runs. The guided parts are checked
by the hand sessions, and by nothing else. The design says this plainly rather
than claiming a counter proves them.

### 11.4 The repo checks

These run before every pull request, as `CLAUDE.md` requires.

| Check | What it covers here |
| --- | --- |
| `node tests/link-check.mjs` | Every link to a moved file in the migration is repaired |
| `node tests/orphan-check.mjs` | No Markdown file is left with nothing pointing at it after the renames |
| `node tests/installed-copy-check.mjs` | The rule files and the output style still match their shipped originals. The hook and tool rows are removed in the same change that removes the copies |
| `node tests/knowledge-startup-check.mjs` | The rewritten startup contract: the new file order, the budget, the version line, the manual's new size and hash, and Claude and Codex hook parity |
| `claude plugin validate .` | The plugin still loads. `main` is what every machine installs from |

### 11.5 How results are recorded

The tracker is the `Claude-Toolkit-Project` board on GitHub, connected to this
repository.

- Each representative session gets one row in the issue body: the session, the
  harness, the date, pass or fail, and the failures found.
- The reasoning behind a result, and anything still open, goes in the one
  comment titled "Progress log", edited in place.
- A failure that is a design change goes into the issue body as a settled
  decision, not only into the comment.
- The written result of each assumption test in section 10 and each Codex proof
  in section 8.6 is one line in the Progress log, with the date.
- A gap that cannot be closed is written into the setup report text, because
  requirement 25 (PRD line 1592) and requirement 3 (PRD line 539) both require
  a project to be told what its harness cannot do.

---

## 12. Build order and the suggested work-item split

Seven items. Step zero comes first and is not optional. The six after it are the
split from the decision brief. Each names the requirements it delivers, the
files it touches, and what it waits for.

### Step zero. Refresh the captured Claude Code documentation

| Field | Value |
| --- | --- |
| Requirements delivered | 26 (PRD line 1599) |
| Files | `ai-external-knowledge/claude-code/` (whole capture), by running `node .claude/tools/capture-claude-code-docs.mjs` |
| Depends on | Nothing |
| Why first | The capture in the repository is twelve days old and twelve Claude Code releases behind. Every part of this design names a captured page. Re-read `hooks.md` and `skills.md` after the refresh and correct anything this design got wrong |
| Done when | The capture date in the file headers is today's date, and the hook events, the `if` syntax, the output cap, and the skill frontmatter fields in this design match the refreshed pages |

### Item 1. The manual, the rule files, the startup hook, and the four skills

| Field | Value |
| --- | --- |
| Requirements delivered | 2 (line 475), 5 (line 587), 6 (line 599), 11 (line 746), 12 (line 782), 15 (line 1044), 17 (line 1235), 18 (line 1247), 19 (line 1316), 20 (line 1385), 22 (line 1512), 24 (line 1567) |
| Files | `plugins/second-brain/skills/second-brain/references/templates/knowledge/README.md` rewritten as the map under 4,000 characters; `plugins/second-brain/hooks/startup-map.mjs`; the four skill folders `knowledge-find`, `knowledge-save`, `knowledge-review`, `knowledge-setup` with their `references/`; `plugins/project-init/library/rules/general/knowledge-system.md` and `knowledge-files.md` |
| Depends on | Step zero |
| Note | This item carries the whole rename list in section 9.4 for the four new skill names, because the old names stop existing here |

### Item 2. The guards and the session state

| Field | Value |
| --- | --- |
| Requirements delivered | 3 (line 508), 9 (line 669), 10 (line 703), 29 (line 1669) |
| Files | `plugins/second-brain/hooks/save-moment-gate.mjs`, `knowledge-write-guard.mjs`, `knowledge-after-write.mjs`, `session-review-nudge.mjs`, `compact-hold.mjs`; `plugins/second-brain/hooks/command-parsing.mjs` kept as the shared helper; `plugins/second-brain/tools/session-marker.mjs`; the plugin's `hooks.json` |
| Depends on | Item 1, because every guard's message names a skill, and the marker is written from the `knowledge-save` body |
| Note | The assumption tests in section 10 run before this item starts, because four of them decide how these scripts are written |

### Item 3. The tools and the layout migration

| Field | Value |
| --- | --- |
| Requirements delivered | 7 (line 610), 8 (line 652), 13 (line 802), 14 (line 916), 16 (line 1120), 21 (line 1458), 23 (line 1537), 28 (line 1629) |
| Files | `plugins/second-brain/tools/build-knowledge-index.mjs`, `check-knowledge.mjs`, `frontmatter.mjs`; `.githooks/pre-commit`; every template under `plugins/second-brain/skills/second-brain/references/templates/`; the migration steps inside `plugins/project-init/skills/project-sync/SKILL.md` |
| Depends on | Item 1 for the file shapes the checker enforces |
| Note | The twelve migration steps in section 9.5 are this item's acceptance list. Nothing in an equipped project moves without the owner approving that project's migration |

### Item 4. Codex delivery

| Field | Value |
| --- | --- |
| Requirements delivered | 25 (line 1588) |
| Files | `.codex/hooks.json`; the "Knowledge system" section of the root `AGENTS.md`; `plugins/second-brain/.codex-plugin/plugin.json`; `.agents/plugins/marketplace.json`; the Codex branch inside every hook script |
| Depends on | Items 1, 2 and 3, because the scripts must exist before they are registered |
| Note | The twelve proofs in section 8.6 run inside this item. Each one ends as a fact in the setup report or a named gap |

### Item 5. Setup, sync, and the delivery proof

| Field | Value |
| --- | --- |
| Requirements delivered | 27 (line 1617), 30 (line 1754) |
| Files | `plugins/project-init/skills/project-init/SKILL.md` Gate 3; `plugins/project-init/skills/project-sync/SKILL.md`; `plugins/project-init/skills/machine-sync/SKILL.md`; the `knowledge-setup` skill's report text; `.claude/toolkit-sync.md` |
| Depends on | Items 1 to 4 |
| Note | The report names the running version, which nothing does today, and names every Codex gap found in item 4 |

### Item 6. Tests, docs, and the rest of the toolkit

| Field | Value |
| --- | --- |
| Requirements delivered | 1 (line 456), 4 (line 575), 26 (line 1599); and it protects every other requirement from a stale reference |
| Files | `tests/knowledge-startup-check.mjs`, `tests/installed-copy-check.mjs`; `docs/toolkit-map.md`; `README.md`; `.claude-plugin/marketplace.json`; `plugins/session-skills/skills/handoff/SKILL.md`, `grill-me/SKILL.md`; `plugins/project-init/library/rules/general/offer-context-handoff.md`; `plugins/second-brain/README.md`; every other row of the dependency list in section 9.4 |
| Depends on | Items 1 to 5 |
| Note | This item finishes the rename list. A row left undone is a file naming a skill that no longer exists |

### Item 7. The representative sessions

| Field | Value |
| --- | --- |
| Requirements delivered | 3's check (line 546) |
| Files | No product files. Results go in the issue body and the Progress log |
| Depends on | Items 1 to 6 |
| Note | Failures found here come back as changes inside the items above, not as a new item |

The build order is the item order. Two items can overlap safely: item 3's tool
work does not touch item 2's hook scripts. Item 4 cannot start before item 2
finishes, because Codex registering a script that does not exist fails with no message.

---

## 13. Requirements to reconsider

Eighteen entries. Each names the requirement and its PRD line, says what is
wrong or unclear in two sentences, gives the recommended answer, and says what
changes in the design if Mike answers differently.

### 13.1 Requirement 2, "confirm the contents were read" (PRD line 481)

The line asks for a completion check that confirms the contents of each file
reached the agent and were read. No harness can observe reading; it can only
observe delivery.

**Recommended answer:** hook delivery in order counts as read. The check is
that the delivery finished, proved by the map's last line appearing in the
session.

**If Mike answers differently:** the startup hook prints a directive instead of
the files, the agent makes three `Read` calls, and a `PostToolUse` counter holds
the confirmation until all three ran. That costs three tool turns in every
session and still proves only that a tool ran.

### 13.2 Requirements 3 and 9, the quiet review at the end of every turn (PRD lines 524 and 674)

A review that finds nothing to save produces no output, so nothing can see
whether it happened. Requirement 29 (PRD line 1669) forbids a program that reads
the agent's replies, which is the only other way to check.

**Recommended answer:** the per-turn review stays a guided duty. The four
visible moments are enforced, and `session-review-nudge.mjs` raises the fifth
when the changed-file count crosses a threshold.

**If Mike answers differently:** the only remaining mechanism is a hook that
reads the reply and judges it. That is a scorer, and the design records it as a
rejected option under requirement 29 and requirement 3 (PRD line 535).

### 13.3 Requirements 9 and 13, a push per decision and per working-memory change (PRD lines 681 and 854)

Requirement 9 says one yes ends the owner's part and the save is pushed.
Requirement 13 says the next session must be able to see the updated context. Read
strictly, that is a commit and a push for every settled decision on a shared
default branch, which collides with other sessions.

**Recommended answer:** several decisions settled in one reply share one push.
`knowledge/memory/current.md` pushes at the save moments and at the handoff.
Between them the one-line confirmation says "saved locally, not yet pushed",
which requirement 3 (PRD line 520) already allows.

**If Mike answers differently:** every write pushes immediately. The design adds
retry and merge handling to the direct-commit step, because a push to a busy
default branch is refused often.

### 13.4 Requirement 14 with requirement 10, `approved_by` when the approval step is off (PRD lines 940 and 717)

Requirement 10 lets the owner turn the approval step off for memory writes in a
project. Requirement 14 says `approved_by` and `approval_date` are never empty,
and gives no value for the off case.

**Recommended answer:** `approved_by: Mike Rihm, standing approval (approval
step off)` and `approval_date` set to the write date. The setting lives in the
`knowledge/project.md` frontmatter as `memory_approval: off`, so both harnesses
read it.

**If Mike answers differently:** if he wants the fields left out when the step is
off, the checker needs a second required-field set keyed on the project setting,
and every index and report has to handle a file with no approver.

### 13.5 Requirement 18 and the layout, the System Guide paths (PRD lines 168 to 172 and 1279)

This PRD names `knowledge/system-guide/` with `system-guide-index.md` and a
`system-guide-entries/` folder. The System Guide PRD, which Mike approved and
told the agent to build, names `knowledge/system/` with a different structure
entirely (`knowledge/prds/system-guide.md` lines 66, 72, 194 to 211).

**Recommended answer:** this PRD stops naming another plugin's layout. It refers
only to the enabled guide's entry page named in `.system-guide.json`. The System
Guide PRD owns its own folders.

**If Mike answers differently:** if this PRD's layout wins, the System Guide PRD
and the built guide both change, and requirement 1 (PRD line 460) has to be
re-read, because it forbids this PRD becoming a second owner of another part's
content.

### 13.6 Requirement 7, the glossary path (PRD line 612)

This PRD puts the glossary at
`knowledge/memory/memory-entries/terminology-glossary.md`. The System Guide PRD
puts it at `knowledge/glossary.md` (line 125). Two files would both be called
the glossary.

**Recommended answer:** Mike picks one path, and both PRDs use it. The design
recommends this PRD's path, because the glossary is memory and the find order
already walks `memory-entries/`.

**If Mike answers differently:** if `knowledge/glossary.md` wins, the checker's
exemption, the index exclusion, the find order, and the startup map all point at
the root path instead. The work is the same size either way.

### 13.7 Requirement 17, the skill-authoring process (PRD line 1238)

Requirement 17 says a repeatable procedure becomes a project skill at the skill
location the runtime provides, and hands the proposal to a skill-authoring
process. No such process exists in the toolkit.

**Recommended answer:** name it as a dependency, not as a part of the knowledge
system. Until it exists, `knowledge-save` writes a short skill proposal and asks
the owner to approve it, then writes the skill file at
`.claude/skills/<name>/SKILL.md`.

**If Mike answers differently:** if he wants the process built here, it becomes
a work item of its own, and requirement 17 stops being deliverable inside this
design.

### 13.8 Requirement 16, "when work ships" (PRD line 1162)

Requirement 16 asks for quiet automatic PRD upkeep when work ships. The PRD
never defines shipping.

**Recommended answer:** shipped means the work item is closed as done, or its
pull request is merged to the default branch. The gate at item close forces the
save skill, whose upkeep branch does the update. Merging is not gated, because
Mike's 2026-09-03 guard set excludes merge. Instead, at the pull-request save
review, `knowledge-save` writes one inbox entry reading "PRD upkeep owed when PR
N merges", so the next session's startup lines and the Stop nudge carry it.

**If Mike answers differently:** if merge should be gated, the gate matches
`gh pr merge` and `mcp__github__merge_pull_request`, and the inbox entry is not
needed.

### 13.9 Requirement 1, "nothing else" against Node scripts (PRD line 456)

Requirement 1 lists the allowed parts and says nothing else. The system is built
from Node scripts that hooks and skills run.

**Recommended answer:** a script that a hook or a skill runs is part of that
hook or that skill. The five allowed parts are Markdown files, Git, hooks,
skills, and the harness itself.

**If Mike answers differently:** if scripts are a separate part needing its own
permission, requirement 1 gets one more line and nothing in the design changes.

### 13.10 Requirements 8 and 21, the outside-documentation index (PRD lines 652 and 1460)

Requirement 21 makes `ai-external-knowledge/README.md` a generated index.
Today it is written by hand, by this repository's own capture script, and it is
not shipped to any other project.

**Recommended answer:** the builder generates it from each topic's entry page.
The capture script writes the topic page's frontmatter, so the builder has a
`summary` and a capture date to read.

**If Mike answers differently:** if the file stays hand-written, requirement 21
loses its third index and the startup map points at a file nothing keeps
current.

### 13.11 The preferred direction names function hooks (PRD lines 1938 to 1942)

The PRD's exploratory section leans toward hooks that run in-process. Function
hooks do not exist in any official Claude Code source: fourteen live pages, the
changelog to 2.1.273, and `llms.txt` were all checked on 2026-09-16. The one
public reference is a community GitHub issue.

**Recommended answer:** build on documented command hooks. Name one upgrade
point: the session-state file and the three `PreToolUse` and `PostToolUse`
scripts are what a function hook would replace later. Nothing else changes.

**If Mike answers differently:** waiting for function hooks stops the build with
no date to wait for.

### 13.12 Requirement 28, nine lines per inbox entry (PRD line 1640)

Requirement 28 keeps the card exactly as it was shown, which is about nine lines
per entry. That is heavy for a case that should be rare.

**Recommended answer:** keep the approved shape. `knowledge-save`'s reference
file holds the template, so the agent never composes an entry from memory, and
`startup-map.mjs` prints only each entry's heading and state line, so a heavy
entry costs nothing at startup.

**If Mike answers differently:** a shorter entry loses the card's wording, and
the owner answering it a day later has to be shown the card again.

### 13.13 Requirement 25, "the same result in Codex" (PRD line 1592)

Requirement 25 asks for the same outcomes on every supported harness. Section 8
shows three places where Codex cannot do the same thing: the quiet Stop nudge,
path-scoped rules, and the trust rule.

**Recommended answer:** the check becomes "same, or named". Every difference is
a row in section 8.1 and a line in every project's setup report, which is what
requirement 25 (PRD line 1592) already requires for a behavior Codex cannot
enforce.

**If Mike answers differently:** if strict parity is required, the design has to
drop the Claude Code features Codex lacks, which makes both harnesses weaker for
no gain.

### 13.14 Requirement 7, how the glossary reaches the agent from the first message (PRD line 616)

Requirement 7 says the agent uses the glossary's meanings from the first message
of every session, and leaves the method to the builder. A large glossary cannot
be printed at startup inside the 9,500-character budget.

**Recommended answer:** the startup map prints the glossary whole when it is
under 2,000 characters, and prints only its path when it is larger. The setup
report names that limit, so a project with a big glossary knows the agent must
open the file.

**If Mike answers differently:** if the whole glossary must always print, the
budget has to grow past the 10,000-character hook cap, which sends the output to
a file and delivers nothing. The only other option is a smaller manual.

### 13.15 The operating-system PRD's open row on a failed knowledge review (`knowledge/prds/toolkit-operating-system.md` line 503)

That row asks what a failed or missed knowledge review does to work completion.
This PRD says a failed save pauses only that save and the work depending on it
(PRD line 556), and the work-item upkeep PRD allows an unapproved local `Done`
with the gap reported.

**Recommended answer:** the item-close gate requires that the save review ran. A
save that then fails is reported in the completion summary and kept in
`knowledge/memory-inbox.md`, and it does not block `Done`, because requirement 3
says a failed save pauses only dependent work.

**If Mike answers differently:** if a failed save must block completion, the gate
has to read the inbox for an unfinished entry, not just the skill marker, which
is the escalation recorded as write-guard option B in section 14.

### 13.16 The PRD's own frontmatter has no `group` and no `updated_at` (PRD lines 1 to 12, against line 1195)

Requirement 16 lists `group` and `updated_at` among the required PRD fields. This
PRD's own frontmatter has neither. It was flagged on 2026-09-15 and never
answered.

**Recommended answer:** add both fields to this PRD in the same change that
teaches the checker about them, so the PRD passes its own rule.

**If Mike answers differently:** if the fields are not required after all,
requirement 16's field list and the checker both change, and the migration's
step 8 disappears.

### 13.17 The walkthrough's inbox card uses a "New wording" block (the approved walkthrough, Part 4, `scratchpad/walkthrough.txt` lines 630 to 634)

The approved walkthrough's inbox example card shows `**Change:**`, then
`**New wording:**` with a block quotation, then `**Your decision:**`.
Requirement 20 (PRD lines 1401 to 1404) names `Change`, `Summary`, and `Your
decision`, and lines 1387 to 1390 say the summary is not a word-for-word preview.
It was flagged on 2026-09-15 and never answered.

**Recommended answer:** the card keeps requirement 20's three labels. A block
quotation of the exact new wording is allowed inside `Summary` when the exact
words are what the owner is approving, such as a one-line correction.

**If Mike answers differently:** the tie-break rule says the approved
walkthrough wins over the PRD, so if he keeps "New wording" as a fourth label,
requirement 20 is edited and the card reference follows it.

### 13.18 Requirement 16, approval fields required while the PRD is still proposed (PRD lines 1198 to 1200)

The line says that once requirements are approved, `approved_by` and
`approval_date` are both required even while the PRD stays `proposed`. That
makes `proposed` carry two different states, and a reader cannot tell them apart
without reading the fields. It was flagged on 2026-09-15 and never answered.

**Recommended answer:** keep the rule and say the two states out loud in the
manual: a `proposed` PRD with no approval fields is being refined; a `proposed`
PRD with both fields has approved requirements and is waiting to be built. The
checker already enforces exactly this in 30 test cases.

**If Mike answers differently:** if `finalized` should be set the moment
requirements are approved, the fields are only ever on a `finalized` PRD, and the
checker's approval logic gets simpler.

### 13.19 Requirement 9's three exclamation marks (PRD line 678)

The line reads "saved directly to the default branch and pushed!!!". The
project's own output style forbids that kind of emphasis, and the shipped manual
has the same problem at `knowledge/README.md` lines 7 to 9. It was flagged on
2026-09-15 and never answered.

**Recommended answer:** delete the exclamation marks in the PRD and fix the
manual's lines in the rewrite. Nothing about the behavior changes.

**If Mike answers differently:** nothing in the design changes either way. This
is a wording fix only.

---

## 14. Design options where two answers are reasonable

Eight places where a second answer would also work. The recommendation comes
first, then the alternative, then the reason for the choice.

### 14.1 How the startup files reach the agent

**Recommended: the `SessionStart` hook prints the files whole.** `startup-map.mjs`
prints `SOUL.md`, `knowledge/project.md`, and `knowledge/README.md` in that
order, inside the 9,500-character budget, and the agent gives a one-line
confirmation.

**Alternative: the hook prints a directive and the agent makes three `Read`
calls,** with a `PostToolUse` counter holding the confirmation until all three
have run.

**Reason:** hook delivery costs no tool turns and always happens in the same
order. The alternative costs three tool turns in every session and proves only
that a tool ran, not that anything was read. The recommended option forces the
manual rewrite, which the 10,000-character cap requires anyway.

### 14.2 What releases the save-moment gate

**Recommended: a marker.** `save-moment-gate.mjs` allows the command when
`knowledge-save` was invoked in this session after the branch's last commit,
compared with `git log -1 --format=%ct`.

**Alternative: hold once per branch,** which is what ships today.

**Reason:** the once-per-branch hold was bypassed in an audited session, where
a session claimed a review that never ran. The marker costs one small file. It
still does not prove the review was good, and the design says so.

### 14.3 Whether to guard writes to lasting files

**Recommended: a `PreToolUse` guard.** `knowledge-write-guard.mjs` denies `Edit`
and `Write` under `knowledge/memory/memory-entries/` and `knowledge/prds/` until
`knowledge-save` has been invoked in this session, and denies any such write from
a helper agent, because a helper never loads the save skill.

**Alternative: no guard,** relying on the standing rule and the after-write
checker.

**Reason:** a hand-written memory file is the failure most likely to damage
trust, because a later agent will believe it. The guard costs nothing when the
skill is used. A stronger version exists and is not built now: deny unless
`knowledge/memory-inbox.md` holds a matching "approved, save unfinished" entry
for that destination, which turns the inbox into an approval ledger. Requirement
29 (PRD line 1684) says add restrictions only after a failure that happened, so
that version is recorded as the next step if an unapproved write ever lands.

### 14.4 Where the standing obligations live

**Recommended: a short manual plus a rule file.** `knowledge/README.md` is the
map, delivered by the startup hook. `.claude/rules/knowledge-system.md` holds
about 25 lines of standing obligations.

**Alternative: the manual only, with no rule file.**

**Reason:** unscoped rule files are re-injected from disk after compaction, and
a helper agent loads rules but never sees the parent's hook output. The manual
alone is workable, because the startup hook runs again on the `compact` source,
but it leaves helper agents with nothing.

### 14.5 When a shown card is written to the inbox

**Recommended: in the same reply that shows the card.** The entry is written
locally, and pushed at the next push or at the handoff.

**Alternative: write the entry only when the owner's next message does not
answer the card.**

**Reason:** the alternative loses the card if the session ends first, which is
the exact case requirement 28 (PRD line 1640) exists for. Requirement 28 does
not say when the entry is written, so this is the design's answer.

### 14.6 How the end-of-turn review is checked

**Recommended: guided, plus the Stop nudge.** The review is a duty in the
standing rule. `session-review-nudge.mjs` speaks when the changed-file count
crosses a threshold, or once per session when the inbox holds an approved save
that never finished.

**Alternative: a prompt hook on `Stop` that reads the agent's last reply and
judges whether a review happened.**

**Reason:** the alternative is a program that reads the agent's replies.
Requirement 29 (PRD line 1669) and requirement 3 (PRD line 535) both rule it
out. It is recorded here as rejected, not as an open choice.

### 14.7 What triggers the after-write check

**Recommended: `PostToolUse`.** `knowledge-after-write.mjs` runs on `Edit` and
`Write` under `knowledge/` and `ai-external-knowledge/`, and again on `Bash`
with no `if`, where it runs
`git status --porcelain -- knowledge/ ai-external-knowledge/`, checks only files
changed since its last run, and stays silent otherwise.

**Alternative: `FileChanged` with `watchPaths` set on the knowledge folders.**

**Reason:** `FileChanged` returns no `additionalContext`, so a failed check
would never reach the agent, and it watches literal filenames rather than
folders. `PostToolUse` reaches the agent on both branches. The Bash branch
covers `sed`, heredocs, and `python -c`, which a guard on `Edit` and `Write`
cannot see. `FileChanged` may be added later as a silent index rebuild for the
owner's own hand edits.

### 14.8 How the skill marker is written

**Recommended: dynamic context injection in the `knowledge-save` body.** A
command line in the skill body runs on every invocation and writes the marker
through `session-marker.mjs`. The command always exits 0, because a failed
injected command aborts the whole skill invocation.

**Alternative: a `PostToolUse` hook matching the Skill tool.**

**Reason:** `PreToolUse` and `PostToolUse` do fire for the Skill tool when the
model invokes a skill, but a typed `/knowledge-save` bypasses both events, and
the Skill tool's `tool_input` schema is undocumented. Injection covers both
paths. In Codex there is no Skill tool and no injection, so the save skill runs
one `node` command as its last step instead, which is weaker and is named in the
Codex table.

---

## 15. Open questions for Mike

Twenty-five questions, grouped. Each can be answered on its own.

### PRD wording

1. Requirement 2 (PRD line 481): does hook delivery of the three startup files
   count as "read", with the check being that delivery finished?
2. Requirements 3 and 9 (PRD lines 524 and 674): is the end-of-turn review a
   guided duty plus a threshold nudge, rather than something enforced?
3. Requirements 9 and 13 (PRD lines 681 and 854): may several decisions settled
   in one reply share one push, with `knowledge/memory/current.md` pushed at the
   save moments and at the handoff?
4. Requirement 14 with requirement 10 (PRD lines 940 and 717): when the approval
   step is off, is `approved_by: Mike Rihm, standing approval (approval step
   off)` with the write date correct?
5. Requirement 18 and the layout (PRD lines 168 to 172): may this PRD stop
   naming the System Guide's folders and refer only to the entry page in
   `.system-guide.json`?
6. Requirement 7 (PRD line 612): which glossary path is real,
   `knowledge/memory/memory-entries/terminology-glossary.md` or
   `knowledge/glossary.md`?
7. Requirement 16 (PRD line 1162): does "when work ships" mean the item is
   closed as done, or its pull request is merged to the default branch?
8. Requirement 25 (PRD line 1592): does the Codex check become "same, or named
   in the setup report"?
9. Requirement 16 (PRD line 1195): does this PRD's own frontmatter get `group`
   and `updated_at`? Open since 2026-09-15.
10. Requirement 20 (PRD lines 1401 to 1404): does the inbox card keep the
    walkthrough's "New wording" block, or the PRD's three labels? Open since
    2026-09-15.
11. Requirement 16 (PRD lines 1198 to 1200): do the approval fields stay
    required while a PRD is still `proposed`? Open since 2026-09-15.
12. Requirement 9 (PRD line 678): may the three exclamation marks be deleted,
    and the same style fixed at `knowledge/README.md` lines 7 to 9? Open since
    2026-09-15.

### Design choices

13. Codex `Stop` can only block, not add a quiet note. Accept one forced
    continuation per session, or leave Codex with no end-of-turn nudge?
14. The startup map prints the glossary whole only when it is under 2,000
    characters, and prints its path otherwise. Is that limit acceptable?
15. Should the startup budget keep per-part caps at all, or should the
    9,500-character total be the only hard rule with a warning near 8,000?
    Recommended on 2026-09-05 and never answered.
16. Should `knowledge/project.md` and the PRD index be trimmed, or should their
    caps be raised? Open since 2026-09-05.
17. The Git pre-commit hook refuses a bad knowledge commit from anyone,
    including the owner's own hand edit. Is that the intent of requirement 21?
18. Requirement 17 hands a procedure to a skill-authoring process that does not
    exist. Is it acceptable to name it as a dependency and have
    `knowledge-save` ask for approval on a skill proposal until it does?
19. The operating-system PRD's open row (line 503): does a failed knowledge save
    keep `Done` available, with the failure reported and the entry kept in the
    inbox?
20. The 2026-09-03 amendment adding a save-moment trigger based on what the
    session did was proposed and never approved. The Stop nudge is that trigger.
    Approve it?

### Migration

21. Each equipped project's layout migration is approved separately before
    anything moves. Which project goes first, this repository or DragonFly?
22. Four files in this repository have a `summary` over the new 200-character
    limit. May they be shortened as part of the migration?
23. The `.claude/hooks/` and `.claude/tools/` copies are removed from projects,
    and the hooks run from the plugin. Confirm?
24. Should the component PRDs, including this one, become children of the
    operating-system PRD, now that child PRD folders will be possible?
25. After approval, the operating-system PRD's three stale rows (lines 501, 502
    and 507) are updated as automatic upkeep under requirement 16. Confirm?

---

# Alternatives considered for the whole system

Full detail, with sources and fetch dates, is in
`/tmp/claude-0/-home-user-claude-toolkit/4fcf9e21-6c96-5d1c-816b-828bcf2822e5/scratchpad/research/r5-alternatives.md`,
written 2026-09-16.

| Approach | Verdict | Reason |
| --- | --- | --- |
| Claude Code auto memory, default setup | Reject | The store sits outside the repository, is machine-local, and is written without asking. |
| Claude Code auto memory pointed into the repository with `autoMemoryDirectory` | Reject | The value must be an absolute path, so no portable repository path works, and the no-approval problem stays. |
| `CLAUDE.md` plus `.claude/rules/` | Adopt part | Path-scoped rules bring the file rules back exactly when a knowledge file is opened, and cost nothing otherwise. |
| Claude Code skills | Adopt | Already in use; the description stays in context and the body loads only when the skill is used. |
| Claude Code command hooks | Adopt | Documented, scriptable, and the only way to block a tool call or add text at a fixed moment. |
| Codex lifecycle hooks | Adopt | Twelve events with Claude Code's names and JSON, so one script serves both harnesses. |
| Claude Code prompt hooks and agent hooks | Adopt part, carefully | Useful only for one narrow question about an approval on record; requirement 29 forbids using them to grade the agent's search. |
| Codex memories subsystem | Reject, and switch it off | A state database, a background writer, and writes with no approval. |
| Anthropic memory tool `memory_20250818` | Reject | It is for programs built on the API; a finished harness cannot be handed your own tool handler. |
| claude-mem | Reject | A Chroma vector database plus SQLite, recording automatically. |
| memsearch | Reject | Markdown plus a Milvus database is still a second store. |
| Mem0 | Reject | A service with a vector store, not files. |
| Letta | Reject | It replaces the harness, and the agent edits its own memory. |
| Obsidian-style vault | Adopt part, already done | A file layout adds no behavior, so it cannot meet requirements 3, 9, 10 or 28 on its own. |
| One `AGENTS.md` handbook for both harnesses | Adopt part | Worth importing so Codex and Claude Code read one file instead of two copies. |
| Git pre-commit hook running the checker | Adopt part | Nothing runs the checker by itself today, and Git catches a bad file whichever harness wrote it. |
| Claude Code team memory stores (`CLAUDE_MEMORY_STORES`) | Reject for now | It appears in one changelog line and in no documentation page, so it cannot be designed against. |
