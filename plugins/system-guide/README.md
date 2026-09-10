# system-guide plugin

An optional project reference that explains important existing parts, purposes,
and connections from real source evidence. It gives future sessions a short way
into the system without turning every source file into prose.

The normal guide lives at `knowledge/system/`. An established guide can stay at
another configured project-relative path. Generated evidence and indexes refresh
from configured sources; owner-approved meaning stays separate and survives a
rebuild.

## Install and choose per project

```text
/plugin install system-guide
```

Installing makes the capability available. A project is on only after its owner
chooses System Guide during `project-init` or `project-sync`, which creates an
enabled `.system-guide.json`. Missing configuration or `enabled: false` means
off and creates no guide work.

Direct setup is also available. These examples run from this toolkit checkout;
from an installed copy, replace the script path with its absolute path under the
installed System Guide plugin:

```text
node plugins/system-guide/tools/system-guide.mjs setup --root <project-root> --source code:complete:src
node plugins/system-guide/tools/system-guide.mjs status --root <project-root> --json
node plugins/system-guide/tools/system-guide.mjs check --root <project-root>
```

Use a repeatable `--source kind:completeness:relative/path` for each real source.
Kinds are `code` and `salesforce`; completeness is `complete` or `partial`. Use
`--guide-path <relative-path> --adopt` to keep an existing nonempty guide where
it already lives. Full CLI usage is in
`skills/system-guide/references/commands-and-hosts.md`.

## One-screen preview

Claude Code gets one short startup pointer when the guide is enabled. It names
the entry path, coverage state, and latest successful refresh without loading
the guide or scanning sources. During ordinary work the main skill opens only
the relevant pages, proposes useful investigation findings, and raises exact
owner corrections. It never treats reading, recognition, or a refresh as
permission to change meaning.

See `skills/system-guide/references/one-screen-preview.md` for worked examples.

## Independent and combined operation

| Project choice | Startup and routing |
| --- | --- |
| System Guide only | The plugin owns one ON or needs-repair Claude briefing and its skill supplies lookup, refresh, and approval rules. |
| System Guide and second brain | System Guide still owns the one ON briefing. The second brain adds its find order and routes system explanations here without repeating guide status. |
| Second brain only | The second brain says `System Guide is not configured.` It does not read or refresh missing guide files. |
| Neither | No System Guide startup or upkeep runs. |

Claude Code discovers `/system-guide:system-guide` and runs the native
`SessionStart` hook. Codex discovers the same skill from the Codex manifest;
Codex does not run Claude hooks, so project setup or sync supplies the root
guidance that routes relevant work to the skill and configured guide.

## What ships

- `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json`: host manifests.
- `skills/system-guide/SKILL.md`: task-aware entry point for lookup and upkeep.
- `skills/system-guide/references/`: routing, source authority, meaning,
  commands, host behavior, and examples.
- `hooks/hooks.json` and `hooks/system-guide-session-start.mjs`: one cheap,
  fail-open Claude startup briefing with no source scan or writes.
- `tools/`: inspection, setup, refresh, validation, preview, approval, and
  disable operations shared by the skill and integrations.
- `tests/core.test.mjs`: core setup, refresh, safety, and approval checks.
- `../../tests/experience-system-guide.test.mjs`: startup and host-experience
  checks.
- `../../tests/system-guide-integration.test.mjs`: setup and second-brain
  integration checks.

## Maintaining this plugin

A content change updates both manifests and marketplace metadata together.
Validate the plugin, its skill, focused System Guide tests, and the repository's
four checks before opening a pull request. Deterministic tests prove routing,
startup scope, and write boundaries; fresh-session smoke tests cover automatic
model invocation because a model's skill selection is not deterministic.
