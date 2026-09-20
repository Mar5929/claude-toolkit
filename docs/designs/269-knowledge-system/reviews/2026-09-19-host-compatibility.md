# Knowledge System #269: Claude Code and Codex host compatibility audit

> Review evidence, not adopted policy. Read the [consolidated disposition](2026-09-19-consolidated-audit.md) before acting on recommendations. Original severity and proposals below may be revised by the linked reassessments.

Date: 2026-09-19
Reviewer: independent host/harness review (reviewer 2)
Repository baseline: main `c43a4feeda538cd0c3e084b52e0b703f805a95db`; manual-draft worktree `414d52465486013f99e433d0a4fb8fd27c88dda6`
Installed observations: Codex CLI `0.154.0`; Claude Code `2.1.271`
Scope: the full Knowledge System PRD, master design, implementation plan, host evidence, and isolated core-manual draft. This review changes no canonical file.

## Verdict

The design is unusually honest about the difference between guidance, observable delivery, acknowledgment, enforcement, and semantic understanding. It correctly blocks universal enforcement claims until host proofs H1-H6 pass. It is not ready for full requirements/design approval yet. Two high-severity host gaps need design text and owned implementation work before approval: the save-helper contract has no concrete per-host execution/permission profile, and host-native memory has no implementation/acceptance owner even though Claude auto memory is on by default. The current host evidence is also already stale at an important Claude release boundary and behind current Codex documentation.

Approval implication: approve continued design/prototype work only. Do not approve full cross-host design, build activation, or equivalence claims until findings H1-H3 are resolved and proved on CLI and desktop surfaces. Confidence: high for documented contracts and local version/config observations; medium for desktop behavior, which still needs runtime proof.

## Evidence taxonomy

**Official documented contract (accessed 2026-09-19).** Anthropic's captured official docs (capture 2026-09-04) plus current official pages; OpenAI's current official Codex hooks/config docs. These describe supported contracts, not successful execution in this project.

**Observed local evidence (2026-09-19).** `claude --version` returned `2.1.271`; `codex --version` returned `0.154.0`; `codex features list` reported `hooks` stable/enabled, `multi_agent` stable/enabled, and `memories` stable/disabled. The installed npm package contains only the launcher/binary package, so the prior Codex source review at commit `977193486dfe7a88c4dab24abeafe9b754f5b13f` remains source evidence for that snapshot, not a current product promise or desktop proof.

**Design inference.** Recommendations below infer failure modes by combining documented contracts with the proposed workflow. They are not runtime results.

**Runtime proof still required.** H1-H6 remain necessary. In particular, neither CLI version output nor docs establish the Codex desktop bundled runtime, effective trust, model-visible read delivery, background helper persistence, or permission behavior.

**Research limitation.** The requested Firecrawl CLI was not authenticated (`npx --yes firecrawl-cli --status`: v1.23.3, “Not authenticated”). I did not install or authenticate it. I used repository-captured official docs first, local executables/source evidence second, and official vendor web pages through the available web tool as fallback. No `.firecrawl` source files were created.

## Findings, ranked by severity

### H1 — High: delegated saving has no concrete per-host execution and permission contract

**Where.** Master design §6.7, lines 544-580; implementation plan D1-P1 lines 118-127 and E1-P4 lines 277-286; core manual lines 219-235.

The design requires the main agent to launch a helper that edits, checks, commits, pushes, and returns evidence while the conversation continues. It deliberately leaves the mechanism to proof, but it never requires the resulting design to name the helper artifact/profile, working-directory or worktree choice, tool allowlist, permission mode, network/Git credential behavior, cancellation semantics, and how an approval request is handled while the helper is in the background.

That detail is material, not an implementation nicety. Claude Code background subagents omit `AskUserQuestion`, have a reduced tool set, inherit/override permission modes under documented rules, and may run in the parent checkout or an isolated worktree. A helper that encounters a Git credential prompt or protected operation can stall or fail without a user interaction path. Codex exposes multi-agent tools locally, but the official hooks contract only proves lifecycle events; it does not promise that a helper survives thread/session teardown or can publish without an approval interaction. The design's generic fallback (“use the available save process”) prevents a false claim but does not define the promised owner experience or parity.

**Counterargument.** D1-P1 explicitly says to test unavailable parallel execution, late results, interruption, and recovery, so the uncertainty is acknowledged.

