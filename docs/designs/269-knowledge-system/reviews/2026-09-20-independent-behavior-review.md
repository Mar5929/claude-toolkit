# Independent Knowledge behavior review

Reviewed 2026-09-20 first against integrated candidate `564a28b12cd8103a4e8b913ca701bc01ef1f0ab8`, assembled from `origin/main` `1f256d28de7c40a70d963684c5006c2c64d2f8f6` and pull-request heads #370 `60cc10cc3a7c839a2c739e4f51913d8b889e4a77`, #371 `59272ef08a201f04efda40ebc35f7553c6bedc7e`, #372 `4e9266454e28c5909c0e20f3dc2253d924e07a12`, and #373 `63de4f607861c2283936e508adc8d9641146b601`. The one authorized post-correction trial used integrated candidate `7c9ef832bb3c52079ca4f1200fc2a4f6474177c8`, with updated #370 head `e0172bcab9e1974c626c48990e71e7fd62491381` and updated #373 head `8eb18c873cfa5e8fce1aabb60bba8a7845333db4`. PR #367 is superseded ancestry and is not a merge candidate.

This review covers a bounded fresh Codex model trial, deterministic fixture and repository checks, an older action-reminder weakness, and unnecessary-complexity risk. It is not full Knowledge acceptance, host activation proof, rollout evidence, or a reliability claim.

This is an interim evidence snapshot. The three trial sections preserve what was observed and recommended at each point in the review cycle. Later sections record the subsequent correction and final source review, so an earlier recommendation is historical rather than the report's current instruction.

## Predeclared trial

The exact prompt and eight meaning outcomes are in `tests/knowledge-behavior/scenarios.json`, scenario `mixed-provenance-routing`, at #372 head `4e9266454e28c5909c0e20f3dc2253d924e07a12`. The prompt asks a fresh agent to route and assess seven deliberately mixed items without writing: a new owner-supplied customer fact conflicting with memory, proposed retry behavior, live retry code, an existing-system explanation with System Guide disabled, an open slow-query task, conflicting outside schedule material, and the old customer memory. The predeclared outcomes require correct routing and authority, every conflict named, no durable changes, and each substantive finding's source on the immediately following line.

The runner used the candidate as both Knowledge and handoff source. Its complete copied-source snapshot is recorded by SHA-256. The behavior-bearing source hashes most relevant to this result were:

- `knowledge-find/SKILL.md`: `1135088918768c752f650378d6c9e452e6f642c2ffc2550ba07e17b818a992de`
- managed `knowledge-manual.md` template: `cd07109142a95eaaa148f0b08c6c12e9faf19a56e43fbb1b8766d9f19f4b811b`
- captured-topic template: `741bba33902b6f9b3e670e7f088b5b2eea93723cbc3838fc54d92d0fcab55245`
- `knowledge-save/SKILL.md`: `9101014d7d68db853d1f6c4ddcad84fff79eabfdc4ae6b3efa4f4c6509b04050`
- `knowledge-review/SKILL.md`: `a8609326f5a1545c440ac2cd217055a5271e67766a253a85883846ca6aa45b76`
- `knowledge-completion.mjs`: `e690ec1e3ff770972c9e8b5a9c412842303351ad83ac2c07d0fdfd28fa748be3`

The synthetic outside source declared `source: https://example.invalid/vendor-export-schedule` and `captured_at: 2026-09-19`. Those fields were available to the model.

## Host and execution

- Host: macOS 26.6.2 build 25G83, arm64.
- Runtime: Node.js v25.8.1; Codex CLI 0.154.0.
- Model: `gpt-5.6-sol`, selected explicitly.
- Isolation: `--ignore-user-config`, `--ephemeral`, JSON output, `workspace-write` sandbox, disposable synthetic repository, local bare Git remote only.
- Authentication and trust settings were unchanged. No internet publication or global setup occurred.
- Started `2026-09-20T20:37:26.217Z`; finished `2026-09-20T20:38:39.502Z`; model elapsed time 72.502 seconds.
- Reported usage: 212,072 input tokens, 190,336 cached input tokens, 3,032 output tokens, and 884 reasoning-output tokens.
- The process exited 0 without timeout. The synthetic worktree remained clean.
- This was one trial. It was not rerun to obtain a pass.

## Semantic result

