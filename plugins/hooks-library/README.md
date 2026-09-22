# hooks-library

Hooks that make a rule land mechanically, instead of writing the rule down again
and hoping.

**Setup: wires into settings.** Install once per machine, then switch each hook
on by adding it to a settings file, either the machine's or one project's.

## Why this exists

Some rules have to hold at one exact moment: the publish that would put an AI's
name on the owner's work, the deploy that cannot be undone, the build that
starts from a specification many sessions have touched. A written rule is easy
to miss at exactly that moment, deep into a long session. These hooks check the
moment mechanically instead of trusting anyone to remember a rule file.

## What ships today

### spec-check-reminder

A `PostToolUse` hook on `Edit`, `Write`, and `NotebookEdit`. At the session's
first file edit it asks one question: if this session is building from or
designing a solution from a specification, has the spec-check skill run yet?
Then it stays quiet for the rest of the session.

Specifications drift as many sessions touch them, and the `spec-check` skill
(in the `session-skills` plugin) exists to catch that before a build starts.
The failure it cannot catch on its own is being forgotten. A rule alone gets
buried in exactly the long handed-off sessions where drift happens, so this
hook re-raises the question at the one moment that matters, the first write.

It is a reminder, not a gate. It reads nothing the agent wrote, cannot tell
real build work from a one-line fix, and never blocks an edit. State lives in
a per-session file under the OS temp folder, which is how it fires only once.

### style-handshake

A per-message style read for Claude Code. On every new user message,
`UserPromptSubmit` asks Claude to read the whole selected output style file with
the `Read` tool before working on the request. The request gives the resolved
path and asks for a fresh read even if Claude read the file earlier. It then
asks Claude to silently check its reply against the style before sending it,
without mentioning either the read or the check. The reply begins with the
answer. Short questions and repeated identical messages get the same request.
Child-agent prompts are skipped.

