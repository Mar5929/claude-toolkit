# Salesforce project scaffold (Gate 1)

The standard Gate 1 layout for a Salesforce project: an SFDX source project plus
a `delivery/` tree for client-work artifacts. Offer this whenever the
stack is Salesforce or SFDX. It fits org builds, org merges, and ongoing
managed-service work. Every folder is optional; confirm the set with the owner
before creating anything.

## Tree

```
<project>/
├── sfdx-project.json
├── .gitignore
├── .forceignore
├── README.md
├── config/
│   └── project-scratch-def.json
├── force-app/main/default/        # metadata for the target org (SFDX source)
├── manifest/
│   └── package.xml                # retrieve/deploy manifests
├── scripts/
│   ├── apex/                      # anonymous Apex scratch files
│   └── soql/                      # SOQL scratch queries
├── ai-external-knowledge/         # outside docs saved as Markdown for agents
├── delivery/                      # client-work artifacts
│   ├── project-overview/          # raw project brief and client framing
│   ├── archive/                   # retired or superseded material
│   ├── communications/            # emails, Slack, client/team messages
│   ├── deliverables/              # finished artifacts handed to the client
│   ├── deployment/                # cutover plans, deploy runbooks, release notes
│   ├── meeting-notes/             # one file per call or working session
│   ├── references/                # source specs, org exports, client docs
│   └── data/
│       └── backups/               # point-in-time data exports
└── .claude/
    ├── settings.json
    ├── rules/                     # project rules (fill via later gates)
    ├── hooks/                     # project hooks (fill via later gates)
    └── agents/                    # project subagents (fill via later gates)
```

## What each part is for

**SFDX project** (`sfdx-project.json`, `force-app`, `manifest`, `config`,
`scripts`): the standard `sf project generate` layout. `force-app/main/default`
holds the metadata for the target org in SFDX source format. `manifest/package.xml`
drives retrieve and deploy. `config/project-scratch-def.json` defines scratch
orgs. `scripts/apex` and `scripts/soql` hold one-off Apex and queries.

**`delivery/`**: the briefs, records, sources, work files, and finished
artifacts produced or received while doing the client work. Curated context
that helps future agents work correctly belongs in `knowledge/`.

| Folder | Holds |
|---|---|
| `project-overview/` | Raw project brief or client-provided framing when the project needs that artifact home. Curated project framing belongs in `knowledge/project.md`, with other persistent circumstances under `knowledge/memory/` |
| `archive/` | Retired or superseded material kept for history |
| `communications/` | Emails, Slack threads, client or team messages |
| `deliverables/` | Finished artifacts handed to the client |
| `deployment/` | Cutover plans, release evidence, and release notes. Reusable operating procedures belong in a skill, not in memory |
| `meeting-notes/` | One file per call or working session |
| `references/` | Source specs, org exports, and client-supplied documents (read-only inputs). Public documentation captured for agents goes in root `ai-external-knowledge/` instead |
| `data/` | Object and field mapping, transformation rules, load files |
| `data/backups/` | Point-in-time data exports from the org(s) |

`grill-me` saves discovery in the flat `knowledge/brainstorms/` collection. It does
not save interviews under `project-overview/` or copy them into a system area.
With project knowledge installed, the brainstorm links to every resulting specification.

**`ai-external-knowledge/`**: public documentation pulled in with a scraper such
as Firecrawl and saved as Markdown, one folder per topic. It sits at the project
root, not under `delivery/`, because every project gets it whatever the stack.
The `ai-external-knowledge.md` rule in `library/rules/general/` governs it.

When project knowledge is selected, do not create a `delivery/knowledge-base/`
folder. Use `knowledge/memory/`
for curated agent memory. Keep raw meeting notes, communications, deliverables,
deployment evidence, and client sources in the delivery folders above. If the
owner declines project knowledge and needs a local reference library, offer
`delivery/knowledge-base/` separately instead of adding it by default.

**`.claude/`**: project-scoped Claude Code setup. Scaffold it empty at Gate 1
with `rules/`, `hooks/`, and `settings.json`. Gate 2 adds approved guards. Gate
3 installs the packaged knowledge tools and fail-open startup loader when the
owner selects project knowledge. It does not restore the retired verifier,
large rule, or per-folder indexes.

## Config defaults

- `sourceApiVersion`: the current Salesforce API version (update per release).
- `namespace`: empty (unmanaged metadata). Set only for managed-package work.
- Package directory: `force-app`, marked default.
- Scratch org edition: `Developer`.

## Notes

- Git does not track empty folders. Add a `.gitkeep` or a one-line `README.md`
  in each folder so the structure survives the first commit. A short README per
  folder doubles as documentation.
- `.gitignore` should cover SFDX local state (`.sfdx/`, `.sf/`,
  `.localdevserver/`, `*.log`) and `.claude/worktrees/`. When the owner chooses
  local work tracking, `work init` also adds `/.work-items/` and creates the
  flat tracker at the repository root.
- `.forceignore` should exclude `package.xml`, LWC config files, and Jest tests.
- Data backups can hold real production data (personal data, secrets in note
  fields). Do not commit sensitive exports to a shared or public remote. If the
  repo gets such a remote, add `delivery/data/backups/*` to `.gitignore`.

## Variants

- **Org merge**: use `references/` for raw source material,
  `knowledge/memory/` for approved
  source context and conclusions, `data/` for field-level mapping, and
  `deployment/` for the cutover plan.
- **Single org build or managed service**: the same tree works; some delivery
  folders stay empty until needed.

## Existing projects

Existing Salesforce projects may keep an `engagement/` tree. Do not rename it,
move its files, or create a parallel `delivery/` tree automatically. Setup and
sync tools recognize both paths; `delivery/` is the default only for new
projects. An older `delivery/work-items/` or `engagement/work-items/` tracker is
not current delivery structure. Offer the preview-first `work migrate` flow and
leave the source unchanged until the owner approves cleanup.