**Why it remains a finding.** The exit artifact is only a capability matrix/selected transport. Nothing requires a committed per-host saver profile and fallback state machine before E1-P4 bakes the generic helper requirement into shared instructions. A test may reveal that interactive permissions make the selected behavior impossible without telling the builder what design artifact must change.

**Smallest remedy.** Add a “save executor contract” deliverable to D1-P1/D1-P2 and make E1-P4 depend on it. For each host/surface, name: executor type; required tools; checkout/worktree; permission mode; whether prompting is possible; credential/network prerequisites; cancel/late-result behavior; durable operation ID; and foreground fallback. Make setup report the selected executor and degraded behavior. Add a scenario where push needs interaction and the background helper cannot ask.

**Approval implication/confidence.** Blocks full design approval for R9/R25/R28 parity; does not block manual wording work. Confidence: high.

### H2 — High: competing native memory is noticed but has no implementation or acceptance owner

**Where.** Master design §6.8 lines 631-635; absent from implementation plan E1-P5/E1-P7 and concrete scenarios; core manual lines 127-145 and 219-223 assume the repository system is the operative lasting-memory route.

Claude Code auto memory is on by default and writes machine-local Markdown outside the repository. Official docs say it is shared across worktrees in a repository, is not shared across machines/cloud, and can also be enabled separately for subagents. That is exactly the kind of competing background writer and private continuity store this design says must not undermine shared approval. Codex locally reports a stable `memories` feature that is disabled, but the setup design does not require verifying it stays disabled or defining policy if enabled later.

The master design has one good sentence telling activation to inspect native memory settings. The implementation plan never assigns that inspection/configuration/reporting to E1-P5 or E1-P7, never defines whether setup disables Claude auto memory, and never tests pre-existing native memory that contradicts project knowledge. A builder can satisfy the plan while leaving Claude's default writer active.

**Counterargument.** The design explicitly recognizes the risk at lines 631-635 and H1/H5 broadly test configuration and recovery.

**Why it remains a finding.** A concern with no owner, state transition, migration behavior, or acceptance case is easy to omit. This is especially likely because the default differs by host and Codex's current local feature is disabled.

**Smallest remedy.** Add native-memory policy to E1-P7: inventory effective settings per host; select disable/preserve-with-warning behavior; never silently delete existing native memory; report machine-local content as non-authoritative; prevent the save helper from using subagent persistent memory; and add new/upgraded-project cases with conflicting Claude auto memory and a future-enabled Codex memory feature. If disabling is selected, verify effective scope/precedence rather than only writing a setting.

**Approval implication/confidence.** Blocks activation design approval because it can violate the single-authority and approval model on first use. Confidence: high for Claude, medium for future Codex behavior.

### H3 — High: the host evidence baseline is stale at a release boundary it marks as consequential

**Where.** Host evidence “Installed observation” and Claude section; master design §6.8 lines 656-669 and Notes line 1198; implementation plan D1-P1 line 108.

The evidence says local Claude Code is `2.1.259` and explicitly refuses to assume subagent handback behavior documented for `2.1.271`. The machine now runs `2.1.271`. The design and plan continue to cite the older version. Current official Codex docs also now document plugin-packaged hooks, broad local-function tool hook coverage (including `spawn_agent` matching `Agent`), code-mode nested enforcement, and a per-handler `additionalContextLimit` default of about 2,500 tokens. Those details are newer/more specific than the evidence's narrower summary and affect packaging, coverage, and context-spill tests.

**Counterargument.** D1-P1 already requires fresh source dates, runtime versions, CLI/desktop separation, and says fixed assumptions must be rechecked.

**Why it remains a finding.** The master design currently uses stale evidence to justify pending questions. Reviewers cannot approve the current host design against a baseline that is known to have crossed the exact version threshold under discussion.

**Smallest remedy.** Refresh the evidence header and installed observations now; add a short delta table for Claude 2.1.271 and current Codex hooks docs. Keep claims “documented, not runtime-proven.” Record Codex docs access date and the installed `0.154.0` feature report separately from desktop. Do not re-open settled product decisions unless the delta changes behavior.

**Approval implication/confidence.** Blocks host-mechanism/design approval, not requirements wording. Confidence: high.

### M1 — Medium: strict startup acceptance lacks a defined support-floor decision

**Where.** Master design §6.1 lines 318-337, §8 lines 797-809, and §12 lines 971-991; implementation plan D1-P1 lines 104-129; PRD R2/R25/R27.

