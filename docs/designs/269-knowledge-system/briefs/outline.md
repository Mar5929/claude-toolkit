# Design document outline: docs/designs/269-knowledge-system.md

Target reader: a junior intern. Plain English. Short sentences. No figurative language. Every part names the documentation page it follows.

1. What this document is. Status: draft solution design for owner approval. The PRD is still `proposed` at stage 02; two questions are open before approval. This design does not change that.
2. What the knowledge system solves. The intent in ten lines, from the PRD's "Why this exists" and "How the owner works".
3. Design philosophy. Mike's brief in plain form. Three kinds of control, named once and used throughout: ENFORCE (the harness blocks or requires it), GUIDE (the right text reaches the agent at the right moment), JUDGE (the agent decides with its own reasoning). Rule: enforce only writes to lasting files and the few moments that damage trust if missed; guide everything else; never build a scorer or a second reasoning engine.
4. The parts, in one table (bill of materials): project files, rule files, skills, hooks by event, checker and tools, settings. For each: kind, path, purpose in one line, enforce or guide, context cost.
5. A session, start to finish. The approved walkthrough's six parts, each step mapped to the part that does it. One mermaid flowchart of the designed process.
6. Each part in detail: what it is, the harness mechanism and doc page followed, when it runs, what it enforces vs guides, its inputs and outputs, context cost, what could still go wrong and how it recovers.
7. Requirement map: 30 rows. requirement | parts | enforced, guided, or judged | check that proves it | known limit.
8. Codex: how each part is delivered there, or the named gap and what the setup report says.
9. What changes from today: keep / change / drop table for every current part, with the reason.
10. Riskiest assumptions and the small tests that prove them first.
11. Testing plan against requirement 3 (representative sessions), and the repo checks.
12. Build order and suggested work-item split, each naming the requirements it delivers.
13. Requirements to reconsider: out of place, illogical, over-controlling, or ambiguous, each with a recommended answer.
14. Design options where two answers are reasonable, with a recommendation.
15. Open questions for Mike.
