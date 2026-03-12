## Notion MCP — Best Practices

When using Notion MCP tools (`mcp__claude_ai_Notion__*`), follow these guidelines.

### Page and Database Operations

- Use `notion-search` to find existing pages and databases before creating new ones — avoid duplicates.
- Respect the existing workspace hierarchy — use `notion-fetch` to understand structure before adding content.
- When creating pages, place them in the contextually appropriate parent page or database.

### Content Formatting

- Use Notion's block-based formatting — headings, toggles, callouts, and dividers for readability.
- Keep pages focused on a single topic or purpose.

### Comments and Collaboration

- Use `notion-create-comment` for inline feedback rather than editing page content directly when reviewing.
- Check existing comments with `notion-get-comments` to avoid duplicate feedback.

### Data Integrity

- When updating pages, use `notion-update-page` for property changes — avoid overwriting content unintentionally.
- Use `notion-fetch` to read the current state before making updates.
