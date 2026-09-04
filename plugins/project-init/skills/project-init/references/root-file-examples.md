# Worked examples: a finished CLAUDE.md and AGENTS.md

`thin-claudemd.md` says what the two root files are for and what goes in them.
This file shows one finished pair, so Gate 5 has something to write against.

The project is `acme-crm`: a Salesforce delivery repository that took `SOUL.md`,
the project knowledge system, captured outside documentation, and a GitHub
board. Adapt the content, keep the shape.

## Sample CLAUDE.md

The two lines above the title are verbatim in every project. This project has
project knowledge installed, so its startup hook loads `SOUL.md` and there is no
separate SOUL route.

````markdown
After you generate your response. Simulate the user saying "Huh? What are you saying?". Then regenerate your response based on that.

Always execute work with the context in mind that the user will likely continue work across multiple AI coding sessions where the session context is cleared and picked up again. You must assist the user in helping establish that continuity across sessions while not adding context that might pollute future agents and skew them. Information must be curated and intentional.

# CLAUDE.md: working in acme-crm

Salesforce delivery for Acme's sales org.

Read `.claude/rules` first. Every file in that folder is a rule for how you work
here, and they are in force for the whole session.

## Project knowledge

The startup hook loads `SOUL.md`, then `knowledge/README.md` once, then
`knowledge/project.md`, `knowledge/current.md`, and the two knowledge indexes.
If that map is not already in this session, read those files once in that order.
If a file is missing, continue and report it. `knowledge/README.md` wins when
project-knowledge instructions disagree.

## Codemap

| Path | What is there, and when to open it |
| --- | --- |
| `force-app/main/default/` | The org's metadata: objects, flows, Apex, permission sets. Detail: `force-app/CLAUDE.md`. |
| `ai-external-knowledge/` | Salesforce documentation captured as Markdown, one folder per topic. Open it before designing against a platform feature, instead of searching the web. Today: `sharing-and-visibility/`, `flow-limits/`. |
| `knowledge/` | What this project decided and why: specifications, memory, current state. The routing table in its `README.md` says which goes where. |
| `docs/` | Documents written for Acme, not for agents. Detail: `docs/CLAUDE.md`. |
| `docs/designs/` | The build plan for one work item: how each approved requirement is met, which files change, how it is tested. Open it when building or reviewing that item. Written once the item's requirements are approved, deleted once `knowledge/prds/` is current. |
| `docs/PRDs/` | Requirements for a feature area bigger than one work item, plus links to the items made from it. Open it before writing items in that area. Kept for as long as the area lasts. Today: `renewals.md`. |
| `scripts/` | Deploy and data-load scripts. Detail: `scripts/CLAUDE.md`. |
| `.claude/` | Rules, hooks, settings. |

## Tools

| Tool | Use it for | Detail |
| --- | --- | --- |
| Salesforce CLI (`sf`) | Deploying and retrieving metadata, running Apex tests. | `.claude/rules/salesforce-safety-guardrails.md` |
| `kb-graph` MCP server | Field, flow, and permission questions across the org. Build it with `python3 tools/kb/build_graph.py`. | `tools/kb/README.md` |

## Where work is tracked

The Acme CRM board on GitHub, connected to this repository. The issue body holds
the requirements and nothing else; progress and decisions go in the comments. An
issue is ready to build when it carries the `refined` label.
````

## Sample AGENTS.md

The whole file:

````markdown
Read CLAUDE.md in this folder and follow it.
````

Codex reads `AGENTS.md` and nothing else on its own, and it expands no import
syntax, so an `@CLAUDE.md` line would sit there as literal text and load
nothing. A plain instruction to open a file is what it follows.

`AGENTS.md` used to repeat the codemap, the working rules, and the folder
detail, so that a Codex session was guaranteed to have the map. That guarantee
cost a hand-maintained second copy of everything, which drifted from the first.
One copy of each thing is worth more than a second copy that is present but
wrong.

## What is deliberately not in either file

- Any rule already in `.claude/rules/`.
- How to talk to the owner. That is machine-wide, in the owner's own
  `~/.claude/`.
- Any multi-step procedure. Those are skills.
- Anything a session could find in one command: what is Git-ignored, what is
  generated, which folders are empty.
- Where anything came from or when it arrived. Git history owns that.
- Current phase, next action, or open work. The tracker owns that.
- What the knowledge folder contains. Its `README.md` owns that.
