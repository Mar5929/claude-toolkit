---
name: grill-me
description: Interview the user relentlessly about a plan, design, or topic while checkpointing every answer to a brainstorm file so nothing is lost. Use when the user wants to stress-test a plan, get grilled on a design, run a brainstorm or discovery session, extract what is in their head into a durable document, or says "grill me".
---

# Grill Me

Interview the user until the topic is understood, every important branch has
been explored, and the result is preserved in an organized Markdown file.
Resolve upstream decisions before asking about anything that depends on them.

## Treat the capture file as the source of truth

Long interviews fill the context window. Never rely on conversation context as
the only record. Checkpoint every answer to disk before asking the next
question, so a context reset or interrupted session can resume from the file.

If the session resumes after an interruption, read the capture file before
continuing.

## Set up before asking the first question

1. Create `brainstorms/` in the current project if it does not exist.
2. Get today's date from the environment, such as with `date +%F`.
3. Create `brainstorms/{YYYY-MM-DD}-{topic-slug}.md`. If that path already
   contains notes for the same topic, read and continue it instead of
   overwriting it. Use a short, filesystem-safe topic slug.
4. Add the title, date, one-line session goal, an empty running summary, an
   empty Q&A log, and an empty open-flags section.
5. Tell the user where the notes are being saved in one line, then ask Q1.

Use this structure:

```markdown
# {Topic}: Brainstorm / Discovery Notes

Date: {date}
Goal: {one line}

## Summary / key decisions

{Running synthesis}

## Q&A log

### Q1: {topic}

- Asked: {question}
- Captured: {facts and decisions, preserving exact wording when it matters}
- Flags: {open item -> owner, or "None"}

## Open flags (pending input)

- {item} -> {owner}
```

## Checkpoint every answer

After every user answer, and before asking another question:

1. Add one structured Q&A entry with the question, key facts, decisions, and
   wording that matters.
2. Add unresolved items to `Open flags`, including who can answer them.
3. Update the running summary and key decisions.
4. Correct earlier entries when the new answer supersedes them. Preserve enough
   history to make the change understandable.
5. Save the file.
6. Only then ask the next question.

Never batch several answers into one checkpoint. If the file cannot be written,
stop and explain the blocker instead of continuing an interview that is not
being preserved.

## Conduct the interview

- Ask one question at a time.
- Include a recommended answer based on the available context, so the user can
  confirm, correct, or redirect it.
- Walk the decision tree in dependency order. Settle upstream decisions before
  their downstream consequences.
- Inspect the codebase or supplied documents when they can answer a question.
  Ask the user only for information that cannot be discovered.
- When the user cannot answer, record the item as a flag with the best owner and
  continue.
- Follow contradictions and vague answers until they are resolved or clearly
  flagged.
- Near the end, ask a completeness backstop such as, "What have we not touched
  that could change this plan?"
- Continue until the user says to stop or every meaningful branch has been
  covered.

## Close the session

1. Read the entire capture file.
2. Reconcile contradictions, gaps, stale flags, and superseded decisions.
3. Save the final running summary and open-flags list.
4. Give the user a short recap of what was captured, what remains flagged, and
   the recommended next step.

Keep the raw capture in `brainstorms/`. A polished plan, map, or specification
may later be created in the project's normal documentation location, but it
does not replace or move the raw interview notes.