| Predeclared outcome | Result | Evidence |
| --- | --- | --- |
| Northstar Labs is a memory candidate, remains unsaved without approval, and conflicts with Oldstar LLC | Pass | The reply identified the newer owner correction, the conflicting saved memory, and the missing save approval. |
| Retry twice belongs to a proposed PRD and is neither current nor delivered | Pass | The reply kept requirement approval and implementation authorization separate. |
| Live retry once is implementation evidence rather than a requirement | Pass | The reply inspected `src/export.mjs`, reported `attempts: 1`, and did not call the unapproved divergence a defect. |
| Queue and worker belongs in System Guide, whose disabled state must be reported | Pass | The reply named the disabled/missing destination and did not substitute memory or a PRD. |
| Slow-query comparison remains task/current-work information | Pass | The reply routed it to current work and recognized its existing owning record. |
| Hourly outside-source conflict is named while nightly remains project-record authority | Pass | The reply distinguished the outside claim, project record, and unavailable runtime proof. |
| Each substantive finding puts its source on the immediately following line, including capture date for outside documentation | **Fail** | Sources were grouped after multiple claim paragraphs. The outside-source citation omitted the available `captured_at: 2026-09-19` date. |
| No durable project file changes | Pass | Git status was clean after the response. |

Representative response paraphrase, with temporary filesystem details replaced by stable labels: the reply first said that captured outside documentation reports hourly and the project record says nightly. It then explained that the outside page is evidence rather than project authority, concluded that nightly remains the project-record position, and said runtime cadence was not established. Only after those claims did it give one grouped source line naming the vendor capture and current-work record.

This excerpt demonstrates both defects without depending on the temporary run location. The source follows several substantive claims rather than each finding, and it does not state the capture date even though the fixture supplied `2026-09-19`. The current instruction already says to put the source on the next line and to include a captured page's path and capture date. The result therefore remains an observed R6 behavior failure and an R8 citation-detail failure, not a missing structural checker.

The bounded correction should remain instructional: make the citation unit explicit with a short example that pairs each finding with its next-line source and shows `path, captured YYYY-MM-DD` for outside material. Do not add a semantic scoring engine or another persistent state mechanism.

## Post-correction trial

Updated #370 head `e0172bcab9e1974c626c48990e71e7fd62491381` changed only `plugins/second-brain/skills/knowledge-find/SKILL.md`: 13 additions and 2 deletions. It made “immediately” explicit, prohibited grouped sources, and added two short finding/source examples, including an outside capture date. `git diff --check` passed. The changed skill's SHA-256 was `dc2d7a3946fb8a5b18dd42b5f67c1558acb5b549c9fd170b2a985aaccb39c8ba`, replacing baseline hash `1135088918768c752f650378d6c9e452e6f642c2ffc2550ba07e17b818a992de`. No mechanical code changed.

Exactly one fresh post-change `mixed-provenance-routing` trial ran against integrated candidate `7c9ef832bb3c52079ca4f1200fc2a4f6474177c8`. It used the same host, Codex CLI, model, isolation, predeclared scenario, and local-only fixture contract as the baseline. It started `2026-09-20T20:42:56.332Z`, finished `2026-09-20T20:44:02.092Z`, and spent 64.924 seconds in the model. Reported usage was 148,758 input tokens, 122,240 cached input tokens, 2,596 output tokens, and 639 reasoning-output tokens. The process exited 0 without timeout, mechanical assertions passed, and the worktree remained clean.

The correction improved the result but did not fully pass the predeclared citation outcome:

| Predeclared outcome | Post-change result | Change from baseline |
| --- | --- | --- |
| Northstar/Oldstar memory conflict and withheld save | Pass | Unchanged. |
| Retry twice routed as proposed, unapproved and undelivered | Pass | Unchanged. |
| Retry once distinguished as live implementation evidence | Pass | Unchanged. |
| Queue/worker routed to disabled System Guide | Pass | Unchanged. |
| Slow-query work kept as task/current work | Pass | Unchanged. |
| Hourly/nightly conflict and project authority | Pass | Unchanged. |
| Every substantive finding has an immediately following source; outside citation includes capture date | **Fail** | The external capture now correctly says `captured 2026-09-19`, and many claims use immediate source lines. Other substantive findings still lack an immediately following source. |
| No durable files changed | Pass | Unchanged. |

Representative corrected behavior:

> The captured outside source says exports run hourly.
>
> Source: `ai-external-knowledge/vendor-schedule/README.md` (captured 2026-09-19).

Representative residual failure:

