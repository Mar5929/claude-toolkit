# Production Data Changes: Hand Over a File

- No agent writes data to production. Not by CLI, API, anonymous Apex, or any wrapping tool. The owner runs it.
- Sandbox data writes and anonymous Apex need the owner's yes in the same chat.
- Reads (SOQL, export, describe) are allowed in every org.
- A yes covers one change, in the chat where it was given. It does not carry to the next change, session, or org.
- Never commit a load or backup file. It holds record IDs and PII.
- When production data must change, open the `sf-data-change` skill (`.claude/skills/sf-data-change/SKILL.md`) before replying. It produces the load file, the backup file, numbered load steps, the success check, and the undo steps.
- "You'll need to update those records" is not a handoff. The owner must get the exact file and the exact steps.
