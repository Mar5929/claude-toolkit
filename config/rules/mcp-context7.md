## Context7 MCP — Best Practices

When using Context7 tools (`mcp__plugin_context7_context7__*` or `mcp__claude_ai_Context7__*`), follow these guidelines.

### Documentation Lookups

- Use `resolve-library-id` first to get the correct library identifier before querying docs.
- Be specific with `query-docs` queries — narrow questions return more useful results than broad ones.
- Prefer Context7 over web searches for library/framework documentation — it returns structured, up-to-date content.

### When to Use

- Look up current API signatures, configuration options, or usage patterns for any library or framework.
- Verify that code examples match the latest version of a library before recommending them.
- Use when the user asks about a specific library feature and you want to confirm your knowledge is current.
