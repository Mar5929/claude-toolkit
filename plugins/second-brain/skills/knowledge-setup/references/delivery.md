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

Use the existing `toolkit-session-start.mjs` route and Knowledge
`knowledge-session-start.mjs` component. It delivers a bounded instruction to
read the complete Toolkit manual, followed by SOUL, project and the complete
Knowledge manual in that order; then current work, relevant inbox and indexes.
Read files in untruncated chunks when necessary. A path listing or successful
reader process is not proof that all contents reached the agent. Restore missing
or changed guidance on resume, clear, compact and supported fork events without
repeating the ordinary startup greeting.

Claude Code uses its documented SessionStart/UserPromptSubmit/Stop events.
Codex uses only the events verified in the effective host. Both use the same
manual, prompt criteria and file contracts. Keep the root fallback route for
disabled/unavailable hooks. Do not infer desktop support from the CLI version.
Hooks guide and check narrow observable outcomes; they do not universally block
all tools or prove meaning. A Stop review must not loop or wait for independent
save helpers. Required prompt intent and quiet end-turn review remain distinct.

Inspect effective native-memory behavior on each host. Name any competing store
and its effect on source/approval/sharing. Preserve user settings and content;
no silent disable, import, deletion or account/authentication changes. Resolve
actual conflicting policy before calling that surface fully equipped.

## Verification report

State source version, installed-copy consistency and configured registrations;
then separately list deterministic file/Git checks, actual agent behavior, CLI
proof, desktop proof and unavailable targets. Test new and migrated projects,
complete reads/tail content, missing files, recovery, an approved interrupted
save and a withheld proposal. A receipt is evidence of the declared step, not
truth, consent or understanding. A limitation disclosure does not turn a failing
requirement into a passing one.

An installation with missing procedures, incompatible files or failing checks
is partial. Repair the affected part under existing scope; retain knowledge and
pending authority. Roll back only managed code/configuration and route changes
that belong to this installation, preserve post-install owner edits, and rebuild
indexes with compatible tools. Never reset a shared checkout.

## Concrete runtime registration

Copy these six `.mjs` files together from `hooks/` into `.claude/hooks/`:
`knowledge-session-start`, `memory-reminder`, `knowledge-completion`,
`save-reminder`, `work-item-close`, and `command-parsing`. The modules import one
another; copying only the entry file is incomplete.

Merge command handlers into existing host configuration; never replace it.
Claude commands use `node "$CLAUDE_PROJECT_DIR/.claude/hooks/<file>.mjs"`.
Register `knowledge-session-start` under SessionStart for startup, resume,
clear and compact, and a fork event only where the host emits it. Register
`memory-reminder` under UserPromptSubmit and `knowledge-completion` under Stop,
each once with a 10-second timeout. The startup handler may use 15 seconds.
Preserve project-init's distinct Toolkit orientation handler. Register the
existing save/work-item reminders under PreToolUse with Bash matcher on Claude;
map only actual supported Codex shell/tool events after testing them.

For a Git-backed Codex project, the POSIX command can locate the script with
`node "$(git rev-parse --show-toplevel)/.claude/hooks/<file>.mjs"`. For Windows,
use the host's commandWindows field with a PowerShell local root variable,
check git's exit code, use Set-Location -LiteralPath, then invoke Node with the
relative script path. Non-Git projects need their verified project-root route;
never assume Git is available merely because a template used it. Check settings
schema and effective event delivery on the installed host. A configured event
that never runs is an unresolved support gap, with the root/manual fallback
still required.

The prompt handler supplies the session/agent identity and current review
UUID. After actual review, call the installed completion module with
`review ROOT SESSION AGENT GENERATION OUTCOME` as positional arguments. Allowed
outcomes are no-change, pending-approval, save-unfinished and saved. The Stop
handler requests at most one continuation if no outcome was recorded. Explicit
old-generation/helper receipts cannot complete another turn's review. Native
Stop events have no validated turn-generation field in this implementation:
out-of-order late Stop delivery is not proven isolated and must remain a host
acceptance gap until a real event correlation or ordering guarantee is verified.
No receipt proves meaning, permission, publication or successful helper work.
