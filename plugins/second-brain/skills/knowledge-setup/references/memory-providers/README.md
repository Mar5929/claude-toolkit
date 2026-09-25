# Memory providers

A project in `external` memory mode keeps working memory, lasting memory,
pending saves, and selection feedback in a memory service instead of in
`knowledge/`. The skills name an operation from this contract. The adapter file
for the configured service names the exact MCP tool and arguments.

| Service | Adapter |
| --- | --- |
| mem0 | [mem0.md](mem0.md) |
| Hindsight | [hindsight.md](hindsight.md) |

## The config file

`.toolkit-memory.json` at the project root, committed. It holds no secrets.

```json
{ "format": 1, "memory": "external", "service": "mem0", "server": "mem0", "project": "dragonfly" }
```

- `format`: `1`.
- `memory`: `files` or `external`. A missing file means `files`.
- `service`: `mem0` or `hindsight`. It picks the adapter.
- `server`: the MCP server name in the project's MCP settings. It holds only
  letters, digits, `_` and `-`, so a tool is called as
  `mcp__<server>__<tool>` with the name unchanged.
- `project`: the scope inside the service. mem0 uses it as `app_id`. Hindsight
  uses it as the bank id.

`external` mode needs all three of `service`, `server`, and `project`, each a
non-empty value on one line. An unreadable file or an invalid value is an
error for `check-knowledge` to report, and every hook treats the project as
`files` mode until it is fixed. Do not guess the mode.

## What lives where

| Thing | `external` mode home |
| --- | --- |
| Project context | `PROJECT.md` (Git) |
| Knowledge manual | `docs/knowledge-manual.md` (Git, managed copy) |
| Toolkit manual | `docs/toolkit-manual.md` (Git, project-init) |
| PRDs | `prds/` and the generated `prds/prd-index.md` (Git) |
| Working memory | Records of kind `working`, one per current-focus item |
| Lasting memory | Records of kind `lasting`, one per topic |
| Pending saves | Records of kind `pending`, one per save reference |
| Selection feedback | One record of kind `feedback` |

`knowledge/` does not exist in `external` mode. Memory has one home.

## Record metadata

Every record carries these fields. mem0 keeps them in `metadata`. Hindsight
keeps them in `metadata` and also as tags `toolkit_kind:<kind>` and
`toolkit_key:<key>`.

| Field | Value |
| --- | --- |
| `toolkit_kind` | `working`, `lasting`, `pending`, or `feedback` |
| `toolkit_project` | the config's `project` |
| `toolkit_key` | the stable key below |
| `summary`, `created`, `updated`, `auto_saved` | lasting records only; same meaning as the memory-topic front matter (`summary`, `created_at`, `updated_at`, `auto_saved`) |

Source and approval fields, in metadata and in record text (`source`,
`approved_by`, and the like), name a person by name only. Never write an email
address or other contact details into a record.

Stable keys:

| Key | Record |
| --- | --- |
| `working:goal` | Project goal and next milestone |
| `working:<item id>` | One active item. Use the tracker item id, such as `issue-42`. Use a short lowercase slug only when no tracker item exists. |
| `working:todo` | General project to-dos |
| `working:handoff:<UTC time>` | One session handoff. The time is the full ISO UTC timestamp with milliseconds, `YYYY-MM-DDTHH:MM:SS.sssZ`, the same value as the handoff heading |
| `lasting:<topic>` | One lasting topic, named like today's topic file name without `.md` |
| `pending:<reference>` | One pending save, keyed by its stable UUID |
| `feedback` | Selection feedback |

Before writing a handoff record, find its key. If a record with that key
exists, never replace it: take a new timestamp and use that key instead.

One key names at most one record. Two records with the same key is an error:
report it to the owner. Do not pick one. The one exception is a mem0 replace
that stopped halfway; its adapter says how to finish it.

## Record text

The record text is the same Markdown the matching file holds in `files` mode.

- Working record: the matching section of the
  [current-work template](../templates/knowledge/memory/current.md). An item
  record holds its heading, goal, work-item link, and owning session when
  known. The work item owns status, progress, next step, blockers, and tasks.
  A handoff record points to the work item's continuation; with no work item,
  it holds a short note instead. Keep entries short. The 5,000-character file
  limit does not apply.
- Lasting record: the whole topic as the
  [memory-topic template](../templates/memory-topic.md) describes it, front
  matter and body.
- Pending record: one entry as the
  [pending-entry template](../templates/pending-entry.md) describes it, without
  the start and end comment lines.
- Feedback record: the
  [selection-feedback template](../templates/knowledge/memory-self-improvement.md)
  content.

## Operations

The skills name these operations. Each adapter maps every one to a tool.

| Operation | What it does |
| --- | --- |
| Load working memory | Return every `working` record for the project, in full. |
| Add or replace a working entry | Write one `working` record by key. |
| Remove a working entry | Delete one finished `working` record. |
| Save or replace a lasting topic | Write one `lasting` record by key. |
| List lasting topics | Return the key and summary of every `lasting` record. |
| Search | Find records by meaning within the project. |
| Add or remove a pending save | Write or delete one `pending` record. |
| Read or update feedback | Read or write the one `feedback` record. |
| Read back after a write | Fetch the record just written and compare it. |

## Write tools

These tools change memory. Call them only through `knowledge-save`.
protocol-guard refuses them before that skill is opened.

| Service | Write tools |
| --- | --- |
| mem0 | `add_memory`, `update_memory`, `delete_memory`, `delete_all_memories`, `delete_entities` |
| Hindsight | `retain`, `sync_retain`, `delete_document`, `clear_memories`, `update_memory`, `invalidate_memory`, `delete_bank` |

Hindsight `update_bank` is not a write tool here. It sets the bank's
extraction mode once at setup and holds no memory text.

## Rules for every call

- Write only through `knowledge-save`, after approval or under an existing
  permission. The selection, approval, and card rules do not change.
- Store text exactly. The adapter turns off the service's rewriting.
- Read back after every write. The stored text must equal the approved text
  exactly, and the metadata must carry the right kind and key. Any difference
  is a failed save. Report it and keep the pending record.
- Never install the service's own Claude Code or Codex plugin. Both save
  automatically, with no approval step. When either is enabled, warn the owner
  and name it: mem0 plugin `mem0`, Hindsight plugin `hindsight-memory`.
- The API key lives in an environment variable. Never write a key into the
  repository, a record, or a message.
- If the MCP server is not connected, tell the owner. Pause work that needs
  memory. Other work continues.
- A search result is a pointer. Open the record before relying on it.
