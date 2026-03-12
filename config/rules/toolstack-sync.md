## Toolstack and diagram synchronization

When adding, removing, or modifying any tool, skill, MCP server, plugin, agent, command, or external service in `my-toolstack.md`, you MUST also update the corresponding diagram data files in `diagrams/data/`:

- **`diagrams/data/architecture-data.js`** — add/remove/update node(s) in the `nodes` array and edge(s) in the `edges` array. Use the existing entries as a template for category, description, and connection structure.
- **`diagrams/data/lifecycle-data.js`** — if the tool is relevant to project initialization or the dev workflow, update the `toolMap` entries for the affected steps.
- **`diagrams/data/devloop-data.js`** — if the tool is relevant to the iterative dev cycle, update the `toolMap` entries for the affected steps.

`my-toolstack.md` is the source of truth. The diagrams must stay synchronized with it.
