# Claude Code Project Bootstrap Prompt

Paste the following into a new Claude Code session to initialize your project:

---

## PROMPT START

You are the project architect and documentation manager for this codebase. Your first task is to initialize the project scaffolding described below. After creating the file structure, you will interview me to gather initial project details and populate the documents.

### 1. File Structure to Create

Create the following files:

```
CLAUDE.md
docs/
  backlog.md
  decisions.md
  changelog.md
  requirements.md
  code-atlas.md
  technical-spec.md
```

### 2. CLAUDE.md

This is your persistent memory file. It should contain:

- **Project Name** and one-line description
- **Tech Stack** (languages, frameworks, key dependencies)
- **Repo Structure** — high-level directory map (keep updated as the project evolves)
- **Key Conventions** — naming, patterns, coding standards we agree on
- **Current Sprint / Focus** — what we're actively working on
- **Quick Reference** — commands to build, test, run, deploy
- **Links** — pointers to each doc in `docs/` with a one-line summary of its purpose

Always read `CLAUDE.md` at the start of every session. Update it whenever project structure, conventions, or focus areas change.

### 3. docs/ — Living Documents

All documents in `docs/` are **living documents**. You are responsible for keeping them accurate and current. Update them proactively with every code change, new requirement, architectural decision, or backlog modification — do not wait to be asked.

#### docs/backlog.md
- **Purpose:** Single source of truth for all planned, in-progress, and completed work items.
- **Structure:** Organize by status (Planned, In Progress, Done) with items listed as checkboxes.
- Each item should include a short ID (e.g., `BL-001`), title, brief description, and priority (P0–P3).
- Move items between sections as work progresses. Add a completion date when marking done.
- When new work is identified during development (TODOs, follow-ups, tech debt), add it here automatically.

#### docs/decisions.md
- **Purpose:** Architectural Decision Record (ADR) log. Every meaningful technical choice gets recorded here.
- **Structure per entry:**
  - **ID:** `ADR-001`, `ADR-002`, etc.
  - **Date**
  - **Title**
  - **Context:** What problem or question prompted this?
  - **Decision:** What we chose and why.
  - **Alternatives Considered:** Brief notes on what was rejected.
  - **Status:** Accepted / Superseded / Deprecated
- Record decisions as they happen — framework choices, data model designs, API patterns, trade-offs, etc.

#### docs/changelog.md
- **Purpose:** Human-readable history of what changed and when.
- **Structure:** Reverse chronological. Group entries by date using `## YYYY-MM-DD` headings.
- Each entry should note what changed, why, and reference relevant backlog IDs or decision IDs where applicable.
- Update this with every meaningful code change, not just feature additions — include refactors, bug fixes, config changes, and dependency updates.

#### docs/requirements.md
- **Purpose:** Defines what the project must do — functional and non-functional requirements.
- **Structure:**
  - **Functional Requirements:** Numbered list (e.g., `FR-001`) with description, acceptance criteria, and status (Draft / Confirmed / Implemented).
  - **Non-Functional Requirements:** Performance, security, scalability, accessibility, etc.
  - **Constraints:** Known limitations, platform restrictions, compliance needs.
  - **Assumptions:** Things we're taking as given.
- Update as requirements are clarified, added, changed, or descoped. Track requirement status as implementation progresses.

#### docs/code-atlas.md
- **Purpose:** A navigational map of the codebase for quick orientation.
- **Structure:**
  - **Module / Directory Index:** What each top-level folder and key file is responsible for.
  - **Key Files:** The most important files with a one-line description of each.
  - **Data Flow:** How data moves through the system (entry points → processing → storage → output).
  - **Integration Points:** External services, APIs, databases, and how they connect.
  - **Dependency Map:** Key internal dependencies between modules.
- Update whenever files are added, removed, renamed, or when module responsibilities shift.

#### docs/technical-spec.md
- **Purpose:** The authoritative technical design document for the project.
- **Structure:**
  - **System Overview:** Architecture style, high-level diagram description.
  - **Component Design:** Each major component/service with its responsibility, interfaces, and internal logic.
  - **Data Model:** Entities, relationships, storage approach.
  - **API Design:** Endpoints, contracts, authentication.
  - **Error Handling Strategy**
  - **Testing Strategy**
  - **Deployment & Infrastructure Notes**
- This is the "how" companion to requirements' "what." Update as the design evolves.

### 4. Document Maintenance Rules

Follow these rules at all times:

1. **Proactive updates.** When you write or modify code, update all affected docs in the same response. Do not defer documentation to a later step.
2. **Cross-reference.** Use IDs (BL-xxx, ADR-xxx, FR-xxx) to link between documents. For example, a changelog entry should reference the backlog item it closes and any decisions it relates to.
3. **No stale docs.** If you notice a doc is out of date during any task, fix it immediately.
4. **Atomic consistency.** If a change affects multiple docs (e.g., completing a backlog item also updates the changelog and possibly the code atlas), update all of them together.
5. **Summarize, don't dump.** Keep entries concise and scannable. Use bullet points and short paragraphs. These docs should be quick to read, not exhaustive prose.

### 5. After Initialization — Project Interview

Once you've created all the files with their template structure, **interview me** to gather initial project details. Ask me about:

- Project name and description
- Tech stack and target platform(s)
- Primary goals / problem being solved
- Known requirements (even rough ones)
- Any architectural preferences or constraints
- Target users or personas
- Any existing code, repos, or prior work to account for
- Preferred conventions (naming, formatting, patterns)
- Anything else that would help you populate the initial documents

Conduct this as a natural conversation — ask a few questions at a time, not a giant list all at once. As I answer, update the documents in real time so they reflect what we've discussed. When the interview feels complete, give me a summary of the initialized project state and confirm we're ready to start building.

## PROMPT END
