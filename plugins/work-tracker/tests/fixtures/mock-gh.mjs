#!/usr/bin/env node

import fs from "node:fs";

const statePath = process.env.MOCK_GH_STATE;
if (!statePath) {
  process.stderr.write("MOCK_GH_STATE is required\n");
  process.exit(2);
}

const args = process.argv.slice(2);
const state = fs.existsSync(statePath)
  ? JSON.parse(fs.readFileSync(statePath, "utf8"))
  : {
      project: { number: 7, id: "PVT_PROJECT_7", url: "https://github.com/users/test/projects/7" },
      configured: false,
      labels: ["bug", "enhancement"],
      issues: {},
      projectItems: {},
      nextIssue: 1,
    };

const desired = ["Backlog", "Ready", "In Progress", "In Review", "Done", "Cancelled"];
const optionId = Object.fromEntries(desired.map((name, index) => [name, `OPT_${index + 1}`]));

function save() {
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

function output(value) {
  process.stdout.write(typeof value === "string" ? value : `${JSON.stringify(value)}\n`);
}

function value(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function finish(valueToOutput) {
  save();
  if (valueToOutput !== undefined) output(valueToOutput);
  process.exit(0);
}

if (args[0] === "auth" && args[1] === "status") finish();

if (args[0] === "project" && args[1] === "create") finish(state.project);
if (args[0] === "project" && args[1] === "link") finish();
if (args[0] === "project" && args[1] === "view") finish(state.project);
if (args[0] === "project" && args[1] === "field-list") {
  const options = state.configured
    ? desired.map((name) => ({ id: optionId[name], name }))
    : [
        { id: "OLD_1", name: "Todo" },
        { id: "OLD_2", name: "In Progress" },
        { id: "OLD_3", name: "Done" },
      ];
  finish({
    fields: [
      { id: "FIELD_STATUS", name: "Status", dataType: "SINGLE_SELECT", options },
    ],
  });
}
if (args[0] === "project" && args[1] === "item-add") {
  const url = value("--url");
  const number = Number(url.match(/\/issues\/(\d+)/)?.[1]);
  const id = `ITEM_${number}`;
  state.projectItems[number] = { id, number, status: null };
  finish({ id });
}
if (args[0] === "project" && args[1] === "item-edit") {
  const id = value("--id");
  const option = value("--single-select-option-id");
  const entry = Object.values(state.projectItems).find((item) => item.id === id);
  if (entry) entry.status = Object.entries(optionId).find(([, candidate]) => candidate === option)?.[0] ?? null;
  finish({});
}
if (args[0] === "project" && args[1] === "item-list") {
  finish({
    items: Object.values(state.projectItems).map((item) => ({
      id: item.id,
      status: item.status,
      content: {
        number: item.number,
        labels: state.issues[item.number]?.labels.map((name) => ({ name })) ?? [],
        state: state.issues[item.number]?.state ?? "OPEN",
      },
    })),
  });
}

if (args[0] === "api" && args[1] === "graphql") {
  JSON.parse(fs.readFileSync(0, "utf8"));
  state.configured = true;
  finish({ data: { updateProjectV2Field: { projectV2Field: { id: "FIELD_STATUS" } } } });
}

if (args[0] === "label" && args[1] === "list") {
  finish(state.labels.map((name) => ({ name })));
}
if (args[0] === "label" && args[1] === "create") {
  const name = args[2];
  if (!state.labels.includes(name)) state.labels.push(name);
  finish();
}

if (args[0] === "issue" && args[1] === "create") {
  const number = state.nextIssue++;
  state.issues[number] = {
    number,
    state: "OPEN",
    labels: [value("--label")],
    url: `https://github.com/test/repo/issues/${number}`,
  };
  finish(state.issues[number].url);
}
if (args[0] === "issue" && args[1] === "view") {
  const issue = state.issues[Number(args[2])];
  finish({
    state: issue.state,
    url: issue.url,
    labels: issue.labels.map((name) => ({ name })),
  });
}
if (args[0] === "issue" && args[1] === "edit") {
  const issue = state.issues[Number(args[2])];
  const add = value("--add-label");
  if (add && !issue.labels.includes(add)) issue.labels.push(add);
  const remove = value("--remove-label");
  if (remove) issue.labels = issue.labels.filter((name) => !remove.split(",").includes(name));
  finish();
}
if (args[0] === "issue" && args[1] === "close") {
  state.issues[Number(args[2])].state = "CLOSED";
  finish();
}
if (args[0] === "issue" && args[1] === "reopen") {
  state.issues[Number(args[2])].state = "OPEN";
  finish();
}

process.stderr.write(`Unsupported mock gh command: ${args.join(" ")}\n`);
process.exit(2);