**No acknowledgment.** The hook gives Claude no sentence to say about the read.
Before 2026-09-21 (issue #375) it asked for a visible opening sentence, and a
`PostToolUse` companion on `Read` reminded Claude to say it; that companion now
does nothing.

**This observes nothing and proves no compliance.** The hook keeps no state,
does not check that the Read happened, does not check the reply, never restarts
a finished answer, and needs no permission to run a confirm command. It runs
once per user message, not at each internal thinking block or tool-result
continuation. Validate style behavior in real conversations.

The selected style is resolved from `outputStyle` in project-local settings,
project settings, then user settings. Files are sought in project and user
`output-styles/` folders, by frontmatter name (or the hyphenated filename when
no name is declared). `CLAUDE_CONFIG_DIR` is honored for user files. The project
where the session started remains the source when Claude changes directory or
enters a worktree. Runtime selections not reflected in these settings are
outside this lookup.

**No style file means no output.** When no settings file selects a style, or no
file in those two folders matches the selected name, the hook says nothing. That
covers Claude Code's built-in styles, plugin-provided styles, managed-policy
styles, styles in a nested project `.claude/output-styles/` folder, and a
mistyped custom style name. To get a read request, select a file-backed style in
the project or user `output-styles/` folder.

A style file that is found but cannot be read, or a settings file that cannot be
parsed, asks Claude to report the limitation briefly and continue without
claiming a successful read. Hook input that cannot be read produces no output
and never blocks the prompt.

#### Install or migrate

Copy `hooks/style-handshake.mjs` to the project's `.claude/hooks/` folder.
Register it once, under `UserPromptSubmit` only. Use this command entry in that
event's `hooks` array:

```json
{
  "type": "command",
  "command": "node",
  "args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/style-handshake.mjs"],
  "timeout": 10
}
```

When migrating, remove this script's old `PostToolUse` entry with the `Read`
matcher. It is harmless if left, because it now does nothing. Also remove any
old `Stop` entry for this script and its exact
`Bash(node .claude/hooks/style-handshake.mjs confirm *)` permission. Keep all
unrelated entries. Do not register the same script again when it already exists
on `UserPromptSubmit`. Old confirm invocations are harmless no-ops. Start a
fresh session and check in its transcript that the reply starts with the answer
and says nothing about the style read.

This replaces the earlier Stop handshake, which continued the conversation
after the answer was already visible and could cause duplicate replies.

### no-ai-attribution-guard

A `PreToolUse` hook on the `Bash` matcher. It refuses any command that would put
AI credit on the owner's work: a `git commit`, `git tag`, `git merge`,
`git notes`, `gh pr create`, `gh pr edit`, `gh release create`, or
`gh issue create` whose text carries a `Co-Authored-By` trailer naming an AI, a
"Generated with Claude Code" line, Claude's no-reply email address, or the
Claude Code link that ships in the default credit line.

**This is the only machine-wide hook in the toolkit.** Every other hook here is
registered in a project's `.claude/settings.json`. This one is registered in the
owner's own `~/.claude/settings.json` and installed by the `machine-sync` skill
in the [`project-init`](../project-init/README.md) plugin, so it covers every
repository on the machine, including ones that were never set up with the
toolkit. Its script still lives here, because splitting hooks across two plugins
by scope would mean checking two folders to answer "what hooks does the toolkit
ship?".

**Why a hook and not just the setting.** The `attribution` setting, with
`commit` and `pr` set to an empty string, already removes the lines Claude Code
adds by itself, and it is the main defense. It has two holes: a project's
settings file beats the machine-wide one, and it does nothing about text an
agent types into a message by hand. The Claude Code documentation names the
answer: "To block an action regardless of what Claude decides, use a PreToolUse
hook instead."

**It leans toward blocking.** A wrong pass puts an AI's name on client work and
cannot be taken back once it is pushed, so a wrong block is the cheaper mistake
here.

**What stops it firing on ordinary commits.** This repository writes about the
`Co-Authored-By: Claude` trailer in its own rules, tickets, and commit messages.
Two things keep that working: every trailer pattern is anchored to the start of
a line, because a real trailer sits on its own line and prose about it does not;
and only publishing commands are scanned, so writing the same words into a file,
searching for them, or reading them is untouched. A `Co-Authored-By:` trailer
naming a real person stays allowed, which the tests check directly.

**It costs nothing on ordinary commands.** A command with none of the marker
words exits after a handful of substring checks, with no file read and no
subprocess.

It fails open. Any unexpected error exits 0 and the command runs.

**Its one limit, stated plainly.** It only sees commands run in the terminal. A
commit made any other way is never seen, and the `no-ai-attribution.md` rule in
the machine-wide set is the backup for those. The rule, the setting, and this
hook each cover a hole the other two leave.

### The two Salesforce guards

Both are `PreToolUse` hooks on the `Bash|PowerShell` matcher, written in Node so
they behave the same under Git Bash and PowerShell. They are Salesforce-only, so
`project-init` Gate 2 offers them only when the stack is Salesforce.

| File | Guide | What it does |
| --- | --- | --- |
| `hooks/guard-protected-orgs.js` | `salesforce-prod-guard-hook.md` | Confirms before any Salesforce CLI deploy or destructive command hits a production org. Works out which orgs are production from the local org store, with no network call. Tuned by `templates/protected-orgs.json`, copied to the project's `.claude/`. |
| `hooks/guard-permission-set-deploy.js` | `salesforce-permset-guard-hook.md` | Blocks a deploy shipping a permission set that has not been preflighted in the last 30 minutes. That omission silently and irreversibly deletes grants, and Salesforce's own `deploy validate` and `deploy preview` cannot detect it. |

**Installing them copies them into the project, so the project does not need this
plugin afterwards.** Each guide ends with the hook file in the project's
`.claude/hooks/` and an entry in the project's `.claude/settings.json`. Install
this plugin to get the guides and the files; after that the project runs the
hooks on its own, and a clone of it needs nothing from here.

The permission set guard depends on `permsets.py`, which is not in this plugin.
It ships in the `project-init` library at `library/tools/permsets.py`, and Gate 1
copies it to `tools/permissions/permsets.py`. Without it the guard blocks every
permission set deploy forever.

## Install

Use the `hooks-library` skill (`/hooks-library`), which wires a hook into the
project's `.claude/settings.json` and verifies it runs. `project-init` and
`project-sync` both offer them.

`spec-check-reminder` is only useful next to the `spec-check` skill from the
`session-skills` plugin, so install those together.

The two Salesforce guards install from their own guides in this folder,
`salesforce-prod-guard-hook.md` and `salesforce-permset-guard-hook.md`, which
`project-init` Gate 2 follows step by step.

`no-ai-attribution-guard` does not install through the `hooks-library` skill,
because it is not a project hook. The `machine-sync` skill (`/machine-sync`) in
the `project-init` plugin installs it into `~/.claude/`, alongside the rule and
the settings values it works with. Installing it per project would leave every
repository nobody set up uncovered, which is the gap it exists to close.

## Configure

### no-ai-attribution-guard

Optional, at `no-ai-attribution-guard.json` next to the installed script in
`~/.claude/hooks/`:

```json
{
  "enabled": true
}
```

Omit the file to get it on. Setting `enabled` to false switches the guard off,
and it is an escape hatch for a wrong block that cannot be reworded, not a
normal setting. The written rule still applies when the guard is off.

## Removed: work-item-stage-reminder

Issue #270 retired the reminder that ran after the first edit. The lifecycle
rule asks for orientation before substantial work; the local tracker checks
the active item and handoff refreshes it. Existing projects remove the old
script and its settings entry through `project-sync`. There is no replacement
lifecycle hook.

## Removed: explain-simply-reminder

A `UserPromptSubmit` hook shipped in issue #258. It fired on every message the
owner sent, carrying a fixed six-line reminder, roughly 90 tokens, asking for an
answer a five-year-old could follow. Issue #271 removed it and replaced it with
the `plain-english` output style in
[`project-init`](../project-init/library/output-styles/README.md).

Know the trade before proposing anything like it again, because #271 decided it
the opposite way from #258. A hook fires every turn and never goes stale. An
output style is delivered once at session start, so deep in a long session it is
the oldest instruction in the window. #258 shipped the hook for exactly that
reason. #271 chose the style anyway: one short file, no per-message cost, and
one place to change the voice.

That makes three per-message voice reminders this library has now removed,
counting `style-reminder` and `writing-guard` in August 2026. Voice is the
output style's job. Do not ship a fourth without the owner asking for it in his
own words.

## Test

```
node plugins/hooks-library/tests/no-ai-attribution-guard-harness.mjs
node plugins/hooks-library/tests/style-handshake.test.mjs
```

The attribution harness is 43 checks. A large share of them assert the hook does
**nothing**, and that weighting is deliberate. The hook fails in two directions
and only one is visible. Blocking a good command is obvious; staying silent when
it should have fired looks exactly like everything working.

The style-handshake tests run the hook as a subprocess with event JSON and
isolated temporary projects. They cover delivery on every message, the absence
of any acknowledgment text, a silent `PostToolUse`, silence when no style file
is found, an unreadable style file, settings precedence, and removal of the
`PostToolUse`, Stop, and confirm wiring. Live Claude sessions separately check that the reply starts with
the answer; script tests cannot establish model compliance.
