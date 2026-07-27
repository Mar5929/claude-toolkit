#!/usr/bin/env node
import { captureBaseline, discoverRoot } from "./lib/core.mjs";

const args = process.argv.slice(2);
const rootIndex = args.indexOf("--root");
const optionValues = new Set(rootIndex >= 0 ? [rootIndex, rootIndex + 1] : []);
const paths = args.filter((argument, index) => argument !== "--json" && !optionValues.has(index));

try {
  const root = await discoverRoot(rootIndex >= 0 ? args[rootIndex + 1] : null);
  const result = await captureBaseline(root, paths);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ schema_version: 1, error: error.message })}\n`);
  process.exitCode = 1;
}
