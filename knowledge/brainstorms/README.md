# Brainstorms and discovery

This folder contains interviews, exploration, candidate requirements, and
unresolved questions. It is non-authoritative input, not approved product
behavior.

## Brainstorms

- [2026-07-28 second-brain v3 project memory](2026-07-28-second-brain-v3-project-memory.md)
  - How v3 should hold roadmaps, timelines, goals, and whole-project knowledge
    without duplicating the work tracker.
- [2026-08-02 Claude response styles](2026-08-02-claude-response-styles.md)
  - What was left to build on the plain-language response style after issue #101
    landed, and how we would know it worked.
- [2026-08-02 memory pull request hook](2026-08-02-memory-pr-guard.md)
  - Stress-test of issue #104, a hook that holds the command opening a pull
    request until the memory check happens. Named `memory-pr-guard` when the
    session started and renamed partway through.
- [2026-08-03 how the memory check reads](2026-08-03-memory-check-wording.md)
  - Two changes to the wording of the memory check: replacing the fixed report
    block, and replacing the word "durable" across the toolkit.
- [2026-08-03 memory pull request hook solutioning](2026-08-03-memory-pr-hook-solutioning.md)
  - What exactly gets built for the memory pull request hook, keeping the later
    clear-the-context trigger in view so the design does not block it.
- [2026-08-03 work-item tracking choice](2026-08-03-work-item-tracking-choice.md)
  - Asking a new project where it tracks work items, letting it name any
    tracker, and carrying the ticket-spec discipline into whatever it named.
- [2026-08-04 memory librarian field report from DragonFly](2026-08-04-memory-librarian-field-report-dragonfly.md)
  - An unedited account of four memory librarian calls in one DragonFly session:
    what worked, and seven things that went wrong, including a wrong date
    committed to memory and a file committed while the librarian was still
    editing it. Written by that session, saved here as evidence for issue #144.
- [2026-08-04 memory system cost and correctness](2026-08-04-memory-system-cost-and-correctness.md)
  - The refinement session for issue #144: why saving to memory ends in
    correcting things, two diagnoses that turned out to be wrong, and how the
    memory librarian came to be replaced by a read-only agent that checks.

Approved behavior belongs in `knowledge/prds/`. A brainstorm is stored once in this flat
folder even when it informs several system areas.
