## Draw.io MCP — Best Practices

When using the Draw.io MCP tool (`mcp__drawio__create_diagram`), follow these guidelines.

### Diagram Standards

- Use clear, descriptive titles for all diagrams.
- Follow consistent color coding across diagrams in the same project.
- Include a legend when using color or shape coding to distinguish categories.
- Use standard shapes for their conventional meaning (e.g., diamonds for decisions, cylinders for databases).

### File Organization

- Save diagrams in a `diagrams/` directory at the project root.
- Use descriptive, kebab-case filenames (e.g., `system-architecture.drawio`, `auth-flow.drawio`).
- When exporting to PNG/SVG/PDF, embed the XML source so the diagram remains editable.

### Content Guidelines

- Keep diagrams focused — one concept per diagram rather than cramming everything into one.
- Label all connections/edges with the relationship or data flow.
- Group related nodes visually using containers or color coding.
