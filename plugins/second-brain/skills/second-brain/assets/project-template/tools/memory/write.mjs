#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { applyTransaction, discoverRoot } from "./lib/core.mjs";

const args = process.argv.slice(2);
const rootIndex = args.indexOf("--root");
const transactionPath = args.find((argument, index) => !argument.startsWith("--") && index !== rootIndex + 1);

try {
  if (!transactionPath) throw new Error("usage: write.mjs <transaction.json> [--root <path>]");
  const root = await discoverRoot(rootIndex >= 0 ? args[rootIndex + 1] : null);
  const transaction = JSON.parse(await readFile(transactionPath, "utf8"));
  const receipt = await applyTransaction(root, transaction);
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ schema_version: 1, error: error.message })}\n`);
  process.exitCode = 1;
}
