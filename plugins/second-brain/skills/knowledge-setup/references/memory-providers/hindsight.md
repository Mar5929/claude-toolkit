# Hindsight adapter

Maps each operation in the [provider contract](README.md) to a Hindsight MCP
tool. Tool names are `mcp__<server>__<tool>`, where `<server>` is the config's
`server`. `P` below is the config's `project`, which is also the bank id.

Tool names and arguments were checked on 2026-09-23 against the Hindsight
source at its 2026-09-22 commit (`vectorize-io/hindsight` 12f2d54:
`hindsight-api-slim/hindsight_api/mcp_tools.py`,
`hindsight-docs/docs/developer/mcp-server.md`,
`hindsight-docs/docs/developer/api/memory-banks.mdx`). Before the first write,
compare the connected server's tool list with this page. If a tool or argument
named here is missing, stop and report it.

## Connect

Connect in single-bank mode: the bank id is in the URL, `<base>/mcp/P/`, and
the tools take no `bank_id`. `<base>` is the Hindsight server, such as
`http://localhost:8888` for a local server or the Hindsight Cloud address. The
API key comes from the `HINDSIGHT_API_KEY` environment variable. A local server
with authentication off needs no key; leave the header out.

Claude Code, project `.mcp.json` (merge into the existing file):

```json
{
  "mcpServers": {
    "hindsight": {
      "type": "http",
      "url": "<base>/mcp/P/",
      "headers": { "Authorization": "Bearer ${HINDSIGHT_API_KEY}" }
    }
  }
}
```

Codex, `~/.codex/config.toml`:

```toml
[mcp_servers.hindsight]
url = "<base>/mcp/P/"
bearer_token_env_var = "HINDSIGHT_API_KEY"
```

The server name (`hindsight` here) must equal the config's `server`. Claude
Code asks the owner to approve a project `.mcp.json` server. Check that it is
connected with `/mcp` or `claude mcp list`.

Never install the Hindsight Claude Code plugin (name `hindsight-memory`) or its
Codex or coding-agent hooks. They recall and save automatically on every
prompt and at the end of each session. When one is enabled, warn the owner.

## Create the bank

Once, at setup: `update_bank` with
`config_updates: {"retain_extraction_mode": "chunks"}`. The bank is created on
first use. `chunks` stores text without an LLM call, so nothing is rewritten.
Confirm `retain_extraction_mode` is `chunks` in the result. Any other value
stops setup.

## Rules for every call

- Write with `sync_retain`, one record per call. It returns after the record
  is stored, so the read back sees it. Pass `content`, `document_id`, `tags`,
  `context`, and `metadata` as top-level arguments. Never use a batch or
  `items` form.
- The record key is the `document_id`. A write with an existing `document_id`
  replaces that record.
- Every write passes `tags: ["toolkit_kind:<kind>", "toolkit_key:<key>"]`,
  `context: "<kind>"`, and
  `metadata: {"toolkit_kind": "<kind>", "toolkit_project": P, "toolkit_key": "<key>"}`.
  Metadata values are strings: write `auto_saved` as `"true"` or `"false"`.
- `get_document` returns the stored text as `original_text`.

## Operations

**Find one record by key.** `get_document` with `document_id: "<key>"`. Not
found means the record does not exist.

**Load working memory.** `list_documents` with `q: "working:"` and
`limit: 100`. `q` matches part of the document id. Keep only ids that start with
`working:`. If the result's total is larger than the items returned, raise
`limit`. Then `get_document` for each id. Each `original_text` is the entry
text.

**Add or replace a working entry.** `sync_retain` with `content` (the entry
text), `document_id: "<key>"`, and the tags, context, and metadata above, kind
`working`.

**Remove a working entry.** `delete_document` with `document_id: "<key>"`.

**Save or replace a lasting topic.** `sync_retain` as above, kind `lasting`,
`document_id: "lasting:<topic>"`, and metadata also holding `summary`,
`created`, `updated`, and `auto_saved`.

**List lasting topics.** `list_documents` with `q: "lasting:"`, keeping ids
that start with `lasting:`. Read each summary from the `summary` line of the
front matter in `get_document`'s `original_text`.

**Search.** `recall` with `query`, `tags: ["toolkit_kind:<kind>"]`, and
`tags_match: "any_strict"`. Leave out `tags` to search every kind. A result
names its document; open it with `get_document`.

**Add or remove a pending save.** `sync_retain` with kind `pending` and
`document_id: "pending:<reference>"`. Remove with `delete_document`.

**Read or update feedback.** `get_document` with `document_id: "feedback"`.
Write with `sync_retain`, kind `feedback`, `document_id: "feedback"`.

**Read back after a write.** `get_document` with the `document_id`.
`original_text` must equal the approved text exactly. Its tags must hold
`toolkit_kind:<kind>` and `toolkit_key:<key>`.
