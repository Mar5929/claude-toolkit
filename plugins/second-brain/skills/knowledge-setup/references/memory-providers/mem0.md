# mem0 adapter

Maps each operation in the [provider contract](README.md) to a mem0 MCP tool.
Tool names are `mcp__<server>__<tool>`, where `<server>` is the config's
`server`. `P` below is the config's `project`.

Tool names and arguments were checked on 2026-09-23 against the mem0 source at
its 2026-09-22 commit (`mem0ai/mem0` f8082a7: `docs/platform/mem0-mcp.mdx`,
`docs/platform/features/v2-memory-filters.mdx`,
`docs/api-reference/memory/add-memories.mdx`) and the `mem0ai/mem0-mcp` server
source. The hosted server publishes no argument list in source. Before the
first write, compare the connected server's tool list with this page. If a tool
or argument named here is missing, stop and report it.

## Connect

Hosted MCP server: `https://mcp.mem0.ai/mcp`. The API key comes from the
`MEM0_API_KEY` environment variable. It is never written into the repository.

Claude Code, project `.mcp.json` (merge into the existing file):

```json
{
  "mcpServers": {
    "mem0": {
      "type": "http",
      "url": "https://mcp.mem0.ai/mcp",
      "headers": { "Authorization": "Bearer ${MEM0_API_KEY}" }
    }
  }
}
```

Codex, `~/.codex/config.toml`:

```toml
[mcp_servers.mem0]
url = "https://mcp.mem0.ai/mcp"
bearer_token_env_var = "MEM0_API_KEY"
```

The server name (`mem0` here) must equal the config's `server`. Claude Code asks
the owner to approve a project `.mcp.json` server. Check that it is connected
with `/mcp` or `claude mcp list`.

Never install the mem0 Claude Code or Codex plugin (name `mem0`). It saves
conversations automatically through hooks. When it is enabled, warn the owner.
Do not combine it with this server entry.

## Rules for every call

- Every `add_memory` passes `infer: false`, so mem0 stores the text as sent.
  Never omit it. If the tool has no `infer` argument, stop: the text would be
  rewritten.
- Every write passes `app_id: P` and the full `metadata` object from the
  contract.
- Every filter includes `{"app_id": P}`. The server adds the account's default
  `user_id`. Do not pass a different `user_id`.
- `add_memory` can return an `event_id` before the record exists. Call
  `get_event_status` with that `event_id` until the status is `SUCCEEDED`. Any
  other final status is a failed save.
- mem0 assigns record ids. Find a record by its key first, then act on its id.
- Never use `update_memory`. The `mem0ai/mem0-mcp` source takes only
  `memory_id` and `text`, so the kind and key metadata would not be written
  with the call. Replace a record as described below.

## Operations

**Find one record by key.** `get_memories` with
`filters: {"AND": [{"app_id": P}, {"metadata": {"toolkit_key": "<key>"}}]}`.
No result means the record does not exist. Two results can be an
unfinished replace: the newer `created_at` is current, so
read it back, then delete the older one. Any other case of more than one result
is an error: report it.

**Load working memory.** `get_memories` with
`filters: {"AND": [{"app_id": P}, {"metadata": {"toolkit_kind": "working"}}]}`,
`page: 1`, `page_size: 100`. Ask for the next page until a page returns fewer
than 100. Each record's `memory` field is the entry text.

**Add or replace a working entry.** Find the record by key. Then
`add_memory` with `text`, `app_id: P`, `infer: false`, and
`metadata: {"toolkit_kind": "working", "toolkit_project": P, "toolkit_key": "<key>"}`.
Read the new record back. If an old record with the key existed, only then
`delete_memory` with the old `memory_id`. The key briefly names two records;
the newer `created_at` is the current one. If the new write fails, keep the
old record.

**Remove a working entry.** Find the record by key, then `delete_memory` with
its `memory_id`.

**Save or replace a lasting topic.** As for a working entry, with kind
`lasting`, key `lasting:<topic>`, and metadata also holding `summary`,
`created`, `updated`, and `auto_saved`.

**List lasting topics.** `get_memories` with
`filters: {"AND": [{"app_id": P}, {"metadata": {"toolkit_kind": "lasting"}}]}`,
paged as above. Use each record's `metadata.toolkit_key` and
`metadata.summary`.

**Search.** `search_memories` with `query`, `limit`, and
`filters: {"AND": [{"app_id": P}]}`. Add
`{"metadata": {"toolkit_kind": "<kind>"}}` to the `AND` list to search one
kind.

**Add or remove a pending save.** Add as for a working entry, with kind
`pending` and key `pending:<reference>`. Remove with `delete_memory`.

**Read or update feedback.** Find key `feedback`. Write as for a working
entry, with kind `feedback`.

**Read back after a write.** `get_memory` with the `memory_id`. The `memory`
field must equal the approved text exactly. `metadata.toolkit_kind` and
`metadata.toolkit_key` must match. After any old record is deleted, find the
record by key again: exactly one record must come back.

## Known service behavior

The hosted service can mark a record as a duplicate of, or superseded by,
another record. If a record found at load or read back is missing, merged, or
marked superseded, report it to the owner. Do not write it again without
checking what changed.
