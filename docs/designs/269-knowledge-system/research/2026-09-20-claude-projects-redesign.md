# Claude Projects redesign and Toolkit OS

Research date: 2026-09-20. Researcher: GPT-5.6 Terra, Codex task
`01a0bf89-a641-7c70-8fec-002453cee13f` (Assess Claude Projects redesign against…).
Toolkit baseline: `1366ac26e4a4ab120e7c7966315bc2710ae6c173`.
The coordinator preserved the task's completed handoff at Mike's explicit request.
This is reported source research and architectural interpretation, not a native
product test or an approved change to Toolkit requirements.

## Sources and method

The researcher consulted Anthropic's [Projects redesign announcement](https://claude.com/blog/projects-redesigned)
and [Projects support documentation](https://support.claude.com/en/articles/9517075-what-are-projects).
Firecrawl CLI was unavailable, so it used official web sources instead.
The handoff reported an announcement dated 2026-09-17 and a limited Claude Code
cloud-project beta for selected Pro/Max users, initially without existing
web/desktop projects. Availability and product behavior must be rechecked before
adoption. The coordinator verified the completed research handoff, not the
product's operation or every external claim independently.

## Findings

**Orchestration overlaps, with no demonstrated conflict.** The research reports
separate cloud threads with their own branches/repository copies, a coordinator
that delegates and reviews work, and continued background execution. This
could supply Claude-specific execution for some Toolkit workflows. Toolkit's
[guided delivery](../../../../knowledge/prds/toolkit-operating-system/guided-delivery.md)
and [guided work management](../../../../knowledge/prds/toolkit-operating-system/guided-work-management.md)
retain portable instructions, tracker ownership and human decisions. Their
workflow is not made redundant by native dispatch. The research recommends
investigating native orchestration before building equivalent host-specific machinery.

**Shared memory and Library complement project records.** Shared context and
artifacts could help threads find information. They do not establish compliance
with Knowledge R18/R29/R30: source authority, owner-defined Markdown records,
and distinct owners for requirements, design, tracker, Guide, research and
pending permission. They also do not establish Codex parity under R25.
[Knowledge requirements](../../../../knowledge/prds/toolkit-operating-system/knowledge-system.md)
remain the authority; native-memory conflict handling is still an open choice.
The research recommendation is to investigate before enabling or synchronizing
native memory, not to replace the project's approved records.

**Project configuration is a potential delivery mechanism.** The reported
project environment, connectors, plugins, instructions and model settings may
help deliver Toolkit guidance. They do not prove instruction precedence,
complete propagation or project adoption. Toolkit OS R3–R5 still govern explicit
project choices and honest reporting of partial support.
[Toolkit OS requirements](../../../../knowledge/prds/toolkit-operating-system/toolkit-operating-system.md)
also retain concurrency and approval controls. Native branches, thread status
and PR artifacts provide evidence; they do not replace the canonical work
record or owner acceptance. Ordinary merge-conflict handling alone does not
protect concurrent knowledge writes.

**Existing defects and proof gaps remain.** The research does not resolve
feedback-template drift, citation placement, late Stop correlation, startup
and prompt delivery, interrupted saves, permission handling, setup/rollback,
or parity across Codex, desktop and Windows. The
[delivered-versus-required assessment](../implementation-plan.md#delivered-versus-required-assessment-2026-09-20)
remains the detailed account. Its 67 deterministic cases do not prove native
host or complete behavioral acceptance. The handoff also reports cloud access
to local tools/networks as future work, which requires fresh verification.

## Recommendation and proposed test

Keep durable Markdown/Git authority, one tracker, and approval/recovery
contracts. No immediate Toolkit behavior change was recommended. Treat native
Projects as a possible optional Claude Code integration, subject to evidence.
These recommendations were saved as research, not adopted as new policy.

When beta access is available, a proposed disposable-repository test would use
two overlapping tasks and one independent task to check:

- Branch/PR isolation and how merge conflicts return to the coordinator.
- Parent responsiveness, completion, cancellation and results arriving later.
- Propagation of a known decision, its source/date and project instructions;
  whether shared memory can be inspected, edited and deleted.
- Library retention, export and recovery outside the vendor interface.
- Cloud/local tool access and actual permission boundaries.

Record product/version, observations and limitations in D1-P1/E1-P4 host/helper
evidence. A successful demonstration would not establish all-host parity or
approve a requirements change. No test, authentication change, memory
activation, implementation or rollout was performed for this research.

Both operating manuals were reviewed for this save; neither needs updating
because this record preserves research without changing operating behavior.
