# protocol-guard plugin

Required workflow checks for Claude Code. The plugin refuses a tool call, or
holds a final reply once, when a required step did not happen. It decides from
facts Claude Code reports: which skill was opened, which file a tool wrote,
which program a shell command ran, and whether the call succeeded. No model is
called, and the agent's words are never read.

A check proves that a step happened. It does not prove the step was done well,
and it never proves that the owner approved anything.

Last tested on Claude Code 2.1.280.

## What it checks

The shipped list is `protocols.default.json`. Each entry names the skill that
owns the step.

| ID | Required step | When it is checked | On failure |
| --- | --- | --- | --- |
| K4 | Knowledge files change only with `knowledge-save` open | A write to `knowledge/memory-inbox.md`, `knowledge/memory/`, `knowledge/prds/` or `knowledge/memory-self-improvement.md`, by a file tool or a shell command | The call is refused. The inbox needs the skill opened this turn; the other files need it opened since the last reset |
| CW | Working memory follows work-item changes | The turn ends after a work item was created, closed, or moved to another stage (`gh issue`, a label edit with a stage label such as `08-build`, `gh project item-edit`, GitHub issue tools, or the `work` command) | The reply is held once and the agent is sent to `knowledge-save`, until `knowledge/memory/current.md` is written after the change |
| K5 | Generated indexes are not edited by hand | A write to `knowledge/memory/memory-index.md`, `knowledge/prds/prd-index.md` or `ai-external-knowledge/README.md` | The call is refused; the agent runs the index builder instead |
| K6 | Indexes rebuilt and checker run after a knowledge write | The turn ends after a K4 write | The reply is held once until `build-knowledge-index.mjs` and then `check-knowledge.mjs` both exited 0 after the last write |

Every check applies only in a project with `knowledge/knowledge-manual.md`.

How each fact is read:

- **A skill opened:** a successful Skill tool call, a typed `/name`, or a Read
  of the skill's `SKILL.md`.
- **A file written:** a successful Write, Edit, MultiEdit or NotebookEdit, or a
  shell command that names the file and is not a read-only program such as
  `cat`, `grep`, `cut`, `sort` without `-o`, `awk` without `-i inplace`, `sed`
  without `-i`, or `git diff` (git's `-C` and `-c` options are skipped before
  the subcommand). `cp`, `install` and `ln` write only their target.
- **A shell command:** its program, subcommand and file arguments
  (`hooks/shell-reader.mjs`). Quoted text is one argument, and heredoc bodies
  are dropped, so a commit message that mentions a path is not that path.
- **Success and order:** only a call that succeeded counts. A shell command
  counts toward a requirement only when its exit code 0 proves it ran to the
  end, such as the parts of a final `&&` chain. "After" means a later call in
  the same session.
- **Paths:** a file counts only inside the session's project root. A write to
  `knowledge/memory/current.md` in another checkout of the same repository,
  such as a sibling worktree, is not seen. CW then holds that turn once and
  shows its notice; later turns are not held for it.

## Agents and resets

- A skill counts for the agent that opened it. A helper agent also starts with
  what the main agent had opened when the helper first acted.
- A helper's successful writes and commands count for the main agent's CW and
  K6 checks. While a helper that wrote a knowledge file this turn is still
  running, the turn-end checks wait: the reply is not held now, and the checks
  are carried to the end of the next turn.
- At each turn start, every agent's "opened this turn" record is cleared.
- While a helper that wrote `knowledge/memory/current.md` or the inbox is still
  running, another agent's write of the same file is refused.
- Session start, `/clear`, resume and a plugin reload start the record over.
  Compaction clears which skills were opened.
- A turn-end check looks only at the facts of the current turn, except a check
  carried from a pending helper save. A check still unmet after its one hold
  is shown as a notice and is not held again in later turns.

## How a reply is held