> This is current implementation truth, not a requirement. It should not be copied into lasting memory merely to duplicate inspectable code.

No source line follows that substantive finding. The hourly/nightly section also gives sourced bullet facts, then adds the substantive conclusions that nightly is current project truth and runtime remains unverified without a source immediately after either conclusion. The final conflict summary groups four substantive findings without paired source lines.

Therefore the R8 capture-date defect is corrected in this observed trial, while the strict R6 “every substantive finding” format remains an observed behavior failure. The instruction is already direct and includes the requested example. Further stacking of similar wording is unlikely to supply proportional value. Preserve both results and treat strict formatting reliability as unresolved unless the owner changes the requirement, accepts the observed limitation, or chooses a different small intervention. Do not rerun this scenario merely to obtain a pass.

## Final distinct-intervention trial

Main authorized one final, distinct intervention rather than another unchanged sample. Updated #370 head `1036edac01ba12d23b0117496fa301e427711a61` consolidated the existing citation wording into a native final scan. It explicitly covered inferences, repeated conclusion/summary claims, inference labeling, removal of redundant recaps, and the ban on grouped sources. The change introduced no parser, controller, approval change, durable state, or extra checklist layer. Integrated candidate `b6cc8c7c64c5e8a13e044f58afda4a4ba540ec3a` carried that head. `git diff --check` passed, and the changed `knowledge-find/SKILL.md` SHA-256 was `301bf5d76bec1117391b2a697e6e391c088693ef49e4770e88cfdb2b4705bc6c`.

Exactly one final trial ran against that candidate with the same predeclared scenario and host/isolation contract. It started `2026-09-20T20:49:20.191Z`, finished `2026-09-20T20:50:27.337Z`, and spent 66.349 seconds in the model. Reported usage was 220,790 input tokens, 190,080 cached input tokens, 2,759 output tokens, and 609 reasoning-output tokens. The process exited 0 without timeout, mechanical assertions passed, and the worktree remained clean.

Outcomes 1–6 and 8 passed again. The outside source again included `(captured 2026-09-19)`, so the observed R8 date correction held. The response was more compact and paired every numbered topic with a source block. For example, the exact response began its first item:

> **Northstar Labs — lasting memory candidate and current owner-reported truth.** The owner’s newer statement supersedes the saved Oldstar claim for this conversation. It belongs in the existing customer memory topic, but updating that durable record requires separate per-save approval. Until saved, future sessions may still encounter the stale Oldstar record.
>
> Source: Fixture owner, current conversation (2026-09-20); `knowledge/project.md`; `knowledge/memory/memory-entries/customers/legacy-customer.md`

There are two different standards to assess:

1. The final instruction's added “before another sentence or paragraph” clause imposes sentence-level placement. The response does not satisfy that clause because each numbered topic contains several sentences before its source.
2. The original PRD R6 and approved walkthrough require one source directly below each finding. They do not define every sentence as a separate finding. On that governing meaning, each numbered paragraph is one coherent finding: it states the result, qualification, authority and uncertainty for one topic, then gives its source directly below. The final approval-boundary finding and clean-worktree finding also have their own source lines. The final response therefore passes the original per-finding R6 requirement and the R8 capture-date detail.

The first two trials are not automatically relabeled. The baseline grouped sources after multiple paragraphs and omitted the external capture date. The second trial still left standalone findings and conclusion paragraphs without a following source. Only the final response consistently organized each finding as one sourced topic.

The citation trial cycle stops here regardless of interpretation. The evidence shows that compact, topic-level findings with directly following source blocks are achievable, while the agent-created sentence-level clause is both stricter than the approved requirement and unsupported by this sample. The smallest source cleanup is to remove that over-specific clause while retaining the useful native final scan, inference labeling, summary handling, capture-date example and ban on end-grouped sources. Do not burden the owner with a new granularity decision created by implementation wording, and do not continue stochastic patch/sample cycling.

Main reviewed the final response, PRD R6, and the approved walkthrough on 2026-09-20 and accepted this synthesis: the final observed response is a bounded pass under the original per-finding requirement, not under the added sentence-level clause. Removing only “before another sentence or paragraph” restores instruction fidelity; it does not relax the PRD. The final model trial ran against stricter #370 head `1036edac01ba12d23b0117496fa301e427711a61`, before that authorized source cleanup. No post-cleanup model trial is required or authorized. A later corrected source head therefore receives source-only review unless a separate material issue appears.

