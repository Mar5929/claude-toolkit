# Salesforce project scaffold (Gate 1)

The standard Gate 1 layout for a Salesforce project: an SFDX source project plus
an `engagement/` tree for all non-code consulting work. Offer this whenever the
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
├── engagement/                    # all non-code work
│   ├── project-overview/          # project brief + grill-me interview output
│   ├── archive/                   # retired or superseded material
│   ├── communications/            # emails, Slack, client/team messages
│   ├── deliverables/              # finished artifacts handed to the client
│   ├── deployment/                # cutover plans, deploy runbooks, release notes
│   ├── knowledge-base/            # durable reference knowledge about the org(s)
│   ├── meeting-notes/             # one file per call or working session
│   ├── references/                # source specs, org exports, third-party docs
│   ├── work-items/                # ticket work items (see work-items-structure.md)
│   │   ├── 01-backlog/            #   holds BACKLOG.md, the running index
│   │   ├── 02-in-progress/
│   │   ├── 03-completed/
│   │   └── 04-archived/
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

**`engagement/`**: everything that is not code. Keeps consulting artifacts in the
repo next to the metadata they describe.

| Folder | Holds |
|---|---|
| `project-overview/` | Raw engagement brief or client-provided framing when the project needs that artifact home. Curated project framing belongs in `knowledge/project.md`, with other durable circumstances under `knowledge/memory/context/` |
| `archive/` | Retired or superseded material kept for history |
| `communications/` | Emails, Slack threads, client or team messages |
| `deliverables/` | Finished artifacts handed to the client |
| `deployment/` | Cutover plans, release evidence, and release notes. Reusable operating procedures belong under `knowledge/memory/operations/` |
| `knowledge-base/` | Legacy standalone knowledge home only when project knowledge is declined. Do not create it alongside `knowledge/` |
| `meeting-notes/` | One file per call or working session |
| `references/` | Source specs, org exports, third-party docs (read-only inputs) |
| `work-items/` | Ticket work items in stage folders (`01-backlog/` holds the `BACKLOG.md` index); one folder per ticket (named by ticket key) with `SPEC.md` + `STATUS.md`. Layout: `work-items-structure.md` |
| `data/` | Object and field mapping, transformation rules, load files |
| `data/backups/` | Point-in-time data exports from the org(s) |

`grill-me` saves discovery in the flat `knowledge/brainstorms/` collection. It does
not save interviews under `project-overview/` or copy them into a system area.
With project knowledge installed, the brainstorm links to every resulting specification.

When project knowledge is selected, omit the legacy `knowledge-base/` folder from new
scaffolding. Use `knowledge/memory/knowledge/`,
`knowledge/memory/references/`, and `knowledge/memory/domain/`
for curated agent memory. Keep raw meeting notes, communications, deliverables,
deployment evidence, and client sources in the engagement folders above.

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
  `.localdevserver/`, `*.log`) and `.claude/worktrees/`.
- `.forceignore` should exclude `package.xml`, LWC config files, and Jest tests.
- Data backups can hold real production data (personal data, secrets in note
  fields). Do not commit sensitive exports to a shared or public remote. If the
  repo gets such a remote, add `engagement/data/backups/*` to `.gitignore`.

## Variants

- **Org merge**: use `references/` for raw source material,
  `knowledge/memory/references/` and `knowledge/memory/knowledge/` for approved
  source context and conclusions, `data/` for field-level mapping, and
  `deployment/` for the cutover plan.
- **Single org build or managed service**: the same tree works; some engagement
  folders stay empty until needed.
