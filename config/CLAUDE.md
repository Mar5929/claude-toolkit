## Document generation cleanup

When creating or updating documents (PDF, DOCX, PPTX, XLSX), delete any temporary/intermediate files (Python scripts, JavaScript files, unpacked directories, etc.) that were created as part of the generation process. Only keep the final output document.

## Screenshot workflow for UI projects

When initializing a new project that involves frontend/UI work, copy these files from the templates directory into the project root:

- `C:/Users/michael.rihm/.claude/templates/screenshot.mjs` → `./screenshot.mjs`
- `C:/Users/michael.rihm/.claude/templates/SCREENSHOT_WORKFLOW.md` → `./SCREENSHOT_WORKFLOW.md`

Use the screenshot script to capture localhost pages for visual review. See SCREENSHOT_WORKFLOW.md for the full workflow and verification checklist.

## UI framework and design preferences

- **CSS framework**: Always use Tailwind CSS for styling UI components.
- **Design skills**: Use the following skills for UI/frontend work:
  - `frontend-design` — Anthropic's official skill for creating distinctive, production-grade frontend interfaces
  - `ui-ux-pro-max` — Open source design intelligence skill from [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) providing 50+ UI styles, color palettes, font pairings, and UX guidelines
- **UI testing**: Use Playwright for browser-based UI testing and verification.

## Screenshot loop workflow for UI development

When developing larger UI features, agents must follow an iterative screenshot loop:

1. **Build** the UI component or page.
2. **Launch** the dev server (or confirm it's running).
3. **Screenshot** the result using `node screenshot.mjs http://localhost:<port> <label>`.
4. **Review** the screenshot by reading the PNG — visually inspect spacing, alignment, colors, typography, and overall quality.
5. **Iterate** — if the result doesn't meet the design standard, fix the issues and repeat from step 3.
6. **Done** — only move on when the screenshot passes visual inspection.

Use this for larger UI features unless explicitly asked to use this creenshot loop. change must be visually verified via screenshot before being considered complete. Do not rely solely on code review — actually look at the rendered output in the browser and iterate until it looks right.

## Toolstack and diagram synchronization

When adding, removing, or modifying any tool, skill, MCP server, plugin, agent, command, or external service in `my-toolstack.md`, you MUST also update the corresponding diagram data files in `diagrams/data/`:

- **`diagrams/data/architecture-data.js`** — add/remove/update node(s) in the `nodes` array and edge(s) in the `edges` array. Use the existing entries as a template for category, description, and connection structure.
- **`diagrams/data/lifecycle-data.js`** — if the tool is relevant to project initialization or the dev workflow, update the `toolMap` entries for the affected steps.
- **`diagrams/data/devloop-data.js`** — if the tool is relevant to the iterative dev cycle, update the `toolMap` entries for the affected steps.

`my-toolstack.md` is the source of truth. The diagrams must stay synchronized with it.