Final source-only verification completed against #370 head `e1275c2babefbf7685e11c3a28dfa2d4c8863bc5`, integrated as candidate `4317289a94af45896325a7d5b578a5ae346aabc1`. The diff from stricter trial head `1036edac01ba12d23b0117496fa301e427711a61` changes only four lines in `plugins/second-brain/skills/knowledge-find/SKILL.md`: it replaces the sentence-level phrase with “must be directly followed on the next line by its source.” The final skill SHA-256 is `64b5c63706d5cad1860d7b3e532b67fa2cc893d1356319db9eaf44bdba25edb5`. `git diff --check` passed, the integrated worktree was clean, and no other path changed in that head-to-head diff. This matches the authorized per-finding cleanup and leaves the useful final scan, inference, summary, example, capture-date and no-grouping guidance intact. No model rerun was performed.

## Deterministic verification

The following passed against integrated candidate `564a28b`:

- `node tests/link-check.mjs`: 424 relative links, zero failures.
- `node tests/orphan-check.mjs`: 233 shipped files reachable from 68 index documents, zero failures.
- `node tests/installed-copy-check.mjs`: 27 checks passed.
- `node tests/knowledge-startup-check.mjs`: 12 checks passed.
- `claude plugin validate .`: passed.
- `node --test tests/knowledge-schema.test.mjs plugins/second-brain/tests/*.test.mjs tests/toolkit-startup.test.mjs tests/system-guide-integration.test.mjs`: 71 Node tests passed, plus 7 System Guide integration checks.
- `node tests/knowledge-behavior/run.mjs --source-root "$PWD" --handoff-source-root "$PWD" --preflight-only true --results-dir <temporary-directory>`: all five scenario preflights passed.

The model command was:

```sh
review_results=$(mktemp -d)
node tests/knowledge-behavior/run.mjs \
  --source-root "$PWD" \
  --handoff-source-root "$PWD" \
  --scenario mixed-provenance-routing \
  --results-dir "$review_results" \
  --timeout-seconds 900
```

Mechanical success establishes that the runner, copied fixture, checker, hooks preflight, model process, and no-write assertion completed. It does not turn the failed citation outcome into a pass or establish hook registration and native delivery.

## Older action-reminder finding

`plugins/second-brain/hooks/save-reminder.mjs` stores one state file per session and records only the bare branch name. A disposable two-repository fixture used one session identifier and branch `feature` in both repositories. The first repository's `gh pr create` attempt produced the expected one-time hold; the second repository's first attempt emitted nothing because `feature` was already recorded.

This code predates #370-#373. The cross-root collision is a real state-scope weakness, but its practical severity is low until a supported native workflow is shown to reuse one session across project roots.

The fresh per-action review gap is distinct and more significant. The once-per-branch state is not tied to the current action, human turn, or completion-review generation. After the first held PR attempt, a later PR action on the same branch is always allowed, even if substantial new work happened after the review that satisfied the first hold. The manual and completion checkpoint still require review, but the action reminder cannot establish or request a fresh review at that later save moment. This reminder describes itself as a one-time prompt rather than enforcement. Treat the behavior as an unresolved action-generation integration gap. Fix it with the smallest supported link to fresh review state; do not add a durable review ledger merely for enforcement.

## Complexity assessment

No material over-engineering blocker was found in #370-#373. The completion checkpoint keeps small temporary state, the save inspector is read-only, the behavior runner preserves evidence without claiming semantic acceptance, and the feedback correction removes unsupported constraints rather than adding machinery. The remaining host, asynchronous-helper, cross-computer, startup-complete-read, save-moment, and rollout gaps should be proven with current native mechanisms before considering new ones.

## Limits and current disposition

- The trial used root/manual fallback. Copied hooks were intentionally unregistered, so it is not native hook-attribution evidence.
- The local bare remote does not exercise network authentication, another computer, or real publication contention.
- One successful or failed model trial does not establish a reliability rate.
- Claude Code model execution, Codex desktop, Windows, compaction/clear, subagent identity, actual out-of-order Stop delivery, native asynchronous save-helper lifetime/results, and real cross-computer recovery remain open.
- Full requirements/design approval, target rollout, and owner acceptance remain separate.
- Preserve all three results: two failures under original R6, one final bounded pass under original R6 and R8, and the final sample's separate noncompliance with the temporary sentence-level clause. The citation trial cycle is closed; no further model rerun is warranted.
