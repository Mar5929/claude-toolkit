#!/usr/bin/env node
import { discoverRoot, formatSearchHuman, searchProject } from "./lib/core.mjs";

const args = process.argv.slice(2);
const json = args.includes("--json");
const rootIndex = args.indexOf("--root");
const limitIndex = args.indexOf("--limit");
const optionValues = new Set([
  ...(rootIndex >= 0 ? [rootIndex, rootIndex + 1] : []),
  ...(limitIndex >= 0 ? [limitIndex, limitIndex + 1] : []),
]);
const queryParts = args.filter((argument, index) => argument !== "--json" && !optionValues.has(index));

try {
  const root = await discoverRoot(rootIndex >= 0 ? args[rootIndex + 1] : null);
  const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : null;
  const result = await searchProject(root, queryParts.join(" "), limit);
  process.stdout.write(`${json ? JSON.stringify(result, null, 2) : formatSearchHuman(result)}\n`);
} catch (error) {
  const failure = { schema_version: 1, error: error.message };
  process.stderr.write(`${json ? JSON.stringify(failure) : `Search failed: ${error.message}`}\n`);
  process.exitCode = 1;
}
