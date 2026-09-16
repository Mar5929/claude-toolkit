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

One script, `hooks/style-handshake.mjs`, registered on two events and also run
as a command. The `Stop` half holds the turn open until two things have happened
in that turn: the agent opened the project's output style file with the `Read`
tool, and the agent ran the confirm command. The `PostToolUse` half, matched on
`Read`, records the first by writing an empty `<key>.read` file when the file
read is the output style. The confirm command records the second by writing an
empty `<key>.ok` file.

**The check is a command, and nothing appears in the reply.** The confirm
command is the third mode of the same script:

```
node <project>/.claude/hooks/style-handshake.mjs confirm <key>
```

`<key>` is the turn key, built from the session id and the prompt id. The block
reason hands the agent the whole command, path and key included, so there is
nothing to compose. A key holding any character outside `[a-zA-Z0-9_-]` is
ignored and writes nothing.

Until 2026-09-16 the turn ended only when the final message ended with one of
two exact lines. The owner asked for the silent form that day, because the line
was noise in every long answer.

**The confirm command needs a permission rule.** In `.claude/settings.json`,
`permissions.allow` holds one entry:

```
Bash(node .claude/hooks/style-handshake.mjs confirm *)
```

The command the hook asks for uses that same relative path, so the rule matches
in every checkout and worktree. Claude Code does not substitute
`${CLAUDE_PROJECT_DIR}` inside a permission rule, and an allow rule whose `*`
comes before the rest of the command prints a warning at every session start,
so neither of those forms is used. Without the entry the command still runs,
after the owner approves it once per turn.

**It is a handshake, not a detector.** It reads nothing in the reply and judges
no writing. It has no list of banned words, no em dash check, no sentence length
limit. It checks two mechanical facts, the read and the confirm, and the
comparison itself happens in the agent's head, which is the only place that can
compare a reply against a style. A detector can only catch the patterns someone
thought to list. This makes the agent look at the style file and answer for the
reply.

Running the confirm command without reading the file does not pass, and reading
the file without running the command does not pass. Both files are keyed to one
session and one prompt, so a read from an earlier turn does not carry forward.

**Short replies skip it.** A final message under `STYLE_HANDSHAKE_MIN_CHARS`
characters, 120 by default, ends the turn untouched. Checking a one-line answer
costs more than the check is worth.

**It gives up after three blocks for the same prompt.** Claude Code ends a turn
itself after 8 consecutive stop-hook continuations, and reaching that cap spends
eight model turns on a handshake. The fourth time this hook would block the same
prompt, it reports one line to the owner and lets the turn end. A counter file
next to the two marker files, in the OS temp folder, is how it counts. All three
kinds of file are deleted after 24 hours.

**Why this is not a fourth voice reminder.** The three removed below all fired
on every message and carried the style text themselves. This one carries no
style text, fires once at the end of a turn, and stays silent on short replies
and on any turn where the handshake already happened. The owner asked for it in
his own words: "a hook that is like a handshake that forces you to read the
output style, check your reply, say yes I read it, and then come back to the
hook and say either it matches or I am going to update it."

It is registered per project in `.claude/settings.json`, and this repository runs
it on itself. The `Stop` entry has no matcher. The `PostToolUse` entry uses the
`Read` matcher with `"if": "Read(.claude/output-styles/*)"`, and the script
filters again on the file path, so the hook still works where the `if` field is
not honored. The style file it looks for comes from the `outputStyle` value in
the project's own `.claude/settings.json`, lowercased and hyphenated, and falls
back to `plain-english.md`.

It fails open. Any unexpected error exits 0 with no output, and the turn ends.

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

The style-handshake tests are 43 checks, split the same way. They run the script
as Claude Code runs it, with the event JSON on stdin and a temp folder in
`STYLE_HANDSHAKE_STATE_DIR`, so a run never touches the marker files of a live
session.
