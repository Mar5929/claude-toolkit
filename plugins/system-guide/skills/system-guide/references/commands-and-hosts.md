# Commands and hosts

Run the packaged CLI with Node. Resolve `<plugin-root>` from the installed
skill: its tool is at `../../tools/system-guide.mjs` relative to this skill
folder. Claude Code may use `${CLAUDE_PLUGIN_ROOT}`. Codex must use the actual
installed skill path exposed by the host and must not assume that Claude-only
environment variable exists.

```text
node <plugin-root>/tools/system-guide.mjs status --root <project-root> --json
node <plugin-root>/tools/system-guide.mjs setup --root <project-root> --source code:complete:src --source salesforce:partial:snapshots/metadata
node <plugin-root>/tools/system-guide.mjs setup --root <project-root> --guide-path engagement/knowledge-base --source salesforce:complete:snapshots/metadata --adopt
node <plugin-root>/tools/system-guide.mjs refresh --root <project-root>
node <plugin-root>/tools/system-guide.mjs refresh --root <project-root> --full
node <plugin-root>/tools/system-guide.mjs check --root <project-root>
node <plugin-root>/tools/system-guide.mjs propose --root <project-root> --request <request.json>
node <plugin-root>/tools/system-guide.mjs apply --root <project-root> --preview <preview-id> --approval <approval.json>
node <plugin-root>/tools/system-guide.mjs disable --root <project-root>
```

`--json` is available on every command. `--source` is repeatable and uses `kind:completeness:relative/path`, where kind is `code` or `salesforce` and completeness is `complete` or `partial`. `--guide-path` keeps an established guide in place. `--adopt` is required before setup uses an existing nonempty guide. Disabling stops active behavior and preserves guide content.

`complete` and `partial` describe the declared capture scope, not whether the
whole system is understood. Default refresh hashes every configured source,
reparses changed sources, and reuses the last successful model for unchanged
sources. `--full` reparses every configured source. Both render the same
deterministic output, preserve meaning byte for byte, and retain previously seen
facts when a source is declared partial. A partial snapshot is never treated as
proof that an unseen part was deleted. The command result identifies the mode
and parsed sources; the build record stays content-based so a no-op refresh does
not rewrite it.

The project configuration is `.system-guide.json`:

```json
{
  "version": 1,
  "enabled": true,
  "guidePath": "knowledge/system",
  "sources": [
    { "path": "src", "kind": "code", "completeness": "complete" }
  ]
}
```

Do not hand-edit generated pages. Setup and refresh read configured project sources; they do not change the documented system. Meaning writes go through preview and exact approval.

A create or update request is a project-relative JSON file shaped like this:

```json
{
  "action": "create",
  "destination": "fields/meaning/primary-advisor.md",
  "targetId": "salesforce:field:Household__c.Primary_Advisor__c",
  "content": "# Primary advisor\n\nThis field identifies the advisor who owns the household relationship.",
  "sourceRefs": [{ "path": "force-app/main/default/objects/Household__c/fields/Primary_Advisor__c.field-meta.xml" }],
  "uncertainty": "None stated",
  "reason": "The source name alone does not explain business ownership."
}
```

`sourceRefs` accepts three explicit source forms:

- A project-relative file string, or an object with `kind: "file"` and a
  project-relative `path`. The preview hashes it and apply refuses a changed or
  missing file.
- An owner statement with `kind: "owner-statement"`, `attributedTo`, an ISO
  `date`, and the exact `statement`. The tool records the caller's attribution;
  it does not claim independent verification.
- An external source with `kind: "external"`, an HTTP or HTTPS `url`, `title`,
  and optional ISO `capturedAt` date. The tool records the reference without
  claiming it verified the external page.

For deletion, use `action: "delete"`, omit `content`, explain the reason, and
include exact `linkRepairs` entries with `path`, `find`, and `replace` values
for inbound meaning links. The preview reports any unresolved links and cannot
be applied while they remain.

After the owner approves the rendered preview exactly, record that decision in
a project-relative file using the preview ID and hash returned by `propose`:

```json
{
  "version": 1,
  "decision": "approved",
  "previewId": "meaning-0123456789abcdef",
  "previewHash": "<hash from the unchanged preview>",
  "approvedBy": "Mike Rihm",
  "approvedAt": "2026-09-10"
}
```

## Host behavior

Claude Code discovers the plugin skill as `/system-guide:system-guide`. The native `SessionStart` hook performs only the cheap status inspection and adds one short guide pointer when configuration is enabled. It does not load the tour, area indexes, or sources. The hook emits nothing for missing or disabled configuration and fails open.

Codex discovers the same `system-guide` skill through `.codex-plugin/plugin.json`. Codex does not run the Claude hook. Project setup or sync must place a short root guidance pointer so Codex consults the discoverable skill and configured guide during relevant work.

When both System Guide and second brain are enabled, System Guide owns the one ON or needs-repair startup briefing. The second brain names System Guide only when its own startup runs and guide configuration is absent or disabled: `System Guide is not configured.` This keeps guide status from appearing twice.

## Smoke checks

Test four project states after setup or sync:

| State | Expected result |
| --- | --- |
| System Guide only | Claude gets one ON briefing; relevant prompts discover the skill; Codex follows root guidance and can invoke the skill |
| Both plugins | One ON briefing total; second-brain routing includes the guide |
| Second brain only | Its briefing says System Guide is not configured; no guide files are read or refreshed |
| Neither | No guide startup output or guide work |

Automatic model selection is probabilistic and cannot be guaranteed by deterministic tests. Smoke-test a fresh host session with a prompt such as `Which process writes this field, and what else could a change affect?` Confirm the agent opens the configured entry and relevant pages before a broad source search.
