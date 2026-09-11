---
name: prd-creator
description: "Generate a Product Requirements Document (PRD) for a new feature, app, or project. Use when planning a feature, starting a new project, or when asked to create a PRD. Triggers on: create a prd, write prd for, plan this feature, requirements for, spec out."
user-invocable: true
---

# PRD Generator

Create detailed Product Requirements Documents that are clear, actionable, and suitable for implementation. The PRD should store functional requirements, process requirements, logic requirements, UI/UX requirements, data model requirements, end-user experience, etc. This should never store solution design or technical information. If while refining the PRD the user mentions some potenital solution design options to explore when designing the solution from a technical perspective, put those in the

---

## The Job

1. Receive a feature description from the user
2. Ask 3-5 essential clarifying questions (with lettered options)
3. Generate a structured PRD based on answers
4. Save to `tasks/prd-[feature-name].md`

**Important:** Do NOT start implementing. Just create the PRD.

---

## Step 1: Clarifying Questions

Ask only critical questions where the initial prompt is ambiguous. Focus on:

- **Problem/Goal:** What problem does this solve?
- **Core Functionality:** What are the key actions?
- **Scope/Boundaries:** What should it NOT do?
- **Success Criteria:** How do we know it's done?

### Format Questions Like This

```
1. Question?
   A. Answer 1 (recommended)
   B. Answer 2
   C. Answer 3
   D. Other: [please specify]

2. Question?
   A. Answer 1 (recommended)
   B. Answer 2
   C. Answer 3
   D. Other: [please specify]

3. Question?
   A. Answer 1 (recommended)
   B. Answer 2
   C. Answer 3
   D. Other: [please specify]
```

List which answer you recommend always. This lets users respond with "1A, 2C, 3B" for quick iteration. Remember to indent the options.

---

## Step 2: PRD Structure

Generate the PRD with these sections:

### Table of Contents

Table of contents go here

### 1. Introduction/Overview

Brief description of the feature and the problem it solves.

#### Why this exists

Content

### 2. Goals

Specific, measurable objectives (bullet list).

### 3. Requirements

### Requirement Area 1

#### Requirement Sub Area 1

##### Requirement 1

1. Requirement Title

2. Description
3. Acceptance Criteria

Each requirement should be small enough to implement in one focused session.

**Important:**

- Acceptance criteria must be verifiable, not vague. "Works correctly" is bad. "Button shows confirmation dialog before deleting" is good.
- **For any requirement with UI changes:**

Be explicit and unambiguous.

### 5. Non-Goals (Out of Scope)

What this feature will NOT include. Critical for managing scope.

### 8. Success Metrics

How will success be measured?

- "Reduce time to complete X by 50%"
- "Increase conversion rate by 10%"

### 9. Open Questions

Remaining questions or areas needing clarification.

### 10. Potential Solution Designs to Explore

1. x
2. y
3. z

---

## Writing for Junior Developers

The PRD reader may be a junior developer or AI agent. Therefore:

- Be explicit and unambiguous
- Avoid jargon or explain it
- Provide enough detail to understand purpose and core logic
- Number requirements for easy reference
- Use concrete examples where helpful
