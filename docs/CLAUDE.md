# docs: the cross-cutting catalog

One file lives here. `toolkit-map.md` is the catalog across all nine plugins:
what each piece is, how the pieces relate, and the honest read on what looks
redundant but is not.

It is the only place that answers "is anything here duplicated?" A plugin's own
`README.md` describes that plugin and cannot see the others.

## Working in here

- **Update the map in the same change that adds, renames, or removes a plugin
  or a skill**, alongside that plugin's `README.md` and the top-level
  `README.md`. A map that lags is worse than no map, because a session trusts
  it.
- **The map names things, it does not restate them.** Where a canonical index
  already exists (the general rules index, the output styles index, the
  Salesforce rules index), the map links to it rather than listing its contents
  again.
- **`orphan-check.mjs` treats this file as an index document**, so a shipped
  file named only here still counts as findable. That makes an out-of-date map
  able to hide a real gap. Check the map is right before relying on it.

## Where the detail lives

- `../README.md`: what the toolkit is and how to install it.
- Each plugin's `README.md` under `../plugins/`: that plugin's own description.
- `../tests/CLAUDE.md`: what each check asks.
