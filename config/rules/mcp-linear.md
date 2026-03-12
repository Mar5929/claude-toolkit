## Linear MCP — Best Practices

When using Linear MCP tools (`mcp__claude_ai_Linear__*`), follow these guidelines.

### Issue Creation

- **Always assign issues to Michael Rihm** (user ID: `8d75f0a6-f848-41af-9f4b-d06036d6af82`) when creating new issues via `save_issue`.
- Use team **Rihm** (team ID: `dfe15bc4-6dd0-4bde-8609-6620efc3140d`, key: `RIH`) unless explicitly told otherwise.
- Write clear, actionable issue titles — lead with a verb (e.g., "Add validation to login form", "Fix timeout on dashboard load").
- Include enough context in the description for someone to pick up the issue without additional conversation.

### Issue Management

- Check for existing issues before creating duplicates — use `list_issues` or `search_documentation` to search first.
- Set appropriate priority when context makes it clear (urgent bugs = Urgent/High, enhancements = Medium/Low).
- Link related issues in descriptions when relevant.

### Labels and Organization

- Use existing labels rather than creating new ones unless there's a clear gap.
- Check available labels with `list_issue_labels` before assigning.

### Comments

- When adding comments to issues, keep them focused and actionable.
- Reference specific files, line numbers, or commits when commenting on technical issues.
