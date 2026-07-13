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
│   ├── archive/                   # retired or superseded material
│   ├── communications/            # emails, Slack, client/team messages
│   ├── deliverables/              # finished artifacts handed to the client
│   ├── deployment/                # cutover plans, deploy runbooks, release notes
│   ├── knowledge-base/            # durable reference knowledge about the org(s)
│   ├── meeting-notes/             # one file per call or working session
│   ├── references/                # source specs, org exports, third-party docs
│   ├── work-items/                # one folder per ticket; local ticket context
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
| `archive/` | Retired or superseded material kept for history |
| `communications/` | Emails, Slack threads, client or team messages |
| `deliverables/` | Finished artifacts handed to the client |
| `deployment/` | Cutover plans, deploy runbooks, release notes |
| `knowledge-base/` | Durable reference knowledge about the org(s) |
| `meeting-notes/` | One file per call or working session |
| `references/` | Source specs, org exports, third-party docs (read-only inputs) |
| `work-items/` | One folder per ticket (named by ticket key), holding local context an agent may need for that ticket |
| `data/` | Object and field mapping, transformation rules, load files |
| `data/backups/` | Point-in-time data exports from the org(s) |

**`.claude/`**: project-scoped Claude Code setup. Scaffold it empty at Gate 1
with `rules/`, `hooks/`, `agents/`, and `settings.json`. Later gates fill it:
Gate 2 adds hooks (production-restriction guards, memory and knowledge hooks),
Gates 3 and 4 add the memory and knowledge curator agents from the `second-brain`
plugin.

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

- **Org merge**: use `references/` and `knowledge-base/` for the analysis of each
  source org, `data/` for the field-level mapping between source and target, and
  `deployment/` for the cutover plan. Consider running the `sf-org-knowledge`
  skill against each source org first.
- **Single org build or managed service**: the same tree works; some engagement
  folders stay empty until needed.
