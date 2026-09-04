# docs: the catalog, the build plans, and the product requirements

Three things live here, and they do three different jobs.

- **`toolkit-map.md`** is the catalog across every plugin: what each piece is,
  how the pieces relate, and the straight answer on what looks redundant but is
  not. It is the only place that answers "is anything here duplicated?" A
  plugin's own `README.md` describes that plugin and cannot see the others.
- **`designs/`** holds the build plan for one work item, written once that
  item's requirements are approved and deleted once the specification has been
  brought up to date. Its `README.md` has the rules.
- **`PRDs/`** holds the requirements for a product or feature area that is
  bigger than one issue. It stays for as long as the area does. Its `README.md`
  has the rules.

## Working in here

### The map

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

### `designs/`

- **One file per work item**, named `<issue number>-<short-slug>.md`.
- **Create it at stage `04-solution-design`**, and merge it in the same pull
  request as the code it describes.
- **Delete it at stage `14-spec-update`**, once `knowledge/specs/` is current.
  Git history keeps it, so nothing is lost. Nothing checks that you did this.
- An empty folder is the normal state between jobs, not a gap.

### `PRDs/`

- **One file per product or feature area**, never one per issue.
- **Keep it.** It is not deleted when an issue closes.
- **Link the issues it produced back into the file**, so the area and its
  issues stay together.

## Where the detail lives

- `designs/README.md` and `PRDs/README.md`: what each folder holds and how long
  a file in it lives.
- `../README.md`: what the toolkit is and how to install it.
- Each plugin's `README.md` under `../plugins/`: that plugin's own description.
- `../tests/CLAUDE.md`: what each check asks.
