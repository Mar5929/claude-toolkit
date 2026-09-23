# Deliver the complete package

Use the project's normal implementation/publication workflow and existing setup
record. No new database, setup tracker or standing save permission is created.
The second-brain plugin supplies knowledge; project-init owns Toolkit orientation.

## New or updated project

1. Confirm project opt-in or existing update authorization and inspect the current
   worktree, owner edits, tracker and optional components. Identify the installed
   plugin source/version and actual runtime copies. Check effective host settings
   and trust; preserve existing hooks and unrelated configuration.
2. Place the marked core manual at `knowledge/knowledge-manual.md` as an exact
   managed copy. Resolve an unmarked collision or customized policy before replacing
   it. Project-init supplies `knowledge/toolkit-manual.md` and its shared startup
   route. Author SOUL/project from actual project facts; never copy another
   project's content or leave template questions as facts.
3. Create only missing project records from the current/inbox/glossary/feedback
   templates. Fill actual known current work and dates, with None/unknown where
   appropriate. Do not create a tracker item merely to populate a field.
   Memory topics live under `knowledge/memory/memory-entries/`; current work is
   `knowledge/memory/current.md`; PRD index is `knowledge/prds/prd-index.md`;
   unchecked brainstorms live at root `brainstorms/`.
4. Deliver all four skills through the host's plugin skill discovery. Check actual
   names `second-brain:knowledge-find`, `knowledge-save`, `knowledge-review`, and
   `knowledge-setup` (host rendering may show a different namespace). If unavailable,
   use verified source paths from that installation, or authorized project-local
   skill copies preserving reference/script layout. Do not assume a plugin cache
   path on another machine. Remove only obsolete managed duplicate skill copies.
5. Copy the plugin's tools into `.claude/tools/`: frontmatter, build-knowledge-index,
   check-knowledge and inspect-knowledge-save. Copy its hooks with imports together.
   Install the coordinated startup, prompt and bounded completion routes described
   below. Keep one registration for each responsibility, preserving unrelated hooks.
6. Rebuild the three indexes from source files. External topic README files require
   their own capture metadata; do not rewrite captured pages. Check the whole
   equipped project and inspect actual read-back, links and generated indexes.
7. Record the actual package version and support results in the existing sync
   record. Run real fresh/resumed sessions where available. A missing supported
   surface or failed outcome remains unresolved; name its effect and next action.

## Host routes and limits

Use the existing `toolkit-session-start.mjs` route and the Knowledge
`knowledge-session-start.mjs` component. The Knowledge hook lists three startup
reads, in order: `SOUL.md`, `knowledge/project.md`, `knowledge/memory/current.md`.
It asks the agent to check `knowledge/memory-inbox.md` for unfinished saves. The
manuals and indexes are not startup reads: the `knowledge-*` skills open them
when a task needs them. The hook asks for no acknowledgment. A path listing is
not proof that the contents reached the agent. The same route runs on resume,
clear, compact and supported fork events.

Claude Code uses its documented SessionStart/UserPromptSubmit/Stop events.
Codex uses only the events verified in the effective host. Both use the same
manual, prompt criteria and file contracts. Keep the root fallback route for
disabled/unavailable hooks. Do not infer desktop support from the CLI version.
Hooks guide and check narrow observable outcomes; they do not universally block
all tools or prove meaning. A Stop review must not loop or wait for independent
save helpers. The prompt reminder asks for no spoken intent; the end-of-turn
review stays quiet.

Inspect effective native-memory behavior on each host. Name any competing store
and its effect on source/approval/sharing. Preserve user settings and content;
no silent disable, import, deletion or account/authentication changes. Resolve
actual conflicting policy before calling that surface fully equipped.

## Verification report

State source version, installed-copy consistency and configured registrations;
then separately list deterministic file/Git checks, actual agent behavior, CLI
proof, desktop proof and unavailable targets. Test new and migrated projects,
the three startup reads, missing files, recovery, an approved interrupted
save and a withheld proposal. A receipt is evidence of the declared step, not
truth, consent or understanding. A limitation disclosure does not turn a failing
requirement into a passing one.

An installation with missing procedures, incompatible files or failing checks
is partial. Repair the affected part under existing scope; retain knowledge and
pending authority. Roll back only managed code/configuration and route changes
that belong to this installation, preserve post-install owner edits, and rebuild
indexes with compatible tools. Never reset a shared checkout.

## Concrete runtime registration

Copy these seven `.mjs` files together from `hooks/` into `.claude/hooks/`:
`knowledge-session-start`, `knowledge-manual`, `memory-reminder`, `knowledge-completion`,
`save-reminder`, `work-item-close`, and `command-parsing`. The modules import one
another; copying only the entry file is incomplete.

Merge command handlers into existing host configuration; never replace it.
Claude commands use `node "$CLAUDE_PROJECT_DIR/.claude/hooks/<file>.mjs"`.
Register `knowledge-session-start` under SessionStart for startup, resume,
clear and compact, and a fork event only where the host emits it. Register
`memory-reminder` under UserPromptSubmit and `knowledge-completion` under Stop,
each once with a 10-second timeout. The startup handler may use 15 seconds.
Preserve project-init's distinct Toolkit orientation handler. Register the
existing save/work-item reminders under PreToolUse with the existing Bash
matcher on Claude. In Codex, place both command handlers in one PreToolUse group
with the exact matcher `^Bash$`. The POSIX commands are
`node "$(git rev-parse --show-toplevel)/.claude/hooks/save-reminder.mjs"` and
`node "$(git rev-parse --show-toplevel)/.claude/hooks/work-item-close.mjs"`.
The Windows commands explicitly launch `powershell.exe -NoProfile -Command`,
assign `git rev-parse --show-toplevel` to a local `$knowledgeRoot`, exit when Git
fails, and invoke `node (Join-Path $knowledgeRoot '.claude/hooks/<file>.mjs')`
with the corresponding file name.
Merge this group into the existing configuration and preserve every unrelated
event, group and handler.

