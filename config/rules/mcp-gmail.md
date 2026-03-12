## Gmail MCP — Best Practices

When using Gmail MCP tools (`mcp__claude_ai_Gmail__*`), follow these guidelines.

### Drafts Over Sends

- **Always create drafts** (`gmail_create_draft`) rather than sending directly — let the user review and send manually.
- Never assume an email should be sent without explicit confirmation.

### Reading and Searching

- Use `gmail_search_messages` with specific queries to find relevant threads — avoid broad searches that return excessive results.
- When reading threads, use `gmail_read_thread` to get full context rather than reading individual messages in isolation.

### Composing

- Keep email drafts professional and concise.
- Match the tone and formality of the existing thread when replying.
- Include relevant context or references when drafting replies to technical discussions.