The design correctly says declaration-only startup fails strict R2 and full acceptance. It also says gaps should be disclosed per host. What is missing is the product decision that follows a failed H2 proof: minimum supported versions/surfaces, whether one unsupported surface blocks the release for both, and whether an equipped project may run in a clearly degraded but not accepted mode.

Without that decision, “same result on Codex” and “full acceptance blocked” can produce an endless test gate or a setup report that calls the project equipped while a mandatory requirement is unavailable.

**Counterargument.** The design is right not to weaken a requirement merely because a host test fails.

**Smallest remedy.** Add a support-matrix decision after D1-P1 with three states: supported/accepted; installed but degraded (specific requirements unmet); unsupported/refuse activation. Define whether release requires at least one accepted CLI and desktop surface per named host. Make setup's word “equipped” contingent on that matrix.

**Approval implication/confidence.** Needs resolution before release approval; can remain a recorded post-spike decision before full design approval if the owner agrees. Confidence: medium-high.

### M2 — Medium: completion-hook recursion is described behaviorally but not specified as an adapter filter

**Where.** Master design §6.6 lines 462-475 and §6.8 lines 618-629; implementation plan E1-P5 lines 306-314.

The design says helper messages must not retrigger the main completion review, which is correct. Both hosts expose subagent identity/lifecycle, but the mechanics differ: Claude settings/plugin hooks run inside subagents and agent-frontmatter `Stop` becomes `SubagentStop`; Codex subagents share the parent's `session_id` and require `agent_id`/`agent_type` for isolation. A state key containing session and agent identity is necessary but insufficient unless each adapter explicitly excludes helper completion from the root `Stop` generation and treats `SubagentStop` only as helper-result evidence.

**Counterargument.** E1-P5 tests helper isolation and master design warns against helper-triggered review.

**Smallest remedy.** Add one normative adapter rule and fixture: root completion generation is keyed by root agent/turn; `SubagentStop` may update the durable operation result but never opens or closes the root prompt-review generation; shared `session_id` alone never identifies a root event. Test two helpers finishing in opposite order during one main turn.

**Approval implication/confidence.** Does not block requirements approval; should be fixed before adapter build approval. Confidence: medium-high.

### M3 — Medium: setup/update validation does not explicitly test root instruction budgets and untrusted first launch

**Where.** Master design §6.1 lines 303-337 and §9 lines 842-866; implementation plan E1-P7 lines 340-362.

Codex bounds project instruction discovery and can omit project `AGENTS.md` in an untrusted project; project-local hooks also require trust. Claude has its own trust/safe-mode/config precedence. The plan says to test trust and actual activation, but it does not require proving that the root router survives Codex's aggregate project-doc budget and that the very first untrusted launch is reported as not equipped rather than silently running without both router and hooks.

**Counterargument.** D1-P1 covers disabled/untrusted hooks, and E1-P7 classifies partial installs.

**Smallest remedy.** Add two setup fixtures: nested/root instruction files exceeding Codex's configured aggregate budget, and first launch before project trust. Acceptance requires a deterministic diagnosis and no “equipped” claim until both the router and hook adapter are observed effective.

**Approval implication/confidence.** Release blocker for Codex setup, not for the shared manual. Confidence: medium.

### L1 — Low: owner-facing acknowledgment can become noise unless the transport is allowed to stay machine-visible

**Where.** Master design §6.5 lines 431-454; core manual lines 153-166.

Every user message requires an acknowledgment, while routine no-change reviews should stay quiet. The design recommends the sentence “Acknowledged...” and separately recommends a helper receipt. If both become visible, every turn adds ritual text without adding evidence; if only prose is used, it is hard to associate reliably with a generation.

**Counterargument.** The owner explicitly selected acknowledgment, and the design distinguishes intent from completion.

**Smallest remedy.** State that one acknowledgment satisfies the requirement: prefer a structured helper receipt and show prose only where the host cannot expose that receipt or the owner explicitly wants it. Measure owner-visible repetitions in H6.

**Approval implication/confidence.** Product-polish issue, not a blocker. Confidence: medium.

## Scenario walkthroughs

### 1. Fresh trusted Claude Code session

Expected path: `SessionStart` supplies the ordered-read request; the agent reads `SOUL.md`, `knowledge/project.md`, then the complete knowledge manual; content delivery is observed; a separate acknowledgment is recorded; `current.md` and relevant inbox entries are opened before dependent work. The design correctly withholds confirmation for a missing/truncated file. Runtime proof required: Claude 2.1.271 CLI and desktop, hook output spill, full manual delivery, effective settings, and no duplicate native auto-memory write.

