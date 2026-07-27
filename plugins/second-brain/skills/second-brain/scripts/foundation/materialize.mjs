#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { materializeTemplate } from "../../assets/project-template/tools/memory/lib/core.mjs";

const args = process.argv.slice(2);
const destinationIndex = args.indexOf("--destination");
const projectIndex = args.indexOf("--project-id");

try {
  if (destinationIndex < 0 || projectIndex < 0 || !args[destinationIndex + 1] || !args[projectIndex + 1]) {
    throw new Error("usage: materialize.mjs --destination <path> --project-id <stable-id>");
  }
  const here = dirname(fileURLToPath(import.meta.url));
  const template = resolve(here, "../../assets/project-template");
  await materializeTemplate(template, args[destinationIndex + 1], args[projectIndex + 1]);
  process.stdout.write(`${JSON.stringify({
    schema_version: 1,
    project_id: args[projectIndex + 1],
    destination: resolve(args[destinationIndex + 1]),
  }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ schema_version: 1, error: error.message })}\n`);
  process.exitCode = 1;
}
