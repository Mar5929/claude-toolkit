#!/usr/bin/env node
// Mint a bearer token for the local fast path.
// Usage: node scripts/mint-token.mjs <github-login> [label]
//
// The raw token is NEVER printed. It is written straight into the repo's
// .claude/settings.local.json (gitignored) as env.BRAIN_MCP_TOKEN. The only
// output is the SQL insert (containing just the token's hash) to run against
// that project's Neon database.

import { randomBytes, createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [login, label = "local"] = process.argv.slice(2);
if (!login) {
  console.error("Usage: node scripts/mint-token.mjs <github-login> [label]");
  process.exit(1);
}

const raw = "bm_" + randomBytes(24).toString("hex");
const hash = createHash("sha256").update(raw).digest("hex");

// repo root = two levels up from this script (memory-mcp/scripts/)
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const settingsPath = join(repoRoot, ".claude", "settings.local.json");

let settings = {};
if (existsSync(settingsPath)) {
  try {
    settings = JSON.parse(readFileSync(settingsPath, "utf8"));
  } catch {
    console.error(`Could not parse ${settingsPath}; fix or remove it first.`);
    process.exit(1);
  }
}
settings.env = { ...(settings.env ?? {}), BRAIN_MCP_TOKEN: raw };
mkdirSync(dirname(settingsPath), { recursive: true });
writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");

console.log(`Token written to ${settingsPath} (BRAIN_MCP_TOKEN; not shown, not committed).`);
console.log("");
console.log("Run this SQL against the project's Neon database to activate it:");
console.log("");
console.log("  insert into tokens (token_hash, github_login, label)");
console.log(`  values ('${hash}', '${login}', '${label}');`);
console.log("");
console.log("Revoke later with:");
console.log(`  update tokens set revoked_at = now() where token_hash = '${hash}';`);
