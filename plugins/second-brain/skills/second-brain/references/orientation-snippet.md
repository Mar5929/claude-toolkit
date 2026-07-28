# Second-brain root orientation

Add this same section to both `CLAUDE.md` and `AGENTS.md`. Preserve the
project's existing content and voice. Do not copy the complete schema into
either root file.

```markdown
## Project memory and knowledge

Read `.claude/rules/second-brain.md` before work that changes product behavior
or depends on project history.

- `brainstorms/`: non-authoritative discovery and interviews.
- `specs/`: current approved product and system behavior.
- `memory/context/`: durable circumstances and constraints.
- `memory/planning/`: vision, goals, roadmap, milestones, risks, and assumptions.
- `memory/decisions/`: important choices and rationale.
- `memory/knowledge/`: reusable non-obvious understanding.
- `memory/references/`: useful sources and why they matter.
- `memory/domain/`: business concepts, language, actors, and rules.
- `memory/operations/`: operating, release, recovery, and support guidance.

Start with each root `README.md`, then follow the relevant area indexes and
backlinks. Work-tracker owns current ticket status, blockers, relationships,
handoffs, branches, pull requests, and landing proof.

At approved completion points, propose durable updates to the owner. After
approval, invoke the memory librarian in this session's worktree.
```

If a project uses another root instruction filename in addition to or instead
of these two, preserve that file and add a short route to the same canonical
rule. Claude and Codex must not receive different memory authority maps.
