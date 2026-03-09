## Document generation cleanup

When creating or updating documents (PDF, DOCX, PPTX, XLSX), delete any temporary/intermediate files (Python scripts, JavaScript files, unpacked directories, etc.) that were created as part of the generation process. Only keep the final output document.

## Screenshot workflow for UI projects

When initializing a new project that involves frontend/UI work, copy these files from the templates directory into the project root:

- `C:/Users/michael.rihm/.claude/templates/screenshot.mjs` → `./screenshot.mjs`
- `C:/Users/michael.rihm/.claude/templates/SCREENSHOT_WORKFLOW.md` → `./SCREENSHOT_WORKFLOW.md`

Use the screenshot script to capture localhost pages for visual review. See SCREENSHOT_WORKFLOW.md for the full workflow and verification checklist.