### 2. First Codex launch in an untrusted repository

Likely failure path: project `AGENTS.md` and project `.codex` hooks may be unavailable until trust is established, so neither the router nor startup adapter can be assumed to run. Correct product result: setup/diagnostics say activation is incomplete and name trust as the missing prerequisite; no “equipped” claim and no startup confirmation. The current documents broadly require this, but M3 should make it an explicit fixture.

### 3. Automatic compaction during a long Codex turn

Current official contract: root `SessionStart` with source `compact` runs before the immediate continuation, including mid-turn automatic compaction. Recovery must invalidate only affected startup guidance, not the per-prompt review generation, and must not repeat the greeting. Test a late pre-compaction receipt arriving after the compact generation. Pass only if the next dependent operation sees current guidance and the stale receipt cannot close the new generation.

### 4. Claude background save needs a permission or Git credential prompt

The main conversation records the approved operation and continues. The background saver reaches `git push` but cannot use `AskUserQuestion` and its permission mode or credentials do not allow completion. Correct outcome: it returns or durably records “approved, save unfinished,” with local/commit/remote state and the exact interactive next step; the main agent does not report success. H1 adds the missing executor/permission contract and foreground fallback.

### 5. Two Codex helpers finish out of order in one parent session

Codex subagent hooks share the parent's `session_id`; distinct `agent_id` and operation IDs are required. Helper B finishes before A. `SubagentStop` updates B's pending operation only; it neither satisfies A nor closes the root completion review. The main agent verifies each publication independently and shared publication is serialized. This scenario exposes M2 if state is keyed only by session/generation.

### 6. Claude auto memory contradicts repository knowledge

An upgraded project already has machine-local auto memory saying an old provider is preferred, while repository memory contains the approved replacement. Correct result: repository records retain authority; setup reports the native store and selected policy, never imports or deletes it silently, and the agent does not cite it as project truth. A save helper has no persistent subagent memory. This scenario currently has no owned implementation/acceptance case (H2).

### 7. User approves a save, closes the app, then resumes on another computer

Before delegation, the exact operation, authority, source, destination, and next step must be remotely available in the inbox. If publication of the inbox entry itself failed, the agent states that the other computer cannot see it. On resume, the new session checks remote state and whether the target change already landed before retrying; it cannot check a helper on the old machine as if cross-machine liveness were guaranteed. No new approval is requested for unchanged scope.

### 8. Completion review requests one continuation, then misses again

The first root `Stop` with no valid outcome requests one corrective continuation. The second miss records an unfinished checkpoint and ends without another retry. A pending proposal or still-running saver is a valid outcome and does not hold the turn open. Run this with another Stop hook installed and with a helper finishing between the two events; there must be no recursive root/helper loop.

### 9. Consequential write through a covered and uncovered path

For `apply_patch` or a covered shell tool, a proven PreToolUse guard may deny an objectively invalid target/state. A hosted/specialized path or continued `write_stdin` may bypass a fresh pre-check. Correct result: the system never claims universal prevention; explicit read-back/check/publication remains authoritative and setup names uncovered paths. PostToolUse feedback cannot claim it prevented an already-executed write.

## Full-document coverage map

