## Google Calendar MCP — Best Practices

When using Google Calendar MCP tools (`mcp__claude_ai_Google_Calendar__*`), follow these guidelines.

### Event Creation

- Always confirm event details (time, attendees, description) with the user before creating events.
- Include a clear description/agenda in event bodies.
- Use `gcal_find_my_free_time` before suggesting meeting times to avoid conflicts.

### Event Management

- Use `gcal_list_events` to check for conflicts before proposing new events.
- When updating events that have other attendees, confirm with the user first — changes are visible to all participants.

### General

- Default to the user's primary calendar unless told otherwise — use `gcal_list_calendars` to check available calendars if needed.
- Use ISO 8601 format for all date/time values.
