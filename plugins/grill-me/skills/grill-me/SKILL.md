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

This owner-invoked raw checkpoint is the one place the project knowledge system
lets anything reach a file without the owner approving the exact words first.
`grill-me` may write only its non-authoritative brainstorm capture. Approved
specifications and curated memory still go through the installed `remember`
skill and its owner-approval flow.

## Set up before asking the first question

1. Detect the project's knowledge layout before writing:
   - when `knowledge/project.md`, `knowledge/index.md`, and the nested
     `knowledge/specs/`, `knowledge/memory/`, and `knowledge/brainstorms/`
     trees are present, use `knowledge/brainstorms/`;
   - when no knowledge-system signature is present, use an existing ordinary
     brainstorm artifact folder, or create top-level `brainstorms/` after
     telling the owner this is standalone raw capture; and
   - when the layout is partial, mixed, or unknown, stop and recommend
     `project-sync`. Never create one missing folder and turn ambiguity into a
     partial knowledge system.
2. Get today's date from the environment, such as with `date +%F`.
3. Create `{brainstorm-root}/{YYYY-MM-DD}-{topic-slug}.md`. If that path already
   contains notes for the same topic, read and continue it instead of
   overwriting it. Use a short, filesystem-safe topic slug.
4. Add the title, date, one-line session goal, an empty running summary, an
   empty Q&A log, and an empty open-flags section.
5. Keep the brainstorm flat even when it may affect several system areas.
   `knowledge/index.md` deliberately excludes brainstorms, so never hand-edit
   it or create a second brainstorm index.
6. Tell the user where the notes are being saved in one line, then ask Q1.

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
4. When the current project knowledge system is installed, invoke its
   `remember` skill for the end-of-interview durable review:
   - identify approved behavior that belongs in one or more capability
     specifications;
   - identify other durable context, planning, decisions, knowledge,
     references, domain material, or operations worth preserving;
   - apply the four save filters before proposing anything;
   - show `What I want to change` and `Why`, then the exact proposed words; and
   - save only what the owner approves in this session's worktree.
5. When the approved update creates or amends a specification, link the
   specification to this brainstorm and this brainstorm to every resulting
   specification.
6. Give the user a short recap of what was captured, what remains flagged, and
   the recommended next step.

Keep the raw capture in `knowledge/brainstorms/` when the knowledge system is
installed, or in the stated standalone artifact folder otherwise. A polished
plan, map, or specification does not replace or move the raw interview notes.

Knowledge-system integration is conditional. Without the complete new layout,
preserve the standalone brainstorm behavior and do not create a partial
`knowledge/`, `specs/`, or `memory/` system.
