---
name: prd-creator
description: "Create and refine a Product Requirements Document (PRD) for a feature, app, or project. Use for PRD drafting, requirements interviews, corrections, or resuming refinement. Keep the agreed draft saved as the owner answers."
user-invocable: true
---

# PRD Generator

Create clear, detailed PRDs using the structure below. Describe required
functionality, processes, business rules, information needs, UI/UX, and the
end-user experience in plain language. Someone who missed the conversation
must be able to understand the intended behavior and recognize when it works.

Keep technical solution design and build plans in their own project record.
If the owner raises a possible implementation approach, retain it only in the
final "Potential Solution Designs to Explore" section, linked to the relevant
requirement and clearly identified as an idea to explore.

---

## The Job

1. Read the owner's description, existing PRD, and relevant project context.
2. Find the project's canonical PRD location and save rules. In an equipped
   toolkit project, use the appropriate file under `knowledge/prds/`; update
   the existing feature-area PRD rather than creating a competing draft.
3. Start the draft from what is already known, using the structure below.
   Leave unanswered details open rather than guessing.
4. Refine it through conversation. Ask the next useful question and save clear
   answers and corrections during the same turn.
5. When the draft is ready, review its requirements and remaining questions
   with the owner. Record full requirements approval only when given.

**Important:** Do NOT start implementing. Just create the PRD.

---

## Step 1: Clarifying Questions

Ask only questions that materially clarify the requirements. Read available
answers first. Focus on:

- **Problem/Goal:** What problem does this solve?
- **Core Functionality:** What are the key actions?
- **Scope/Boundaries:** What should it NOT do?
- **Success Criteria:** How do we know it's done?
- **People and Process:** Who uses it, and what happens before and after?
- **Rules and Exceptions:** What conditions, permissions, or failures change
  what should happen?

Prefer one question at a time so the owner can think aloud. Use a small batch
only when the questions are independent and quick to answer. Do not require a
fixed questionnaire before starting or saving the draft.

### Format Questions Like This

```
1. Who may approve a submitted request?
   A. Its assigned reviewer (recommended)
   B. Any member of the review team
   C. Another approach you describe
```

Recommend an answer when the available context supports one, and briefly say
why. Do not manufacture a recommendation when a business decision is unknown.
Accept either a short option answer or ordinary conversation. If several
questions are shown, the owner can answer "1A, 2C". Use the host's question tool
when available and follow its presentation rules.

---

## Step 2: PRD Structure

Keep this section order and the requirement-area hierarchy. Use the project's
required metadata, including draft status and actual approval details. Saving
an evolving draft does not approve its full contents.

### Table of Contents

Link to the main sections, requirement areas, and useful subareas. Keep those
links current as the PRD changes.

### 1. Introduction/Overview

Describe the feature, the problem it solves, and who will use or be affected
by it. Explain where it fits in the user's existing process.

#### Why this exists

Explain the reason for the feature and the practical consequence of leaving
the problem unresolved. Keep this separate from the measurable goals below.

### 2. Goals

List the intended outcomes in plain words. Use measurable objectives where
meaningful, with agreed targets. Do not invent percentages, deadlines, or
business commitments to fill the template.

### 3. Requirements

Group requirements into meaningful areas. Add subareas when they make a large
area easier to read; a small area can contain requirements directly.

#### Requirement Area 1: [Area name]

##### Requirement Subarea 1.1: [Subarea name, when useful]

###### R1. [Requirement title]

**Description**

State who is involved, what triggers the behavior, what must happen, and the
result the person experiences. Include the business reason when it helps
explain the requirement.

**Rules and exceptions, when relevant**

Capture conditions, permissions, important limits, and failure or alternative
paths that change the behavior. Link to another requirement when it owns a
shared rule instead of repeating that rule here.

**Acceptance criteria**

Use concrete, observable checks. For example:

- When the assigned reviewer approves a pending request, the requester sees
  its approved status.
