# Retired V1 Memory Rule

Do not add this rule to a new project. It exists only so `project-sync` can
recognize and remove or replace an older v1 rule.

Second-brain v1 is retired. Do not call its reads or writes, dispatch a curator,
append or drain its journal, flush its outbox, or use its content as current
truth.

Use `project-sync` to report the exact local integration surface. With owner
approval, deactivate its MCP connections and automatic hooks first, then
optionally remove specifically approved committed files. Do not open token
files, contact the Worker or Neon, import v1 content into v2, or delete cloud
resources.

V2 is not shipped. Until it is, use the project's existing authoritative Git
documents and normal handoff process.