For a Git-backed Codex project, the POSIX command can locate the script with
`node "$(git rev-parse --show-toplevel)/.claude/hooks/<file>.mjs"`. For Windows,
use the host's commandWindows field to launch PowerShell explicitly, set a local
root variable, check git's exit code, then invoke Node with the script path
built by `Join-Path` from that root. Non-Git projects need their verified project-root route;
never assume Git is available merely because a template used it. Review the
exact project-layer hook definitions in Codex `/hooks` and use the host's normal
trust flow. Never grant trust, change authentication, or use a bypass as part of
setup. Configured, trusted and active are separate results. Check settings schema
and effective event delivery on the installed host. A configured event that
never runs is an unresolved support gap, with the root/manual fallback still
required.

Assumption from a rolling-document claim, not verified on the installed host:
Codex runs multiple command hooks concurrently. The evidence is in the
claude-toolkit repository at
`docs/designs/269-knowledge-system/host-capability-evidence.md`, line 76; an
installed project does not carry that file. Both action hooks therefore perform
the same mixed-action precheck before either records a held action. A command
that combines pull-request creation with a close or merge is denied by both
handlers and must be split into separate actions. Two concurrent writes to the
held list can lose one entry, which causes one extra hold and never a silent
allow, so the list takes no lock.

Each action hook holds a recognized action once. The denial names the exact
action: the `gh pr create` branch and short HEAD, or the close and merge command
segments. The agent reviews what that action needs saved and runs the same
command again. There is no nonce, no permit and no command to run to earn the
retry. Both hooks share one list of the action keys already held, kept by
`command-parsing.mjs` in one JSON file per session and agent in the operating
system's temporary folder, outside the repository. The folder is created with
mode 0700 and the file with mode 0600, and the file name is a SHA-256 hash of
the session and agent identity, so two session ids that differ only in
punctuation never share a list. That file holds no knowledge, permission or
save state. A pull-request-create key is the project root, branch and HEAD; a
close or merge key is the project root and the ordered command segments, so the
two hooks never claim each other's actions. An unreadable or corrupt list counts
as empty, so the action is held again and the file is rewritten.

Each hook reads the list, writes the denial, and only then records the key. A
recording that fails leaves the denial standing for that attempt and holds the
same action again on the next attempt, until the list can be written. The folder
is created during the read, so a temporary folder that cannot be used reaches
the fail-open path before any denial is written.

Known limits of the action hold:

- The hold proves that the agent was told to review, never that it reviewed. An
  agent can retry without reviewing, and a general turn review or no review at
  all satisfies the hold. The owner accepted that cost.
- A held action stays allowed for the rest of that session, through later
  prompts. A pull-request create is held again when that repository's HEAD
  changes. A close or merge is held again only when its command segments change,
  so a new commit does not hold it again.
- An action reached through a command that starts with `cd /other/repo` is bound
  to that other repository, and the hold covers it there.
- Only Bash command segments beginning `gh pr create`, `gh issue close` or
  `gh pr merge` are recognized, so `bash -c "..."`, a full path to gh,
  `gh pr close`, `gh api` and non-Bash tool routes pass.
- A command run outside a Git repository is always allowed.
- The two older raw-PowerShell Codex handlers (UserPromptSubmit
  `memory-reminder` and Stop `knowledge-completion`) do not run under cmd.exe,
  so on that host the turn review has no prompt reminder and no Stop check. The
  action hold does not depend on either handler and still runs.
- A host that sends no session id is not held at all. Without one the hook
  cannot tell a retry from a first attempt, so it allows the command, writes no
  file and shares no list with another session.
- One small hold file per session and agent accumulates in the temporary folder.
  Nothing prunes them.
- A held list that cannot be written does not release the action. The denial is
  already written, so that attempt stays denied and the same action is held
  again on the next attempt, until the list can be written.
- Enforcement is otherwise fail-open: an unexpected error before the denial,
  including a temporary folder that cannot be used, allows the command. A list
  that cannot be read holds the action again rather than allowing it silently.
- Nothing here is proven on native Windows.

The prompt handler supplies the session/agent identity, the current review
UUID, and a normalized nonempty Codex `turn_id` when the host provides one.
After actual turn review, call the installed completion module with
`review ROOT SESSION AGENT GENERATION OUTCOME`, five positional arguments after
`review`. Allowed outcomes are no-change, pending-approval, save-unfinished and
saved. The Stop handler requests at most one continuation
if no outcome was recorded. Explicit old-generation/helper receipts cannot
complete another turn's review. A held review-state lock denies a turn review
and names its file; nothing removes it by age. The action hold does not use that
lock. Native
Codex Stop handling compares nonempty stored and incoming `turn_id` values
before outcome or continuation handling. A mismatch is ignored without changing
the current review state; a match keeps the generation receipt and one-
continuation behavior. If either identifier is absent, compatibility mode keeps
the earlier flow but cannot isolate a late Stop. This correlation is observed
only for Codex CLI 0.154 main-thread events on macOS. Claude Stop identifiers,
Desktop hosts, Windows, subagents, actual reordered delivery and general ordering
guarantees remain unverified acceptance gaps.
No receipt proves meaning, permission, publication or successful helper work.
