# System Guide tools

`system-guide.mjs` is the dependency-free Node CLI and importable library for a
project's generated System Guide and owner-approved meaning. It reads only
configured local sources, writes only the configured guide and
`.system-guide.json`, makes no network calls, and does not write to any live
system.

## Commands

```text
node system-guide.mjs status  --root PROJECT [--json]
node system-guide.mjs setup   --root PROJECT [--guide-path RELATIVE] [--source KIND:COMPLETENESS:RELATIVE]... [--adopt] [--json]
node system-guide.mjs refresh --root PROJECT [--full] [--json]
node system-guide.mjs check   --root PROJECT [--json]
node system-guide.mjs propose --root PROJECT --request RELATIVE.json [--json]
node system-guide.mjs apply   --root PROJECT --preview ID --approval RELATIVE.json [--json]
node system-guide.mjs disable --root PROJECT [--json]
```

`status` is a cheap config/build-record inspection and does not scan source
trees. `check` scans configured sources and returns exit 1 when repair or
refresh is needed. Other refusals and failures return exit 1; invalid command
usage returns exit 2.

The default refresh hashes all supported source files, reparses changed
sources, and reuses the last successful model for unchanged sources. `--full`
reparses every source. Both preserve meaning byte for byte. A source declared
`partial` retains previously observed facts that its latest snapshot did not
contain; only a `complete` source can establish removal.

## Imported API

The module exports `inspectGuide`, `setupGuide`, `refreshGuide`, `checkGuide`,
`proposeMeaningChange`, `applyMeaningChange`, `disableGuide`, `runCli`, and
`SystemGuideError`. Config version 1 is:

```json
{
  "version": 1,
  "enabled": true,
  "guidePath": "knowledge/system",
  "sources": [
    { "path": "src", "kind": "code", "completeness": "complete" }
  ]
}
```

Meaning requests use `action`, `destination`, `targetId`, `content`,
`sourceRefs`, `uncertainty`, and `reason`. A source reference may be a local
project path, `{kind:"file",path}`, an attributed owner statement, or an
external HTTP(S) authority. Local source hashes freeze the preview. The apply
command accepts only a separate approval record matching the exact preview ID
and hash; the calling workflow remains responsible for obtaining the owner's
real approval before creating that record.

## Supported source facts

- `code` recognizes JavaScript, TypeScript, and Python modules. It maps static
  local imports and literal dynamic imports using common file and `index`
  resolution. It does not resolve non-literal imports, framework runtime
  wiring, call graphs, or business purpose.
- `salesforce` recognizes object, field, and flow metadata files. It maps field
  containment, lookup targets, generic flow mentions, and qualified field
  writes when a `recordUpdates` or `recordCreates` block names both the object
  and input assignment. It is not a complete Salesforce Metadata API parser.

Generated pages label direct evidence and inferred path resolution. They never
copy source literals or generate a prose page for every function.