| Document area | Host concern checked | Result |
| --- | --- | --- |
| PRD framing, layout, end-to-end session | native instructions versus Knowledge System behavior; startup order; same shared files | Sound separation; support-floor decision still needed. |
| R1-R8 | plain components, startup, recovery, knowledge/source lookup | Read/ack distinction is strong; strict proof and trust/budget cases remain. |
| R9-R10 | timely save, helper execution, approval persistence | High-risk helper contract gap H1. |
| R11-R15 | selection, exclusions, working state, schema, wording | Mostly host-neutral; native memory can bypass approval/authority (H2). |
| R16-R24 | PRDs, skills, routing, find order, cards, indexes, lifecycle, natural language | Four-skill routing is host-portable if discovery/installation tests pass. |
| R25-R27 | Codex parity, official APIs, setup | Evidence stale; no explicit accepted/degraded/unsupported matrix; trust/budget fixture missing. |
| R28-R30 | durable inbox, judgment boundary, OS integration | Durable recovery is well designed; root/helper event isolation needs normative adapter rule. |
| Master design §§1-3 | authority, decisions, GUIDE/CHECK/ENFORCE boundaries | Strong and appropriately skeptical. |
| Master design §§4-6.4 | component inventory, startup/current/index/manual/skills | Host-neutral core is plausible; native store policy missing from build plan. |
| Master design §§6.5-6.8 | prompt/completion/write/save/helper/state/hooks | Findings H1, H2, M2, L1. |
| Master design §§7-8 | checkpoint contracts, requirement proof, context cost | Good evidence taxonomy; refresh official contracts and define support floor. |
| Master design §§9-10 | migration, technical proofs, scenarios | Strong rollback/concurrency posture; add native-memory, trust-budget, and permission-stall scenarios. |
| Master design §§11-14/Notes | sequence, ledger, remaining work | Correctly preserves approval boundaries; version references need refresh. |
| Implementation plan D1 | host proof and design reconciliation | Broadly correct; add concrete executor contract and support-matrix deliverables. |
| Implementation plan E1-P1/P2 | manuals/templates/publication | Host-neutral, dependent on helper permission behavior. |
| Implementation plan E1-P3/P4 | schemas and save/recovery procedures | Add saver profile dependency and explicit duplicate-operation concurrency proof. |
| Implementation plan E1-P5 | adapters/checkpoints/gates | Add root/subagent normative filtering and current Codex coverage cases. |
| Implementation plan E1-P6/P7 | integration/setup/migration | Add native-memory owner/policy and first-untrusted/budget tests. |
| Implementation plan E1-P8/F1 | representative sessions/rollout | Add the scenarios above and gate “equipped” on support state. |
| Core manual §§1-5 | responsibility, startup, routing, evidence, eligibility | Clear; accurately says delivery is not understanding. |
| Core manual §§6-8 | review, permission, helper save/recovery | Behavioral fallback is honest; needs concrete per-host executor supplied by design/setup. |
| Core manual §§9-10/review notes | file shape, procedures, setup/version reporting | Suitable as shared policy; should mention native memory only through setup procedure, not duplicate host details in core text. |

## Official sources and local evidence

- Anthropic, [Hooks reference](https://code.claude.com/docs/en/hooks), accessed 2026-09-19. Relevant contracts: SessionStart context only; Stop/SubagentStop continuation; tool-hook failure/fail-open limits; 10,000-character hook-output spill; settings/plugin hooks inside subagents.
- Anthropic, [Subagents](https://code.claude.com/docs/en/sub-agents), accessed from captured official page dated 2026-09-04 and local current capture. Relevant contracts: background tool filtering, no `AskUserQuestion`, permission modes, working directory/worktree isolation, hooks inside subagents, persistent subagent memory.
- Anthropic, [Memory](https://code.claude.com/docs/en/memory), accessed from captured official page dated 2026-09-04. Relevant contracts: auto memory on by default, project/user setting and environment-variable disablement, machine-local storage, repository-wide worktree sharing.
- Anthropic, [Context window](https://code.claude.com/docs/en/context-window), captured 2026-09-04. Relevant contracts: compaction re-injection behavior and context cost.
- OpenAI, [Codex Hooks](https://developers.openai.com/codex/hooks), accessed 2026-09-19 (the available official search endpoint returned localized official copies). Relevant contracts: plugin hooks; trust; event schemas; `session_id`/`agent_id`; local tool coverage; code-mode nested enforcement; `additionalContextLimit`; async cancellation; root compact reinjection; `write_stdin` limitation.
- OpenAI, [Codex configuration reference](https://developers.openai.com/codex/config-file/config-reference), accessed 2026-09-19. Relevant contracts: hooks configuration and per-handler context limit.
- Local host observations, 2026-09-19: `claude --version` 2.1.271; `codex --version` 0.154.0; `codex features list` as summarized above. These are not desktop runtime proof.

## Approval recommendation

Keep the current ordinary-command-hook baseline and shared Markdown/Git authority. Approve the core manual for continued wording review only after reconciling any wording findings from the other reviewers. Before full design approval, require: (1) a refreshed dated host matrix; (2) a per-host save-executor contract including permission/fallback behavior; (3) an owned native-memory setup policy and migration test; (4) a supported/degraded/unsupported release matrix; and (5) explicit root/helper event isolation fixtures. After those are written, H1-H6 runtime proof can determine mechanisms without changing the product's approved meaning.
