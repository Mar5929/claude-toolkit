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

### explain-simply-reminder

A `UserPromptSubmit` hook, with no matcher, that fires on every message the
owner sends. It asks for the answer to be written as if the reader is five years
old: plain everyday words, short, in bullet points, and simplifying the wording
without ever simplifying the facts.

`hooks/explain-simply-reminder.mjs` is the whole thing. The reminder is a fixed
six-line string inside the script. It reads no other file, resolves no settings,
and has no config file, so it behaves the same in a project that installed
nothing else from the toolkit. It is deliberately not paired with the
`explain-simply` skill in `session-skills`: that skill re-explains one answer on
request, this covers every answer, and neither needs the other installed.

It fires every turn, with no per-session throttle. That is the point. The
failure it exists for is an instruction going stale deep in a long session, and
a throttle would put that failure straight back.

It is a reminder, not a check. It reads nothing the agent wrote and blocks
nothing. It cannot catch a complicated answer, only make one less likely. It
fails open: any unexpected error exits 0 with nothing written.

**It is the one named exception to what a hook is for.** The top-level
`README.md` says a hook does one of three jobs, and re-stating an instruction is
not among them. This does exactly that, on purpose, with the owner's decision
behind it.

Know the history before changing it or asking for more like it. The toolkit
shipped a hook of this shape once. `style-reminder` resolved the project's
active output style and re-sent the whole style file, up to 4000 characters, on
every message; the owner removed it in August 2026 as per-message overhead, and
`writing-guard` went with it. The difference that made this one worth shipping
anyway is size: a fixed six lines, roughly 90 tokens, against thousands. That is
the reasoning the owner accepted, and it is the reasoning to re-test before this
grows. A reminder here that starts reading files or restating a whole style has
turned back into the hook that was already deleted once.

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

`explain-simply-reminder` needs nothing else installed, and shipping it turns it
on nowhere. It changes the voice of every answer in whichever project takes it,
so it is offered and never applied by default.

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

## Test

```
node plugins/hooks-library/tests/no-ai-attribution-guard-harness.mjs
```

43 checks. A large share of them assert the hook does **nothing**, and that
weighting is deliberate. The hook fails in two directions and only one is
visible. Blocking a good command is obvious; staying silent when it should have
fired looks exactly like everything working.
