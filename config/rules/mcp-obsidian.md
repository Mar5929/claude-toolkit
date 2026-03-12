## Obsidian MCP — Best Practices

When using Obsidian MCP tools (`mcp__obsidian__*`), follow these guidelines.

### Note Organization

- Respect the existing vault folder structure — do not create top-level folders without asking.
- Use `list_directory` to understand the current structure before creating or moving notes.
- Place new notes in the most contextually appropriate existing folder.

### Writing Notes

- Use standard Markdown formatting consistent with the vault's existing style.
- Add frontmatter (YAML) with relevant metadata when creating new notes — check existing notes with `get_frontmatter` for the vault's conventions.
- Use `[[wikilinks]]` for internal references to other notes in the vault.

### Tags and Metadata

- Check existing tags with `manage_tags` before creating new ones to avoid duplicates or inconsistencies.
- Use `update_frontmatter` to add metadata rather than manually editing YAML blocks.

### Reading and Searching

- Use `search_notes` to find related content before creating potentially duplicate notes.
- Use `read_multiple_notes` when you need context from several related notes at once.
