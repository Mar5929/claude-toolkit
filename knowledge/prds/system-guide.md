---
summary: The optional System Guide keeps useful insights about a system and its parts, so future sessions do not repeat substantial investigation. It does not simply restate the code.
group: Project knowledge
area: system-guide
status: proposed
source: Mike Rihm's requirements discussion on 2026-09-09 and 2026-09-10, followed by his instruction to build on 2026-09-10, for GitHub issue 304.
created_at: 2026-09-09
tags: [system-guide, project-knowledge, requirements]
approved_by: Mike Rihm
approval_date: 2026-09-10
project: claude-toolkit
work_item: "304"
---

# System Guide

## Contents

- [Why this exists](#why-this-exists)
- [Where it sits](#where-it-sits)
- [How to read this](#how-to-read-this)
- [Using the guide](#using-the-guide)
- [1. The owner chooses it](#1-the-owner-chooses-it)
- [2. One place for system explanations](#2-one-place-for-system-explanations)
- [3. PRD or System Guide](#3-prd-or-system-guide)
- [4. Memory or System Guide](#4-memory-or-system-guide)
- [5. Which source wins](#5-which-source-wins)
- [6. The standard sections](#6-the-standard-sections)
- [7. Two separate layers](#7-two-separate-layers)
- [8. Build from real sources](#8-build-from-real-sources)
- [9. Refresh without losing meaning](#9-refresh-without-losing-meaning)
- [10. Approve meaning changes](#10-approve-meaning-changes)
- [11. A short way into the detail](#11-a-short-way-into-the-detail)
- [12. The find order](#12-the-find-order)
- [13. The shared routing table](#13-the-shared-routing-table)
- [14. The startup briefing](#14-the-startup-briefing)
- [15. Report setup clearly](#15-report-setup-clearly)
- [16. Follow the captured documentation](#16-follow-the-captured-documentation)
- [17. Use and maintain it without being asked](#17-use-and-maintain-it-without-being-asked)
- [18. Remove information that no longer helps](#18-remove-information-that-no-longer-helps)
- [Roadmap](#roadmap)

## Why this exists

A new session should be able to understand a project's system without asking
the owner to explain it again or reading every source file. The guide explains
the business it serves, its important parts, and how those parts work together.

The system shows what exists. It does not always explain why a field matters,
which of several sources to trust, or what the business calls a process. The
guide keeps those explanations beside the facts they explain.

It must add useful understanding, not repeat the code in prose. When a session
does substantial work to understand a codebase, keep the useful findings and
their evidence so a future session does not have to repeat that investigation.
Keep the result, not a record of every file opened or step taken.

The Davis Advisors knowledge base is the working example: a short tour, area
indexes, detailed object pages, and separate explanations of meaning. Its
Salesforce-specific tools and database are examples, not required choices for
every project.

## Where it sits

System Guide is a separate, optional toolkit plugin. It keeps its reference at
`knowledge/system/`. It works without the second brain. Sharing the parent
folder does not make it part of that plugin or require it to be enabled.

When enabled, the second brain keeps memory, PRDs, the project map, the glossary, and current
work context. Its `knowledge/README.md` explains where to find each kind of
information, including the System Guide when enabled. The System Guide owns
its contents under `knowledge/system/`. Setup, refresh, and removal of either
plugin preserve the other's content.

On its own, System Guide provides its entry guidance, lookup behavior, refresh,
and approved meaning upkeep. It does not install the second brain or create
its files. References below to memory, PRDs, or a glossary describe where those
kinds of information belong when available; they do not make those stores
required. Both plugins being enabled adds their shared routing and find order.

This PRD describes the System Guide plugin. Other projects keep their own
System Guide contents; those contents are not this plugin's PRD.

The related requirements are in [the second-brain PRD](knowledge-system.md),
especially requirements 11, 12, 16, 18, 19, and 26. Its placement rules and this
document must agree. Adding the System Guide to the find order is a required
change to that neighbor, not a claim that it already happens.

## How to read this

- Status is `proposed`. This describes the wanted system, not an installed plugin.
- Mike approved the summary, name, location, and folder shape on 2026-09-09, settled the later clarifications, and authorized building on 2026-09-10. This records requirements approval, not acceptance of a finished implementation.
- Requirements say what must happen and what the owner sees. Each has a check. Build choices belong on the work item, not here.
- The folder shape is included because the owner chose a standard place to browse and edit the guide. It does not choose a programming language, database, hook, or builder.
- When Mike changes a requirement, update this file in the same reply. Keep the issue's requirements consistent with it.
- After implementation, keep this same PRD and edit it to match accepted behavior. Mark it `finalized` only after its work is complete.

## Using the guide

1. Mike chooses System Guide during project setup or sync.
2. The guide shows which real sources it covers and when those sources were captured.
3. A tool builds the system facts. Mike approves the explanations of purpose and importance.
4. A new session receives a short pointer. It opens the relevant area index and only the pages it needs.
5. When the sources change, affected facts and indexes refresh. Approved explanations stay intact. Any explanation that no longer fits is flagged for review.

## 1. The owner chooses it

- Offer System Guide in project-init for a new project and project-sync for an existing project.
- Enable it only when the owner chooses it for that project. Having the plugin available on the machine is not that choice.
- The choice is independent of the second brain. Lookup, refresh, meaning approval, and cleanup work with or without that plugin.
- A project that does not use it gets no System Guide folders or refresh work.

**Check:** set up a guide-only project, a project using both plugins, and a
project without the guide. Only the first two receive an active guide. The
guide-only project can find, refresh, and maintain its content without any
second-brain files. Sync preserves all choices.

## 2. One place for system explanations

- Keep explanations that add insight or save substantial investigation. Other documents link to them instead of repeating them. Do not require a write-up of every system part.
- Before adding content, ask: what will a future reader understand from this that a quick look at the relevant source would not tell them, or what substantial investigation will this save? If neither has a concrete answer, leave it out and point to the source when needed.
- Preserve useful findings from earlier work to understand the codebase: connections across files, the role of a part in a larger process, important effects on other parts, and explanations of why something matters. Link to the supporting sources and keep uncertainty visible. Meaning changes still require the owner's approval under requirement 10.
- Being recoverable from code does not by itself exclude a finding. Repeating an obvious function body adds nothing. Bringing together evidence from many files to explain a whole process can save substantial work.
- Apply this test to both layers. Generated maps and indexes earn their place by making important parts and connections easier to find or understand. A prose copy of every function does not.
- When the second brain is enabled, keep project identity and key locations in `knowledge/project.md`, and the owner's and client's word definitions in `knowledge/glossary.md`. Definitions link to guide pages when more detail is useful. The guide does not copy those stores.
- Without the second brain, use the project's existing overview and word definitions when available. Their absence does not prevent guide use. Resolve terms from relevant guide pages or ask when the meaning remains unclear; do not create second-brain files to satisfy this requirement.
- Keep work status in the work tracker and repeatable instructions in skills. The guide can describe a recurring system process and link to the skill for operating it.

**Check:** compare two candidates. "This function returns the sum of these two
values" merely repeats an obvious function and is left out. A supported map of
several processes that overwrite the same field is kept when it saves tracing
those processes again. A future session can find the conclusion, follow its
evidence, and see any uncertainty without repeating the original investigation.
When a glossary is available, look up that field by a client phrase: the
glossary leads to the explanation instead of copying it.

## 3. PRD or System Guide

Test each statement separately. Split a note that contains both kinds.

| Test | Home | Example |
| --- | --- | --- |
| Does it define what the system must do, what the user gets, or the business reason for that required behavior? | PRD | A user can find an advisor by name or firm, so they can find the right person even when names repeat. |
| Does it describe an existing part, its purpose, or its connections? | System Guide | The advisor search uses Contact and Account. The firm field links an advisor to their firm. |

A PRD starts before the behavior is built and is kept accurate afterwards. It
does not become a list of objects, fields, or code paths after implementation.
The guide records the actual parts that deliver that behavior and links back
to the PRD when the requirement explains their purpose.

**Check:** separate a note containing a search requirement and its existing
object connections. The requirement goes in the PRD. The connections go in
the guide. Neither copies the other's detail.

## 4. Memory or System Guide

- An explanation of an existing feature, field, process, or application belongs in the guide when it passes requirement 2's usefulness test. An obvious restatement of code is not saved in either the guide or memory.
- A lasting decision or lesson belongs in memory when it passes the second brain's memory test. Keep it short and link to the detailed guide page.
- Something recoverable from code or the live system never becomes memory just because it took time to investigate.
- Deployment work status belongs in the work tracker.

Example: a note says what advisor matching does, why the current matching
fields matter, that Mike rejected name-only matching after a collision, and
that production deployment is owed. Put the current explanation in the guide,
the decision and its lesson in memory with a link, and the deployment task in
the tracker. Required matching behavior belongs in the PRD.

**Check:** split that note into its proper homes. Memory contains neither the
feature write-up nor deployment status.

## 5. Which source wins

| Question | Source that wins |
| --- | --- |
| What should the system do? | A finalized PRD. |
| How is the system put together, and what are its parts for? | The System Guide. |
| What exists right now? | The live system. |

Memory never overrides these sources. A proposed PRD describes wanted work,
not proof of current behavior. A captured snapshot does not prove live state
after its capture date.

Report disagreements and name the sources. Do not silently select a convenient
answer or rewrite approved meaning to hide a conflict.

**Check:** a guide describes a field that is absent from the live system.
Report the difference and the guide's source date. Do not claim the field
exists because the guide says so.

## 6. The standard sections

The normal location and sections are:

```text
knowledge/system/
  README.md          Entry page, coverage, last refresh
  tour.md            One-page system overview
  business/          Business purpose and people the system serves
  data-model/        Overall arrangement of the data
  objects/           Key objects, application records, or database tables
  fields/            Important fields, their purpose and authority
  processes/         Recurring processes and the parts that carry them out
  relationships/     What connects, reads, writes, or depends on what
  applications/      Sub-applications and what each does
```

- Each section has a `README.md` index and separate `generated/` and `meaning/` folders for the two layers. Keep unknown or uncovered areas visible without inventing content.
- Overview pages and indexes summarize and link; detailed facts and explanations each keep one home.
- The sections work for Salesforce and other systems. An object can be a Salesforce object, an application record, or a database table. Do not require Salesforce names or concepts in other projects.
- Add areas such as security, integrations, configuration, or operations when the project needs them.
- An existing guide can keep its established location, such as Davis's `engagement/knowledge-base/`. Record the actual location and link to it. Do not move it merely to enable the plugin.

**Check:** navigate an advisor system and a non-Salesforce order application
using the same section names. In both, find a key record, a key field, a
process, and their connections without reading unrelated pages.

## 7. Two separate layers

- Generated content records what the real sources show. A tool rebuilds it. Nobody edits that output by hand.
- Meaning content explains purpose, importance, and which source is authoritative. It is maintained by hand under the owner's approval.
- Each explanation points to the part it explains. Readers can tell generated evidence from an approved explanation.
- A generated page can display or link to approved meaning, but its rebuild never replaces the separately kept meaning.

**Check:** open a field's evidence and explanation. Identify where each came
from and where a correction belongs without guessing.

## 8. Build from real sources

- Build the generated layer from the project's source files or a captured system snapshot. Name the source, its scope, and its capture or revision date.
- Include source facts where they support useful navigation, connections, or explanations. Do not generate redundant descriptions merely because a source file exists; apply requirement 2.
- Show what was covered, what was not covered, and what could not be determined.
- Distinguish facts directly found in the sources from inferred connections. An uncertain connection is never presented as confirmed.
- Building the guide reads its sources; it does not change the system being documented.

**Check:** build from a limited snapshot. The guide identifies that snapshot
and its gaps. It does not claim to describe parts outside the captured scope.

## 9. Refresh without losing meaning

- Refresh after the source material changes. For Davis, that includes every production metadata pull. Other projects use the equivalent source update.
- Refresh affected pages and indexes. Leave unrelated content unchanged.
- Preserve approved meaning across both a partial refresh and a full rebuild. This prevents accidental loss; it does not prevent deliberate correction or deletion under requirements 10 and 18.
- Show the latest successful refresh and the source it used. A failed refresh must not appear successful.
- Flag explanations and links whose parts were removed, renamed, or changed. Keep those explanations for review instead of deleting or silently applying them to another part. The review decides whether to correct, replace, or delete them; it does not require keeping them forever.

**Check:** change one field and remove another in a source snapshot. Refresh.
The facts change, the owner's explanations survive, and the removed field's
explanation is flagged. Repeat with a full rebuild and confirm the same result.

## 10. Approve meaning changes

- Before an agent adds, edits, moves, or deletes meaning, show the owner the exact proposed text, its destination, its source, and any uncertainty. For deletion, show what will be removed and why it is no longer needed.
- Save only the meaning the owner approves. Silence or approval of a refresh is not approval of new meaning.
- The owner can edit meaning directly. A later refresh preserves those edits.
- Record who approved meaning and when, so a reader can check its basis.

**Check:** approve one explanation and reject another. Only the approved
change is saved. Edit that explanation by hand and rebuild; the edit remains.

## 11. A short way into the detail

- The entry page explains what the guide covers, where each section starts, how to use it, and when it was refreshed.
- The tour fits on one page. It introduces the business, major parts, recurring processes, and where to read next.
- Each area index lists its pages with a short description and a link.
- Readers can follow connections across objects, fields, processes, and applications without reading the whole guide.
- Missing or stale pages are called out before the agent checks the underlying sources. Cite the source actually used in the answer.

**Check:** ask which process writes an important field. Starting from the
entry page, find the field and the writing process through the relevant index
and links. Open the actual evidence before answering.

## 12. The find order

When both plugins are enabled, keep the second brain's existing order, with
System Guide added to step 4:

1. Current work context.
2. Standing rules.
3. Skills.
4. PRDs, memory, and System Guide through their indexes and relevant pages.
5. Past sessions when the earlier steps do not answer.

Before step 4, resolve the owner's words through the glossary. Within step 4,
start structure questions at the System Guide index, required-behavior
questions at PRDs, and decisions or lessons at memory. Check the work tracker
for work-item questions. Follow links and apply requirement 5 before stopping
at an answer; a memory hit cannot override a stronger source.

Without the second brain, follow the project's standing guidance and check
the System Guide's relevant index and pages before broad source investigation
for a system question. Use an existing glossary or project context when
available. Skip absent second-brain sources without errors or a demand to
install them. The source rules in requirement 5 still apply.

**Check:** ask how a field connects to a process. The agent checks the guide
before a broad code search or past-session search, opens the relevant page,
and names its source. Repeat with the second brain disabled: guide lookup
still works. When the guide is off, the agent skips that source.

## 13. The shared routing table

- When both plugins are on, the second brain's routing table sends explanations of existing parts, purpose, and connections to System Guide at its actual project location.
- Keep PRDs for required behavior, memory for qualifying facts and lessons, and the tracker for work status. Memory links to guide detail rather than copying it.
- When the second brain is on and System Guide is off, the table says System Guide is not configured. Detailed system descriptions do not become memory or PRD content as a fallback.
- If an off project already has a suitable reference, use its documented location. Otherwise name the missing destination before proposing a lasting save.
- Without the second brain, the guide's own entry guidance explains what belongs there, what to consult, and how approved upkeep works. It does not depend on `knowledge/README.md` or second-brain commands.
- When both plugins are present, keep routing words in the shared manual and this plugin's own entry guidance consistent.

**Check:** present the same feature write-up in an on project and an off
project. Neither saves it as memory. Each names the available reference home
or says that none is configured. In a guide-only project, its own guidance is
enough to place the write-up correctly.

## 14. The startup briefing

- When on, startup names System Guide and its entry path. It says whether coverage is known to be incomplete, stale, or unavailable.
- This briefing works without the second brain. When both plugins are enabled, show the guide information once rather than duplicate it in two briefings.
- Keep startup short. Do not load the tour, all area indexes, or detailed pages into every session. Open those when the task needs them.
- When the guide is off and the second brain is on, its startup says System Guide is not configured, with no directions to read or refresh missing guide files. With neither plugin enabled, no guide startup behavior is required.

**Check:** start sessions with the guide alone, both plugins, the second brain
alone, and neither plugin. Each receives the applicable guidance, with no
duplicate guide briefing or attempt to read absent second-brain files. None
loads the whole guide.

## 15. Report setup clearly

- Project-sync reports System Guide as on, off, or needing repair. It gives the actual guide location when one is configured.
- A configured guide with missing required parts is reported as needing repair, not as off or successfully installed.
- Sync preserves the owner's choice and existing meaning. Repairs do not approve new explanations on the owner's behalf.
- Disabling the plugin stops its active behavior and preserves existing guide content. Removing either plugin never deletes the other's files.
- Disabling or removing the second brain leaves an enabled System Guide working. Enabling the second brain later adds the shared lookup and routing without recreating or replacing the guide.

**Check:** sync an enabled project, a declined project, and an enabled project
with a missing entry page. Each gets the right report without losing content.
Disable the second brain in a project using both: guide lookup and upkeep
still work. Enable it again and confirm that existing guide content is kept.

## 16. Follow the captured documentation

Everything shipped for System Guide follows the captured Claude Code
documentation at `ai-external-knowledge/claude-code/`, using its README as the
index. Before building a hook, skill, plugin part, rule, or startup behavior,
read the page that covers it.

The solution design on the work item names the page and the practice followed.
Keep globally loaded text short and load folder-specific instructions only
where they apply. Requirements decide what the guide does; the documentation
decides how Claude Code is used to deliver it. Report any disagreement.

**Check:** pick a shipped part. Its work-item design names a captured page,
and the part follows that page's guidance.

## 17. Use and maintain it without being asked

The owner does not have to mention System Guide, use a special command, or
remember to ask for upkeep. The agent recognizes relevant moments during
ordinary conversation and work. Reading the guide and spotting needed changes
do not require permission. Meaning changes still follow requirement 10.

| What comes up | What the agent does |
| --- | --- |
| A question about a system part, its purpose, how a process works, or what a change could affect | Find and read the relevant guide pages before repeating broad investigation. Follow their sources when current evidence is needed. |
| A requested change touches a documented part | Read the affected explanations and connections before planning the change. Do not treat documented behavior as approval to change the system. |
| The owner supplies or corrects an explanation of the system | Check the existing page and source, then propose the needed addition or correction in that reply. Distinguish a correction about the existing system from a request for future behavior, which belongs in a PRD. |
| Investigation produces useful understanding that would take substantial work to recover | Apply requirement 2, look for an existing home, and propose the useful findings for the guide with their evidence. |
| Source material or implemented behavior changes | Identify affected pages, refresh generated content under requirement 9, and propose any needed meaning changes. |
| A page is wrong, duplicated, no longer useful, or contradicted by evidence | Explain the problem and propose a correction, merge, or deletion under requirement 18. Do not use a known wrong statement as current truth while it awaits review. |

- Work out which kind of information is involved before proposing a save. A desired behavior, a work status, or an obvious code summary does not become guide content just because it arose in conversation.
- Before a substantial investigation or system change is handed off, check whether its useful findings and affected guide pages have been handled. Bring any remaining proposal to the owner then; do not wait for a later request to remember it.
- Keep this focused on the topic and affected pages. Do not scan the whole guide, repeat an unchanged proposal, or propose a write for every message. If the guide already covers the answer, use it without adding another copy.
- When the guide is off, follow requirement 13 rather than enabling it or creating content without the owner's choice.

**Check:** in a fresh session, never mention System Guide. Ask what a field
affects, correct its business purpose, then finish an investigation that finds
an undocumented interaction between several processes. The agent reads the
guide for the first question and raises the relevant meaning proposals for
the correction and investigation. A later unrelated message produces no guide
proposal. No unapproved meaning changes are saved.

## 18. Remove information that no longer helps

The guide is maintained, not kept as an unchangeable record. Information may
be corrected, shortened, combined, replaced, or deleted when that makes the
guide more useful and accurate. Keeping an explanation across a rebuild does
not require keeping it forever.

- When reading or updating a page, look for claims that are wrong, duplicates, details that merely repeat code, and explanations that no longer serve a useful purpose. Age alone is not enough to delete something.
- Remove obsolete generated entries as part of refresh when the source evidence supports removal. A failed pull or an incomplete snapshot is not proof that a part no longer exists. Repair affected generated indexes and links.
- For meaning, propose the exact removal and reason under requirement 10. Once the owner approves, remove it and update affected guide references together. Do not leave the deleted claim in the tour or an index as if it were still true.
- Preserve any still-useful explanation when combining or shortening pages. Keep a short historical explanation only when it helps someone understand the current system; do not require a retired page or archive copy for every deletion.
- A separate lasting decision or trap may qualify for memory under the second brain's rules. Deleting guide content is not by itself a reason to create a memory.

**Check:** find a duplicate explanation, an obsolete process explanation, and
an old explanation that is still useful. Propose combining the duplicate and
deleting the obsolete content, and retain the useful explanation. After the
owner approves, the removed content disappears from the guide and its current
references. A later rebuild preserves that approved cleanup. An incomplete
source snapshot does not cause unrelated generated entries to be deleted.

## Roadmap

[Issue 304](https://github.com/Mar5929/claude-toolkit/issues/304) carries
requirements 1-18. The solution design and build plan live on that issue,
following Mike's requirements and build approval. If the work needs to be
split, add the approved work-item order and requirement numbers here. The
tracker keeps status; this roadmap does not copy it.
