## Document generation cleanup

When creating or updating documents (PDF, DOCX, PPTX, XLSX), delete any temporary/intermediate files (Python scripts, JavaScript files, unpacked directories, etc.) that were created as part of the generation process. Only keep the final output document.

## Rules

Domain-specific instructions (UI development, toolstack sync, etc.) live in `~/.claude/rules/`. Claude Code loads these automatically — see that directory for the full set.
