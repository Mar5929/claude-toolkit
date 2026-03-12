## Playwright MCP — Best Practices

When using Playwright MCP tools (`mcp__plugin_playwright_playwright__*`), follow these guidelines.

### Screenshot Organization

- Store all screenshots in a `screenshots/` directory at the project root.
- Organize by work item: `screenshots/{work-item-id}/{description}-{timestamp}.png`
  - Example: `screenshots/RIH-42/login-form-initial-load-20260311-1430.png`
  - If no work item context exists, use `screenshots/adhoc/{description}-{timestamp}.png`
- Use descriptive, kebab-case filenames that capture what the screenshot shows.
- Never delete screenshots silently — they serve as visual evidence of QA and development progress.

### Screenshot Retention

- Keep all screenshots organized and linked to their originating work item or task.
- When a task or work item is complete, keep the screenshots in place — do not clean them up automatically.
- If asked to clean up, move to `screenshots/archive/` rather than deleting.

### Browser Best Practices

- Always wait for network idle or specific selectors before taking screenshots — avoid capturing loading states unless intentionally testing them.
- Use `browser_snapshot` to inspect page structure before interacting with elements.
- Prefer `browser_click` with descriptive selectors (text content, aria labels) over fragile CSS selectors.
- Use `browser_wait_for` before assertions to avoid flaky interactions.
- Close browser sessions (`browser_close`) when done to free resources.
- Set appropriate viewport sizes with `browser_resize` before capturing screenshots for consistency.

### Error Handling

- If a page fails to load, capture a screenshot of the error state and note it — don't silently retry.
- Log console errors using `browser_console_messages` when debugging unexpected behavior.
- Check `browser_network_requests` when diagnosing loading or API issues.
