# Archived second-brain v1 Worker

This directory is historical implementation evidence for the retired v1
Cloudflare Worker and Neon memory service.

Do not deploy, synchronize, register, seed, restore, export, or connect it to a
project. V2 does not import its data.

The source remains because it records the behavior and failures that informed
the Git-native v2 architecture. Accidental deployment is blocked in two ways:

- the default `wrangler.jsonc` filename is absent; and
- `package.json` has no development, type-generation, or deployment script.

`wrangler.v1-archived.jsonc` is retained only to show the historical binding
shape. Existing live Worker and Neon resources remain untouched until the owner
separately approves deletion.

Historical no-database checks may still be run locally:

```sh
npm ci
npm run check
```

The database and curation harnesses require a scratch Neon database and are not
part of normal retirement validation.
