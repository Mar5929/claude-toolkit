#!/usr/bin/env node
import { discoverRoot, formatValidationHuman, validateProject, validationReport } from "./lib/core.mjs";

const args = process.argv.slice(2);
const json = args.includes("--json");
const rootIndex = args.indexOf("--root");

try {
  const root = await discoverRoot(rootIndex >= 0 ? args[rootIndex + 1] : null);
  const result = await validateProject(root);
  process.stdout.write(`${json ? JSON.stringify(validationReport(result), null, 2) : formatValidationHuman(result)}\n`);
  if (!result.usable) process.exitCode = 1;
  else if (result.stale) process.exitCode = 2;
} catch (error) {
  const failure = { schema_version: 1, usable: false, error: error.message };
  process.stderr.write(`${json ? JSON.stringify(failure) : `Validation failed: ${error.message}`}\n`);
  process.exitCode = 1;
}
