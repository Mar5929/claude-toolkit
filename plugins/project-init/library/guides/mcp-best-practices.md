# MCP tool rules (per server)

How to use specific MCP servers well. These are **conditional**: fold a server's
section into a project's CLAUDE.md only if the project actually connects that MCP
server. Skip the rest. Adapt the wording to the project's voice; the intent is
what matters, not the exact prose.

If a project uses an MCP server not covered here, that's fine: these are the ones
the owner has settled rules for so far. Add new sections as new servers earn
standing rules.

---

## Context7 (docs lookups)

Tools: `*context7*resolve-library-id`, `*context7*query-docs`.

- Call `resolve-library-id` first to get the right library identifier, then
  `query-docs`.
- Keep queries narrow. Specific questions return more useful results than broad
  ones.
- Prefer Context7 over a web search for library, framework, SDK, or CLI docs: it
  returns structured, current content. Use it even for well-known libraries;
  training data may be out of date.
- Use it to check current API signatures, config options, and usage patterns, and
  to confirm an example matches the library's latest version before recommending
  it.
- Don't use it for refactoring, writing scripts from scratch, debugging business
  logic, or general programming concepts.

## Gmail

Tools: `*Gmail*`.

- **Draft, never send.** Create drafts (`create_draft`) and let the owner review
  and send. Never send directly, and never assume an email should go out without
  explicit confirmation.
- Search with specific queries (`search_threads`); avoid broad searches that
  return too much.
- Read full threads (`get_thread`) for context rather than single messages in
  isolation.
- Keep drafts professional and concise, and match the tone and formality of the
  existing thread when replying.

## Google Calendar

Tools: `*Google_Calendar*`.

- Confirm event details (time, attendees, description) with the owner before
  creating an event.
- Check for conflicts before proposing a time: use the free-time / suggest-time
  tool, and list events on the relevant day first.
- Give every event a clear description or agenda in the body.
- When changing an event that has other attendees, confirm first: the change is
  visible to all of them.
- Default to the primary calendar unless told otherwise. Use ISO 8601 for all
  date-times.

## Linear

Tools: `*Linear*`.

- Search before creating so you don't duplicate an existing issue
  (`list_issues` / `search_documentation`).
- Write actionable titles that lead with a verb ("Add validation to login form",
  "Fix timeout on dashboard load").
- Put enough context in the description that someone can pick the issue up
  without more conversation.
- Set priority when the context makes it clear (urgent bugs high, enhancements
  lower).
- Prefer existing labels; check available labels before assigning, and only make
  a new one for a real gap.
- Keep comments focused and actionable; reference specific files, lines, or
  commits on technical issues.

> Per-project defaults (assignee, team, default labels) belong in the project's
> own CLAUDE.md, not here. This section is the general etiquette.

## Notion

Tools: `*Notion*`.

- Search before creating (`notion-search`) so you don't duplicate a page or
  database.
- Respect the existing hierarchy: fetch the parent (`notion-fetch`) to understand
  structure before adding content, and place new pages in the right parent.
- Use block-based formatting (headings, toggles, callouts, dividers) for
  readability; keep a page focused on one topic.
- For review feedback, prefer inline comments (`notion-create-comment`) over
  editing the page body; check existing comments first to avoid duplicates.
- Read current state (`notion-fetch`) before updating, and use targeted property
  updates so you don't overwrite content by accident.

## Playwright

Tools: `*playwright*`.

- **Screenshots:** store under `screenshots/`, organized by work item
  (`screenshots/{work-item}/{description}-{timestamp}.png`; use
  `screenshots/adhoc/...` when there's no work item). Use descriptive,
  kebab-case names. Never delete screenshots silently; if asked to clean up, move
  them to `screenshots/archive/` instead of deleting.
- **Before interacting:** take a snapshot (`browser_snapshot`) to read page
  structure. Prefer selectors by visible text or aria label over fragile CSS.
- **Timing:** wait for network idle or a specific selector (`browser_wait_for`)
  before screenshots and assertions, so you don't capture loading states or hit
  flaky interactions. Set a consistent viewport (`browser_resize`) before
  capturing.
- **Errors:** if a page fails to load, screenshot the error state and note it;
  don't silently retry. Check console messages and network requests when
  debugging.
- Close the browser (`browser_close`) when done to free resources.