The engine drops the draft reply before it is shown. When Claude Code then
asks for a visible reply, that draft is dropped too. The classic `Stop` event
continues the turn with a note, the way a Stop hook's block does; a block from
another Stop hook is kept beside it. The note says which step is missing and
which skill to open, and the agent does the step and writes its reply again.
Only the final reply is shown. If the turn then ends with no reply (an error
or an interrupt), the first held draft is shown beneath it.

The design planned to insert a Skill call for the owner instead. In print-mode
runs on Claude Code 2.1.280 the model treated that call, which it had not
made, as a prompt injection and refused the step (2 of 2 runs). The Stop
continuation is Claude Code's own channel for this, and the model followed it.

## When the engine fails

- A tool check that cannot decide refuses the call.
- The reply hold is the exception: on an error, the reply is shown.
- After two engine errors in one turn, the engine stops for the rest of that
  turn and one line says: "Workflow checks are off for this turn after an
  error."
- When a check is still unmet after its one hold, the reply is shown with the
  line "Required workflow check not met after one retry: <IDs>."
- Every note to the agent ends "Do not mention this check in your reply."

## Turning it on in a project

Function hooks load only when `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`. The
`project-init` and `project-sync` skills write both keys into the project's
committed `.claude/settings.json`:

```json
"env": { "CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1" },
"enabledPlugins": { "protocol-guard@claude-toolkit": true }
```

`machine-sync` does not set the variable. In user settings it would turn on
function hooks for every installed plugin on the computer.

A project changes the list in `.claude/protocols.json`:

```json
{ "off": ["K6"], "protocols": [] }
```

`off` names default checks to skip. `protocols` adds entries, and an entry with
a default's name replaces it. An entry that uses a word the engine does not
know is ignored, and the agent is told once. The list is read once per session.

## The older command hooks

The engine adds a `toolkit_protocol_engine` field, `{ version, active }`, to
the input of the classic `UserPromptSubmit` and `Stop` hooks. The second-brain
command hooks read it:

- `knowledge-completion.mjs` skips its end-of-turn check while K4 and K6 are
  active.
- `memory-reminder.mjs` leaves out the turn-review line while CW, K4 and K6 are
  active. It still starts the review checkpoint, so if the engine stops
  mid-turn the old end-of-turn check runs in full. When function hooks are on
  in a project that enables this plugin but the field is absent, it shows the
  owner one line per session (`systemMessage`) saying the checks are not
  running, and gives the agent the same line.

With the variable off, the field is absent and every old hook runs as before.
After two engine errors, the `Stop` input has no field, so the old check runs
for that turn.

## Codex

Codex cannot run function hooks. This plugin has no `.codex-plugin` manifest and
no entry in `.agents/plugins/marketplace.json`. Codex sessions follow the same
steps from their instructions and skills.

## Files

| File | What it is |
| --- | --- |
| `.claude-plugin/plugin.json` | The manifest |
| `hooks/hooks.json` | Registers the function-hook module |
| `hooks/engine.ts` | The engine |
| `hooks/shell-reader.mjs` | Reads a shell command's program, arguments and redirections |
| `protocols.default.json` | The shipped list |
| `tests/engine.test.ts` | Offline tests for each check |
| `tests/defaults.fixture.mjs` | A copy of the list for the offline tests, which cannot read files |
| `tsconfig.json` | Type-checks against the declarations `/plugin-types` writes to `.claude/types/` |

## Testing

```text
node tests/protocol-guard-check.mjs
CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude plugin test plugins/protocol-guard
```

The check regenerates the declarations, type-checks the engine, validates the
plugin, runs the offline tests, checks that each owner skill exists, and
compares the shell reader with the command hooks' reader. It skips the Claude
Code steps when `claude` is not installed. Run it after every Claude Code
update: the function-hook API is early access and may change in any release.

Not yet tested: Windows, the desktop app, a first session in an untrusted
folder, and turns started by background tasks.