- A person without approval permission cannot approve the request.
- If approval cannot be saved, the reviewer sees that it is unfinished and
  the request remains pending.

Keep each requirement about one coherent behavior or rule. Build tasks can
later divide the work into implementation sessions. Preserve requirement IDs
as the document changes so links and references remain useful.

For **UI/UX requirements**, describe the relevant actions, visible results,
and important empty, loading, error, or access states. Include accessibility
and device behavior when they affect the intended experience.

For **data requirements**, describe the information the business needs, its
meaning, relationships, and validation rules. Leave tables, code, APIs, and
other technical design choices to solution design unless the owner explicitly
requires a particular compatibility constraint or interface.

### 4. Non-Goals (Out of Scope)

State the boundaries the owner agreed to. Distinguish something excluded from
this feature from something still undecided. Do not silently exclude work
merely because it has not been discussed.

### 5. Success Metrics

Explain how the overall outcome will be judged after use. Acceptance criteria
check individual requirements; these measures assess whether the feature solves
the problem. Include a baseline, target, and measurement period when agreed.

Examples, not default commitments:

- Reduce the time needed to complete a request, against an agreed baseline.
- Reduce requests returned because required information is missing.

If a target is unknown, record the question instead of inventing a number.

### 6. Open Questions

List the unresolved decision, the requirement it affects, and why an answer
matters. Keep possible answers visibly tentative. As answers arrive, update
the affected requirement and remove the resolved question from this section.

### 7. Potential Solution Designs to Explore

Label these as **Potential paths to explore**. They are possible approaches,
not requirements, approved design, or instructions to build that way.

For each retained idea, name the relevant requirement and link to the supporting
design note when one exists. Keep long technical discussion outside the PRD.
Approved design decisions belong in the separate design record with their
approval preserved. Omit this optional section when there are no ideas to keep.

This is always the final section of the generated PRD.

---

## Step 3: Save as the Owner Answers

Once drafting or refinement is authorized, save each clear answer or correction
in the canonical PRD during the same turn. Do not wait until the interview ends
or ask the owner to repeat approval for the same change.

- Update the existing requirement, its acceptance criteria, and any directly
  affected wording. Remove contradictions and duplication instead of appending
  another account of the answer. Preserve useful existing content.
- Keep owner answers distinct from the agent's suggestions. An unanswered
  suggestion is not an agreed requirement. Ask only when uncertainty would
  materially change what gets saved.
- Reread the destination before editing and preserve other sessions' changes.
  Use the project's existing save workflow and required document checks.
- For Git-backed PRDs, finish the authorized commit and push as part of the
  same save. Follow the project's branch and approval rules; where knowledge
  saves go directly to the default branch, use that route. Group the changes
  from one answer into one focused save, not a commit for every sentence.
- Stage only the intended document changes and required generated indexes.
  Inspect the staged diff and verify the push succeeded before saying the
  change is shared. Use focused document checks, not an unrelated full software
  test suite for each answer.
- If access, a conflict, or a save failure prevents completion, state what is
  saved locally, committed, and pushed, and what remains unfinished. Resolve
  routine problems within existing authorization. Never bypass required access
  approval or claim that a local edit reached the shared record.
- Keep the acknowledgement short: "Saved: only the assigned reviewer can
  approve." Continue the conversation naturally. Do not repeat the whole PRD
  or turn each answer into another approval ceremony.

Before calling the PRD ready for full approval, check for contradictions,
unanswered material questions, unapproved assumptions, broken references, and
technical design presented as a requirement. Use the project's existing review
workflow when available. Draft approval, requirements approval, and permission
to build remain separate decisions.

---

## Writing for Junior Developers

The PRD must also make sense to a nontechnical owner and a future reader who
has not seen this conversation. Therefore:

- Be explicit and unambiguous
- Use plain language and explain necessary project terms
- Provide enough detail to understand purpose and core logic
- Number requirements for easy reference
- Use concrete examples where helpful
- Keep the PRD a maintained account of required behavior, not a transcript or
  an ever-growing log of every suggestion
