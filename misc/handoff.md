Continue the solution-design work for GitHub issue #269 in:

  C:\Users\michael.rihm\Documents\Claude_Projects\claude-toolkit

  Issue:
  <https://github.com/Mar5929/claude-toolkit/issues/269>

  Existing isolated worktree:
  C:\Users\michael.rihm\Documents\Claude_Projects\claude-toolkit-269

  Branch:
  issue-269-second-brain-design

  Goal

  Review every requirement in issue #269 against the actual toolkit implementation, the Davis memory-system pattern, the DragonFly rule-audit report, and current official Claude Code documentation. Then
  draft a build-ready technical solution for each requirement.

  This is solution design only. Do not implement, migrate, delete, or change production code, rules, hooks, plugin files, or project configurations.

  Important boundaries

- Preserve the approved requirements and approved solution directions already in the issue.
- Do not silently reinterpret or expand them.
- Technical design does not authorize implementation.
- Do not mark anything “approved” unless Mike explicitly approves that exact design.
- Requirement 1 already has a proposed technical design in the existing technical-plan comment. Review it, preserve it, and identify gaps—but do not replace it casually.
- The separate work-tracker work item owns work-item lifecycle behavior. Issue #269 should define only the integration contract it needs.
- General plain-English response style is being handled separately. Keep only the special structured, plain-language format for proposed memory and specification saves.
- Specifications contain valuable information that cannot simply be rediscovered by reading the code.
- Prefer Claude Code’s native plugin, hook, settings, and scope mechanisms. Do not invent another registry, installer service, database, daemon, or configuration layer unless evidence proves it is
  necessary.
- Preserve all unrelated repository changes. The primary checkout has a user-owned CLAUDE.md modification.
- Use the existing worktree. Do not create another worktree or a repository folder for this analysis.
- No AI attribution anywhere.

  Required evidence

  Inspect at least:

- The complete body and comments of issue #269
- The current second-brain plugin
- The project-init plugin and `/project-sync`
- Every relevant hook program and registration mechanism
- The knowledge-system specification and templates
- Rules packaged for installation into project `.claude/rules/`
- The Davis project’s knowledge and memory routing rules
- `C:\Users\michael.rihm\Documents\Claude_Projects\DragonFly-rules-cleanup-20260902\RULE-AUDIT-REPORT.md`
- The existing `graphify-out` results for navigation only
- Current official Claude Code documentation for plugins, hooks, settings, scopes, and plugin reloading

  Direct source files and official documentation are authoritative. The existing graph has known health warnings and must not be treated as final evidence.

  Team approach

  If subagents are available, use them for independent, read-only review:

  1. Second-brain memory, specification, glossary, and proposal behavior
  2. Plugin activation, native hooks, `/project-sync`, scope, and migration
  3. Knowledge lookup ladder, Davis comparison, project rules, and DragonFly audit
  4. Coordinator synthesis, contradictions, traceability, and issue updates

  Only the coordinating agent should update the GitHub issue so parallel agents do not overwrite one another.

  For every requirement, produce this design record

  1. Requirement
     Restate the requirement briefly in plain language.

  2. Current behavior
     Explain what the toolkit currently does, citing exact files and relevant sections or lines.

  3. Gap
     Explain precisely why the current behavior does not satisfy the requirement.

  4. Recommended solution
     Give the strongest reliable solution. Keep it as small and mechanical as possible.

  5. Agent workflow
     Show what an agent experiences before, during, and after the relevant trigger.

  6. Exact implementation changes
     Identify the files, components, hook events, matchers, commands, settings, templates, and ownership boundaries that would change.

  7. Reuse
     Identify existing mechanisms that should be reused rather than duplicated.

  8. Failure behavior
     Explain what happens when knowledge is missing, stale, ambiguous, conflicting, unavailable, or only partially installed.

  9. Migration and rollback
     Explain how existing equipped projects move to the new design and how the change can be safely reversed.

  10. Verification
      Provide concrete automated and end-to-end acceptance tests. A design is not complete if it only proves that files exist; it must prove that a fresh agent session receives and follows the intended
      behavior.

  11. Dependencies
      Record dependencies on other requirements or the separate work-tracker item.

  12. Assumptions and unverified points
      Clearly label anything that still requires a platform proof or user decision.

  13. Recommendation status
      Use exactly one of:
      - Draft
      - Proposed — awaiting Mike’s approval
      - Approved by Mike on YYYY-MM-DD
      - Blocked by named evidence or decision

  Quality tests

  Each design must answer:

- What exact event makes the agent look for knowledge?
- What lookup ladder does the agent follow?
- How does it know what each knowledge location contains?
- When does it propose a memory versus a specification?
- What information must never become memory?
- How is a proposal shown to Mike?
- What exact approval permits a write?
- How do native hooks become active?
- How does `/project-sync` prove that activation worked?
- How is a stale or partially equipped project reported?
- How does a fresh session prove the behavior works?
- Is the solution copied from Davis because it is generally sound, or is it Davis-specific?
- Could the same result be achieved with fewer moving parts?

  Issue updates

  Maintain one coherent technical-plan record. Do not scatter the design across unrelated comments.

  For each requirement:

- Add or update its detailed technical-design section.
- Add a traceability entry connecting requirement → solution → files → tests → status.
- Add a dated progress-history entry.
- Preserve prior approved text and decisions.
- Never turn “proposed” into “approved” without Mike’s explicit approval.

  Interaction with Mike

  Complete the evidence review and draft recommendations, but present the final technical solutions to Mike one requirement at a time.

  For each requirement:

- Explain the recommendation simply.
- Explain why it should work.
- Identify any remaining uncertainty.
- Ask one focused approval or decision question.
- Wait for approval before treating that requirement as settled.

  Start by reading the entire issue and existing technical-plan comment. Report whether the recorded requirements, approved directions, and Requirement 1 draft are internally consistent before drafting
  Requirement 2.

  This gives the agents permission to inspect and design, but not to start building. It also makes one coordinator responsible for issue updates, which should prevent parallel agents from overwriting each
  other.
